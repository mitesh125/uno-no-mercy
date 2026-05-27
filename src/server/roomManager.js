/**
 * RoomManager — manages room lifecycle for UNO No Mercy.
 * Handles room creation, player join/leave, host reassignment, and game start.
 */

import { validateDisplayName, generateRoomCode, isValidRoomCode, isDuplicateName } from './validation.js';
import { initializeGame } from './gameEngine.js';
import { RoomError, MAX_PLAYERS } from './types.js';

/**
 * RoomManager class that holds all active rooms and provides
 * methods for room lifecycle management.
 */
export class RoomManager {
  constructor() {
    /** @type {Map<string, import('./types.js').Room>} */
    this.rooms = new Map();
  }

  /**
   * Create a new room with the given host.
   * Generates a unique room code and creates the room in lobby state.
   *
   * @param {string} hostId - The player ID of the host
   * @param {string} hostName - The display name of the host
   * @returns {{ ok: true, value: import('./types.js').Room } | { ok: false, error: string }}
   */
  createRoom(hostId, hostName) {
    // Validate host name
    const nameResult = validateDisplayName(hostName);
    if (!nameResult.ok) {
      return { ok: false, error: RoomError.INVALID_NAME };
    }

    // Generate a unique room code (retry if collision)
    let code = generateRoomCode();
    let attempts = 0;
    while (this.rooms.has(code) && attempts < 100) {
      code = generateRoomCode();
      attempts++;
    }

    if (this.rooms.has(code)) {
      // Extremely unlikely, but handle gracefully
      return { ok: false, error: RoomError.INVALID_ROOM_CODE };
    }

    const now = Date.now();

    /** @type {import('./types.js').PlayerInfo} */
    const hostPlayer = {
      id: hostId,
      name: nameResult.value,
      socketId: hostId, // Default socketId to hostId; can be updated later
      joinedAt: now,
    };

    /** @type {import('./types.js').Room} */
    const room = {
      code,
      hostId,
      players: new Map([[hostId, hostPlayer]]),
      status: 'lobby',
      gameState: null,
      createdAt: now,
      lastActivityAt: now,
    };

    this.rooms.set(code, room);

    return { ok: true, value: room };
  }

  /**
   * Join an existing room.
   * Validates room code, capacity, game status, duplicate player, and name.
   *
   * @param {string} roomCode - The room code to join
   * @param {string} playerId - The player ID
   * @param {string} playerName - The display name
   * @returns {{ ok: true, value: import('./types.js').Room } | { ok: false, error: string }}
   */
  joinRoom(roomCode, playerId, playerName) {
    // Validate room code format
    if (!isValidRoomCode(roomCode)) {
      return { ok: false, error: RoomError.INVALID_ROOM_CODE };
    }

    // Check room exists
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { ok: false, error: RoomError.ROOM_NOT_FOUND };
    }

    // Check game status
    if (room.status !== 'lobby') {
      return { ok: false, error: RoomError.GAME_IN_PROGRESS };
    }

    // Check capacity
    if (room.players.size >= MAX_PLAYERS) {
      return { ok: false, error: RoomError.ROOM_FULL };
    }

    // Check duplicate player
    if (room.players.has(playerId)) {
      return { ok: false, error: RoomError.ALREADY_IN_ROOM };
    }

    // Validate name
    const nameResult = validateDisplayName(playerName);
    if (!nameResult.ok) {
      return { ok: false, error: RoomError.INVALID_NAME };
    }

    // Check duplicate name (case-insensitive)
    const existingNames = Array.from(room.players.values()).map(p => p.name);
    if (isDuplicateName(nameResult.value, existingNames)) {
      return { ok: false, error: RoomError.NAME_TAKEN };
    }

    const now = Date.now();

    /** @type {import('./types.js').PlayerInfo} */
    const player = {
      id: playerId,
      name: nameResult.value,
      socketId: playerId, // Default socketId to playerId
      joinedAt: now,
    };

    room.players.set(playerId, player);
    room.lastActivityAt = now;

    return { ok: true, value: room };
  }

  /**
   * Remove a player from a room.
   * Handles host reassignment (earliest joiner) and destroys room if empty.
   *
   * @param {string} roomCode - The room code
   * @param {string} playerId - The player ID to remove
   * @returns {{ ok: true, value: import('./types.js').Room | null } | { ok: false, error: string }}
   */
  leaveRoom(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { ok: false, error: RoomError.ROOM_NOT_FOUND };
    }

    if (!room.players.has(playerId)) {
      return { ok: false, error: RoomError.ROOM_NOT_FOUND };
    }

    // Remove the player
    room.players.delete(playerId);
    room.lastActivityAt = Date.now();

    // If room is now empty, destroy it
    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
      return { ok: true, value: null };
    }

    // If the leaving player was the host, reassign to earliest joiner
    if (room.hostId === playerId) {
      let earliestPlayer = null;
      let earliestTime = Infinity;

      for (const [, player] of room.players) {
        if (player.joinedAt < earliestTime) {
          earliestTime = player.joinedAt;
          earliestPlayer = player;
        }
      }

      if (earliestPlayer) {
        room.hostId = earliestPlayer.id;
      }
    }

    return { ok: true, value: room };
  }

  /**
   * Start the game in a room.
   * Validates that the requester is the host and there are at least 2 players.
   *
   * @param {string} roomCode - The room code
   * @param {string} requesterId - The player ID requesting game start
   * @returns {{ ok: true, value: import('./types.js').GameState } | { ok: false, error: string }}
   */
  startGame(roomCode, requesterId) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { ok: false, error: RoomError.ROOM_NOT_FOUND };
    }

    // Validate requester is host
    if (room.hostId !== requesterId) {
      return { ok: false, error: RoomError.ROOM_NOT_FOUND };
    }

    // Validate at least 2 players
    if (room.players.size < 2) {
      return { ok: false, error: RoomError.INSUFFICIENT_PLAYERS };
    }

    // Build players array for game initialization
    const players = Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.id === room.hostId,
    }));

    // Initialize game via GameEngine
    const gameState = initializeGame(players);
    gameState.roomCode = roomCode;

    // Update room state
    room.status = 'in_progress';
    room.gameState = gameState;
    room.lastActivityAt = Date.now();

    return { ok: true, value: gameState };
  }

  /**
   * Get a room by its code.
   *
   * @param {string} roomCode - The room code
   * @returns {import('./types.js').Room | null}
   */
  getRoom(roomCode) {
    return this.rooms.get(roomCode) || null;
  }

  /**
   * Destroy a room, cleaning up all state.
   *
   * @param {string} roomCode - The room code to destroy
   */
  destroyRoom(roomCode) {
    this.rooms.delete(roomCode);
  }
}
