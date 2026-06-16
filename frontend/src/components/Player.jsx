import React, { useRef, useState, useEffect } from 'react';
import { audioUrl, formatTime } from '../utils/api.js';

export default function Player({ track, isPlaying, currentTime, isHost, onPlay, onPause, onSeek, onEnded, onSkipVote, skipVotes, skipNeeded }) {
  const audioRef = useRef(null);
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [dragging, setDragging] = useState(false);
  const progressRef = useRef(null);
  const syncedRef = useRef(false);

  // Load new track
  useEffect(() => {
    if (!track || !audioRef.current) return;
    syncedRef.current = false;
    audioRef.current.src = audioUrl(track.id);
    audioRef.current.load();
  }, [track?.id]);

  // Sync play/pause from room state
  useEffect(() => {
    if (!audioRef.current || !track) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, track?.id]);

  // Sync time (only on big drift)
  useEffect(() => {
    if (!audioRef.current || !track || dragging) return;
    const diff = Math.abs(audioRef.current.currentTime - currentTime);
    if (diff > 2) audioRef.current.currentTime = currentTime;
  }, [currentTime]);

  function handleTimeUpdate() {
    if (!dragging) setLocalTime(audioRef.current.currentTime);
    // buffered
    if (audioRef.current.buffered.length > 0) {
      setBuffered(audioRef.current.buffered.end(audioRef.current.buffered.length - 1));
    }
  }

  function handleLoadedMetadata() {
    setDuration(audioRef.current.duration);
    if (currentTime > 0) audioRef.current.currentTime = currentTime;
    if (isPlaying) audioRef.current.play().catch(() => {});
  }

  function handleProgressClick(e) {
    const rect = progressRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const t = x * duration;
    audioRef.current.currentTime = t;
    setLocalTime(t);
    onSeek(t);
  }

  const pct = duration > 0 ? (localTime / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  if (!track) {
    return (
      <div className="player-empty">
        <div className="player-empty-icon">🎵</div>
        <p>Плейлист пуст — добавь первый трек!</p>
      </div>
    );
  }

  return (
    <div className="player">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={onEnded}
        crossOrigin="anonymous"
      />

      {/* Track info */}
      <div className="player-info">
        <div className="player-thumb">
          {track.thumbnail
            ? <img src={track.thumbnail} alt="" />
            : <span>🎵</span>}
          {isPlaying && (
            <div className="player-thumb-overlay">
              <div className="eq-bars">
                <div className="eq-bar" style={{height:'70%'}}/>
                <div className="eq-bar" style={{height:'100%'}}/>
                <div className="eq-bar" style={{height:'55%'}}/>
                <div className="eq-bar" style={{height:'85%'}}/>
              </div>
            </div>
          )}
        </div>
        <div className="player-meta">
          <p className="player-title">{track.title}</p>
          <p className="player-artist">{track.artist || track.addedBy}</p>
          {track.status === 'downloading' && (
            <span className="badge badge-warn">⟳ Скачивается...</span>
          )}
          {track.status === 'error' && (
            <span className="badge badge-red">✕ Ошибка загрузки</span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="player-progress-wrap">
        <span className="player-time">{formatTime(localTime)}</span>
        <div
          className="progress-wrap"
          ref={progressRef}
          onClick={handleProgressClick}
          style={{ flex: 1 }}
        >
          <div className="progress-fill" style={{ width: `${bufPct}%`, opacity: 0.25, position: 'absolute' }} />
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="player-time">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="player-controls">
        {isPlaying ? (
          <button className="btn btn-icon player-main-btn" onClick={() => onPause(localTime)}>
            <PauseIcon />
          </button>
        ) : (
          <button className="btn btn-icon player-main-btn" onClick={() => onPlay(localTime)}>
            <PlayIcon />
          </button>
        )}

        {/* Skip vote */}
        <button
          className="btn btn-ghost btn-sm skip-btn"
          onClick={onSkipVote}
          title="Проголосовать за скип"
        >
          <SkipIcon />
          {skipVotes > 0 && (
            <span className="skip-count">{skipVotes}/{skipNeeded}</span>
          )}
          Скип
        </button>
      </div>

      <style>{`
        .player {
          background: var(--bg2);
          border: 1.5px solid var(--border);
          border-radius: var(--r-xl);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .player-empty {
          background: var(--bg2);
          border: 1.5px dashed var(--border);
          border-radius: var(--r-xl);
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--text3);
        }
        .player-empty-icon { font-size: 36px; }
        .player-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .player-thumb {
          width: 60px;
          height: 60px;
          border-radius: var(--r-md);
          background: var(--bg3);
          overflow: hidden;
          flex-shrink: 0;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .player-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .player-thumb-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
        }
        .player-meta { flex: 1; min-width: 0; }
        .player-title {
          font-weight: 700;
          font-size: 16px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .player-artist { color: var(--text2); font-size: 13px; margin-top: 2px; }
        .player-progress-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .player-time { font-size: 12px; color: var(--text3); font-family: 'Space Mono', monospace; min-width: 36px; }
        .player-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }
        .player-main-btn {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, var(--accent), var(--accent2)) !important;
          color: white !important;
          border-color: transparent !important;
          box-shadow: 0 0 20px rgba(124,58,237,0.4);
        }
        .player-main-btn:hover:not(:disabled) {
          transform: scale(1.06);
          box-shadow: 0 0 32px rgba(124,58,237,0.6);
        }
        .skip-btn { position: relative; }
        .skip-count {
          background: var(--warn);
          color: #000;
          border-radius: 100px;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 5px;
        }
      `}</style>
    </div>
  );
}

function PlayIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M6.3 4.3a1 1 0 0 1 1.4 0l6 5.7a1 1 0 0 1 0 1.4l-6 5.7a1 1 0 0 1-1.4-1.4L11.6 10 6.3 5.7a1 1 0 0 1 0-1.4z"/></svg>;
}
function PauseIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="3" width="4" height="14" rx="1.5"/><rect x="11" y="3" width="4" height="14" rx="1.5"/></svg>;
}
function SkipIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3.5a.5.5 0 0 1 .5-.5h.5a.5.5 0 0 1 .5.5v3.8l5.4-4A.5.5 0 0 1 11 3.5v9a.5.5 0 0 1-.8.4L4.8 8.7V12.5a.5.5 0 0 1-.5.5H3.5a.5.5 0 0 1-.5-.5v-9zm10 0a.5.5 0 0 0-1 0v9a.5.5 0 0 0 1 0v-9z"/></svg>;
}
