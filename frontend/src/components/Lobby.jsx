import React, { useState } from 'react';
import { createRoom, getRoom } from '../utils/api.js';

export default function Lobby({ onEnter }) {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [tab, setTab] = useState('create'); // create | join
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!nickname.trim()) return setError('Введи никнейм');
    setLoading(true); setError('');
    try {
      const { roomId } = await createRoom(nickname.trim());
      onEnter({ roomId, nickname: nickname.trim(), isHost: true });
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!nickname.trim()) return setError('Введи никнейм');
    if (!roomCode.trim()) return setError('Введи код комнаты');
    setLoading(true); setError('');
    try {
      await getRoom(roomCode.trim());
      onEnter({ roomId: roomCode.trim().toUpperCase(), nickname: nickname.trim(), isHost: false });
    } catch (err) {
      setError('Комната не найдена');
    } finally { setLoading(false); }
  }

  return (
    <div className="lobby-wrap fade-in">
      {/* Hero */}
      <div className="lobby-hero">
        <div className="lobby-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="url(#lg)" opacity="0.15"/>
            <path d="M16 32V18l20-4v14" stroke="url(#lg2)" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="12" cy="32" r="4" fill="url(#lg2)"/>
            <circle cx="32" cy="28" r="4" fill="url(#lg2)"/>
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="48" y2="48">
                <stop stopColor="#7c3aed"/><stop offset="1" stopColor="#e879f9"/>
              </linearGradient>
              <linearGradient id="lg2" x1="0" y1="0" x2="48" y2="48">
                <stop stopColor="#a855f7"/><stop offset="1" stopColor="#e879f9"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className="lobby-title">Party<span>Play</span></h1>
        <p className="lobby-sub">Общий плейлист для вашего мероприятия</p>
      </div>

      <div className="lobby-card card">
        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${tab === 'create' ? 'active' : ''}`}
            onClick={() => { setTab('create'); setError(''); }}
          >
            Создать комнату
          </button>
          <button
            className={`tab ${tab === 'join' ? 'active' : ''}`}
            onClick={() => { setTab('join'); setError(''); }}
          >
            Войти по коду
          </button>
        </div>

        <form onSubmit={tab === 'create' ? handleCreate : handleJoin} className="lobby-form">
          <div className="field">
            <label className="label">Твой никнейм</label>
            <input
              className="input"
              placeholder="Как тебя зовут?"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={24}
              autoFocus
            />
          </div>

          {tab === 'join' && (
            <div className="field">
              <label className="label">Код комнаты</label>
              <input
                className="input mono"
                placeholder="ABCD12"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                maxLength={8}
                style={{ letterSpacing: '0.1em', fontSize: '18px' }}
              />
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
            {loading ? (
              <><span className="spin">⟳</span> Загружаем...</>
            ) : tab === 'create' ? '🎉 Создать вечеринку' : '🚀 Войти в комнату'}
          </button>
        </form>
      </div>

      <style>{`
        .lobby-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px 48px;
          gap: 32px;
          min-height: 100dvh;
          background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 70%);
        }
        .lobby-hero { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .lobby-logo { width: 72px; height: 72px; background: var(--bg3); border-radius: 20px; display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--border); }
        .lobby-title { font-size: 42px; font-weight: 800; letter-spacing: -1px; color: var(--text); }
        .lobby-title span { background: linear-gradient(135deg, var(--accent2), var(--neon)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .lobby-sub { color: var(--text2); font-size: 16px; }
        .lobby-card { width: 100%; max-width: 420px; }
        .tabs { display: flex; gap: 4px; background: var(--bg3); border-radius: var(--r-md); padding: 4px; margin-bottom: 24px; }
        .tab { flex: 1; padding: 10px; border-radius: calc(var(--r-md) - 2px); border: none; background: transparent; color: var(--text2); font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .tab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
        .lobby-form { display: flex; flex-direction: column; gap: 16px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .label { font-size: 13px; font-weight: 600; color: var(--text2); letter-spacing: 0.02em; }
        .form-error { color: var(--error); font-size: 13px; background: rgba(239,68,68,0.08); padding: 8px 12px; border-radius: var(--r-sm); border: 1px solid rgba(239,68,68,0.2); }
      `}</style>
    </div>
  );
}
