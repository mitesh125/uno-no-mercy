import { describe, it, expect } from 'vitest';
import {
  RoomError,
  GameError,
  COLORS,
  CARD_TYPES,
  CARD_POINTS,
  MAX_PLAYERS,
  CARDS_PER_PLAYER,
  TOTAL_DECK_SIZE,
  TURN_TIMER_MS,
  COLOR_SELECTION_TIMER_MS,
  DISCONNECT_TIMEOUT_MS,
} from '@server/types.js';

describe('types.js exports', () => {
  describe('RoomError', () => {
    it('should contain all room error codes', () => {
      expect(RoomError.ROOM_NOT_FOUND).toBe('ROOM_NOT_FOUND');
      expect(RoomError.ROOM_FULL).toBe('ROOM_FULL');
      expect(RoomError.GAME_IN_PROGRESS).toBe('GAME_IN_PROGRESS');
      expect(RoomError.INVALID_ROOM_CODE).toBe('INVALID_ROOM_CODE');
      expect(RoomError.INVALID_NAME).toBe('INVALID_NAME');
      expect(RoomError.NAME_TAKEN).toBe('NAME_TAKEN');
      expect(RoomError.INSUFFICIENT_PLAYERS).toBe('INSUFFICIENT_PLAYERS');
      expect(RoomError.ALREADY_IN_ROOM).toBe('ALREADY_IN_ROOM');
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(RoomError)).toBe(true);
    });
  });

  describe('GameError', () => {
    it('should contain all game error codes', () => {
      expect(GameError.NOT_YOUR_TURN).toBe('NOT_YOUR_TURN');
      expect(GameError.INVALID_PLAY).toBe('INVALID_PLAY');
      expect(GameError.CANNOT_STACK).toBe('CANNOT_STACK');
      expect(GameError.INVALID_COLOR_REMAP).toBe('INVALID_COLOR_REMAP');
      expect(GameError.CONNECTION_TIMEOUT).toBe('CONNECTION_TIMEOUT');
      expect(GameError.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(GameError)).toBe(true);
    });
  });

  describe('Constants', () => {
    it('should export valid COLORS array', () => {
      expect(COLORS).toEqual(['red', 'yellow', 'green', 'blue']);
    });

    it('should export all CARD_TYPES', () => {
      expect(CARD_TYPES).toContain('number');
      expect(CARD_TYPES).toContain('skip');
      expect(CARD_TYPES).toContain('reverse');
      expect(CARD_TYPES).toContain('draw2');
      expect(CARD_TYPES).toContain('wild');
      expect(CARD_TYPES).toContain('wild_draw4');
      expect(CARD_TYPES).toContain('skip_everyone');
      expect(CARD_TYPES).toContain('draw6');
      expect(CARD_TYPES).toContain('draw10');
      expect(CARD_TYPES).toContain('color_remap');
      expect(CARD_TYPES).toHaveLength(10);
    });

    it('should export correct CARD_POINTS', () => {
      expect(CARD_POINTS.skip).toBe(20);
      expect(CARD_POINTS.reverse).toBe(20);
      expect(CARD_POINTS.draw2).toBe(20);
      expect(CARD_POINTS.wild).toBe(50);
      expect(CARD_POINTS.wild_draw4).toBe(50);
      expect(CARD_POINTS.skip_everyone).toBe(50);
      expect(CARD_POINTS.draw6).toBe(50);
      expect(CARD_POINTS.draw10).toBe(50);
      expect(CARD_POINTS.color_remap).toBe(50);
    });

    it('should export correct game constants', () => {
      expect(MAX_PLAYERS).toBe(10);
      expect(CARDS_PER_PLAYER).toBe(7);
      expect(TOTAL_DECK_SIZE).toBe(122);
      expect(TURN_TIMER_MS).toBe(30000);
      expect(COLOR_SELECTION_TIMER_MS).toBe(10000);
      expect(DISCONNECT_TIMEOUT_MS).toBe(60000);
    });
  });
});
