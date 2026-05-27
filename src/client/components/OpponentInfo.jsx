import React from 'react';
import { useGameState } from '../context/GameContext.jsx';

const styles = {
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '12px',
    padding: '12px',
  },
  playerCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255,255,255,0.2)',
    minWidth: '80px',
  },
  playerCardCurrent: {
    border: '2px solid #f1c40f',
    backgroundColor: 'rgba(241, 196, 15, 0.15)',
  },
  playerCardDisconnected: {
    opacity: 0.5,
  },
  playerName: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '4px',
    maxWidth: '100px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardCount: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
  },
  cardCountLabel: {
    fontSize: '10px',
    color: '#aaa',
    textTransform: 'uppercase',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
  },
  disconnectedBadge: {
    fontSize: '10px',
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  unoBadge: {
    fontSize: '10px',
    color: '#f1c40f',
    fontWeight: 'bold',
    backgroundColor: 'rgba(241, 196, 15, 0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
};

export default function OpponentInfo() {
  const { gameState, playerId } = useGameState();

  if (!gameState) return null;

  const { players, currentPlayerId } = gameState;

  // Filter out the current player (show only opponents)
  const opponents = (players || []).filter((p) => p.id !== playerId);

  if (opponents.length === 0) return null;

  return (
    <div style={styles.container}>
      {opponents.map((player) => {
        const isCurrent = player.id === currentPlayerId;
        const isDisconnected = player.isConnected === false;
        const hasUno = player.cardCount === 1;

        const cardStyle = {
          ...styles.playerCard,
          ...(isCurrent ? styles.playerCardCurrent : {}),
          ...(isDisconnected ? styles.playerCardDisconnected : {}),
        };

        return (
          <div key={player.id} style={cardStyle}>
            <span style={styles.playerName}>{player.name}</span>
            <span style={styles.cardCount}>{player.cardCount}</span>
            <span style={styles.cardCountLabel}>cards</span>
            <div style={styles.statusRow}>
              {isDisconnected && (
                <span style={styles.disconnectedBadge}>OFFLINE</span>
              )}
              {hasUno && (
                <span style={styles.unoBadge}>UNO!</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
