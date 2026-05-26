/**
 * DisconnectHandler — manages player disconnect/reconnect logic for UNO No Mercy.
 * Handles Socket.IO disconnect events, 60-second removal timers,
 * rejoin validation, and game pause when < 2 connected players remain.
 */

import { DISCONNECT_TIMEOUT_MS } from './types.js';
import { shuffle } from './deckManager.js';

/**
 * Map of active disconnect timers, keyed by `${roomCode}:${playerId}`.
 * @type {Map<string, NodeJS.Timeout>}
 */
const disconnectTimers = new Map();

/**
 * Build a timer key for a player in a room.
 * @param {string} roomCode
 * @param {string} playerId
 * @returns {string}
 */
function timerKey(roomCode, playerId) {
  return `${roomCode}:${playerId}`;
}

/**
 * Get the number of connected players in a game state.
 * @param {import('./types.js').GameState} gameState
 * @returns {number}
 */
function getConnectedPlayerCount(gameState) {
  return gameState.players.filter((p) => p.isConnected).length;
}

/**
 * Find the room a player belongs to by searching all rooms.
 * @param {import('./roomManager.js').RoomManager} roomManager
 * @param {string} playerId
 * @returns {{ room: import('./types.js').Room, roomCode: string } | null}
 */
function findPlayerRoom(roomManager, playerId) {
  for (const [code, room] of roomManager.rooms) {
    if (room.players.has(playerId)) {
      return { room, roomCode: code };
    }
  }
  return null;
}

/**
 * Build a filtered client game state for a specific player.
 * Hides other players' cards, showing only card counts.
 * @param {import('./types.js').GameState} gameState
 * @param {string} playerId
 * @returns {import('./types.js').ClientGameState}
 */
function buildClientGameState(gameState, playerId) {
  const player = gameState.players.find((p) => p.id === playerId);
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];

  const players = gameState.players.map((p) => ({
    id: p.id,
    name: p.name,
    cardCount: p.hand.length,
    isConnected: p.isConnected,
    isHost: p.isHost,
    hasCalledUno: p.hasCalledUno,
  }));

  return {
    roomCode: gameState.roomCode,
    status: gameState.status,
    myHand: player ? player.hand : [],
    players,
    currentPlayerId: gameState.players[gameState.currentPlayerIndex].id,
    direction: gameState.direction,
    topDiscard,
    activeColor: gameState.activeColor,
    drawPileCount: gameState.drawPile.length,
    stackChain: gameState.stackChain
      ? {
          cumulativeDrawCount: gameState.stackChain.cumulativeDrawCount,
          pendingPlayerId: gameState.stackChain.pendingPlayerId,
        }
      : null,
    canPlay: [],
    canDraw: false,
    canStack: false,
    canCallUno: false,
    winner: gameState.winner,
    scores: gameState.scores,
  };
}

/**
 * Remove a player from the game after disconnect timeout.
 * Redistributes their cards to the draw pile and removes them from the player list.
 * If fewer than 2 players remain, ends the game.
 *
 * @param {object} io - Socket.IO server instance
 * @param {import('./roomManager.js').RoomManager} roomManager
 * @param {string} roomCode
 * @param {string} playerId
 */
function removePlayerFromGame(io, roomManager, roomCode, playerId) {
  const room = roomManager.getRoom(roomCode);
  if (!room || !room.gameState) {
    return;
  }

  const gameState = room.gameState;
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return;
  }

  const removedPlayer = gameState.players[playerIndex];

  // Add the removed player's cards back to the draw pile and shuffle
  const redistributedCards = [...removedPlayer.hand];
  gameState.drawPile = shuffle([...gameState.drawPile, ...redistributedCards]);

  // Remove the player from the game state players array
  gameState.players.splice(playerIndex, 1);

  // Also remove from the room's player map
  room.players.delete(playerId);

  // Adjust currentPlayerIndex if needed
  if (gameState.players.length > 0) {
    if (playerIndex < gameState.currentPlayerIndex) {
      gameState.currentPlayerIndex--;
    } else if (gameState.currentPlayerIndex >= gameState.players.length) {
      gameState.currentPlayerIndex = 0;
    }
  }

  // If the removed player was the pending player in a stack chain, clear the chain
  if (gameState.stackChain && gameState.stackChain.pendingPlayerId === playerId) {
    gameState.stackChain = null;
  }

  // Notify all remaining players
  io.to(roomCode).emit('player_removed', {
    playerId,
    playerName: removedPlayer.name,
    cardsRedistributed: redistributedCards.length,
  });

  // Check if fewer than 2 players remain — end the game
  if (gameState.players.length < 2) {
    if (gameState.players.length === 1) {
      // Last remaining player wins
      gameState.status = 'finished';
      gameState.winner = gameState.players[0].id;
      gameState.scores = { [gameState.players[0].id]: 0 };

      io.to(roomCode).emit('game_over', {
        winner: gameState.winner,
        scores: gameState.scores,
        reason: 'all_opponents_disconnected',
      });
    } else {
      // No players left — destroy the room
      roomManager.destroyRoom(roomCode);
    }
    return;
  }

  // Broadcast updated game state to remaining players
  for (const player of gameState.players) {
    const playerInfo = room.players.get(player.id);
    if (playerInfo && player.isConnected) {
      const clientState = buildClientGameState(gameState, player.id);
      io.to(playerInfo.socketId).emit('game_state_update', clientState);
    }
  }
}

/**
 * Set up disconnect and reconnect handlers for a socket connection.
 *
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - The connected socket
 * @param {import('./roomManager.js').RoomManager} roomManager
 * @param {import('./timerService.js').TimerService} timerService
 */
export function setupDisconnectHandlers(io, socket, roomManager, timerService) {
  /**
   * Handle socket disconnect event.
   * Marks the player as disconnected, records timestamp, notifies others,
   * and starts a 60-second removal timer.
   */
  socket.on('disconnect', () => {
    const playerId = socket.playerId;
    if (!playerId) {
      return;
    }

    // Find the room this player belongs to
    const result = findPlayerRoom(roomManager, playerId);
    if (!result) {
      return;
    }

    const { room, roomCode } = result;

    // If game is in progress, mark player as disconnected in game state
    if (room.gameState && room.status === 'in_progress') {
      const gameState = room.gameState;
      const player = gameState.players.find((p) => p.id === playerId);

      if (player) {
        player.isConnected = false;
        player.disconnectedAt = Date.now();

        // Notify other players
        io.to(roomCode).emit('player_disconnected', {
          playerId,
          playerName: player.name,
        });

        // Check if game should be paused (< 2 connected players)
        const connectedCount = getConnectedPlayerCount(gameState);
        if (connectedCount < 2) {
          io.to(roomCode).emit('game_paused', {
            reason: 'insufficient_players',
            connectedCount,
          });
        }

        // If it's the disconnected player's turn, advance to next connected player
        if (gameState.players[gameState.currentPlayerIndex].id === playerId) {
          // Cancel any active turn timer for this player
          timerService.cancelTimer(roomCode, playerId);

          // Find next connected player
          const players = gameState.players;
          const count = players.length;
          let nextIndex = ((gameState.currentPlayerIndex + gameState.direction) % count + count) % count;
          let attempts = 0;
          while (!players[nextIndex].isConnected && attempts < count) {
            nextIndex = ((nextIndex + gameState.direction) % count + count) % count;
            attempts++;
          }

          // Only advance if we found a connected player
          if (players[nextIndex].isConnected) {
            gameState.currentPlayerIndex = nextIndex;

            // Broadcast updated state
            for (const p of gameState.players) {
              const pInfo = room.players.get(p.id);
              if (pInfo && p.isConnected) {
                const clientState = buildClientGameState(gameState, p.id);
                io.to(pInfo.socketId).emit('game_state_update', clientState);
              }
            }
          }
        }

        // Start 60-second removal timer
        const key = timerKey(roomCode, playerId);
        // Clear any existing timer for this player
        if (disconnectTimers.has(key)) {
          clearTimeout(disconnectTimers.get(key));
        }

        const timer = setTimeout(() => {
          disconnectTimers.delete(key);
          removePlayerFromGame(io, roomManager, roomCode, playerId);
        }, DISCONNECT_TIMEOUT_MS);

        disconnectTimers.set(key, timer);
      }
    } else {
      // In lobby state, just notify others that the player left
      io.to(roomCode).emit('player_disconnected', {
        playerId,
      });
    }
  });

  /**
   * Handle rejoin_room event.
   * Validates the player existed, checks the 60-second window,
   * restores connection state, and sends full game state to the reconnected player.
   */
  socket.on('rejoin_room', ({ roomCode, playerId }) => {
    if (!roomCode || !playerId) {
      socket.emit('error', {
        code: 'INVALID_REJOIN',
        message: 'Room code and player ID are required.',
      });
      return;
    }

    const room = roomManager.getRoom(roomCode);
    if (!room) {
      socket.emit('error', {
        code: 'ROOM_NOT_FOUND',
        message: 'Room does not exist or has been destroyed.',
      });
      return;
    }

    // Check if the player exists in the room
    const playerInfo = room.players.get(playerId);
    if (!playerInfo) {
      socket.emit('error', {
        code: 'PLAYER_NOT_FOUND',
        message: 'Player not found in this room.',
      });
      return;
    }

    // If game is in progress, validate the reconnection window
    if (room.gameState && room.status === 'in_progress') {
      const gameState = room.gameState;
      const player = gameState.players.find((p) => p.id === playerId);

      if (!player) {
        socket.emit('error', {
          code: 'PLAYER_NOT_FOUND',
          message: 'Player has been removed from the game.',
        });
        return;
      }

      // Check if the player is actually disconnected
      if (player.isConnected) {
        socket.emit('error', {
          code: 'ALREADY_CONNECTED',
          message: 'Player is already connected.',
        });
        return;
      }

      // Check the 60-second reconnection window
      if (player.disconnectedAt !== null) {
        const elapsed = Date.now() - player.disconnectedAt;
        if (elapsed > DISCONNECT_TIMEOUT_MS) {
          socket.emit('error', {
            code: 'SESSION_EXPIRED',
            message: 'Reconnection window has expired. You have been removed from the game.',
          });
          return;
        }
      }

      // Restore the player's connection
      player.isConnected = true;
      player.disconnectedAt = null;

      // Update the socket ID in the room's player map
      playerInfo.socketId = socket.id;

      // Associate playerId with this socket
      socket.playerId = playerId;

      // Join the socket to the room
      socket.join(roomCode);

      // Cancel the removal timer
      const key = timerKey(roomCode, playerId);
      if (disconnectTimers.has(key)) {
        clearTimeout(disconnectTimers.get(key));
        disconnectTimers.delete(key);
      }

      // Send full game state to the reconnected player
      const clientState = buildClientGameState(gameState, playerId);
      socket.emit('game_state_update', clientState);

      // Notify other players that this player reconnected
      socket.to(roomCode).emit('player_reconnected', {
        playerId,
        playerName: player.name,
      });

      // Check if game was paused and can now resume
      const connectedCount = getConnectedPlayerCount(gameState);
      if (connectedCount >= 2) {
        io.to(roomCode).emit('game_resumed', {
          connectedCount,
        });
      }
    } else {
      // Lobby state: just rejoin the room
      playerInfo.socketId = socket.id;
      socket.playerId = playerId;
      socket.join(roomCode);

      socket.emit('room_joined', {
        roomCode,
        players: Array.from(room.players.values()).map((p) => ({
          id: p.id,
          name: p.name,
        })),
      });

      socket.to(roomCode).emit('player_reconnected', {
        playerId,
        playerName: playerInfo.name,
      });
    }
  });
}

/**
 * Cancel a disconnect timer for a player (used externally if needed).
 * @param {string} roomCode
 * @param {string} playerId
 */
export function cancelDisconnectTimer(roomCode, playerId) {
  const key = timerKey(roomCode, playerId);
  if (disconnectTimers.has(key)) {
    clearTimeout(disconnectTimers.get(key));
    disconnectTimers.delete(key);
  }
}

/**
 * Get the disconnect timers map (for testing purposes).
 * @returns {Map<string, NodeJS.Timeout>}
 */
export function getDisconnectTimers() {
  return disconnectTimers;
}
