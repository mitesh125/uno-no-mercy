import { io } from 'socket.io-client';

const SERVER_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : window.location.origin;

let socket = null;

/**
 * Connect to the Socket.IO server.
 * If already connected, returns the existing socket.
 */
export function connect() {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(SERVER_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

/**
 * Disconnect from the Socket.IO server.
 */
export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Check if the socket is currently connected.
 * @returns {boolean}
 */
export function isConnected() {
  return socket !== null && socket.connected;
}

/**
 * Register a listener for a server event.
 * @param {string} event - The event name
 * @param {Function} callback - The callback function
 */
export function on(event, callback) {
  if (socket) {
    socket.on(event, callback);
  }
}

/**
 * Remove a listener for a server event.
 * @param {string} event - The event name
 * @param {Function} callback - The callback function
 */
export function off(event, callback) {
  if (socket) {
    socket.off(event, callback);
  }
}

// --- Game Actions (Client → Server) ---

/**
 * Create a new room.
 * @param {string} playerName
 */
export function createRoom(playerName) {
  socket.emit('create_room', { playerName });
}

/**
 * Join an existing room.
 * @param {string} roomCode
 * @param {string} playerName
 */
export function joinRoom(roomCode, playerName) {
  socket.emit('join_room', { roomCode, playerName });
}

/**
 * Start the game (host only).
 */
export function startGame() {
  socket.emit('start_game');
}

/**
 * Play a card from hand.
 * @param {string} cardId
 * @param {string|null} chosenColor - Required for wild cards
 */
export function playCard(cardId, chosenColor) {
  socket.emit('play_card', { cardId, chosenColor });
}

/**
 * Draw a card from the draw pile.
 */
export function drawCard() {
  socket.emit('draw_card');
}

/**
 * Stack a draw card on top of an incoming draw card.
 * @param {string} cardId
 */
export function stackCard(cardId) {
  socket.emit('stack_card', { cardId });
}

/**
 * Accept the cumulative draw penalty.
 */
export function acceptDraw() {
  socket.emit('accept_draw');
}

/**
 * Call UNO when you have one card left.
 */
export function callUno() {
  socket.emit('call_uno');
}

/**
 * Challenge another player who didn't call UNO.
 * @param {string} targetPlayerId
 */
export function challengeUno(targetPlayerId) {
  socket.emit('challenge_uno', { targetPlayerId });
}

/**
 * Execute a Color Remap action.
 * @param {string} color - The color to swap
 * @param {string} targetPlayerId - The target player
 */
export function colorRemap(color, targetPlayerId) {
  socket.emit('color_remap', { color, targetPlayerId });
}

/**
 * Leave the current room.
 */
export function leaveRoom() {
  socket.emit('leave_room');
}
