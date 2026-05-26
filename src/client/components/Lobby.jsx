import { useGameState, useGameActions } from '../context/GameContext.jsx';

function Lobby() {
  const state = useGameState();
  const { startGame } = useGameActions();

  const isHost = state.players.some(
    (p) => p.id === state.playerId && p.isHost
  );
  const canStart = state.players.length >= 2;

  return (
    <div style={{ padding: '16px' }}>
      <h2>Game Lobby</h2>

      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: '#666' }}>Room Code:</p>
        <p style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '4px' }}>
          {state.roomCode}
        </p>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h3>Players ({state.players.length})</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {state.players.map((player) => (
            <li
              key={player.id}
              style={{
                padding: '8px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{player.name}</span>
              {player.isHost && (
                <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold' }}>
                  (Host)
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isHost && (
        <button
          onClick={startGame}
          disabled={!canStart}
          style={{
            padding: '12px 24px',
            fontSize: '18px',
            cursor: canStart ? 'pointer' : 'not-allowed',
            backgroundColor: canStart ? '#22c55e' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
          }}
        >
          Start Game
        </button>
      )}

      {isHost && !canStart && (
        <p style={{ color: '#666', marginTop: '8px', fontSize: '14px' }}>
          Waiting for at least 2 players to start...
        </p>
      )}
    </div>
  );
}

export default Lobby;
