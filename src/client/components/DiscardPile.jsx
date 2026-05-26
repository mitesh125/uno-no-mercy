import React from 'react';
import { useGameState } from '../context/GameContext.jsx';

const colorMap = {
  red: '#e74c3c',
  yellow: '#f1c40f',
  green: '#27ae60',
  blue: '#2980b9',
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  card: {
    width: '80px',
    height: '120px',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '14px',
    textAlign: 'center',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
    border: '3px solid #fff',
  },
  cardValue: {
    fontSize: '20px',
    marginBottom: '4px',
  },
  cardType: {
    fontSize: '11px',
    textTransform: 'uppercase',
  },
  activeColorIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#fff',
  },
  colorDot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid #fff',
  },
  label: {
    fontSize: '12px',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
};

function getCardDisplay(card) {
  if (!card) return { text: '?', subtext: '' };
  if (card.type === 'number') {
    return { text: String(card.value), subtext: '' };
  }
  const typeLabels = {
    skip: 'SKIP',
    reverse: 'REV',
    draw2: '+2',
    wild: 'WILD',
    wild_draw4: '+4',
    skip_everyone: 'SKIP ALL',
    draw6: '+6',
    draw10: '+10',
    color_remap: 'REMAP',
  };
  return { text: typeLabels[card.type] || card.type, subtext: '' };
}

function getCardBackgroundColor(card, activeColor) {
  if (!card) return '#555';
  if (card.color) return colorMap[card.color] || '#555';
  // Wild cards: show the active color as background
  return activeColor ? colorMap[activeColor] : '#555';
}

export default function DiscardPile() {
  const { gameState } = useGameState();

  if (!gameState) return null;

  const { topDiscard, activeColor } = gameState;
  const { text } = getCardDisplay(topDiscard);
  const bgColor = getCardBackgroundColor(topDiscard, activeColor);

  return (
    <div style={styles.container}>
      <span style={styles.label}>Discard</span>
      <div style={{ ...styles.card, backgroundColor: bgColor }}>
        <span style={styles.cardValue}>{text}</span>
        {topDiscard && topDiscard.type !== 'number' && (
          <span style={styles.cardType}>{topDiscard.type.replace(/_/g, ' ')}</span>
        )}
      </div>
      <div style={styles.activeColorIndicator}>
        <div style={{ ...styles.colorDot, backgroundColor: colorMap[activeColor] || '#555' }} />
        <span>{activeColor || 'none'}</span>
      </div>
    </div>
  );
}
