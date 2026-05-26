import { useState } from 'react';
import { useGameState, useGameActions } from '../context/GameContext.jsx';

function JoinRoom() {
  const [roomCode, setRoomCode] = useState('');
  const [name, setName] = useState('');
  const state = useGameState();
  const { joinRoom } = useGameActions();

  function handleJoin() {
    const trimmedName = name.trim();
    const trimmedCode = roomCode.trim().toUpperCase();
    if (trimmedName.length < 2 || trimmedCode.length !== 6) return;
    joinRoom(trimmedCode, trimmedName);
  }

  return (
    <div style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Join a Room</h2>
      <div style={{ marginBottom: '8px' }}>
        <input
          type="text"
          placeholder="Room code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength={6}
          style={{ padding: '8px', fontSize: '16px', width: '120px', marginRight: '8px' }}
        />
        <input
          type="text"
          placeholder="Your display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          style={{ padding: '8px', fontSize: '16px', width: '200px' }}
        />
      </div>
      <button
        onClick={handleJoin}
        disabled={name.trim().length < 2 || roomCode.trim().length !== 6}
        style={{ padding: '8px 16px', fontSize: '16px', cursor: 'pointer' }}
      >
        Join Room
      </button>
      {state.error && (
        <p style={{ color: 'red', marginTop: '8px' }}>{state.error}</p>
      )}
    </div>
  );
}

export default JoinRoom;
