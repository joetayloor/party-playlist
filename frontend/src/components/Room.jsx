import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import Player from './Player.jsx';
import Playlist from './Playlist.jsx';
import Members from './Members.jsx';

export default function Room({ roomId, nickname, isHost: initialHost, onLeave }) {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((text, type = 'info') => {
    setToast({ text, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── WebSocket message handler ──
  const handleMessage = useCallback((msg) => {
    switch (msg.type) {

      case 'ROOM_STATE':
        setRoom(msg.room);
        setConnected(true);
        break;

      case 'MEMBER_JOINED':
        setRoom(prev => prev ? { ...prev, members: msg.members } : prev);
        if (msg.nickname !== nickname) showToast(`${msg.nickname} вошёл в комнату 🎉`);
        break;

      case 'MEMBER_LEFT':
        setRoom(prev => prev ? { ...prev, members: msg.members } : prev);
        showToast(`${msg.nickname} покинул комнату`);
        break;

      case 'TRACK_ADDED':
        setRoom(prev => {
          if (!prev) return prev;
          const playlist = [...prev.playlist, msg.track];
          const currentIndex = prev.currentIndex === -1 ? playlist.length - 1 : prev.currentIndex;
          return { ...prev, playlist, currentIndex };
        });
        showToast(`${msg.track.addedBy} добавил "${msg.track.title.slice(0, 30)}..."`);
        break;

      case 'TRACK_READY':
        setRoom(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            playlist: prev.playlist.map(t =>
              t.id === msg.trackId ? { ...t, status: 'ready' } : t
            ),
          };
        });
        break;

      case 'TRACK_ERROR':
        setRoom(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            playlist: prev.playlist.map(t =>
              t.id === msg.trackId ? { ...t, status: 'error' } : t
            ),
          };
        });
        showToast('Не удалось загрузить трек', 'error');
        break;

      case 'PLAY':
        setRoom(prev => prev ? { ...prev, isPlaying: true, currentTime: msg.currentTime } : prev);
        break;

      case 'PAUSE':
        setRoom(prev => prev ? { ...prev, isPlaying: false, currentTime: msg.currentTime } : prev);
        break;

      case 'SEEK':
        setRoom(prev => prev ? { ...prev, currentTime: msg.currentTime } : prev);
        break;

      case 'PLAY_TRACK':
        setRoom(prev => prev ? {
          ...prev,
          currentIndex: msg.index,
          isPlaying: true,
          currentTime: 0,
          skipVotes: [],
        } : prev);
        break;

      case 'TRACK_SKIPPED':
        setRoom(prev => prev ? {
          ...prev,
          currentIndex: msg.index,
          isPlaying: true,
          currentTime: 0,
          skipVotes: [],
        } : prev);
        showToast('Трек скипнут голосованием ⏭');
        break;

      case 'SKIP_VOTE':
        setRoom(prev => prev ? { ...prev, skipVotes: msg.voters, skipNeeded: msg.needed } : prev);
        showToast(`Голосов за скип: ${msg.votes}/${msg.needed}`);
        break;

      case 'ERROR':
        showToast(msg.text, 'error');
        break;

      case 'PONG':
        break;
    }
  }, [nickname, showToast]);

  const { send } = useSocket(handleMessage);

  // Join room on mount — send immediately, useSocket queues if WS not open
  useEffect(() => {
    send({ type: 'JOIN', roomId, nickname });
  }, [roomId, nickname, send]);

  // ── Player event handlers ──
  function handlePlay(currentTime) {
    send({ type: 'PLAY', currentTime });
    setRoom(prev => prev ? { ...prev, isPlaying: true } : prev);
  }
  function handlePause(currentTime) {
    send({ type: 'PAUSE', currentTime });
    setRoom(prev => prev ? { ...prev, isPlaying: false } : prev);
  }
  function handleSeek(currentTime) {
    send({ type: 'SEEK', currentTime });
  }
  function handleEnded() {
    send({ type: 'NEXT_TRACK' });
  }
  function handleSkipVote() {
    send({ type: 'VOTE_SKIP' });
  }

  function handleAddTrack(meta) {
    send({ type: 'ADD_TRACK', ...meta });
  }

  // ── Loading state ──
  if (!connected || !room) {
    return (
      <div className="room-loading">
        <div className="loading-ring" />
        <p>Подключаемся к комнате {roomId}...</p>
      </div>
    );
  }

  const currentTrack = room.playlist[room.currentIndex] ?? null;
  const isHost = room.host === nickname;

  return (
    <div className="room fade-in">
      {/* Header */}
      <header className="room-header">
        <div className="room-header-left">
          <div className="room-logo">
            <MusicIcon />
          </div>
          <div>
            <h1 className="room-title">PartyPlay</h1>
            <div className="room-status">
              <span className="status-dot" />
              <span>{room.members?.length ?? 0} онлайн</span>
            </div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onLeave}>
          Выйти
        </button>
      </header>

      <hr className="glow-line" />

      {/* Main layout */}
      <div className="room-body">
        {/* Left: player + playlist */}
        <main className="room-main">
          <Player
            track={currentTrack}
            isPlaying={room.isPlaying}
            currentTime={room.currentTime}
            isHost={isHost}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onEnded={handleEnded}
            onSkipVote={handleSkipVote}
            skipVotes={room.skipVotes?.length ?? 0}
            skipNeeded={room.skipNeeded ?? Math.ceil((room.members?.length ?? 1) / 2)}
          />
          <Playlist
            tracks={room.playlist}
            currentIndex={room.currentIndex}
            onAdd={handleAddTrack}
            nickname={nickname}
          />
        </main>

        {/* Right: members */}
        <aside className="room-aside">
          <Members
            members={room.members ?? []}
            host={room.host}
            roomId={room.id}
            nickname={nickname}
          />
        </aside>
      </div>

      {/* Toast */}
      {toast && (
        <div key={toast.id} className={`toast toast-${toast.type} fade-in`}>
          {toast.text}
        </div>
      )}

      <style>{`
        .room { display: flex; flex-direction: column; min-height: 100dvh; }
        .room-loading {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 20px; color: var(--text2);
        }
        .loading-ring {
          width: 40px; height: 40px; border-radius: 50%;
          border: 3px solid var(--border); border-top-color: var(--accent);
          animation: spin 0.8s linear infinite;
        }

        .room-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 24px;
        }
        .room-header-left { display: flex; align-items: center; gap: 12px; }
        .room-logo {
          width: 40px; height: 40px; background: var(--bg3);
          border-radius: 12px; border: 1.5px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--accent2);
        }
        .room-title { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
        .room-status { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text3); }
        .status-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 6px var(--success);
          animation: pulse 2s infinite;
        }

        .room-body {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 20px;
          padding: 20px 24px 40px;
          align-items: start;
        }
        .room-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .room-aside { position: sticky; top: 20px; }

        .toast {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: var(--surface); border: 1.5px solid var(--border);
          border-radius: 100px; padding: 10px 20px;
          font-size: 14px; font-weight: 500;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          z-index: 999; white-space: nowrap;
          max-width: calc(100vw - 48px); text-align: center;
        }
        .toast-error { border-color: rgba(239,68,68,0.4); color: var(--error); }
        .toast-info { border-color: rgba(124,58,237,0.3); }

        @media (max-width: 768px) {
          .room-body { grid-template-columns: 1fr; }
          .room-aside { position: static; }
          .room-header { padding: 12px 16px; }
          .room-body { padding: 12px 16px 80px; }
        }
      `}</style>
    </div>
  );
}

function MusicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path d="M18 3a1 1 0 0 0-1.196-.98l-10 2A1 1 0 0 0 6 5v8.5A2.5 2.5 0 1 0 8.5 16V9.164l8-1.6V12.5A2.5 2.5 0 1 0 19 15V3z"/>
    </svg>
  );
}
