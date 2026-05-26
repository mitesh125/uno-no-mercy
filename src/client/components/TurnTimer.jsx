import React from 'react';
import { useGameState } from '../context/GameContext.jsx';

const timerContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  backgroundColor: '#1a1a2e',
  borderRadius: '8px',
  border: '1px solid #333',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: '14px',
};

const timerValueStyle = {
  fontSize: '20px',
  fontWeight: 'bold',
  minWidth: '40px',
  textAlign: 'center',
};

const playerNameStyle = {
  fontSize: '14px',
  color: '#aaa',
};

function getTimerColor(remaining) {
  if (remaining <= 5) return '#ff4444';
  if (remaining <= 10) return '#ffaa00';
  return '#44ff44';
}

export default function TurnTimer() {
  const state = useGameState();
  const { turnTimer, gameState } = state;

  if (!turnTimer || !gameState || gameState.status !== 'in_progress') {
    return null;
  }

  const remainingSeconds = Math.ceil(turnTimer.remaining);
  const timerColor = getTimerColor(remainingSeconds);

  // Find the player whose turn it is
  const currentPlayer = gameState.players
    ? gameState.players.find((p) => p.id === turnTimer.playerId)
    : null;

  const playerName = currentPlayer ? currentPlayer.name : 'Unknown';

  return (
    <div style={timerContainerStyle} aria-live="polite" aria-label="Turn timer">
      <span style={playerNameStyle}>{playerName}&apos;s turn</span>
      <span style={{ ...timerValueStyle, color: timerColor }}>
        {remainingSeconds}s
      </span>
    </div>
  );
}
