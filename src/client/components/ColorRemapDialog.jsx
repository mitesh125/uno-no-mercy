import React, { useState } from 'react';
import { useGameState, useGameActions } from '../context/GameContext.jsx';

const colors = ['red', 'yellow', 'green', 'blue'];

const colorStyles = {
  red: { backgroundColor: '#e74c3c' },
  yellow: { backgroundColor: '#f1c40f' },
  green: { backgroundColor: '#27ae60' },
  blue: { backgroundColor: '#2980b9' },
};

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle = {
  backgroundColor: '#1a1a2e',
  borderRadius: '12px',
  padding: '24px',
  textAlign: 'center',
  minWidth: '320px',
};

const titleStyle = {
  color: '#fff',
  fontSize: '18px',
  marginBottom: '16px',
  fontWeight: 'bold',
};

const sectionStyle = {
  marginBottom: '20px',
};

const labelStyle = {
  color: '#ccc',
  fontSize: '14px',
  marginBottom: '8px',
  display: 'block',
};

const colorButtonContainerStyle = {
  display: 'flex',
  gap: '10px',
  justifyContent: 'center',
};

const colorButtonStyle = {
  width: '50px',
  height: '50px',
  border: '3px solid transparent',
  borderRadius: '50%',
  cursor: 'pointer',
  transition: 'transform 0.15s',
};

const selectedColorButtonStyle = {
  ...colorButtonStyle,
  border: '3px solid #fff',
  transform: 'scale(1.1)',
};

const selectStyle = {
  padding: '8px 16px',
  fontSize: '14px',
  borderRadius: '6px',
  border: '1px solid #555',
  backgroundColor: '#2c3e50',
  color: '#fff',
  width: '100%',
  cursor: 'pointer',
};

const confirmButtonStyle = {
  padding: '12px 32px',
  fontSize: '16px',
  fontWeight: 'bold',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  backgroundColor: '#9b59b6',
  color: '#fff',
  marginTop: '12px',
};

const disabledConfirmStyle = {
  ...confirmButtonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
  backgroundColor: '#7f8c8d',
};

/**
 * ColorRemapDialog - Color selection + target player selection for Color Remap card.
 * Shows 4 color buttons and a target player dropdown.
 * On confirm, calls actions.colorRemap(color, targetPlayerId).
 */
export default function ColorRemapDialog() {
  const state = useGameState();
  const actions = useGameActions();

  const [selectedColor, setSelectedColor] = useState(null);
  const [targetPlayerId, setTargetPlayerId] = useState('');

  const gameState = state.gameState;
  const players = gameState?.players ?? [];
  const myId = state.playerId;

  // Filter out the current player from target options
  const otherPlayers = players.filter((p) => p.id !== myId);

  const canConfirm = selectedColor !== null && targetPlayerId !== '';

  function handleConfirm() {
    if (canConfirm) {
      actions.colorRemap(selectedColor, targetPlayerId);
    }
  }

  return (
    <div style={overlayStyle} role="dialog" aria-label="Color Remap">
      <div style={modalStyle}>
        <div style={titleStyle}>Color Remap</div>

        <div style={sectionStyle}>
          <span style={labelStyle}>Select a color to swap:</span>
          <div style={colorButtonContainerStyle}>
            {colors.map((color) => (
              <button
                key={color}
                style={{
                  ...(selectedColor === color
                    ? selectedColorButtonStyle
                    : colorButtonStyle),
                  ...colorStyles[color],
                }}
                onClick={() => setSelectedColor(color)}
                aria-label={color}
                aria-pressed={selectedColor === color}
                title={color}
              />
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle} htmlFor="target-player-select">
            Select target player:
          </label>
          <select
            id="target-player-select"
            style={selectStyle}
            value={targetPlayerId}
            onChange={(e) => setTargetPlayerId(e.target.value)}
          >
            <option value="">-- Choose a player --</option>
            {otherPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </div>

        <button
          style={canConfirm ? confirmButtonStyle : disabledConfirmStyle}
          onClick={handleConfirm}
          disabled={!canConfirm}
          aria-label="Confirm color remap"
        >
          Confirm Remap
        </button>
      </div>
    </div>
  );
}
