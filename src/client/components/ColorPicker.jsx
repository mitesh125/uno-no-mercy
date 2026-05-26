import React from 'react';

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
  minWidth: '280px',
};

const titleStyle = {
  color: '#fff',
  fontSize: '18px',
  marginBottom: '16px',
  fontWeight: 'bold',
};

const buttonContainerStyle = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'center',
  flexWrap: 'wrap',
};

const colorButtonStyle = {
  width: '60px',
  height: '60px',
  border: '3px solid #fff',
  borderRadius: '50%',
  cursor: 'pointer',
  transition: 'transform 0.15s',
};

/**
 * ColorPicker - Modal overlay with 4 color buttons for wild card selection.
 * Props:
 *   - onColorSelected(color): callback when a color is chosen
 *   - onCancel(): callback when the user cancels
 */
export default function ColorPicker({ onColorSelected, onCancel }) {
  return (
    <div style={overlayStyle} role="dialog" aria-label="Choose a color">
      <div style={modalStyle}>
        <div style={titleStyle}>Choose a Color</div>
        <div style={buttonContainerStyle}>
          {colors.map((color) => (
            <button
              key={color}
              style={{ ...colorButtonStyle, ...colorStyles[color] }}
              onClick={() => onColorSelected(color)}
              aria-label={color}
              title={color}
            />
          ))}
        </div>
        <button
          onClick={onCancel}
          style={{ marginTop: '16px', padding: '8px 20px', fontSize: '14px', borderRadius: '6px', border: '1px solid #666', backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
