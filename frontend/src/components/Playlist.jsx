import React, { useState } from 'react';
import { resolveTrack, sourceLabel, sourceClass, formatTime } from '../utils/api.js';

export default function Playlist({ tracks, currentIndex, onAdd, nickname }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  async function handleResolve(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true); setError(''); setPreview(null);
    try {
      const meta = await resolveTrack(url.trim());
      setPreview(meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    if (!preview) return;
    onAdd({ ...preview, url: url.trim() });
    setUrl('');
    setPreview(null);
    setError('');
  }

  return (
    <div className="playlist">
      {/* Add track form */}
      <div className="add-track card">
        <p className="section-label">Добавить трек</p>
        <form onSubmit={handleResolve} className="add-form">
          <input
            className="input"
            placeholder="Вставь ссылку с YouTube, VK, Яндекс.Музыки, SoundCloud..."
            value={url}
            onChange={e => { setUrl(e.target.value); setPreview(null); setError(''); }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !url.trim()}>
            {loading ? <span className="spin">⟳</span> : <SearchIcon />}
            {loading ? 'Ищу...' : 'Найти'}
          </button>
        </form>

        {error && <p className="add-error">{error}</p>}

        {preview && (
          <div className="preview fade-in">
            <div className="preview-thumb">
              {preview.thumbnail
                ? <img src={preview.thumbnail} alt="" />
                : <span>🎵</span>}
            </div>
            <div className="preview-meta">
              <p className="preview-title">{preview.title}</p>
              <p className="preview-sub">
                <span className={`source-tag ${sourceClass(preview.source)}`}>
                  {sourceLabel(preview.source)}
                </span>
                {preview.duration > 0 && <span className="preview-dur">{formatTime(preview.duration)}</span>}
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>
              <PlusIcon /> Добавить
            </button>
          </div>
        )}
      </div>

      {/* Track list */}
      <div className="track-list">
        <p className="section-label" style={{ padding: '0 4px' }}>
          Плейлист
          <span className="badge badge-purple" style={{ marginLeft: 8 }}>{tracks.length}</span>
        </p>

        {tracks.length === 0 ? (
          <div className="playlist-empty">
            <span style={{ fontSize: 32 }}>🎶</span>
            <p>Пока пусто — добавь первый трек!</p>
          </div>
        ) : (
          <div className="tracks">
            {tracks.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                isCurrent={i === currentIndex}
                isNext={i === currentIndex + 1}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .playlist { display: flex; flex-direction: column; gap: 16px; }
        .section-label { font-size: 12px; font-weight: 700; color: var(--text2); letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; }
        .add-track { padding: 16px 20px; }
        .add-form { display: flex; gap: 10px; }
        .add-form .input { flex: 1; }
        .add-error { color: var(--error); font-size: 13px; margin-top: 10px; background: rgba(239,68,68,0.07); padding: 8px 12px; border-radius: var(--r-sm); }
        .preview {
          display: flex; align-items: center; gap: 12px;
          margin-top: 14px; padding: 12px; border-radius: var(--r-md);
          background: var(--bg3); border: 1px solid var(--border);
        }
        .preview-thumb { width: 44px; height: 44px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: var(--surface); display: flex; align-items: center; justify-content: center; }
        .preview-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .preview-meta { flex: 1; min-width: 0; }
        .preview-title { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .preview-sub { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .source-tag { font-size: 11px; font-weight: 700; }
        .preview-dur { font-size: 12px; color: var(--text3); font-family: 'Space Mono', monospace; }
        .track-list { display: flex; flex-direction: column; }
        .playlist-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px; color: var(--text3); background: var(--bg2); border: 1.5px dashed var(--border); border-radius: var(--r-lg); }
        .tracks { display: flex; flex-direction: column; gap: 4px; }
      `}</style>
    </div>
  );
}

function TrackRow({ track, index, isCurrent, isNext }) {
  return (
    <div className={`track-row ${isCurrent ? 'track-current' : ''} ${isNext ? 'track-next' : ''}`}>
      <div className="track-num">
        {isCurrent ? (
          <div className="eq-bars" style={{ height: 14 }}>
            <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
          </div>
        ) : (
          <span>{index + 1}</span>
        )}
      </div>
      <div className="track-thumb">
        {track.thumbnail
          ? <img src={track.thumbnail} alt="" />
          : <span>🎵</span>}
      </div>
      <div className="track-meta">
        <p className="track-title">{track.title}</p>
        <p className="track-sub">
          <span className={`source-dot ${sourceClass(track.source)}`}>●</span>
          {track.artist || ''}
          {track.addedBy && <span className="track-by"> · {track.addedBy}</span>}
        </p>
      </div>
      <div className="track-right">
        {track.status === 'downloading' && <span className="badge badge-warn" style={{fontSize:10}}>↓</span>}
        {track.status === 'error' && <span className="badge badge-red" style={{fontSize:10}}>!</span>}
        {track.duration > 0 && <span className="track-dur">{formatTime(track.duration)}</span>}
      </div>

      <style>{`
        .track-row {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: var(--r-md);
          transition: background 0.15s;
          cursor: default;
        }
        .track-row:hover { background: var(--bg3); }
        .track-current { background: rgba(124,58,237,0.12) !important; border: 1px solid rgba(124,58,237,0.25); }
        .track-next { opacity: 0.75; }
        .track-num { width: 22px; text-align: center; font-size: 12px; color: var(--text3); flex-shrink: 0; }
        .track-thumb { width: 36px; height: 36px; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: var(--surface); display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .track-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .track-meta { flex: 1; min-width: 0; }
        .track-title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .track-sub { font-size: 12px; color: var(--text3); margin-top: 2px; display: flex; align-items: center; gap: 4px; }
        .track-by { color: var(--text3); }
        .source-dot { font-size: 8px; }
        .track-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .track-dur { font-size: 12px; color: var(--text3); font-family: 'Space Mono', monospace; }
      `}</style>
    </div>
  );
}

function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.868-3.834zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>;
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 1a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2H8v4a1 1 0 1 1-2 0V8H2a1 1 0 1 1 0-2h4V2a1 1 0 0 1 1-1z"/></svg>;
}
