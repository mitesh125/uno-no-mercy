import { describe, it, expect } from 'vitest';
import { isPlayable, getPlayableCards, drawCard } from '../../src/server/gameEngine.js';

describe('gameEngine', () => {
  describe('isPlayable', () => {
    describe('color matching', () => {
      it('allows a card that matches the active color', () => {
        const card = { id: 'red-5-0', type: 'number', color: 'red', value: 5 };
        const topDiscard = { id: 'blue-3-0', type: 'number', color: 'blue', value: 3 };
        expect(isPlayable(card, topDiscard, 'red', null)).toBe(true);
      });

      it('rejects a card that does not match the active color or number', () => {
        const card = { id: 'green-7-0', type: 'number', color: 'green', value: 7 };
        const topDiscard = { id: 'red-3-0', type: 'number', color: 'red', value: 3 };
        expect(isPlayable(card, topDiscard, 'red', null)).toBe(false);
      });

      it('allows a colored action card matching the active color', () => {
        const card = { id: 'blue-skip-0', type: 'skip', color: 'blue', value: null };
        const topDiscard = { id: 'blue-3-0', type: 'number', color: 'blue', value: 3 };
        expect(isPlayable(card, topDiscard, 'blue', null)).toBe(true);
      });
    });

    describe('number matching', () => {
      it('allows a number card matching the top discard value regardless of color', () => {
        const card = { id: 'green-7-0', type: 'number', color: 'green', value: 7 };
        const topDiscard = { id: 'red-7-1', type: 'number', color: 'red', value: 7 };
        expect(isPlayable(card, topDiscard, 'red', null)).toBe(true);
      });

      it('rejects a number card that does not match value or color', () => {
        const card = { id: 'green-4-0', type: 'number', color: 'green', value: 4 };
        const topDiscard = { id: 'red-7-0', type: 'number', color: 'red', value: 7 };
        expect(isPlayable(card, topDiscard, 'red', null)).toBe(false);
      });

      it('does not allow number matching against an action card', () => {
        const card = { id: 'green-5-0', type: 'number', color: 'green', value: 5 };
        const topDiscard = { id: 'red-skip-0', type: 'skip', color: 'red', value: null };
        expect(isPlayable(card, topDiscard, 'red', null)).toBe(false);
      });
    });

    describe('type matching', () => {
      it('allows a skip card on top of another skip card regardless of color', () => {
        const card = { id: 'green-skip-0', type: 'skip', color: 'green', value: null };
        const topDiscard = { id: 'red-skip-1', type: 'skip', color: 'red', value: null };
        expect(isPlayable(card, topDiscard, 'red', null)).toBe(true);
      });

      it('allows a reverse card on top of another reverse card', () => {
        const card = { id: 'yellow-reverse-0', type: 'reverse', color: 'yellow', value: null };
        const topDiscard = { id: 'blue-reverse-1', type: 'reverse', color: 'blue', value: null };
        expect(isPlayable(card, topDiscard, 'blue', null)).toBe(true);
      });

      it('allows a draw2 card on top of another draw2 card', () => {
        const card = { id: 'green-draw2-0', type: 'draw2', color: 'green', value: null };
        const topDiscard = { id: 'red-draw2-1', type: 'draw2', color: 'red', value: null };
        expect(isPlayable(card, topDiscard, 'red', null)).toBe(true);
      });

      it('rejects a skip card on top of a reverse card when colors differ', () => {
        const card = { id: 'green-skip-0', type: 'skip', color: 'green', value: null };
        const topDiscard = { id: 'red-reverse-0', type: 'reverse', color: 'red', value: null };
        expect(isPlayable(card, topDiscard, 'red', null)).toBe(false);
      });
    });

    describe('wild cards always playable', () => {
      it('allows Wild card regardless of top discard and active color', () => {
        const card = { id: 'wild-0', type: 'wild', color: null, value: null };
        const topDiscard = { id: 'red-9-0', type: 'number', color: 'red', value: 9 };
        expect(isPlayable(card, topDiscard, 'red', null)).toBe(true);
      });

      it('allows Wild Draw 4 card regardless of top discard and active color', () => {
        const card = { id: 'wild_draw4-0', type: 'wild_draw4', color: null, value: null };
        const topDiscard = { id: 'blue-skip-0', type: 'skip', color: 'blue', value: null };
        expect(isPlayable(card, topDiscard, 'blue', null)).toBe(true);
      });
    });

    describe('wild-type cards always playable', () => {
      it('allows Skip Everyone card regardless of state', () => {
        const card = { id: 'skip_everyone-0', type: 'skip_everyone', color: null, value: null };
        const topDiscard = { id: 'red-3-0', type: 'number', color: 'red', value: 3 };
        expect(isPlayable(card, topDiscard, 'red', null)).toBe(true);
      });

      it('allows Draw 6 card regardless of state', () => {
        const card = { id: 'draw6-0', type: 'draw6', color: null, value: null };
        const topDiscard = { id: 'green-reverse-0', type: 'reverse', color: 'green', value: null };
        expect(isPlayable(card, topDiscard, 'green', null)).toBe(true);
      });

      it('allows Draw 10 card regardless of state', () => {
        const card = { id: 'draw10-0', type: 'draw10', color: null, value: null };
        const topDiscard = { id: 'yellow-7-0', type: 'number', color: 'yellow', value: 7 };
        expect(isPlayable(card, topDiscard, 'yellow', null)).toBe(true);
      });

      it('allows Color Remap card regardless of state', () => {
        const card = { id: 'color_remap-0', type: 'color_remap', color: null, value: null };
        const topDiscard = { id: 'blue-draw2-0', type: 'draw2', color: 'blue', value: null };
        expect(isPlayable(card, topDiscard, 'blue', null)).toBe(true);
      });
    });

    describe('stack chain - only valid stacking cards playable', () => {
      it('allows Draw 2 on top of Draw 2 in stack chain', () => {
        const card = { id: 'blue-draw2-0', type: 'draw2', color: 'blue', value: null };
        const lastCard = { id: 'red-draw2-0', type: 'draw2', color: 'red', value: null };
        const stackChain = { cumulativeDrawCount: 2, pendingPlayerId: 'p1', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'red', stackChain)).toBe(true);
      });

      it('rejects Wild Draw 4 on top of Draw 2 in stack chain', () => {
        const card = { id: 'wild_draw4-0', type: 'wild_draw4', color: null, value: null };
        const lastCard = { id: 'red-draw2-0', type: 'draw2', color: 'red', value: null };
        const stackChain = { cumulativeDrawCount: 2, pendingPlayerId: 'p1', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'red', stackChain)).toBe(false);
      });

      it('allows Wild Draw 4 on top of Wild Draw 4 in stack chain', () => {
        const card = { id: 'wild_draw4-1', type: 'wild_draw4', color: null, value: null };
        const lastCard = { id: 'wild_draw4-0', type: 'wild_draw4', color: null, value: null };
        const stackChain = { cumulativeDrawCount: 4, pendingPlayerId: 'p2', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'blue', stackChain)).toBe(true);
      });

      it('allows Draw 6 on top of Wild Draw 4 in stack chain', () => {
        const card = { id: 'draw6-0', type: 'draw6', color: null, value: null };
        const lastCard = { id: 'wild_draw4-0', type: 'wild_draw4', color: null, value: null };
        const stackChain = { cumulativeDrawCount: 4, pendingPlayerId: 'p1', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'red', stackChain)).toBe(true);
      });

      it('allows Draw 10 on top of Wild Draw 4 in stack chain', () => {
        const card = { id: 'draw10-0', type: 'draw10', color: null, value: null };
        const lastCard = { id: 'wild_draw4-0', type: 'wild_draw4', color: null, value: null };
        const stackChain = { cumulativeDrawCount: 4, pendingPlayerId: 'p1', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'red', stackChain)).toBe(true);
      });

      it('allows Draw 6 on top of Draw 6 in stack chain', () => {
        const card = { id: 'draw6-1', type: 'draw6', color: null, value: null };
        const lastCard = { id: 'draw6-0', type: 'draw6', color: null, value: null };
        const stackChain = { cumulativeDrawCount: 6, pendingPlayerId: 'p1', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'green', stackChain)).toBe(true);
      });

      it('allows Draw 10 on top of Draw 6 in stack chain', () => {
        const card = { id: 'draw10-0', type: 'draw10', color: null, value: null };
        const lastCard = { id: 'draw6-0', type: 'draw6', color: null, value: null };
        const stackChain = { cumulativeDrawCount: 6, pendingPlayerId: 'p1', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'red', stackChain)).toBe(true);
      });

      it('allows Draw 10 on top of Draw 10 in stack chain', () => {
        const card = { id: 'draw10-1', type: 'draw10', color: null, value: null };
        const lastCard = { id: 'draw10-0', type: 'draw10', color: null, value: null };
        const stackChain = { cumulativeDrawCount: 10, pendingPlayerId: 'p1', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'blue', stackChain)).toBe(true);
      });

      it('rejects Draw 2 on top of Wild Draw 4 in stack chain', () => {
        const card = { id: 'red-draw2-0', type: 'draw2', color: 'red', value: null };
        const lastCard = { id: 'wild_draw4-0', type: 'wild_draw4', color: null, value: null };
        const stackChain = { cumulativeDrawCount: 4, pendingPlayerId: 'p1', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'red', stackChain)).toBe(false);
      });

      it('rejects Draw 2 on top of Draw 6 in stack chain', () => {
        const card = { id: 'red-draw2-0', type: 'draw2', color: 'red', value: null };
        const lastCard = { id: 'draw6-0', type: 'draw6', color: null, value: null };
        const stackChain = { cumulativeDrawCount: 6, pendingPlayerId: 'p1', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'red', stackChain)).toBe(false);
      });

      it('rejects Draw 6 on top of Draw 10 in stack chain', () => {
        const card = { id: 'draw6-0', type: 'draw6', color: null, value: null };
        const lastCard = { id: 'draw10-0', type: 'draw10', color: null, value: null };
        const stackChain = { cumulativeDrawCount: 10, pendingPlayerId: 'p1', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'blue', stackChain)).toBe(false);
      });

      it('rejects a normal color-matching card during stack chain', () => {
        const card = { id: 'red-5-0', type: 'number', color: 'red', value: 5 };
        const lastCard = { id: 'red-draw2-0', type: 'draw2', color: 'red', value: null };
        const stackChain = { cumulativeDrawCount: 2, pendingPlayerId: 'p1', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'red', stackChain)).toBe(false);
      });

      it('rejects a Wild card during stack chain', () => {
        const card = { id: 'wild-0', type: 'wild', color: null, value: null };
        const lastCard = { id: 'red-draw2-0', type: 'draw2', color: 'red', value: null };
        const stackChain = { cumulativeDrawCount: 2, pendingPlayerId: 'p1', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'red', stackChain)).toBe(false);
      });

      it('rejects Skip Everyone during stack chain', () => {
        const card = { id: 'skip_everyone-0', type: 'skip_everyone', color: null, value: null };
        const lastCard = { id: 'draw6-0', type: 'draw6', color: null, value: null };
        const stackChain = { cumulativeDrawCount: 6, pendingPlayerId: 'p1', cards: [lastCard] };
        expect(isPlayable(card, lastCard, 'red', stackChain)).toBe(false);
      });

      it('uses the last card in the chain for stacking validation', () => {
        const card = { id: 'draw10-0', type: 'draw10', color: null, value: null };
        const firstCard = { id: 'wild_draw4-0', type: 'wild_draw4', color: null, value: null };
        const secondCard = { id: 'draw6-0', type: 'draw6', color: null, value: null };
        const stackChain = { cumulativeDrawCount: 10, pendingPlayerId: 'p1', cards: [firstCard, secondCard] };
        // Last card is draw6, which allows draw6 and draw10
        expect(isPlayable(card, secondCard, 'red', stackChain)).toBe(true);
      });
    });

    describe('non-matching cards rejected', () => {
      it('rejects a card with wrong color and wrong number', () => {
        const card = { id: 'green-2-0', type: 'number', color: 'green', value: 2 };
        const topDiscard = { id: 'red-8-0', type: 'number', color: 'red', value: 8 };
        expect(isPlayable(card, topDiscard, 'red', null)).toBe(false);
      });

      it('rejects a colored action card with wrong color and wrong type', () => {
        const card = { id: 'green-reverse-0', type: 'reverse', color: 'green', value: null };
        const topDiscard = { id: 'red-skip-0', type: 'skip', color: 'red', value: null };
        expect(isPlayable(card, topDiscard, 'red', null)).toBe(false);
      });
    });
  });

  describe('getPlayableCards', () => {
    it('returns only playable cards from a hand', () => {
      const hand = [
        { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
        { id: 'green-3-0', type: 'number', color: 'green', value: 3 },
        { id: 'blue-7-0', type: 'number', color: 'blue', value: 7 },
        { id: 'wild-0', type: 'wild', color: null, value: null },
      ];
      const topDiscard = { id: 'red-3-0', type: 'number', color: 'red', value: 3 };

      const playable = getPlayableCards(hand, topDiscard, 'red', null);

      // red-5 matches color, green-3 matches number, wild is always playable
      expect(playable).toHaveLength(3);
      expect(playable.map((c) => c.id)).toContain('red-5-0');
      expect(playable.map((c) => c.id)).toContain('green-3-0');
      expect(playable.map((c) => c.id)).toContain('wild-0');
    });

    it('returns empty array when no cards are playable', () => {
      const hand = [
        { id: 'green-5-0', type: 'number', color: 'green', value: 5 },
        { id: 'blue-8-0', type: 'number', color: 'blue', value: 8 },
      ];
      const topDiscard = { id: 'red-3-0', type: 'number', color: 'red', value: 3 };

      const playable = getPlayableCards(hand, topDiscard, 'red', null);
      expect(playable).toHaveLength(0);
    });

    it('returns all cards when all are playable', () => {
      const hand = [
        { id: 'red-1-0', type: 'number', color: 'red', value: 1 },
        { id: 'red-skip-0', type: 'skip', color: 'red', value: null },
        { id: 'wild-0', type: 'wild', color: null, value: null },
      ];
      const topDiscard = { id: 'red-5-0', type: 'number', color: 'red', value: 5 };

      const playable = getPlayableCards(hand, topDiscard, 'red', null);
      expect(playable).toHaveLength(3);
    });

    it('filters correctly during a stack chain', () => {
      const hand = [
        { id: 'red-draw2-0', type: 'draw2', color: 'red', value: null },
        { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
        { id: 'wild-0', type: 'wild', color: null, value: null },
        { id: 'draw6-0', type: 'draw6', color: null, value: null },
      ];
      const lastCard = { id: 'blue-draw2-1', type: 'draw2', color: 'blue', value: null };
      const stackChain = { cumulativeDrawCount: 2, pendingPlayerId: 'p1', cards: [lastCard] };

      const playable = getPlayableCards(hand, lastCard, 'blue', stackChain);

      // Only draw2 can stack on draw2
      expect(playable).toHaveLength(1);
      expect(playable[0].id).toBe('red-draw2-0');
    });

    it('returns empty array when no stacking cards available', () => {
      const hand = [
        { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
        { id: 'wild-0', type: 'wild', color: null, value: null },
        { id: 'skip_everyone-0', type: 'skip_everyone', color: null, value: null },
      ];
      const lastCard = { id: 'draw10-0', type: 'draw10', color: null, value: null };
      const stackChain = { cumulativeDrawCount: 10, pendingPlayerId: 'p1', cards: [lastCard] };

      const playable = getPlayableCards(hand, lastCard, 'red', stackChain);
      expect(playable).toHaveLength(0);
    });
  });
});


import { playCard } from '../../src/server/gameEngine.js';

/**
 * Helper to create a minimal game state for testing playCard.
 */
function createTestState(overrides = {}) {
  const defaultState = {
    roomCode: 'TEST01',
    status: 'in_progress',
    players: [
      {
        id: 'player1',
        name: 'Alice',
        hand: [
          { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
          { id: 'blue-3-0', type: 'number', color: 'blue', value: 3 },
          { id: 'green-skip-0', type: 'skip', color: 'green', value: null },
          { id: 'yellow-reverse-0', type: 'reverse', color: 'yellow', value: null },
          { id: 'wild-0', type: 'wild', color: null, value: null },
          { id: 'red-draw2-0', type: 'draw2', color: 'red', value: null },
          { id: 'skip_everyone-0', type: 'skip_everyone', color: null, value: null },
        ],
        isConnected: true,
        isHost: true,
        hasCalledUno: false,
        disconnectedAt: null,
      },
      {
        id: 'player2',
        name: 'Bob',
        hand: [
          { id: 'blue-7-0', type: 'number', color: 'blue', value: 7 },
          { id: 'red-9-0', type: 'number', color: 'red', value: 9 },
        ],
        isConnected: true,
        isHost: false,
        hasCalledUno: false,
        disconnectedAt: null,
      },
      {
        id: 'player3',
        name: 'Charlie',
        hand: [
          { id: 'green-2-0', type: 'number', color: 'green', value: 2 },
        ],
        isConnected: true,
        isHost: false,
        hasCalledUno: false,
        disconnectedAt: null,
      },
    ],
    currentPlayerIndex: 0,
    direction: 1,
    drawPile: [],
    discardPile: [{ id: 'red-7-0', type: 'number', color: 'red', value: 7 }],
    activeColor: 'red',
    stackChain: null,
    turnTimer: null,
    winner: null,
    scores: null,
  };

  return { ...defaultState, ...overrides };
}

describe('playCard', () => {
  describe('valid plays', () => {
    it('playing a valid number card advances turn to next player', () => {
      const state = createTestState();
      const result = playCard(state, 'player1', 'red-5-0');

      expect(result.ok).toBe(true);
      expect(result.value.currentPlayerIndex).toBe(1);
      // Card removed from hand
      expect(result.value.players[0].hand.find((c) => c.id === 'red-5-0')).toBeUndefined();
      // Card placed on discard pile
      expect(result.value.discardPile[result.value.discardPile.length - 1].id).toBe('red-5-0');
    });

    it('playing a skip card skips the next player', () => {
      // Active color is green so green-skip is playable
      const state = createTestState({ activeColor: 'green' });
      const result = playCard(state, 'player1', 'green-skip-0');

      expect(result.ok).toBe(true);
      // Player 1 (index 1) is skipped, turn goes to player 2 (index 2)
      expect(result.value.currentPlayerIndex).toBe(2);
    });

    it('playing a reverse card flips direction and advances turn', () => {
      // Active color is yellow so yellow-reverse is playable
      const state = createTestState({ activeColor: 'yellow' });
      const result = playCard(state, 'player1', 'yellow-reverse-0');

      expect(result.ok).toBe(true);
      // Direction should be reversed
      expect(result.value.direction).toBe(-1);
      // With 3 players, direction -1 from index 0 goes to index 2
      expect(result.value.currentPlayerIndex).toBe(2);
    });

    it('playing a wild card sets chosen color and advances turn', () => {
      const state = createTestState();
      const result = playCard(state, 'player1', 'wild-0', 'blue');

      expect(result.ok).toBe(true);
      expect(result.value.activeColor).toBe('blue');
      expect(result.value.currentPlayerIndex).toBe(1);
    });

    it('playing a draw 2 card starts a stack chain', () => {
      const state = createTestState();
      const result = playCard(state, 'player1', 'red-draw2-0');

      expect(result.ok).toBe(true);
      expect(result.value.stackChain).not.toBeNull();
      expect(result.value.stackChain.cumulativeDrawCount).toBe(2);
      expect(result.value.stackChain.pendingPlayerId).toBe('player2');
      expect(result.value.stackChain.cards).toHaveLength(1);
      expect(result.value.stackChain.cards[0].id).toBe('red-draw2-0');
    });

    it('playing a skip everyone card gives current player another turn', () => {
      const state = createTestState();
      const result = playCard(state, 'player1', 'skip_everyone-0', 'green');

      expect(result.ok).toBe(true);
      // Current player keeps their turn
      expect(result.value.currentPlayerIndex).toBe(0);
      expect(result.value.activeColor).toBe('green');
    });
  });

  describe('invalid plays', () => {
    it('rejects play when it is not the player\'s turn', () => {
      const state = createTestState();
      const result = playCard(state, 'player2', 'blue-7-0');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('NOT_YOUR_TURN');
    });

    it('rejects play when card is not in the player\'s hand', () => {
      const state = createTestState();
      const result = playCard(state, 'player1', 'nonexistent-card');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('INVALID_PLAY');
    });

    it('rejects play when card is not playable', () => {
      // blue-3-0 doesn't match active color (red) or top discard value (7)
      const state = createTestState();
      const result = playCard(state, 'player1', 'blue-3-0');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('INVALID_PLAY');
    });
  });
});

describe('drawCard', () => {
  /**
   * Helper to create a game state for drawCard tests.
   */
  function createDrawTestState(overrides = {}) {
    return {
      roomCode: 'TEST01',
      status: 'in_progress',
      players: [
        {
          id: 'player1',
          name: 'Alice',
          hand: [
            { id: 'green-2-0', type: 'number', color: 'green', value: 2 },
            { id: 'blue-8-0', type: 'number', color: 'blue', value: 8 },
          ],
          isConnected: true,
          isHost: true,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player2',
          name: 'Bob',
          hand: [
            { id: 'red-9-0', type: 'number', color: 'red', value: 9 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player3',
          name: 'Charlie',
          hand: [
            { id: 'yellow-4-0', type: 'number', color: 'yellow', value: 4 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
      ],
      currentPlayerIndex: 0,
      direction: 1,
      drawPile: [
        { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
        { id: 'green-7-0', type: 'number', color: 'green', value: 7 },
        { id: 'yellow-1-0', type: 'number', color: 'yellow', value: 1 },
      ],
      discardPile: [{ id: 'red-3-0', type: 'number', color: 'red', value: 3 }],
      activeColor: 'red',
      stackChain: null,
      turnTimer: null,
      winner: null,
      scores: null,
      ...overrides,
    };
  }

  it('drawing a card adds it to the player\'s hand', () => {
    const state = createDrawTestState();
    const result = drawCard(state, 'player1');

    expect(result.ok).toBe(true);
    // Player's hand should grow by 1
    expect(result.value.state.players[0].hand).toHaveLength(3);
    // The drawn card should be in the hand
    expect(result.value.drawnCard).not.toBeNull();
    expect(result.value.state.players[0].hand.map(c => c.id)).toContain(result.value.drawnCard.id);
  });

  it('rejects drawing when it is not the player\'s turn', () => {
    const state = createDrawTestState();
    const result = drawCard(state, 'player2');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('NOT_YOUR_TURN');
  });

  it('rejects drawing during a stack chain', () => {
    const state = createDrawTestState({
      stackChain: {
        cumulativeDrawCount: 2,
        pendingPlayerId: 'player1',
        cards: [{ id: 'red-draw2-0', type: 'draw2', color: 'red', value: null }],
      },
    });
    const result = drawCard(state, 'player1');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('CANNOT_STACK');
  });

  it('if drawn card is playable, turn stays on same player', () => {
    // Draw pile has a red card, active color is red — it's playable
    const state = createDrawTestState({
      drawPile: [
        { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
      ],
    });
    const result = drawCard(state, 'player1');

    expect(result.ok).toBe(true);
    expect(result.value.drawnCardPlayable).toBe(true);
    // Turn stays on player1 (index 0)
    expect(result.value.state.currentPlayerIndex).toBe(0);
  });

  it('if drawn card is not playable, turn advances', () => {
    // Draw pile has a green card, active color is red, top discard is red-3
    // green-9 doesn't match color (red) or value (3)
    const state = createDrawTestState({
      drawPile: [
        { id: 'green-9-0', type: 'number', color: 'green', value: 9 },
      ],
    });
    const result = drawCard(state, 'player1');

    expect(result.ok).toBe(true);
    expect(result.value.drawnCardPlayable).toBe(false);
    // Turn advances to player2 (index 1)
    expect(result.value.state.currentPlayerIndex).toBe(1);
  });

  it('total card count is conserved after drawing', () => {
    const state = createDrawTestState();

    // Count total cards before
    const totalBefore =
      state.players.reduce((sum, p) => sum + p.hand.length, 0) +
      state.drawPile.length +
      state.discardPile.length;

    const result = drawCard(state, 'player1');
    expect(result.ok).toBe(true);

    // Count total cards after
    const newState = result.value.state;
    const totalAfter =
      newState.players.reduce((sum, p) => sum + p.hand.length, 0) +
      newState.drawPile.length +
      newState.discardPile.length;

    expect(totalAfter).toBe(totalBefore);
  });

  it('handles empty draw pile by reshuffling discard pile', () => {
    // Draw pile is empty, discard pile has multiple cards
    const state = createDrawTestState({
      drawPile: [],
      discardPile: [
        { id: 'blue-1-0', type: 'number', color: 'blue', value: 1 },
        { id: 'yellow-6-0', type: 'number', color: 'yellow', value: 6 },
        { id: 'red-3-0', type: 'number', color: 'red', value: 3 },
      ],
      activeColor: 'red',
    });

    const result = drawCard(state, 'player1');

    expect(result.ok).toBe(true);
    expect(result.value.drawnCard).not.toBeNull();
    // Player's hand should grow by 1
    expect(result.value.state.players[0].hand).toHaveLength(3);
  });

  it('handles case where both piles are exhausted by auto-passing turn', () => {
    const state = createDrawTestState({
      drawPile: [],
      discardPile: [{ id: 'red-3-0', type: 'number', color: 'red', value: 3 }],
    });

    const result = drawCard(state, 'player1');

    expect(result.ok).toBe(true);
    expect(result.value.drawnCard).toBeNull();
    expect(result.value.drawnCardPlayable).toBe(false);
    // Turn should advance
    expect(result.value.state.currentPlayerIndex).toBe(1);
  });
});


import { colorRemap } from '../../src/server/gameEngine.js';

describe('colorRemap', () => {
  /**
   * Helper to create a game state for colorRemap tests.
   */
  function createRemapTestState(overrides = {}) {
    return {
      roomCode: 'TEST01',
      status: 'in_progress',
      players: [
        {
          id: 'player1',
          name: 'Alice',
          hand: [
            { id: 'red-1-0', type: 'number', color: 'red', value: 1 },
            { id: 'red-2-0', type: 'number', color: 'red', value: 2 },
            { id: 'red-3-0', type: 'number', color: 'red', value: 3 },
            { id: 'blue-5-0', type: 'number', color: 'blue', value: 5 },
          ],
          isConnected: true,
          isHost: true,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player2',
          name: 'Bob',
          hand: [
            { id: 'red-4-0', type: 'number', color: 'red', value: 4 },
            { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
            { id: 'red-6-0', type: 'number', color: 'red', value: 6 },
            { id: 'green-7-0', type: 'number', color: 'green', value: 7 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player3',
          name: 'Charlie',
          hand: [
            { id: 'yellow-4-0', type: 'number', color: 'yellow', value: 4 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
      ],
      currentPlayerIndex: 0,
      direction: 1,
      drawPile: [],
      discardPile: [{ id: 'red-7-0', type: 'number', color: 'red', value: 7 }],
      activeColor: 'red',
      stackChain: null,
      turnTimer: null,
      winner: null,
      scores: null,
      ...overrides,
    };
  }

  it('equal swap works — both players have same number of color cards', () => {
    // Player1 has 3 red cards, Player2 has 3 red cards → swap all 3
    const state = createRemapTestState();
    const result = colorRemap(state, 'player1', 'red', 'player2');

    expect(result.ok).toBe(true);
    const newState = result.value;

    // Player1 should now have the 3 red cards that were in Player2's hand
    const player1Reds = newState.players[0].hand.filter((c) => c.color === 'red');
    expect(player1Reds.map((c) => c.id).sort()).toEqual(['red-4-0', 'red-5-0', 'red-6-0']);

    // Player2 should now have the 3 red cards that were in Player1's hand
    const player2Reds = newState.players[1].hand.filter((c) => c.color === 'red');
    expect(player2Reds.map((c) => c.id).sort()).toEqual(['red-1-0', 'red-2-0', 'red-3-0']);
  });

  it('asymmetric swap works — target has fewer cards of the color', () => {
    // Player1 has 3 red, Player2 has 1 red → swap min(3,1)=1
    const state = createRemapTestState({
      players: [
        {
          id: 'player1',
          name: 'Alice',
          hand: [
            { id: 'red-1-0', type: 'number', color: 'red', value: 1 },
            { id: 'red-2-0', type: 'number', color: 'red', value: 2 },
            { id: 'red-3-0', type: 'number', color: 'red', value: 3 },
            { id: 'blue-5-0', type: 'number', color: 'blue', value: 5 },
          ],
          isConnected: true,
          isHost: true,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player2',
          name: 'Bob',
          hand: [
            { id: 'red-9-0', type: 'number', color: 'red', value: 9 },
            { id: 'green-7-0', type: 'number', color: 'green', value: 7 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player3',
          name: 'Charlie',
          hand: [
            { id: 'yellow-4-0', type: 'number', color: 'yellow', value: 4 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
      ],
    });

    const result = colorRemap(state, 'player1', 'red', 'player2');

    expect(result.ok).toBe(true);
    const newState = result.value;

    // Player1 gave 1 red card, received 1 red card from target, keeps 2 excess red cards
    const player1Reds = newState.players[0].hand.filter((c) => c.color === 'red');
    expect(player1Reds).toHaveLength(3); // 2 kept + 1 received
    expect(player1Reds.map((c) => c.id)).toContain('red-9-0'); // received from target

    // Player2 gave 1 red card, received 1 red card from player1
    const player2Reds = newState.players[1].hand.filter((c) => c.color === 'red');
    expect(player2Reds).toHaveLength(1); // received 1 from player1
  });

  it('rejects if player has 0 cards of selected color', () => {
    const state = createRemapTestState();
    // Player1 has no yellow cards
    const result = colorRemap(state, 'player1', 'yellow', 'player2');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_COLOR_REMAP');
  });

  it('rejects if it is not the player\'s turn', () => {
    const state = createRemapTestState();
    const result = colorRemap(state, 'player2', 'red', 'player1');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('NOT_YOUR_TURN');
  });

  it('total card count is conserved after swap', () => {
    const state = createRemapTestState();

    // Count total cards before
    const totalBefore =
      state.players.reduce((sum, p) => sum + p.hand.length, 0) +
      state.drawPile.length +
      state.discardPile.length;

    const result = colorRemap(state, 'player1', 'red', 'player2');
    expect(result.ok).toBe(true);

    // Count total cards after
    const newState = result.value;
    const totalAfter =
      newState.players.reduce((sum, p) => sum + p.hand.length, 0) +
      newState.drawPile.length +
      newState.discardPile.length;

    expect(totalAfter).toBe(totalBefore);
  });

  it('rejects if target is the same player', () => {
    const state = createRemapTestState();
    const result = colorRemap(state, 'player1', 'red', 'player1');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_COLOR_REMAP');
  });

  it('rejects if target player does not exist', () => {
    const state = createRemapTestState();
    const result = colorRemap(state, 'player1', 'red', 'nonexistent');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_COLOR_REMAP');
  });

  it('advances the turn after a successful swap', () => {
    const state = createRemapTestState();
    const result = colorRemap(state, 'player1', 'red', 'player2');

    expect(result.ok).toBe(true);
    // Turn should advance from player1 (index 0) to player2 (index 1)
    expect(result.value.currentPlayerIndex).toBe(1);
  });
});


import { handleTimeout } from '../../src/server/gameEngine.js';

describe('handleTimeout', () => {
  /**
   * Helper to create a game state for handleTimeout tests.
   */
  function createTimeoutTestState(overrides = {}) {
    return {
      roomCode: 'TEST01',
      status: 'in_progress',
      players: [
        {
          id: 'player1',
          name: 'Alice',
          hand: [
            { id: 'green-2-0', type: 'number', color: 'green', value: 2 },
            { id: 'blue-8-0', type: 'number', color: 'blue', value: 8 },
          ],
          isConnected: true,
          isHost: true,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player2',
          name: 'Bob',
          hand: [
            { id: 'red-9-0', type: 'number', color: 'red', value: 9 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player3',
          name: 'Charlie',
          hand: [
            { id: 'yellow-4-0', type: 'number', color: 'yellow', value: 4 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
      ],
      currentPlayerIndex: 0,
      direction: 1,
      drawPile: [
        { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
        { id: 'green-7-0', type: 'number', color: 'green', value: 7 },
        { id: 'yellow-1-0', type: 'number', color: 'yellow', value: 1 },
      ],
      discardPile: [{ id: 'red-3-0', type: 'number', color: 'red', value: 3 }],
      activeColor: 'red',
      stackChain: null,
      turnTimer: null,
      winner: null,
      scores: null,
      ...overrides,
    };
  }

  it('auto-draws a card and advances turn on timeout', () => {
    const state = createTimeoutTestState();
    const result = handleTimeout(state, 'player1');

    expect(result.ok).toBe(true);
    // Player's hand should grow by 1 (auto-draw)
    expect(result.value.players[0].hand).toHaveLength(3);
    // Draw pile should shrink by 1
    expect(result.value.drawPile).toHaveLength(2);
    // Turn should advance to next player regardless of playability
    expect(result.value.currentPlayerIndex).toBe(1);
  });

  it('during stack chain, forces draw of cumulative total and advances turn', () => {
    const state = createTimeoutTestState({
      drawPile: [
        { id: 'red-1-0', type: 'number', color: 'red', value: 1 },
        { id: 'blue-2-0', type: 'number', color: 'blue', value: 2 },
        { id: 'green-3-0', type: 'number', color: 'green', value: 3 },
        { id: 'yellow-4-1', type: 'number', color: 'yellow', value: 4 },
        { id: 'red-6-0', type: 'number', color: 'red', value: 6 },
        { id: 'blue-7-0', type: 'number', color: 'blue', value: 7 },
      ],
      stackChain: {
        cumulativeDrawCount: 4,
        pendingPlayerId: 'player1',
        cards: [
          { id: 'red-draw2-0', type: 'draw2', color: 'red', value: null },
          { id: 'blue-draw2-0', type: 'draw2', color: 'blue', value: null },
        ],
      },
    });

    const result = handleTimeout(state, 'player1');

    expect(result.ok).toBe(true);
    // Player should have drawn 4 cards (cumulative total)
    expect(result.value.players[0].hand).toHaveLength(2 + 4); // original 2 + 4 drawn
    // Draw pile should shrink by 4
    expect(result.value.drawPile).toHaveLength(2);
    // Stack chain should be cleared
    expect(result.value.stackChain).toBeNull();
    // Turn should advance (skip the timed-out player)
    expect(result.value.currentPlayerIndex).toBe(1);
  });

  it('rejects timeout when it is not the player\'s turn', () => {
    const state = createTimeoutTestState();
    const result = handleTimeout(state, 'player2');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('NOT_YOUR_TURN');
  });

  it('handles timeout when both piles are exhausted by advancing turn', () => {
    const state = createTimeoutTestState({
      drawPile: [],
      discardPile: [{ id: 'red-3-0', type: 'number', color: 'red', value: 3 }],
    });

    const result = handleTimeout(state, 'player1');

    expect(result.ok).toBe(true);
    // Hand should remain unchanged (no cards to draw)
    expect(result.value.players[0].hand).toHaveLength(2);
    // Turn should still advance
    expect(result.value.currentPlayerIndex).toBe(1);
  });
});


import { stackCard, acceptDraw } from '../../src/server/gameEngine.js';

describe('stackCard', () => {
  /**
   * Helper to create a game state with an active stack chain for stacking tests.
   */
  function createStackTestState(overrides = {}) {
    return {
      roomCode: 'TEST01',
      status: 'in_progress',
      players: [
        {
          id: 'player1',
          name: 'Alice',
          hand: [
            { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
            { id: 'red-draw2-0', type: 'draw2', color: 'red', value: null },
          ],
          isConnected: true,
          isHost: true,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player2',
          name: 'Bob',
          hand: [
            { id: 'blue-draw2-0', type: 'draw2', color: 'blue', value: null },
            { id: 'wild_draw4-0', type: 'wild_draw4', color: null, value: null },
            { id: 'blue-7-0', type: 'number', color: 'blue', value: 7 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player3',
          name: 'Charlie',
          hand: [
            { id: 'green-2-0', type: 'number', color: 'green', value: 2 },
            { id: 'draw6-0', type: 'draw6', color: null, value: null },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
      ],
      currentPlayerIndex: 0,
      direction: 1,
      drawPile: [
        { id: 'yellow-1-0', type: 'number', color: 'yellow', value: 1 },
        { id: 'yellow-2-0', type: 'number', color: 'yellow', value: 2 },
        { id: 'yellow-3-0', type: 'number', color: 'yellow', value: 3 },
        { id: 'yellow-4-0', type: 'number', color: 'yellow', value: 4 },
        { id: 'yellow-5-0', type: 'number', color: 'yellow', value: 5 },
        { id: 'yellow-6-0', type: 'number', color: 'yellow', value: 6 },
      ],
      discardPile: [{ id: 'red-draw2-1', type: 'draw2', color: 'red', value: null }],
      activeColor: 'red',
      stackChain: {
        cumulativeDrawCount: 2,
        pendingPlayerId: 'player2',
        cards: [{ id: 'red-draw2-1', type: 'draw2', color: 'red', value: null }],
      },
      turnTimer: null,
      winner: null,
      scores: null,
      ...overrides,
    };
  }

  it('stacking a valid card increases cumulative count', () => {
    const state = createStackTestState();
    // player2 stacks a draw2 on top of draw2 chain
    const result = stackCard(state, 'player2', 'blue-draw2-0');

    expect(result.ok).toBe(true);
    expect(result.value.stackChain.cumulativeDrawCount).toBe(4); // 2 + 2
  });

  it('stacking advances pending player to next', () => {
    const state = createStackTestState();
    // player2 stacks, so pending should advance to player3
    const result = stackCard(state, 'player2', 'blue-draw2-0');

    expect(result.ok).toBe(true);
    expect(result.value.stackChain.pendingPlayerId).toBe('player3');
  });

  it('stacking when not the pending player is rejected', () => {
    const state = createStackTestState();
    // player1 is NOT the pending player (player2 is)
    const result = stackCard(state, 'player1', 'red-draw2-0');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('CANNOT_STACK');
  });

  it('stacking an invalid card is rejected', () => {
    const state = createStackTestState();
    // player2 tries to stack a number card (not valid for stacking)
    const result = stackCard(state, 'player2', 'blue-7-0');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_PLAY');
  });

  it('stacking removes the card from the player hand', () => {
    const state = createStackTestState();
    const result = stackCard(state, 'player2', 'blue-draw2-0');

    expect(result.ok).toBe(true);
    const player2Hand = result.value.players[1].hand;
    expect(player2Hand.find((c) => c.id === 'blue-draw2-0')).toBeUndefined();
  });

  it('stacking places the card on the discard pile', () => {
    const state = createStackTestState();
    const result = stackCard(state, 'player2', 'blue-draw2-0');

    expect(result.ok).toBe(true);
    const topDiscard = result.value.discardPile[result.value.discardPile.length - 1];
    expect(topDiscard.id).toBe('blue-draw2-0');
  });

  it('stacking when there is no active stack chain is rejected', () => {
    const state = createStackTestState({ stackChain: null });
    const result = stackCard(state, 'player2', 'blue-draw2-0');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('CANNOT_STACK');
  });

  it('stacking a wild_draw4 on a wild_draw4 chain increases count by 4', () => {
    const state = createStackTestState({
      stackChain: {
        cumulativeDrawCount: 4,
        pendingPlayerId: 'player2',
        cards: [{ id: 'wild_draw4-1', type: 'wild_draw4', color: null, value: null }],
      },
    });
    const result = stackCard(state, 'player2', 'wild_draw4-0');

    expect(result.ok).toBe(true);
    expect(result.value.stackChain.cumulativeDrawCount).toBe(8); // 4 + 4
  });
});

describe('acceptDraw', () => {
  /**
   * Helper to create a game state with an active stack chain for acceptDraw tests.
   */
  function createAcceptDrawTestState(overrides = {}) {
    return {
      roomCode: 'TEST01',
      status: 'in_progress',
      players: [
        {
          id: 'player1',
          name: 'Alice',
          hand: [
            { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
          ],
          isConnected: true,
          isHost: true,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player2',
          name: 'Bob',
          hand: [
            { id: 'blue-7-0', type: 'number', color: 'blue', value: 7 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player3',
          name: 'Charlie',
          hand: [
            { id: 'green-2-0', type: 'number', color: 'green', value: 2 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
      ],
      currentPlayerIndex: 0,
      direction: 1,
      drawPile: [
        { id: 'yellow-1-0', type: 'number', color: 'yellow', value: 1 },
        { id: 'yellow-2-0', type: 'number', color: 'yellow', value: 2 },
        { id: 'yellow-3-0', type: 'number', color: 'yellow', value: 3 },
        { id: 'yellow-4-0', type: 'number', color: 'yellow', value: 4 },
        { id: 'yellow-5-0', type: 'number', color: 'yellow', value: 5 },
        { id: 'yellow-6-0', type: 'number', color: 'yellow', value: 6 },
      ],
      discardPile: [{ id: 'red-draw2-0', type: 'draw2', color: 'red', value: null }],
      activeColor: 'red',
      stackChain: {
        cumulativeDrawCount: 4,
        pendingPlayerId: 'player2',
        cards: [
          { id: 'red-draw2-0', type: 'draw2', color: 'red', value: null },
          { id: 'blue-draw2-0', type: 'draw2', color: 'blue', value: null },
        ],
      },
      turnTimer: null,
      winner: null,
      scores: null,
      ...overrides,
    };
  }

  it('accepting draw adds correct number of cards to hand', () => {
    const state = createAcceptDrawTestState();
    // player2 accepts draw of 4 cards
    const result = acceptDraw(state, 'player2');

    expect(result.ok).toBe(true);
    // player2 started with 1 card, should now have 1 + 4 = 5
    const player2Hand = result.value.players[1].hand;
    expect(player2Hand).toHaveLength(5);
  });

  it('accepting draw clears stack chain and advances turn', () => {
    const state = createAcceptDrawTestState();
    const result = acceptDraw(state, 'player2');

    expect(result.ok).toBe(true);
    // Stack chain should be cleared
    expect(result.value.stackChain).toBeNull();
    // Turn should advance past player2 (index 1) to player3 (index 2)
    expect(result.value.currentPlayerIndex).toBe(2);
  });

  it('accepting draw when not the pending player is rejected', () => {
    const state = createAcceptDrawTestState();
    // player1 is NOT the pending player
    const result = acceptDraw(state, 'player1');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('CANNOT_STACK');
  });

  it('accepting draw when there is no active stack chain is rejected', () => {
    const state = createAcceptDrawTestState({ stackChain: null });
    const result = acceptDraw(state, 'player2');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('CANNOT_STACK');
  });

  it('accepting draw reduces the draw pile by the cumulative count', () => {
    const state = createAcceptDrawTestState();
    const drawPileBefore = state.drawPile.length;
    const result = acceptDraw(state, 'player2');

    expect(result.ok).toBe(true);
    expect(result.value.drawPile.length).toBe(drawPileBefore - 4);
  });

  it('total card count is conserved after accepting draw', () => {
    const state = createAcceptDrawTestState();

    const totalBefore =
      state.players.reduce((sum, p) => sum + p.hand.length, 0) +
      state.drawPile.length +
      state.discardPile.length;

    const result = acceptDraw(state, 'player2');
    expect(result.ok).toBe(true);

    const newState = result.value;
    const totalAfter =
      newState.players.reduce((sum, p) => sum + p.hand.length, 0) +
      newState.drawPile.length +
      newState.discardPile.length;

    expect(totalAfter).toBe(totalBefore);
  });
});


import { callUno, challengeUno } from '../../src/server/gameEngine.js';

describe('callUno', () => {
  function createUnoTestState(overrides = {}) {
    return {
      roomCode: 'TEST01',
      status: 'in_progress',
      players: [
        {
          id: 'player1',
          name: 'Alice',
          hand: [
            { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
            { id: 'blue-3-0', type: 'number', color: 'blue', value: 3 },
          ],
          isConnected: true,
          isHost: true,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player2',
          name: 'Bob',
          hand: [
            { id: 'green-7-0', type: 'number', color: 'green', value: 7 },
            { id: 'yellow-2-0', type: 'number', color: 'yellow', value: 2 },
            { id: 'red-9-0', type: 'number', color: 'red', value: 9 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
      ],
      currentPlayerIndex: 0,
      direction: 1,
      drawPile: [
        { id: 'red-1-0', type: 'number', color: 'red', value: 1 },
        { id: 'blue-4-0', type: 'number', color: 'blue', value: 4 },
        { id: 'green-6-0', type: 'number', color: 'green', value: 6 },
        { id: 'yellow-8-0', type: 'number', color: 'yellow', value: 8 },
      ],
      discardPile: [{ id: 'red-7-0', type: 'number', color: 'red', value: 7 }],
      activeColor: 'red',
      stackChain: null,
      turnTimer: null,
      winner: null,
      scores: null,
      ...overrides,
    };
  }

  it('succeeds when player has exactly 2 cards', () => {
    const state = createUnoTestState();
    const result = callUno(state, 'player1');

    expect(result.ok).toBe(true);
    expect(result.value.players[0].hasCalledUno).toBe(true);
  });

  it('fails when player has more than 2 cards', () => {
    const state = createUnoTestState();
    const result = callUno(state, 'player2');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_PLAY');
  });

  it('fails when player has 1 card', () => {
    const state = createUnoTestState({
      players: [
        {
          id: 'player1',
          name: 'Alice',
          hand: [{ id: 'red-5-0', type: 'number', color: 'red', value: 5 }],
          isConnected: true,
          isHost: true,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player2',
          name: 'Bob',
          hand: [
            { id: 'green-7-0', type: 'number', color: 'green', value: 7 },
            { id: 'yellow-2-0', type: 'number', color: 'yellow', value: 2 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
      ],
    });
    const result = callUno(state, 'player1');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_PLAY');
  });
});

describe('challengeUno', () => {
  function createChallengeTestState(overrides = {}) {
    return {
      roomCode: 'TEST01',
      status: 'in_progress',
      players: [
        {
          id: 'player1',
          name: 'Alice',
          hand: [
            { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
          ],
          isConnected: true,
          isHost: true,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player2',
          name: 'Bob',
          hand: [
            { id: 'green-7-0', type: 'number', color: 'green', value: 7 },
            { id: 'yellow-2-0', type: 'number', color: 'yellow', value: 2 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
      ],
      currentPlayerIndex: 1,
      direction: 1,
      drawPile: [
        { id: 'red-1-0', type: 'number', color: 'red', value: 1 },
        { id: 'blue-4-0', type: 'number', color: 'blue', value: 4 },
        { id: 'green-6-0', type: 'number', color: 'green', value: 6 },
        { id: 'yellow-8-0', type: 'number', color: 'yellow', value: 8 },
      ],
      discardPile: [{ id: 'red-7-0', type: 'number', color: 'red', value: 7 }],
      activeColor: 'red',
      stackChain: null,
      turnTimer: null,
      winner: null,
      scores: null,
      ...overrides,
    };
  }

  it('succeeds when target has 1 card and has not called UNO', () => {
    const state = createChallengeTestState();
    const result = challengeUno(state, 'player2', 'player1');

    expect(result.ok).toBe(true);
    // Target should now have 5 cards (1 original + 4 drawn)
    expect(result.value.players[0].hand).toHaveLength(5);
    expect(result.value.players[0].hasCalledUno).toBe(false);
  });

  it('fails when target has called UNO', () => {
    const state = createChallengeTestState({
      players: [
        {
          id: 'player1',
          name: 'Alice',
          hand: [{ id: 'red-5-0', type: 'number', color: 'red', value: 5 }],
          isConnected: true,
          isHost: true,
          hasCalledUno: true,
          disconnectedAt: null,
        },
        {
          id: 'player2',
          name: 'Bob',
          hand: [
            { id: 'green-7-0', type: 'number', color: 'green', value: 7 },
            { id: 'yellow-2-0', type: 'number', color: 'yellow', value: 2 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
      ],
    });
    const result = challengeUno(state, 'player2', 'player1');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_PLAY');
  });

  it('fails when target does not have exactly 1 card', () => {
    const state = createChallengeTestState();
    // player2 has 2 cards
    const result = challengeUno(state, 'player1', 'player2');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_PLAY');
  });
});

describe('win detection', () => {
  function createWinTestState(overrides = {}) {
    return {
      roomCode: 'TEST01',
      status: 'in_progress',
      players: [
        {
          id: 'player1',
          name: 'Alice',
          hand: [
            { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
          ],
          isConnected: true,
          isHost: true,
          hasCalledUno: true,
          disconnectedAt: null,
        },
        {
          id: 'player2',
          name: 'Bob',
          hand: [
            { id: 'green-7-0', type: 'number', color: 'green', value: 7 },
            { id: 'yellow-2-0', type: 'number', color: 'yellow', value: 2 },
            { id: 'blue-skip-0', type: 'skip', color: 'blue', value: null },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player3',
          name: 'Charlie',
          hand: [
            { id: 'wild-0', type: 'wild', color: null, value: null },
            { id: 'red-9-0', type: 'number', color: 'red', value: 9 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
      ],
      currentPlayerIndex: 0,
      direction: 1,
      drawPile: [
        { id: 'red-1-0', type: 'number', color: 'red', value: 1 },
        { id: 'blue-4-0', type: 'number', color: 'blue', value: 4 },
      ],
      discardPile: [{ id: 'red-7-0', type: 'number', color: 'red', value: 7 }],
      activeColor: 'red',
      stackChain: null,
      turnTimer: null,
      winner: null,
      scores: null,
      ...overrides,
    };
  }

  it('triggers when player plays their last card', () => {
    const state = createWinTestState();
    const result = playCard(state, 'player1', 'red-5-0');

    expect(result.ok).toBe(true);
    expect(result.value.status).toBe('finished');
    expect(result.value.winner).toBe('player1');
  });

  it('does not advance the turn when game is won', () => {
    const state = createWinTestState();
    const result = playCard(state, 'player1', 'red-5-0');

    expect(result.ok).toBe(true);
    // Turn should stay at the winning player's index
    expect(result.value.currentPlayerIndex).toBe(0);
  });

  it('calculates scores correctly for remaining players', () => {
    const state = createWinTestState();
    const result = playCard(state, 'player1', 'red-5-0');

    expect(result.ok).toBe(true);
    expect(result.value.scores).not.toBeNull();
    // Winner gets 0
    expect(result.value.scores['player1']).toBe(0);
    // Player2: green-7 (7) + yellow-2 (2) + blue-skip (20) = 29
    expect(result.value.scores['player2']).toBe(29);
    // Player3: wild (50) + red-9 (9) = 59
    expect(result.value.scores['player3']).toBe(59);
  });

  it('does not trigger win when player still has cards', () => {
    const state = createWinTestState({
      players: [
        {
          id: 'player1',
          name: 'Alice',
          hand: [
            { id: 'red-5-0', type: 'number', color: 'red', value: 5 },
            { id: 'red-3-0', type: 'number', color: 'red', value: 3 },
          ],
          isConnected: true,
          isHost: true,
          hasCalledUno: false,
          disconnectedAt: null,
        },
        {
          id: 'player2',
          name: 'Bob',
          hand: [
            { id: 'green-7-0', type: 'number', color: 'green', value: 7 },
          ],
          isConnected: true,
          isHost: false,
          hasCalledUno: false,
          disconnectedAt: null,
        },
      ],
    });
    const result = playCard(state, 'player1', 'red-5-0');

    expect(result.ok).toBe(true);
    expect(result.value.status).toBe('in_progress');
    expect(result.value.winner).toBeNull();
    expect(result.value.scores).toBeNull();
  });
});
