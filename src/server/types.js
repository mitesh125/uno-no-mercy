/**
 * Core data models and type definitions for UNO No Mercy.
 * Uses JSDoc for documentation — no TypeScript.
 */

// ─── Enumerations ────────────────────────────────────────────────────────────

/**
 * Valid card colors.
 * @typedef {'red' | 'yellow' | 'green' | 'blue'} Color
 */

/**
 * All card types in the No Mercy variant.
 * @typedef {'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4' | 'skip_everyone' | 'draw6' | 'draw10' | 'color_remap'} CardType
 */

/**
 * Game status values.
 * @typedef {'lobby' | 'in_progress' | 'finished'} GameStatus
 */

/**
 * Play direction.
 * @typedef {1 | -1} Direction
 */

// ─── Data Models ─────────────────────────────────────────────────────────────

/**
 * Represents a single UNO card.
 * @typedef {Object} Card
 * @property {string} id - Unique identifier (e.g., "red-7-1", "wild-draw4-2")
 * @property {CardType} type - The card type
 * @property {Color | null} color - Card color, null for wild-type cards
 * @property {number | null} value - 0-9 for number cards, null for action/wild
 */

/**
 * Tracks a chain of stacked draw cards.
 * @typedef {Object} StackChain
 * @property {number} cumulativeDrawCount - Total cards the final player must draw
 * @property {string} pendingPlayerId - Player who must stack or accept
 * @property {Card[]} cards - Cards in the stack chain
 */

/**
 * Full server-side state for a single player.
 * @typedef {Object} PlayerState
 * @property {string} id - Unique player identifier
 * @property {string} name - Display name
 * @property {Card[]} hand - Cards in the player's hand
 * @property {boolean} isConnected - Whether the player is currently connected
 * @property {boolean} isHost - Whether this player is the room host
 * @property {boolean} hasCalledUno - Whether the player has called UNO
 * @property {number | null} disconnectedAt - Timestamp of disconnection, null if connected
 */

/**
 * Full server-side game state.
 * @typedef {Object} GameState
 * @property {string} roomCode - The room this game belongs to
 * @property {GameStatus} status - Current game status
 * @property {PlayerState[]} players - All players in the game
 * @property {number} currentPlayerIndex - Index of the current player in the players array
 * @property {Direction} direction - Play direction (1 = clockwise, -1 = counter-clockwise)
 * @property {Card[]} drawPile - Face-down draw pile
 * @property {Card[]} discardPile - Face-up discard pile
 * @property {Color} activeColor - Currently active color
 * @property {StackChain | null} stackChain - Active stack chain, or null
 * @property {{ playerId: string, expiresAt: number } | null} turnTimer - Active turn timer info
 * @property {string | null} winner - Winner's player ID, or null
 * @property {Record<string, number> | null} scores - Final scores, or null
 */

/**
 * Information about a player in a room (lobby-level, before game starts).
 * @typedef {Object} PlayerInfo
 * @property {string} id - Unique player identifier
 * @property {string} name - Display name
 * @property {string} socketId - Socket.IO socket ID
 * @property {number} joinedAt - Timestamp when the player joined
 */

/**
 * A game room.
 * @typedef {Object} Room
 * @property {string} code - 6-character room code
 * @property {string} hostId - Player ID of the current host
 * @property {Map<string, PlayerInfo>} players - Map of player ID to PlayerInfo
 * @property {GameStatus} status - Room status
 * @property {GameState | null} gameState - Active game state, or null in lobby
 * @property {number} createdAt - Timestamp of room creation
 * @property {number} lastActivityAt - Timestamp of last activity
 */

/**
 * Filtered game state sent to each client (hides other players' cards).
 * @typedef {Object} ClientGameState
 * @property {string} roomCode - The room code
 * @property {GameStatus} status - Current game status
 * @property {Card[]} myHand - Only the requesting player's cards
 * @property {ClientPlayerInfo[]} players - Other players' info (card counts only)
 * @property {string} currentPlayerId - ID of the player whose turn it is
 * @property {Direction} direction - Play direction
 * @property {Card} topDiscard - Top card of the discard pile
 * @property {Color} activeColor - Currently active color
 * @property {number} drawPileCount - Number of cards in the draw pile
 * @property {{ cumulativeDrawCount: number, pendingPlayerId: string } | null} stackChain - Stack chain info
 * @property {string[]} canPlay - IDs of playable cards in the player's hand
 * @property {boolean} canDraw - Whether the player can draw
 * @property {boolean} canStack - Whether the player can stack
 * @property {boolean} canCallUno - Whether the player can call UNO
 * @property {string | null} winner - Winner's player ID, or null
 * @property {Record<string, number> | null} scores - Final scores, or null
 */

/**
 * Player info as seen by other clients (no hand details).
 * @typedef {Object} ClientPlayerInfo
 * @property {string} id - Player ID
 * @property {string} name - Display name
 * @property {number} cardCount - Number of cards in hand
 * @property {boolean} isConnected - Connection status
 * @property {boolean} isHost - Whether this player is the host
 * @property {boolean} hasCalledUno - Whether the player has called UNO
 */

// ─── Error Codes ─────────────────────────────────────────────────────────────

/**
 * Error codes related to room operations.
 * @readonly
 * @enum {string}
 */
export const RoomError = Object.freeze({
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  GAME_IN_PROGRESS: 'GAME_IN_PROGRESS',
  INVALID_ROOM_CODE: 'INVALID_ROOM_CODE',
  INVALID_NAME: 'INVALID_NAME',
  NAME_TAKEN: 'NAME_TAKEN',
  INSUFFICIENT_PLAYERS: 'INSUFFICIENT_PLAYERS',
  ALREADY_IN_ROOM: 'ALREADY_IN_ROOM',
});

/**
 * Error codes related to game actions.
 * @readonly
 * @enum {string}
 */
export const GameError = Object.freeze({
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_PLAY: 'INVALID_PLAY',
  CANNOT_STACK: 'CANNOT_STACK',
  INVALID_COLOR_REMAP: 'INVALID_COLOR_REMAP',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * All valid card colors.
 * @type {Color[]}
 */
export const COLORS = ['red', 'yellow', 'green', 'blue'];

/**
 * All valid card types.
 * @type {CardType[]}
 */
export const CARD_TYPES = [
  'number',
  'skip',
  'reverse',
  'draw2',
  'wild',
  'wild_draw4',
  'skip_everyone',
  'draw6',
  'draw10',
  'color_remap',
];

/**
 * Point values for scoring.
 * Number cards use their face value (handled separately).
 * @type {Record<string, number>}
 */
export const CARD_POINTS = Object.freeze({
  skip: 20,
  reverse: 20,
  draw2: 20,
  wild: 50,
  wild_draw4: 50,
  skip_everyone: 50,
  draw6: 50,
  draw10: 50,
  color_remap: 50,
});

/**
 * Maximum players per room.
 * @type {number}
 */
export const MAX_PLAYERS = 10;

/**
 * Cards dealt to each player at game start.
 * @type {number}
 */
export const CARDS_PER_PLAYER = 7;

/**
 * Total cards in the No Mercy deck.
 * @type {number}
 */
export const TOTAL_DECK_SIZE = 122;

/**
 * Turn timer duration in milliseconds.
 * @type {number}
 */
export const TURN_TIMER_MS = 30000;

/**
 * Color selection timer duration in milliseconds.
 * @type {number}
 */
export const COLOR_SELECTION_TIMER_MS = 10000;

/**
 * Disconnection timeout in milliseconds.
 * @type {number}
 */
export const DISCONNECT_TIMEOUT_MS = 60000;
