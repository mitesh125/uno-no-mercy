import { describe, it, expect } from 'vitest';
import {
  createDeck,
  shuffle,
  deal,
  drawFromPile,
  findStartingCard,
} from '../../src/server/deckManager.js';
import { COLORS, TOTAL_DECK_SIZE, CARDS_PER_PLAYER } from '../../src/server/types.js';

describe('DeckManager', () => {
  describe('createDeck', () => {
    it('should produce exactly 122 cards', () => {
      const deck = createDeck();
      expect(deck.length).toBe(TOTAL_DECK_SIZE);
    });

    it('should have 4 number-0 cards (one per color)', () => {
      const deck = createDeck();
      const zeros = deck.filter((c) => c.type === 'number' && c.value === 0);
      expect(zeros.length).toBe(4);
      for (const color of COLORS) {
        expect(zeros.filter((c) => c.color === color).length).toBe(1);
      }
    });

    it('should have 72 number cards for values 1-9 (2 per color per value)', () => {
      const deck = createDeck();
      const numbers1to9 = deck.filter((c) => c.type === 'number' && c.value >= 1 && c.value <= 9);
      expect(numbers1to9.length).toBe(72);
      for (const color of COLORS) {
        for (let v = 1; v <= 9; v++) {
          const matches = numbers1to9.filter((c) => c.color === color && c.value === v);
          expect(matches.length).toBe(2);
        }
      }
    });

    it('should have 8 skip cards (2 per color)', () => {
      const deck = createDeck();
      const skips = deck.filter((c) => c.type === 'skip');
      expect(skips.length).toBe(8);
      for (const color of COLORS) {
        expect(skips.filter((c) => c.color === color).length).toBe(2);
      }
    });

    it('should have 8 reverse cards (2 per color)', () => {
      const deck = createDeck();
      const reverses = deck.filter((c) => c.type === 'reverse');
      expect(reverses.length).toBe(8);
      for (const color of COLORS) {
        expect(reverses.filter((c) => c.color === color).length).toBe(2);
      }
    });

    it('should have 8 draw-2 cards (2 per color)', () => {
      const deck = createDeck();
      const draw2s = deck.filter((c) => c.type === 'draw2');
      expect(draw2s.length).toBe(8);
      for (const color of COLORS) {
        expect(draw2s.filter((c) => c.color === color).length).toBe(2);
      }
    });

    it('should have 4 wild cards', () => {
      const deck = createDeck();
      const wilds = deck.filter((c) => c.type === 'wild');
      expect(wilds.length).toBe(4);
      wilds.forEach((c) => expect(c.color).toBeNull());
    });

    it('should have 4 wild draw-4 cards', () => {
      const deck = createDeck();
      const wd4s = deck.filter((c) => c.type === 'wild_draw4');
      expect(wd4s.length).toBe(4);
      wd4s.forEach((c) => expect(c.color).toBeNull());
    });

    it('should have 4 skip-everyone cards', () => {
      const deck = createDeck();
      const skipAll = deck.filter((c) => c.type === 'skip_everyone');
      expect(skipAll.length).toBe(4);
      skipAll.forEach((c) => expect(c.color).toBeNull());
    });

    it('should have 4 draw-6 cards', () => {
      const deck = createDeck();
      const draw6s = deck.filter((c) => c.type === 'draw6');
      expect(draw6s.length).toBe(4);
      draw6s.forEach((c) => expect(c.color).toBeNull());
    });

    it('should have 2 draw-10 cards', () => {
      const deck = createDeck();
      const draw10s = deck.filter((c) => c.type === 'draw10');
      expect(draw10s.length).toBe(2);
      draw10s.forEach((c) => expect(c.color).toBeNull());
    });

    it('should have 4 color-remap cards', () => {
      const deck = createDeck();
      const remaps = deck.filter((c) => c.type === 'color_remap');
      expect(remaps.length).toBe(4);
      remaps.forEach((c) => expect(c.color).toBeNull());
    });

    it('should have unique IDs for all cards', () => {
      const deck = createDeck();
      const ids = deck.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(deck.length);
    });
  });

  describe('shuffle', () => {
    it('should return the same number of cards', () => {
      const deck = createDeck();
      const shuffled = shuffle([...deck]);
      expect(shuffled.length).toBe(deck.length);
    });

    it('should contain the same cards after shuffling', () => {
      const deck = createDeck();
      const copy = [...deck];
      shuffle(copy);
      const originalIds = new Set(deck.map((c) => c.id));
      const shuffledIds = new Set(copy.map((c) => c.id));
      expect(shuffledIds).toEqual(originalIds);
    });

    it('should mutate the array in-place and return it', () => {
      const deck = createDeck();
      const result = shuffle(deck);
      expect(result).toBe(deck);
    });
  });

  describe('deal', () => {
    it('should deal the correct number of cards to each player', () => {
      const deck = createDeck();
      const { hands, remaining } = deal(deck, 4, CARDS_PER_PLAYER);
      expect(hands.length).toBe(4);
      for (const hand of hands) {
        expect(hand.length).toBe(CARDS_PER_PLAYER);
      }
      expect(remaining.length).toBe(TOTAL_DECK_SIZE - 4 * CARDS_PER_PLAYER);
    });

    it('should conserve total card count', () => {
      const deck = createDeck();
      const { hands, remaining } = deal(deck, 6, CARDS_PER_PLAYER);
      const totalDealt = hands.reduce((sum, h) => sum + h.length, 0);
      expect(totalDealt + remaining.length).toBe(TOTAL_DECK_SIZE);
    });

    it('should deal cards in round-robin order', () => {
      const deck = createDeck();
      const { hands } = deal(deck, 3, 2);
      // First round: cards 0, 1, 2 go to players 0, 1, 2
      // Second round: cards 3, 4, 5 go to players 0, 1, 2
      expect(hands[0][0]).toEqual(deck[0]);
      expect(hands[1][0]).toEqual(deck[1]);
      expect(hands[2][0]).toEqual(deck[2]);
      expect(hands[0][1]).toEqual(deck[3]);
      expect(hands[1][1]).toEqual(deck[4]);
      expect(hands[2][1]).toEqual(deck[5]);
    });
  });

  describe('drawFromPile', () => {
    it('should draw the requested number of cards', () => {
      const deck = createDeck();
      const drawPile = deck.slice(0, 50);
      const discardPile = deck.slice(50);
      const { drawn, newDrawPile } = drawFromPile(drawPile, discardPile, 3);
      expect(drawn.length).toBe(3);
      expect(newDrawPile.length).toBe(47);
    });

    it('should reshuffle discard into draw pile when draw pile is empty', () => {
      const deck = createDeck();
      const drawPile = deck.slice(0, 2);
      const discardPile = deck.slice(2, 20); // 18 cards in discard
      const { drawn, newDrawPile, newDiscardPile } = drawFromPile(drawPile, discardPile, 5);
      expect(drawn.length).toBe(5);
      // After reshuffle, discard pile should only have its top card
      expect(newDiscardPile.length).toBe(1);
      // Total cards should be conserved
      const totalBefore = drawPile.length + discardPile.length;
      const totalAfter = drawn.length + newDrawPile.length + newDiscardPile.length;
      expect(totalAfter).toBe(totalBefore);
    });

    it('should stop drawing if both piles are exhausted', () => {
      const deck = createDeck();
      const drawPile = deck.slice(0, 2);
      const discardPile = [deck[2]]; // Only 1 card in discard (the top card, can't reshuffle)
      const { drawn } = drawFromPile(drawPile, discardPile, 5);
      expect(drawn.length).toBe(2); // Can only draw what's in draw pile
    });
  });

  describe('findStartingCard', () => {
    it('should find a number card', () => {
      const deck = createDeck();
      const { startCard, remaining } = findStartingCard(deck);
      expect(startCard.type).toBe('number');
      expect(remaining.length).toBe(deck.length - 1);
    });

    it('should remove the starting card from the remaining deck', () => {
      const deck = createDeck();
      const { startCard, remaining } = findStartingCard(deck);
      expect(remaining.find((c) => c.id === startCard.id)).toBeUndefined();
    });

    it('should find a number card even if first cards are action cards', () => {
      const deck = createDeck();
      // Put action cards at the front
      const actionCards = deck.filter((c) => c.type !== 'number');
      const numberCards = deck.filter((c) => c.type === 'number');
      const reordered = [...actionCards, ...numberCards];
      const { startCard } = findStartingCard(reordered);
      expect(startCard.type).toBe('number');
    });

    it('should throw if no number card exists', () => {
      const allWilds = Array.from({ length: 4 }, (_, i) => ({
        id: `wild-${i}`,
        type: 'wild',
        color: null,
        value: null,
      }));
      expect(() => findStartingCard(allWilds)).toThrow('No number card found');
    });
  });
});
