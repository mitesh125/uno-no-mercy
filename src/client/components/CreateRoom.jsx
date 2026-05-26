import { useState } from 'react';
import { useGameState, useGameActions } from '../context/GameContext.jsx';

function CreateRoom() {
  const [name, setName] = useState('');
  const state = useGameState();
  const { createRoom } = useGameActions();

  function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    createRoom(trimmed);
  }

  return (
    <div style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '16px' }}>
      <h2>Create a Room</h2>
      <div style={{ marginBottom: '8px' }}>
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
        onClick={handleCreate}
        disabled={name.trim().length < 2}
        style={{ padding: '8px 16px', fontSize: '16px', cursor: 'pointer' }}
      >
        Create Room
      </button>
      {state.roomCode && (
        <p style={{ marginTop: '12px', fontSize: '18px' }}>
          Room Code: <strong>{state.roomCode}</strong>
        </p>
      )}
    </div>
  );
}

export default CreateRoom;
