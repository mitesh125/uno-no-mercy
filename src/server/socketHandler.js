/**
 * Socket.IO event handler — routes client events to game logic
 * and broadcasts server events back to players.
 */

import {
  playCard,
  drawCard,
  stackCard,
  acceptDraw,
  callUno,
  challengeUno,
  colorRemap,
  getPlayableCards,
} from './gameEngine.js';

/**
 * Filter the full GameState into a ClientGameState for a specific player.
 * Hides other players' cards, exposing only card counts.
 *
 * @param {import('./types.js').GameState} gameState - Full server-side game state
 * @param {string} playerId - The player to filter for
 * @returns {import('./types.js').ClientGameState}
 */
export function filterStateForPlayer(gameState, playerId) {
  const myPlayer = gameState.players.find((p) => p.id === playerId);
  const myHand = myPlayer ? myPlayer.hand : [];

  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
  const currentPlayerId = gameState.players[gameState.currentPlayerIndex].id;

  // Compute playable cards for this player
  const playableCards = getPlayableCards(myHand, topDiscard, gameState.activeColor, gameState.stackChain);
  const canPlay = playableCards.map((c) => c.id);

  // Determine action permissions
  const isMyTurn = currentPlayerId === playerId;
  const canDraw = isMyTurn && gameState.stackChain === null && gameState.status === 'in_progress';
  const canStack =
    gameState.stackChain !== null &&
    gameState.stackChain.pendingPlayerId === playerId &&
    playableCards.length > 0;
  const canCallUno = myHand.length === 2 && isMyTurn && !(myPlayer && myPlayer.hasCalledUno);

  // Build players array with card counts instead of hands
  const players = gameState.players.map((p) => ({
    id: p.id,
    name: p.name,
    cardCount: p.hand.length,
    isConnected: p.isConnected,
    isHost: p.isHost,
    hasCalledUno: p.hasCalledUno,
  }));

  // Simplified stack chain (no card details)
  const stackChain = gameState.stackChain
    ? {
        cumulativeDrawCount: gameState.stackChain.cumulativeDrawCount,
        pendingPlayerId: gameState.stackChain.pendingPlayerId,
      }
    : null;

  return {
    roomCode: gameState.roomCode,
    status: gameState.status,
    myHand,
    players,
    currentPlayerId,
    direction: gameState.direction,
    topDiscard,
    activeColor: gameState.activeColor,
    drawPileCount: gameState.drawPile.length,
    stackChain,
    canPlay,
    canDraw,
    canStack,
    canCallUno,
    winner: gameState.winner,
    scores: gameState.scores,
  };
}

/**
 * Broadcast filtered game state to all players in a room.
 *
 * @param {import('socket.io').Server} io - Socket.IO server instance
 * @param {import('./types.js').Room} room - The room containing players
 * @param {import('./types.js').GameState} gameState - Full game state
 * @param {string} event - Event name to emit (e.g., 'game_state_update', 'game_started')
 */
function broadcastFilteredState(io, room, gameState, event) {
  for (const [playerId, playerInfo] of room.players) {
    const filteredState = filterStateForPlayer(gameState, playerId);
    io.to(playerInfo.socketId).emit(event, { gameState: filteredState });
  }
}

/**
 * Set up Socket.IO event handlers for the UNO No Mercy game.
 *
 * @param {import('socket.io').Server} io - Socket.IO server instance
 * @param {import('./roomManager.js').RoomManager} roomManager - Room manager instance
 * @param {import('./timerService.js').TimerService} timerService - Timer service instance
 */
export function setupSocketHandlers(io, roomManager, timerService) {
  /** @type {Map<string, string>} Map of socketId → roomCode */
  const socketRoomMap = new Map();

  io.on('connection', (socket) => {
    // ─── create_room ───────────────────────────────────────────────────────
    socket.on('create_room', ({ playerName }) => {
      const result = roomManager.createRoom(socket.id, playerName);

      if (!result.ok) {
        socket.emit('error', { code: result.error, message: result.error });
        return;
      }

      const room = result.value;

      // Update the host's socketId in the room
      const hostPlayer = room.players.get(socket.id);
      if (hostPlayer) {
        hostPlayer.socketId = socket.id;
      }

      // Join the Socket.IO room
      socket.join(room.code);
      socketRoomMap.set(socket.id, room.code);

      // Build players list for the creator
      const playersList = Array.from(room.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.id === room.hostId,
      }));

      socket.emit('room_created', { roomCode: room.code, playerId: socket.id, players: playersList });
    });

    // ─── join_room ─────────────────────────────────────────────────────────
    socket.on('join_room', ({ roomCode, playerName }) => {
      const result = roomManager.joinRoom(roomCode, socket.id, playerName);

      if (!result.ok) {
        // If game is in progress, try to rejoin by name
        if (result.error === 'GAME_IN_PROGRESS') {
          const room = roomManager.getRoom(roomCode);
          if (room && room.gameState) {
            // Find the player by name (case-insensitive)
            const matchedPlayer = room.gameState.players.find(
              p => p.name.toLowerCase() === playerName.trim().toLowerCase()
            );
            if (matchedPlayer) {
              // Reconnect this player (regardless of current isConnected state)
              matchedPlayer.isConnected = true;
              matchedPlayer.disconnectedAt = null;

              // Update the player's ID in the room map to the new socket ID
              const oldPlayerInfo = room.players.get(matchedPlayer.id);
              if (oldPlayerInfo) {
                room.players.delete(matchedPlayer.id);
                oldPlayerInfo.id = socket.id;
                oldPlayerInfo.socketId = socket.id;
                room.players.set(socket.id, oldPlayerInfo);
              }

              // Update the player ID in game state
              matchedPlayer.id = socket.id;

              // Join the Socket.IO room
              socket.join(room.code);
              socketRoomMap.set(socket.id, room.code);

              // Send game state to the reconnected player
              const filteredState = filterStateForPlayer(room.gameState, socket.id);
              socket.emit('game_started', { gameState: filteredState, playerId: socket.id, roomCode: room.code });

              // Notify others
              socket.to(room.code).emit('player_reconnected', { playerId: socket.id, playerName: matchedPlayer.name });
              return;
            }
          }
        }
        socket.emit('error', { code: result.error, message: result.error });
        return;
      }

      const room = result.value;

      // Update the player's socketId
      const player = room.players.get(socket.id);
      if (player) {
        player.socketId = socket.id;
      }

      // Join the Socket.IO room
      socket.join(room.code);
      socketRoomMap.set(socket.id, room.code);

      // Build players list for the joiner
      const playersList = Array.from(room.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.id === room.hostId,
      }));

      // Emit to the joiner
      socket.emit('room_joined', { roomCode: room.code, playerId: socket.id, players: playersList });

      // Broadcast to others in the room
      socket.to(room.code).emit('player_joined', {
        player: { id: socket.id, name: player ? player.name : playerName, isHost: false },
      });
    });

    // ─── start_game ────────────────────────────────────────────────────────
    socket.on('start_game', () => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Not in a room' });
        return;
      }

      const result = roomManager.startGame(roomCode, socket.id);

      if (!result.ok) {
        socket.emit('error', { code: result.error, message: result.error });
        return;
      }

      const gameState = result.value;
      const room = roomManager.getRoom(roomCode);

      if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        return;
      }

      // Broadcast filtered state to each player
      broadcastFilteredState(io, room, gameState, 'game_started');
    });

    // ─── play_card ─────────────────────────────────────────────────────────
    socket.on('play_card', ({ cardId, chosenColor }) => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Not in a room' });
        return;
      }

      const room = roomManager.getRoom(roomCode);
      if (!room || !room.gameState) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'No active game' });
        return;
      }

      const result = playCard(room.gameState, socket.id, cardId, chosenColor);

      if (!result.ok) {
        socket.emit('error', { code: result.error, message: result.error });
        return;
      }

      room.gameState = result.value;
      room.lastActivityAt = Date.now();

      // Auto-accept: if stack chain targets a player with no valid stacking cards, auto-resolve
      if (room.gameState.stackChain && room.gameState.status === 'in_progress') {
        const pendingId = room.gameState.stackChain.pendingPlayerId;
        const pendingPlayer = room.gameState.players.find(p => p.id === pendingId);
        if (pendingPlayer) {
          const stackableCards = getPlayableCards(
            pendingPlayer.hand,
            room.gameState.discardPile[room.gameState.discardPile.length - 1],
            room.gameState.activeColor,
            room.gameState.stackChain
          );
          if (stackableCards.length === 0) {
            // Auto-accept the draw
            const acceptResult = acceptDraw(room.gameState, pendingId);
            if (acceptResult.ok) {
              room.gameState = acceptResult.value;
            }
          }
        }
      }

      // Broadcast updated state to all players
      broadcastFilteredState(io, room, room.gameState, 'game_state_update');

      // Check for game over
      if (room.gameState.status === 'finished') {
        io.to(roomCode).emit('game_over', {
          winner: room.gameState.winner,
          scores: room.gameState.scores,
        });
      }
    });

    // ─── draw_card ─────────────────────────────────────────────────────────
    socket.on('draw_card', () => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Not in a room' });
        return;
      }

      const room = roomManager.getRoom(roomCode);
      if (!room || !room.gameState) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'No active game' });
        return;
      }

      const result = drawCard(room.gameState, socket.id);

      if (!result.ok) {
        socket.emit('error', { code: result.error, message: result.error });
        return;
      }

      room.gameState = result.value.state;
      room.lastActivityAt = Date.now();

      // Broadcast updated state to all players
      broadcastFilteredState(io, room, room.gameState, 'game_state_update');
    });

    // ─── stack_card ────────────────────────────────────────────────────────
    socket.on('stack_card', ({ cardId }) => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Not in a room' });
        return;
      }

      const room = roomManager.getRoom(roomCode);
      if (!room || !room.gameState) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'No active game' });
        return;
      }

      const result = stackCard(room.gameState, socket.id, cardId);

      if (!result.ok) {
        socket.emit('error', { code: result.error, message: result.error });
        return;
      }

      room.gameState = result.value;
      room.lastActivityAt = Date.now();

      // Auto-accept: if next pending player has no valid stacking cards, auto-resolve
      if (room.gameState.stackChain && room.gameState.status === 'in_progress') {
        const pendingId = room.gameState.stackChain.pendingPlayerId;
        const pendingPlayer = room.gameState.players.find(p => p.id === pendingId);
        if (pendingPlayer) {
          const stackableCards = getPlayableCards(
            pendingPlayer.hand,
            room.gameState.discardPile[room.gameState.discardPile.length - 1],
            room.gameState.activeColor,
            room.gameState.stackChain
          );
          if (stackableCards.length === 0) {
            const acceptResult = acceptDraw(room.gameState, pendingId);
            if (acceptResult.ok) {
              room.gameState = acceptResult.value;
            }
          }
        }
      }

      // Broadcast updated state to all players
      broadcastFilteredState(io, room, room.gameState, 'game_state_update');
    });

    // ─── accept_draw ───────────────────────────────────────────────────────
    socket.on('accept_draw', () => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Not in a room' });
        return;
      }

      const room = roomManager.getRoom(roomCode);
      if (!room || !room.gameState) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'No active game' });
        return;
      }

      const result = acceptDraw(room.gameState, socket.id);

      if (!result.ok) {
        socket.emit('error', { code: result.error, message: result.error });
        return;
      }

      room.gameState = result.value;
      room.lastActivityAt = Date.now();

      // Broadcast updated state to all players
      broadcastFilteredState(io, room, room.gameState, 'game_state_update');
    });

    // ─── call_uno ──────────────────────────────────────────────────────────
    socket.on('call_uno', () => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Not in a room' });
        return;
      }

      const room = roomManager.getRoom(roomCode);
      if (!room || !room.gameState) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'No active game' });
        return;
      }

      const result = callUno(room.gameState, socket.id);

      if (!result.ok) {
        socket.emit('error', { code: result.error, message: result.error });
        return;
      }

      room.gameState = result.value;
      room.lastActivityAt = Date.now();

      // Broadcast uno_called to all players in the room
      io.to(roomCode).emit('uno_called', { playerId: socket.id });
    });

    // ─── challenge_uno ─────────────────────────────────────────────────────
    socket.on('challenge_uno', ({ targetPlayerId }) => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Not in a room' });
        return;
      }

      const room = roomManager.getRoom(roomCode);
      if (!room || !room.gameState) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'No active game' });
        return;
      }

      const result = challengeUno(room.gameState, socket.id, targetPlayerId);

      if (!result.ok) {
        socket.emit('error', { code: result.error, message: result.error });
        return;
      }

      room.gameState = result.value;
      room.lastActivityAt = Date.now();

      // Broadcast updated state to all players
      broadcastFilteredState(io, room, room.gameState, 'game_state_update');
    });

    // ─── color_remap ───────────────────────────────────────────────────────
    socket.on('color_remap', ({ color, targetPlayerId }) => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Not in a room' });
        return;
      }

      const room = roomManager.getRoom(roomCode);
      if (!room || !room.gameState) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'No active game' });
        return;
      }

      const result = colorRemap(room.gameState, socket.id, color, targetPlayerId);

      if (!result.ok) {
        socket.emit('error', { code: result.error, message: result.error });
        return;
      }

      room.gameState = result.value;
      room.lastActivityAt = Date.now();

      // Broadcast updated state to all players
      broadcastFilteredState(io, room, room.gameState, 'game_state_update');
    });

    // ─── leave_room ────────────────────────────────────────────────────────
    socket.on('leave_room', () => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Not in a room' });
        return;
      }

      const result = roomManager.leaveRoom(roomCode, socket.id);

      if (!result.ok) {
        socket.emit('error', { code: result.error, message: result.error });
        return;
      }

      // Leave the Socket.IO room
      socket.leave(roomCode);
      socketRoomMap.delete(socket.id);

      // If room was destroyed (null), nothing more to broadcast
      if (result.value === null) {
        return;
      }

      const room = result.value;

      // Broadcast player_left to remaining players
      socket.to(roomCode).emit('player_left', {
        playerId: socket.id,
        newHost: room.hostId,
      });
    });

    // ─── disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const roomCode = socketRoomMap.get(socket.id);
      if (!roomCode) {
        return;
      }

      const room = roomManager.getRoom(roomCode);
      if (!room) {
        socketRoomMap.delete(socket.id);
        return;
      }

      // Mark the player as disconnected in game state if game is in progress
      if (room.gameState) {
        const playerState = room.gameState.players.find((p) => p.id === socket.id);
        if (playerState) {
          playerState.isConnected = false;
          playerState.disconnectedAt = Date.now();
        }
      }

      // Broadcast player_disconnected to remaining players
      socket.to(roomCode).emit('player_disconnected', { playerId: socket.id });

      // Clean up the socket-room mapping
      socketRoomMap.delete(socket.id);
    });
  });
}
