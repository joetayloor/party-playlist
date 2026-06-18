import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const AUDIO_DIR = path.join(__dirname, '../audio');
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

// In-memory state
const rooms = new Map();
const clients = new Map(); // ws -> { roomId, nickname }

// ─────────────────────────────────────────────
// Room helpers
// ─────────────────────────────────────────────

function createRoom(hostNickname) {
  const id = Math.random().toString(36).substring(2, 8).toUpperCase();
  rooms.set(id, {
    id,
    host: hostNickname,
    members: [],
    playlist: [],
    currentIndex: -1,
    isPlaying: false,
    currentTime: 0,
    skipVotes: new Set(),
    createdAt: Date.now(),
  });
  return rooms.get(id);
}

function broadcast(roomId, message, excludeWs = null) {
  wss.clients.forEach((ws) => {
    const meta = clients.get(ws);
    if (meta?.roomId === roomId && ws !== excludeWs && ws.readyState === 1) {
      ws.send(JSON.stringify(message));
    }
  });
}

function broadcastAll(roomId, message) {
  broadcast(roomId, message, null);
}

function getRoomMembers(roomId) {
  const members = [];
  clients.forEach((meta, ws) => {
    if (meta.roomId === roomId) members.push(meta.nickname);
  });
  return members;
}

// ─────────────────────────────────────────────
// Audio download via yt-dlp
// ─────────────────────────────────────────────

function detectSource(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vk.com')) return 'vk';
  if (url.includes('music.yandex') || url.includes('yandex.ru/album')) return 'yandex';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  return 'unknown';
}

async function getTrackMeta(url) {
  try {
    const { stdout } = await execFileAsync('yt-dlp', [
      '--dump-json',
      '--no-playlist',
      '--flat-playlist',
      url,
    ], { timeout: 30000 });
    const meta = JSON.parse(stdout.trim().split('\n')[0]);
    return {
      title: meta.title || 'Unknown Track',
      artist: meta.uploader || meta.channel || '',
      duration: meta.duration || 0,
      thumbnail: meta.thumbnail || meta.thumbnails?.[0]?.url || '',
    };
  } catch (e) {
    return { title: 'Unknown Track', artist: '', duration: 0, thumbnail: '' };
  }
}

async function downloadAudio(url, trackId) {
  const outPath = path.join(AUDIO_DIR, `${trackId}.%(ext)s`);
  await execFileAsync('yt-dlp', [
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '5',
    '--no-playlist',
    '-o', outPath,
    '--no-warnings',
    url,
  ], { timeout: 120000 });

  // Find the downloaded file
  const files = fs.readdirSync(AUDIO_DIR).filter(f => f.startsWith(trackId));
  if (files.length === 0) throw new Error('Download failed');
  return path.join(AUDIO_DIR, files[0]);
}

function scheduleDelete(filePath, delayMs = 3600000) {
  setTimeout(() => {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }, delayMs);
}

// ─────────────────────────────────────────────
// REST API
// ─────────────────────────────────────────────

app.post('/api/rooms', (req, res) => {
  const { nickname } = req.body;
  if (!nickname) return res.status(400).json({ error: 'nickname required' });
  const room = createRoom(nickname);
  res.json({ roomId: room.id });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({
    id: room.id,
    host: room.host,
    memberCount: getRoomMembers(room.id).length,
    trackCount: room.playlist.length,
  });
});

// Resolve track info (before adding to playlist)
app.post('/api/resolve', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const source = detectSource(url);
    if (source === 'unknown') return res.status(400).json({ error: 'Unsupported URL' });
    const meta = await getTrackMeta(url);
    res.json({ ...meta, source, url });
  } catch (e) {
    res.status(500).json({ error: 'Could not resolve track: ' + e.message });
  }
});

// Stream audio
app.get('/api/audio/:trackId', (req, res) => {
  const files = fs.readdirSync(AUDIO_DIR).filter(f => f.startsWith(req.params.trackId));
  if (files.length === 0) return res.status(404).json({ error: 'Audio not found' });

  const filePath = path.join(AUDIO_DIR, files[0]);
  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'audio/mpeg',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'audio/mpeg',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// ─────────────────────────────────────────────
// WebSocket
// ─────────────────────────────────────────────

wss.on('connection', (ws) => {
  clients.set(ws, { roomId: null, nickname: null });

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const meta = clients.get(ws);

    switch (msg.type) {

      case 'JOIN': {
        const roomId = msg.roomId?.toUpperCase();
        console.log('[JOIN] roomId:', roomId, 'nickname:', msg.nickname);
        const room = rooms.get(roomId);
        if (!room) { console.log('[JOIN] room not found:', roomId, 'available:', [...rooms.keys()]); ws.send(JSON.stringify({ type: 'ERROR', text: 'Room not found' })); return; }

        meta.roomId = roomId;
        meta.nickname = msg.nickname || 'Guest';
        clients.set(ws, meta);

        // Send current state to joiner
        ws.send(JSON.stringify({
          type: 'ROOM_STATE',
          room: {
            id: room.id,
            host: room.host,
            playlist: room.playlist,
            currentIndex: room.currentIndex,
            isPlaying: room.isPlaying,
            currentTime: room.currentTime,
            members: getRoomMembers(roomId),
          },
        }));

        broadcastAll(roomId, { type: 'MEMBER_JOINED', nickname: meta.nickname, members: getRoomMembers(roomId) });
        break;
      }

      case 'ADD_TRACK': {
        console.log('[ADD_TRACK] roomId:', meta.roomId, 'url:', msg.url?.slice(0,50));
        const room = rooms.get(meta.roomId);
        if (!room) { console.log('[ADD_TRACK] room not found for:', meta.roomId); return; }

        const trackId = uuidv4();
        const track = {
          id: trackId,
          url: msg.url,
          title: msg.title || 'Loading...',
          artist: msg.artist || '',
          thumbnail: msg.thumbnail || '',
          duration: msg.duration || 0,
          source: msg.source || 'unknown',
          status: 'downloading', // downloading | ready | error
          addedBy: meta.nickname,
        };

        room.playlist.push(track);
        broadcastAll(meta.roomId, { type: 'TRACK_ADDED', track });

        // If nothing is playing, start
        if (room.currentIndex === -1) {
          room.currentIndex = room.playlist.length - 1;
          broadcastAll(meta.roomId, { type: 'PLAY_TRACK', index: room.currentIndex, trackId });
        }

        // Download in background
        try {
          await downloadAudio(msg.url, trackId);
          track.status = 'ready';
          broadcastAll(meta.roomId, { type: 'TRACK_READY', trackId });
          scheduleDelete(path.join(AUDIO_DIR, trackId + '.mp3'), 2 * 3600000);
        } catch (e) {
          track.status = 'error';
          broadcastAll(meta.roomId, { type: 'TRACK_ERROR', trackId, error: e.message });
        }
        break;
      }

      case 'PLAY': {
        const room = rooms.get(meta.roomId);
        if (!room) return;
        room.isPlaying = true;
        room.currentTime = msg.currentTime || 0;
        broadcast(meta.roomId, { type: 'PLAY', currentTime: room.currentTime }, ws);
        break;
      }

      case 'PAUSE': {
        const room = rooms.get(meta.roomId);
        if (!room) return;
        room.isPlaying = false;
        room.currentTime = msg.currentTime || 0;
        broadcast(meta.roomId, { type: 'PAUSE', currentTime: room.currentTime }, ws);
        break;
      }

      case 'SEEK': {
        const room = rooms.get(meta.roomId);
        if (!room) return;
        room.currentTime = msg.currentTime;
        broadcast(meta.roomId, { type: 'SEEK', currentTime: msg.currentTime }, ws);
        break;
      }

      case 'VOTE_SKIP': {
        const room = rooms.get(meta.roomId);
        if (!room) return;
        room.skipVotes.add(meta.nickname);
        const members = getRoomMembers(meta.roomId);
        const needed = Math.ceil(members.length / 2);
        broadcastAll(meta.roomId, {
          type: 'SKIP_VOTE',
          votes: room.skipVotes.size,
          needed,
          voters: [...room.skipVotes],
        });

        if (room.skipVotes.size >= needed) {
          room.skipVotes.clear();
          room.currentIndex = (room.currentIndex + 1) % room.playlist.length;
          broadcastAll(meta.roomId, {
            type: 'TRACK_SKIPPED',
            index: room.currentIndex,
            trackId: room.playlist[room.currentIndex]?.id,
          });
        }
        break;
      }

      case 'NEXT_TRACK': {
        const room = rooms.get(meta.roomId);
        if (!room || meta.nickname !== room.host) return;
        room.skipVotes.clear();
        if (room.currentIndex < room.playlist.length - 1) {
          room.currentIndex++;
          broadcastAll(meta.roomId, {
            type: 'PLAY_TRACK',
            index: room.currentIndex,
            trackId: room.playlist[room.currentIndex]?.id,
          });
        }
        break;
      }

      case 'PING':
        ws.send(JSON.stringify({ type: 'PONG' }));
        break;
    }
  });

  ws.on('close', () => {
    const meta = clients.get(ws);
    if (meta?.roomId) {
      clients.delete(ws);
      broadcast(meta.roomId, {
        type: 'MEMBER_LEFT',
        nickname: meta.nickname,
        members: getRoomMembers(meta.roomId),
      });
    }
  });
});

// Cleanup empty rooms every 30 min
setInterval(() => {
  rooms.forEach((room, id) => {
    const members = getRoomMembers(id);
    if (members.length === 0 && Date.now() - room.createdAt > 30 * 60 * 1000) {
      rooms.delete(id);
    }
  });
}, 30 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🎵 Party Playlist server on port ${PORT}`));
