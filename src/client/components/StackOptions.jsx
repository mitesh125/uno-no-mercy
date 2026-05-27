import React from 'react';
import { useGameState, useGameActions } from '../context/GameContext.jsx';

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  padding: '16px',
  backgroundColor: '#2c3e50',
  borderRadius: '10px',
  border: '2px solid #e74c3c',
};

const titleStyle = {
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  textTransform: 'uppercase',
};

const totalStyle = {
  color: '#e74c3c',
  fontSize: '24px',
  fontWeight: 'bold',
};

const buttonRowStyle = {
  display: 'flex',
  gap: '12px',
};

const stackButtonStyle = {
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 'bold',
  borderRadius: '8px',
  border: '2px solid #f39c12',
  cursor: 'pointer',
  backgroundColor: '#f39c12',
  color: '#fff',
};

const acceptButtonStyle = {
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 'bold',
  borderRadius: '8px',
  border: '2px solid #e74c3c',
  cursor: 'pointer',
  backgroundColor: '#e74c3c',
  color: '#fff',
};

/**
 * StackOptions - Shows stack or accept options during a stack chain.
 * Visible when the current player is the pending player in a stack chain.
 * Displays cumulative draw total and options to stack or accept.
 */
export default function StackOptions() {
  const state = useGameState();
  const actions = useGameActions();

  const gameState = state.gameState;
  const stackChain = gameState?.stackChain;
  const cumulativeTotal = stackChain?.cumulativeDrawCount ?? 0;
  const canStack = gameState?.canStack ?? false;

  // Show whenever there's a stack chain targeting the current player
  const isPendingPlayer = stackChain && stackChain.pendingPlayerId === state.playerId;

  if (!isPendingPlayer) {
    return null;
  }

  return (
    <div style={containerStyle} role="group" aria-label="Stack options">
      <div style={titleStyle}>Stack Chain Active</div>
      <div style={totalStyle}>Draw Total: {cumulativeTotal}</div>
      <div style={buttonRowStyle}>
        {canStack && (
          <div style={{ color: '#f39c12', fontSize: '13px', fontWeight: 'bold' }}>
            ↑ Click a highlighted card to stack
          </div>
        )}
        <button
          style={acceptButtonStyle}
          onClick={() => actions.acceptDraw()}
          aria-label={`Accept draw of ${cumulativeTotal} cards`}
        >
          Accept Draw ({cumulativeTotal})
        </button>
      </div>
    </div>
  );
}
