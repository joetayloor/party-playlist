import React, { useState } from 'react';

export default function Members({ members, host, roomId, nickname }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(roomId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="members-panel card">
      {/* Room code */}
      <div className="room-code-block">
        <p className="section-label">Код комнаты</p>
        <button className="room-code mono" onClick={copyCode} title="Скопировать код">
          {roomId}
          <span className="copy-hint">{copied ? '✓' : '⎘'}</span>
        </button>
        <p className="code-hint">Поделись кодом с друзьями</p>
      </div>

      <hr className="glow-line" style={{ margin: '16px 0' }} />

      {/* Members */}
      <p className="section-label">
        Участники
        <span className="badge badge-purple" style={{ marginLeft: 8 }}>{members.length}</span>
      </p>
      <div className="member-list">
        {members.map(m => (
          <div key={m} className={`member-row ${m === nickname ? 'member-me' : ''}`}>
            <div className="member-avatar">
              {m[0]?.toUpperCase()}
            </div>
            <span className="member-name">{m}</span>
            <div className="member-tags">
              {m === host && <span className="badge badge-purple" style={{ fontSize: 10 }}>DJ</span>}
              {m === nickname && <span className="badge badge-green" style={{ fontSize: 10 }}>Ты</span>}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .members-panel {}
        .section-label { font-size: 12px; font-weight: 700; color: var(--text2); letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; }
        .room-code-block { display: flex; flex-direction: column; gap: 6px; }
        .room-code {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--bg3); border: 1.5px solid var(--border);
          border-radius: var(--r-md); padding: 12px 16px;
          font-size: 22px; font-weight: 700; letter-spacing: 0.12em;
          color: var(--text); cursor: pointer; transition: all 0.15s;
          font-family: 'Space Mono', monospace;
        }
        .room-code:hover { border-color: var(--accent); background: rgba(124,58,237,0.08); }
        .copy-hint { font-size: 16px; color: var(--text3); }
        .code-hint { font-size: 12px; color: var(--text3); }
        .member-list { display: flex; flex-direction: column; gap: 4px; }
        .member-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: var(--r-md);
          transition: background 0.12s;
        }
        .member-row:hover { background: var(--bg3); }
        .member-me { background: rgba(124,58,237,0.07); }
        .member-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), var(--neon));
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; flex-shrink: 0;
          color: white;
        }
        .member-name { flex: 1; font-size: 14px; font-weight: 500; }
        .member-tags { display: flex; gap: 4px; }
      `}</style>
    </div>
  );
}
