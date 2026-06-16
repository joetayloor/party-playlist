import React, { useState } from 'react';
import Lobby from './components/Lobby.jsx';
import Room from './components/Room.jsx';

export default function App() {
  const [session, setSession] = useState(null); // { roomId, nickname, isHost }

  if (!session) {
    return <Lobby onEnter={setSession} />;
  }

  return (
    <Room
      roomId={session.roomId}
      nickname={session.nickname}
      isHost={session.isHost}
      onLeave={() => setSession(null)}
    />
  );
}
