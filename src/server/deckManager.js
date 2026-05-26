/**
 * DeckManager — handles deck creation, shuffling, dealing, and drawing for UNO No Mercy.
 */

import { COLORS, TOTAL_DECK_SIZE, CARDS_PER_PLAYER } from './types.js';

/**
 * Create the full 122-card No Mercy deck.
 * Card ID format:
 *   Colored cards: "{color}-{type}-{index}" or "{color}-{value}-{index}" for numbers
 *   Wild-type cards: "{type}-{index}"
 * @returns {import('./types.js').Card[]}
 */
export function createDeck() {
  /** @type {import('./types.js').Card[]} */
  const cards = [];

  // Number 0: one per color (4 total)
  for (const color of COLORS) {
    cards.push({
      id: `${color}-0-0`,
      type: 'number',
      color,
      value: 0,
    });
  }

  // Numbers 1-9: two per color (72 total)
  for (const color of COLORS) {
    for (let value = 1; value <= 9; value++) {
      for (let i = 0; i < 2; i++) {
        cards.push({
          id: `${color}-${value}-${i}`,
          type: 'number',
          color,
          value,
        });
      }
    }
  }

  // Skip: two per color (8 total)
  for (const color of COLORS) {
    for (let i = 0; i < 2; i++) {
      cards.push({
        id: `${color}-skip-${i}`,
        type: 'skip',
        color,
        value: null,
      });
    }
  }

  // Reverse: two per color (8 total)
  for (const color of COLORS) {
    for (let i = 0; i < 2; i++) {
      cards.push({
        id: `${color}-reverse-${i}`,
        type: 'reverse',
        color,
        value: null,
      });
    }
  }

  // Draw 2: two per color (8 total)
  for (const color of COLORS) {
    for (let i = 0; i < 2; i++) {
      cards.push({
        id: `${color}-draw2-${i}`,
        type: 'draw2',
        color,
        value: null,
      });
    }
  }

  // Wild: 4 total (no color)
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `wild-${i}`,
      type: 'wild',
      color: null,
      value: null,
    });
  }

  // Wild Draw 4: 4 total (no color)
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `wild_draw4-${i}`,
      type: 'wild_draw4',
      color: null,
      value: null,
    });
  }

  // Skip Everyone: 4 total (no color)
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `skip_everyone-${i}`,
      type: 'skip_everyone',
      color: null,
      value: null,
    });
  }

  // Draw 6: 4 total (no color)
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `draw6-${i}`,
      type: 'draw6',
      color: null,
      value: null,
    });
  }

  // Draw 10: 2 total (no color)
  for (let i = 0; i < 2; i++) {
    cards.push({
      id: `draw10-${i}`,
      type: 'draw10',
      color: null,
      value: null,
    });
  }

  // Color Remap: 4 total (no color)
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `color_remap-${i}`,
      type: 'color_remap',
      color: null,
      value: null,
    });
  }

  return cards;
}

/**
 * Shuffle an array of cards in-place using the Fisher-Yates algorithm.
 * Returns the same array reference (mutated).
 * @param {import('./types.js').Card[]} cards
 * @returns {import('./types.js').Card[]}
 */
export function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/**
 * Deal cards from the deck to players.
 * @param {import('./types.js').Card[]} deck - The deck to deal from (will not be mutated)
 * @param {number} playerCount - Number of players
 * @param {number} cardsPerPlayer - Cards to deal to each player (default: CARDS_PER_PLAYER)
 * @returns {{ hands: import('./types.js').Card[][], remaining: import('./types.js').Card[] }}
 */
export function deal(deck, playerCount, cardsPerPlayer = CARDS_PER_PLAYER) {
  const hands = Array.from({ length: playerCount }, () => []);
  let deckIndex = 0;

  // Deal one card at a time to each player in round-robin fashion
  for (let round = 0; round < cardsPerPlayer; round++) {
    for (let player = 0; player < playerCount; player++) {
      if (deckIndex < deck.length) {
        hands[player].push(deck[deckIndex]);
        deckIndex++;
      }
    }
  }

  const remaining = deck.slice(deckIndex);
  return { hands, remaining };
}

/**
 * Draw N cards from the draw pile. If the draw pile runs out, reshuffle the discard pile
 * (keeping the top card) into the draw pile and continue drawing.
 * @param {import('./types.js').Card[]} drawPile - Current draw pile
 * @param {import('./types.js').Card[]} discardPile - Current discard pile
 * @param {number} count - Number of cards to draw
 * @returns {{ drawn: import('./types.js').Card[], newDrawPile: import('./types.js').Card[], newDiscardPile: import('./types.js').Card[] }}
 */
export function drawFromPile(drawPile, discardPile, count) {
  // Work with copies to avoid mutating inputs
  let currentDrawPile = [...drawPile];
  let currentDiscardPile = [...discardPile];
  const drawn = [];

  for (let i = 0; i < count; i++) {
    // If draw pile is empty, reshuffle discard pile (keep top card)
    if (currentDrawPile.length === 0) {
      if (currentDiscardPile.length <= 1) {
        // Cannot reshuffle — no cards available
        break;
      }
      // Keep the top card of the discard pile (last element)
      const topCard = currentDiscardPile[currentDiscardPile.length - 1];
      const cardsToReshuffle = currentDiscardPile.slice(0, currentDiscardPile.length - 1);
      currentDrawPile = shuffle([...cardsToReshuffle]);
      currentDiscardPile = [topCard];
    }

    if (currentDrawPile.length > 0) {
      drawn.push(currentDrawPile.shift());
    }
  }

  return {
    drawn,
    newDrawPile: currentDrawPile,
    newDiscardPile: currentDiscardPile,
  };
}

/**
 * Find the first number card in the deck to use as the starting discard card.
 * Returns the starting card and the remaining deck without that card.
 * @param {import('./types.js').Card[]} deck
 * @returns {{ startCard: import('./types.js').Card, remaining: import('./types.js').Card[] }}
 */
export function findStartingCard(deck) {
  const index = deck.findIndex((card) => card.type === 'number');
  if (index === -1) {
    throw new Error('No number card found in deck for starting card');
  }

  const startCard = deck[index];
  const remaining = [...deck.slice(0, index), ...deck.slice(index + 1)];
  return { startCard, remaining };
}
