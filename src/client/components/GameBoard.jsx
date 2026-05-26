import React from 'react';
import { useGameState, useGameActions } from '../context/GameContext.jsx';
import DiscardPile from './DiscardPile.jsx';
import PlayerHand from './PlayerHand.jsx';
import OpponentInfo from './OpponentInfo.jsx';

const styles = {
  board: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#1a1a2e',
    fontFamily: 'Arial, sans-serif',
  },
  topSection: {
    flex: '0 0 auto',
    padding: '12px',
  },
  centerSection: {
    flex: '1 1 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '40px',
  },
  bottomSection: {
    flex: '0 0 auto',
    padding: '12px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  drawPile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  drawPileCard: {
    width: '80px',
    height: '120px',
    borderRadius: '10px',
    backgroundColor: '#2c3e50',
    border: '3px solid #34495e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ecf0f1',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
  },
  drawPileCount: {
    fontSize: '12px',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  directionIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#fff',
    padding: '8px',
  },
  currentPlayerBanner: {
    textAlign: 'center',
    padding: '6px 12px',
    fontSize: '13px',
    color: '#f1c40f',
    fontWeight: 'bold',
  },
};

export default function GameBoard() {
  const { gameState, playerId } = useGameState();
  const actions = useGameActions();

  if (!gameState) {
    return (
      <div style={styles.board}>
        <div style={{ color: '#fff', textAlign: 'center', marginTop: '40px' }}>
          Waiting for game state...
        </div>
      </div>
    );
  }

  const { drawPileCount, direction, currentPlayerId } = gameState;
  const isMyTurn = currentPlayerId === playerId;
  const directionSymbol = direction === 1 ? '↻' : '↺';
  const directionLabel = direction === 1 ? 'Clockwise' : 'Counter-clockwise';

  // Find current player name
  const currentPlayerName = gameState.players
    ? gameState.players.find((p) => p.id === currentPlayerId)?.name || 'Unknown'
    : 'Unknown';

  function handleDrawClick() {
    // During a stack chain targeting me, clicking draw pile accepts the penalty
    if (gameState.stackChain && gameState.stackChain.pendingPlayerId === playerId) {
      actions.acceptDraw();
      return;
    }
    if (isMyTurn && gameState.canDraw) {
      actions.drawCard();
    }
  }

  // Determine if draw pile should be highlighted
  const drawPileActive = (isMyTurn && gameState.canDraw) || 
    (gameState.stackChain && gameState.stackChain.pendingPlayerId === playerId);
  const drawPileLabel = gameState.stackChain && gameState.stackChain.pendingPlayerId === playerId
    ? `Accept +${gameState.stackChain.cumulativeDrawCount}`
    : 'Draw Pile';

  return (
    <div style={styles.board}>
      {/* Room code in top-left */}
      <div style={{ position: 'absolute', top: '10px', left: '12px', fontSize: '12px', color: '#888', letterSpacing: '1px' }}>
        Room: <span style={{ color: '#fff', fontWeight: 'bold' }}>{gameState.roomCode}</span>
      </div>

      {/* Top: Opponents */}
      <div style={styles.topSection}>
        <OpponentInfo />
      </div>

      {/* Center: Discard pile, Draw pile, Direction */}
      <div style={styles.centerSection}>
        <DiscardPile />

        <div style={{ ...styles.drawPile, ...(drawPileActive ? { cursor: 'pointer' } : { cursor: 'default' }) }} onClick={handleDrawClick}>
          <span style={styles.drawPileCount}>{drawPileLabel}</span>
          <div style={{ ...styles.drawPileCard, ...(drawPileActive ? { border: '3px solid #ffd700', boxShadow: '0 0 12px rgba(255,215,0,0.5)' } : {}) }}>
            <span>{drawPileCount}</span>
          </div>
        </div>

        <div style={styles.directionIndicator}>
          {directionSymbol}
        </div>
      </div>

      {/* Current player indicator */}
      <div style={styles.currentPlayerBanner}>
        {isMyTurn ? "Your turn!" : `${currentPlayerName}'s turn`}
      </div>

      {/* Bottom: Player's hand */}
      <div style={styles.bottomSection}>
        <PlayerHand />
      </div>
    </div>
  );
}
