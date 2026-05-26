import { describe, it, expect } from 'vitest';
import {
  getNextPlayer,
  skipPlayer,
  skipAllExceptCurrent,
  reverseDirection,
  getCurrentPlayer,
  advanceTurn,
} from '@server/turnManager.js';

/**
 * Helper to create a minimal game state for testing.
 */
function makeState({ playerCount = 4, currentPlayerIndex = 0, direction = 1, disconnected = [] } = {}) {
  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i}`,
    hand: [],
    isConnected: !disconnected.includes(i),
    isHost: i === 0,
    hasCalledUno: false,
    disconnectedAt: disconnected.includes(i) ? Date.now() : null,
  }));

  return {
    roomCode: 'TEST01',
    status: 'in_progress',
    players,
    currentPlayerIndex,
    direction,
    drawPile: [],
    discardPile: [],
    activeColor: 'red',
    stackChain: null,
    turnTimer: null,
    winner: null,
    scores: null,
  };
}

describe('TurnManager', () => {
  describe('getNextPlayer', () => {
    it('should advance clockwise (direction = 1)', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 0, direction: 1 });
      expect(getNextPlayer(state)).toBe(1);
    });

    it('should advance counter-clockwise (direction = -1)', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 2, direction: -1 });
      expect(getNextPlayer(state)).toBe(1);
    });

    it('should wrap around clockwise', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 3, direction: 1 });
      expect(getNextPlayer(state)).toBe(0);
    });

    it('should wrap around counter-clockwise', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 0, direction: -1 });
      expect(getNextPlayer(state)).toBe(3);
    });

    it('should skip disconnected players', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 0, direction: 1, disconnected: [1] });
      expect(getNextPlayer(state)).toBe(2);
    });

    it('should skip multiple consecutive disconnected players', () => {
      const state = makeState({ playerCount: 5, currentPlayerIndex: 0, direction: 1, disconnected: [1, 2] });
      expect(getNextPlayer(state)).toBe(3);
    });
  });

  describe('skipPlayer', () => {
    it('should skip one player clockwise', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 0, direction: 1 });
      const result = skipPlayer(state);
      expect(result.currentPlayerIndex).toBe(2);
    });

    it('should skip one player counter-clockwise', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 2, direction: -1 });
      const result = skipPlayer(state);
      expect(result.currentPlayerIndex).toBe(0);
    });

    it('should wrap around when skipping', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 3, direction: 1 });
      const result = skipPlayer(state);
      expect(result.currentPlayerIndex).toBe(1);
    });

    it('should not mutate the original state', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 0, direction: 1 });
      const result = skipPlayer(state);
      expect(state.currentPlayerIndex).toBe(0);
      expect(result.currentPlayerIndex).toBe(2);
    });
  });

  describe('skipAllExceptCurrent', () => {
    it('should keep the current player index unchanged', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 2 });
      const result = skipAllExceptCurrent(state);
      expect(result.currentPlayerIndex).toBe(2);
    });

    it('should return a new state object (not mutate)', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 1 });
      const result = skipAllExceptCurrent(state);
      expect(result).not.toBe(state);
      expect(result.currentPlayerIndex).toBe(1);
    });
  });

  describe('reverseDirection', () => {
    it('should flip direction from 1 to -1 for 3+ players', () => {
      const state = makeState({ playerCount: 4, direction: 1 });
      const result = reverseDirection(state);
      expect(result.direction).toBe(-1);
    });

    it('should flip direction from -1 to 1 for 3+ players', () => {
      const state = makeState({ playerCount: 4, direction: -1 });
      const result = reverseDirection(state);
      expect(result.direction).toBe(1);
    });

    it('should act as skip in 2-player game (flips direction)', () => {
      const state = makeState({ playerCount: 2, currentPlayerIndex: 0, direction: 1 });
      const result = reverseDirection(state);
      // Direction still flips
      expect(result.direction).toBe(-1);
      // Current player index stays the same (acts as skip — current player keeps turn)
      expect(result.currentPlayerIndex).toBe(0);
    });

    it('should treat game as 2-player when only 2 are connected', () => {
      // 4 players but 2 disconnected — effectively a 2-player game
      const state = makeState({ playerCount: 4, currentPlayerIndex: 0, direction: 1, disconnected: [1, 3] });
      const result = reverseDirection(state);
      expect(result.direction).toBe(-1);
      // Current player keeps their turn (2-player reverse = skip)
      expect(result.currentPlayerIndex).toBe(0);
    });

    it('should not mutate the original state', () => {
      const state = makeState({ playerCount: 4, direction: 1 });
      const result = reverseDirection(state);
      expect(state.direction).toBe(1);
      expect(result.direction).toBe(-1);
    });
  });

  describe('getCurrentPlayer', () => {
    it('should return the ID of the current player', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 2 });
      expect(getCurrentPlayer(state)).toBe('player-2');
    });

    it('should return the first player when index is 0', () => {
      const state = makeState({ playerCount: 3, currentPlayerIndex: 0 });
      expect(getCurrentPlayer(state)).toBe('player-0');
    });
  });

  describe('advanceTurn', () => {
    it('should move to the next player', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 0, direction: 1 });
      const result = advanceTurn(state);
      expect(result.currentPlayerIndex).toBe(1);
    });

    it('should skip disconnected players when advancing', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 0, direction: 1, disconnected: [1] });
      const result = advanceTurn(state);
      expect(result.currentPlayerIndex).toBe(2);
    });

    it('should not mutate the original state', () => {
      const state = makeState({ playerCount: 4, currentPlayerIndex: 0, direction: 1 });
      const result = advanceTurn(state);
      expect(state.currentPlayerIndex).toBe(0);
      expect(result.currentPlayerIndex).toBe(1);
    });
  });
});
