import React from 'react';
import { useGameState, useGameActions } from '../context/GameContext.jsx';

const buttonStyle = {
  padding: '14px 28px',
  fontSize: '18px',
  fontWeight: 'bold',
  borderRadius: '50px',
  border: '3px solid #fff',
  cursor: 'pointer',
  backgroundColor: '#e74c3c',
  color: '#fff',
  textTransform: 'uppercase',
  letterSpacing: '2px',
  boxShadow: '0 4px 12px rgba(231, 76, 60, 0.4)',
  transition: 'transform 0.15s',
};

/**
 * UnoButton - UNO call button, visible when player can call UNO.
 * Visible when gameState.canCallUno is true.
 */
export default function UnoButton() {
  const state = useGameState();
  const actions = useGameActions();

  const gameState = state.gameState;
  const canCallUno = gameState?.canCallUno ?? false;

  if (!canCallUno) {
    return null;
  }

  return (
    <button
      style={buttonStyle}
      onClick={() => actions.callUno()}
      aria-label="Call UNO"
    >
      UNO!
    </button>
  );
}
