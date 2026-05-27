import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../src/server/roomManager.js';
import { RoomError, MAX_PLAYERS } from '../../src/server/types.js';

describe('RoomManager', () => {
  let manager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  describe('createRoom', () => {
    it('returns a valid room code and sets host', () => {
      const result = manager.createRoom('host-1', 'Alice');

      expect(result.ok).toBe(true);
      expect(result.value.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(result.value.hostId).toBe('host-1');
      expect(result.value.players.size).toBe(1);
      expect(result.value.players.get('host-1').name).toBe('Alice');
      expect(result.value.status).toBe('lobby');
      expect(result.value.gameState).toBeNull();
    });

    it('rejects invalid host name', () => {
      const result = manager.createRoom('host-1', 'A'); // too short
      expect(result.ok).toBe(false);
      expect(result.error).toBe(RoomError.INVALID_NAME);
    });
  });

  describe('joinRoom', () => {
    it('adds the player to the room', () => {
      const createResult = manager.createRoom('host-1', 'Alice');
      const roomCode = createResult.value.code;

      const joinResult = manager.joinRoom(roomCode, 'player-2', 'Bob');

      expect(joinResult.ok).toBe(true);
      expect(joinResult.value.players.size).toBe(2);
      expect(joinResult.value.players.get('player-2').name).toBe('Bob');
    });

    it('rejects joining a full room', () => {
      const createResult = manager.createRoom('host-1', 'Player01');
      const roomCode = createResult.value.code;

      // Fill the room to MAX_PLAYERS
      for (let i = 2; i <= MAX_PLAYERS; i++) {
        const res = manager.joinRoom(roomCode, `player-${i}`, `Player${String(i).padStart(2, '0')}`);
        expect(res.ok).toBe(true);
      }

      // Try to add one more
      const result = manager.joinRoom(roomCode, 'player-extra', 'ExtraPlayer');
      expect(result.ok).toBe(false);
      expect(result.error).toBe(RoomError.ROOM_FULL);
    });

    it('rejects joining with a duplicate name (case-insensitive)', () => {
      const createResult = manager.createRoom('host-1', 'Alice');
      const roomCode = createResult.value.code;

      const result = manager.joinRoom(roomCode, 'player-2', 'alice');
      expect(result.ok).toBe(false);
      expect(result.error).toBe(RoomError.NAME_TAKEN);
    });

    it('rejects invalid room code format', () => {
      const result = manager.joinRoom('bad', 'player-1', 'Bob');
      expect(result.ok).toBe(false);
      expect(result.error).toBe(RoomError.INVALID_ROOM_CODE);
    });

    it('rejects non-existent room code', () => {
      const result = manager.joinRoom('ZZZZZZ', 'player-1', 'Bob');
      expect(result.ok).toBe(false);
      expect(result.error).toBe(RoomError.ROOM_NOT_FOUND);
    });

    it('rejects duplicate player ID', () => {
      const createResult = manager.createRoom('host-1', 'Alice');
      const roomCode = createResult.value.code;

      const result = manager.joinRoom(roomCode, 'host-1', 'Bob');
      expect(result.ok).toBe(false);
      expect(result.error).toBe(RoomError.ALREADY_IN_ROOM);
    });

    it('rejects joining a game in progress', () => {
      const createResult = manager.createRoom('host-1', 'Alice');
      const roomCode = createResult.value.code;
      manager.joinRoom(roomCode, 'player-2', 'Bob');
      manager.startGame(roomCode, 'host-1');

      const result = manager.joinRoom(roomCode, 'player-3', 'Charlie');
      expect(result.ok).toBe(false);
      expect(result.error).toBe(RoomError.GAME_IN_PROGRESS);
    });
  });

  describe('leaveRoom', () => {
    it('removes the player from the room', () => {
      const createResult = manager.createRoom('host-1', 'Alice');
      const roomCode = createResult.value.code;
      manager.joinRoom(roomCode, 'player-2', 'Bob');

      const result = manager.leaveRoom(roomCode, 'player-2');

      expect(result.ok).toBe(true);
      expect(result.value.players.size).toBe(1);
      expect(result.value.players.has('player-2')).toBe(false);
    });

    it('destroys room when last player leaves', () => {
      const createResult = manager.createRoom('host-1', 'Alice');
      const roomCode = createResult.value.code;

      const result = manager.leaveRoom(roomCode, 'host-1');

      expect(result.ok).toBe(true);
      expect(result.value).toBeNull();
      expect(manager.getRoom(roomCode)).toBeNull();
    });

    it('reassigns host to earliest joiner when host leaves', () => {
      const createResult = manager.createRoom('host-1', 'Alice');
      const roomCode = createResult.value.code;

      // Add players with slight time differences
      manager.joinRoom(roomCode, 'player-2', 'Bob');
      manager.joinRoom(roomCode, 'player-3', 'Charlie');

      const result = manager.leaveRoom(roomCode, 'host-1');

      expect(result.ok).toBe(true);
      // player-2 joined before player-3, so player-2 should be new host
      expect(result.value.hostId).toBe('player-2');
    });
  });

  describe('startGame', () => {
    it('rejects starting with fewer than 2 players', () => {
      const createResult = manager.createRoom('host-1', 'Alice');
      const roomCode = createResult.value.code;

      const result = manager.startGame(roomCode, 'host-1');

      expect(result.ok).toBe(false);
      expect(result.error).toBe(RoomError.INSUFFICIENT_PLAYERS);
    });

    it('succeeds with 2 or more players', () => {
      const createResult = manager.createRoom('host-1', 'Alice');
      const roomCode = createResult.value.code;
      manager.joinRoom(roomCode, 'player-2', 'Bob');

      const result = manager.startGame(roomCode, 'host-1');

      expect(result.ok).toBe(true);
      expect(result.value.status).toBe('in_progress');
      expect(result.value.players.length).toBe(2);
      expect(result.value.roomCode).toBe(roomCode);

      // Room status should be updated
      const room = manager.getRoom(roomCode);
      expect(room.status).toBe('in_progress');
      expect(room.gameState).not.toBeNull();
    });

    it('rejects non-host from starting the game', () => {
      const createResult = manager.createRoom('host-1', 'Alice');
      const roomCode = createResult.value.code;
      manager.joinRoom(roomCode, 'player-2', 'Bob');

      const result = manager.startGame(roomCode, 'player-2');

      expect(result.ok).toBe(false);
    });
  });

  describe('getRoom', () => {
    it('returns room when it exists', () => {
      const createResult = manager.createRoom('host-1', 'Alice');
      const roomCode = createResult.value.code;

      const room = manager.getRoom(roomCode);
      expect(room).not.toBeNull();
      expect(room.code).toBe(roomCode);
    });

    it('returns null for non-existent room', () => {
      const room = manager.getRoom('ZZZZZZ');
      expect(room).toBeNull();
    });
  });

  describe('destroyRoom', () => {
    it('removes the room completely', () => {
      const createResult = manager.createRoom('host-1', 'Alice');
      const roomCode = createResult.value.code;

      manager.destroyRoom(roomCode);

      expect(manager.getRoom(roomCode)).toBeNull();
    });
  });
});
