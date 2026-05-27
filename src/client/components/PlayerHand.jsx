import React, { useState } from 'react';
import { useGameState, useGameActions } from '../context/GameContext.jsx';
import ColorPicker from './ColorPicker.jsx';

const colorMap = {
  red: '#e74c3c',
  yellow: '#f1c40f',
  green: '#27ae60',
  blue: '#2980b9',
};

// Card types that require a color choice
const NEEDS_COLOR = ['wild', 'wild_draw4', 'skip_everyone', 'draw6', 'draw10', 'color_remap'];

const styles = {
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '6px',
    padding: '16px',
  },
  card: {
    width: '75px',
    height: '112px',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '13px',
    textAlign: 'center',
    cursor: 'pointer',
    border: '3px solid rgba(255,255,255,0.4)',
    userSelect: 'none',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  cardPlayable: {
    border: '3px solid #ffd700',
    cursor: 'pointer',
  },
  cardNotPlayable: {
    opacity: 0.55,
    cursor: 'default',
    filter: 'saturate(0.7)',
  },
  cardValue: {
    fontSize: '26px',
    fontWeight: '900',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    zIndex: 2,
  },
  cardType: {
    fontSize: '9px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.9,
    zIndex: 2,
  },
  cardOval: {
    position: 'absolute',
    width: '55px',
    height: '85px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: 'rotate(-20deg)',
    border: '2px solid rgba(255,255,255,0.2)',
  },
};

function getCardDisplay(card) {
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
  return { text: typeLabels[card.type] || card.type, subtext: card.type.replace(/_/g, ' ') };
}

function getCardBackgroundColor(card) {
  if (card.color) return colorMap[card.color] || '#555';
  return '#555';
}

export default function PlayerHand() {
  const state = useGameState();
  const { gameState, playerId } = state;
  const actions = useGameActions();
  const [pendingCardId, setPendingCardId] = useState(null);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [swapCardId, setSwapCardId] = useState(null);

  if (!gameState) return null;

  const { myHand, canPlay } = gameState;
  const playableSet = new Set(canPlay || []);

  function handleCardClick(card) {
    if (!playableSet.has(card.id)) return;

    // During a stack chain, use stackCard instead of playCard
    if (gameState.stackChain) {
      actions.stackCard(card.id);
      return;
    }

    // 7-card: show target player picker for swap
    if (card.type === 'number' && card.value === 7) {
      setSwapCardId(card.id);
      setShowSwapPicker(true);
      return;
    }

    // If the card needs a color choice, show the color picker
    if (NEEDS_COLOR.includes(card.type)) {
      setPendingCardId(card.id);
      return;
    }

    // Otherwise play directly
    actions.playCard(card.id);
  }

  function handleColorSelected(color) {
    if (pendingCardId) {
      actions.playCard(pendingCardId, color);
      setPendingCardId(null);
    }
  }

  function handleSwapTargetSelected(targetId) {
    if (swapCardId) {
      // Pass targetId as the "chosenColor" param (overloaded for 7-swap)
      actions.playCard(swapCardId, targetId);
      setSwapCardId(null);
      setShowSwapPicker(false);
    }
  }

  // Check if it's my turn or I'm the pending player in a stack chain
  const isMyTurn = gameState.currentPlayerId === playerId;
  const isPendingStack = gameState.stackChain && gameState.stackChain.pendingPlayerId === playerId;
  const canAct = isMyTurn || isPendingStack;

  // Get other players for the swap picker
  const otherPlayers = (gameState.players || []).filter(p => p.id !== playerId);

  return (
    <>
      <div style={{ ...styles.container, ...(canAct ? {} : { opacity: 0.5, filter: 'grayscale(0.4)' }) }}>
        {(myHand || []).map((card) => {
          const isPlayable = canAct && playableSet.has(card.id);
          const { text, subtext } = getCardDisplay(card);
          const bgColor = getCardBackgroundColor(card);

          const cardStyle = {
            ...styles.card,
            backgroundColor: bgColor,
            ...(isPlayable ? styles.cardPlayable : styles.cardNotPlayable),
          };

          return (
            <div
              key={card.id}
              className={`game-card card-enter ${isPlayable ? 'playable card-playable' : ''}`}
              style={cardStyle}
              onClick={() => handleCardClick(card)}
            >
              <div style={styles.cardOval} />
              <span style={styles.cardValue}>{text}</span>
              {card.type !== 'number' && (
                <span style={styles.cardType}>{subtext}</span>
              )}
            </div>
          );
        })}
      </div>
      {pendingCardId && <ColorPicker onColorSelected={handleColorSelected} onCancel={() => setPendingCardId(null)} />}
      {showSwapPicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1a1a2e', borderRadius: '12px', padding: '24px', textAlign: 'center', minWidth: '280px' }}>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Pick a player to swap hands with</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {otherPlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSwapTargetSelected(p.id)}
                  style={{ padding: '12px 20px', fontSize: '16px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: '#3498db', color: '#fff', fontWeight: 'bold' }}
                >
                  {p.name} ({p.cardCount} cards)
                </button>
              ))}
            </div>
            <button onClick={() => { setShowSwapPicker(false); setSwapCardId(null); }} style={{ marginTop: '16px', padding: '8px 16px', fontSize: '14px', borderRadius: '6px', border: '1px solid #666', backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
