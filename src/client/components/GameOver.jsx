import React from 'react';
import { useGameState, useGameActions } from '../context/GameContext.jsx';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const panelStyle = {
  backgroundColor: '#1a1a2e',
  borderRadius: '12px',
  padding: '32px',
  minWidth: '320px',
  maxWidth: '480px',
  textAlign: 'center',
  color: '#fff',
  border: '2px solid #444',
};

const titleStyle = {
  fontSize: '28px',
  fontWeight: 'bold',
  marginBottom: '8px',
  color: '#ffd700',
};

const winnerStyle = {
  fontSize: '20px',
  marginBottom: '24px',
  color: '#44ff44',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '24px',
};

const thStyle = {
  padding: '8px 12px',
  borderBottom: '2px solid #444',
  textAlign: 'left',
  color: '#aaa',
  fontSize: '12px',
  textTransform: 'uppercase',
};

const tdStyle = {
  padding: '8px 12px',
  borderBottom: '1px solid #333',
  fontSize: '14px',
};

const buttonStyle = {
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 'bold',
  backgroundColor: '#4444ff',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

export default function GameOver() {
  const state = useGameState();
  const actions = useGameActions();
  const { gameState } = state;

  if (!gameState || gameState.status !== 'finished') {
    return null;
  }

  const { winner, scores, players } = gameState;

  // Build scores list sorted by score ascending (lower is better)
  const scoreEntries = scores
    ? Object.entries(scores).map(([playerId, score]) => {
        const player = players ? players.find((p) => p.id === playerId) : null;
        return {
          name: player ? player.name : playerId,
          score,
          isWinner: playerId === winner,
        };
      }).sort((a, b) => a.score - b.score)
    : [];

  const winnerName = scoreEntries.find((e) => e.isWinner)?.name || 'Unknown';

  function handleReturnToLobby() {
    actions.resetGame();
  }

  return (
    <div style={overlayStyle} role="dialog" aria-label="Game over">
      <div style={panelStyle}>
        <div style={titleStyle}>Game Over</div>
        <div style={winnerStyle}>🏆 {winnerName} wins!</div>

        {scoreEntries.length > 0 && (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Player</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {scoreEntries.map((entry) => (
                <tr key={entry.name}>
                  <td style={{ ...tdStyle, fontWeight: entry.isWinner ? 'bold' : 'normal' }}>
                    {entry.isWinner ? '🏆 ' : ''}{entry.name}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {entry.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button style={buttonStyle} onClick={handleReturnToLobby}>
          Return to Lobby
        </button>
      </div>
    </div>
  );
}
