import React from 'react';
import { useGameState, useGameActions } from '../context/GameContext.jsx';

const buttonStyle = {
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 'bold',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  backgroundColor: '#3498db',
  color: '#fff',
  transition: 'opacity 0.2s',
};

const disabledStyle = {
  ...buttonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
  backgroundColor: '#7f8c8d',
};

/**
 * DrawButton - Draw card button, enabled/disabled based on game state.
 * Uses gameState.canDraw to determine if drawing is allowed.
 */
export default function DrawButton() {
  const state = useGameState();
  const actions = useGameActions();

  const gameState = state.gameState;
  const canDraw = gameState?.canDraw ?? false;

  return (
    <button
      style={canDraw ? buttonStyle : disabledStyle}
      onClick={() => canDraw && actions.drawCard()}
      disabled={!canDraw}
      aria-label="Draw card"
    >
      Draw Card
    </button>
  );
}
