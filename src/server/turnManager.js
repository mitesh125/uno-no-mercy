/**
 * TurnManager — handles turn advancement, direction, skips, and reverses.
 * All functions are pure: they take a game state and return a new state (or value).
 */

/**
 * Get the index of the next connected player in the current direction.
 * Skips disconnected players.
 * @param {import('./types.js').GameState} state
 * @returns {number} Index of the next player
 */
export function getNextPlayer(state) {
  const { players, currentPlayerIndex, direction } = state;
  const count = players.length;

  let nextIndex = ((currentPlayerIndex + direction) % count + count) % count;

  // Skip disconnected players (guard against infinite loop if all disconnected)
  let attempts = 0;
  while (!players[nextIndex].isConnected && attempts < count) {
    nextIndex = ((nextIndex + direction) % count + count) % count;
    attempts++;
  }

  return nextIndex;
}

/**
 * Skip the next player — advance past them to the player after.
 * Returns a new state with updated currentPlayerIndex.
 * @param {import('./types.js').GameState} state
 * @returns {import('./types.js').GameState}
 */
export function skipPlayer(state) {
  const { players, currentPlayerIndex, direction } = state;
  const count = players.length;

  // First, find the player that would be skipped
  let skippedIndex = ((currentPlayerIndex + direction) % count + count) % count;

  // Then find the next connected player after the skipped one
  let nextIndex = ((skippedIndex + direction) % count + count) % count;

  let attempts = 0;
  while (!players[nextIndex].isConnected && attempts < count) {
    nextIndex = ((nextIndex + direction) % count + count) % count;
    attempts++;
  }

  return { ...state, currentPlayerIndex: nextIndex };
}

/**
 * Skip all players except the current one (Skip Everyone card).
 * The current player keeps their turn — state is returned unchanged.
 * @param {import('./types.js').GameState} state
 * @returns {import('./types.js').GameState}
 */
export function skipAllExceptCurrent(state) {
  // Current player gets another turn, so state doesn't change
  return { ...state };
}

/**
 * Reverse the play direction.
 * In a 2-player game, reverse acts as a skip (current player gets another turn).
 * In 3+ player games, flips direction (1 ↔ -1).
 * @param {import('./types.js').GameState} state
 * @returns {import('./types.js').GameState}
 */
export function reverseDirection(state) {
  const { players } = state;

  // Count connected players for the 2-player rule
  const connectedCount = players.filter(p => p.isConnected).length;

  if (connectedCount === 2) {
    // In a 2-player game, reverse acts as skip — current player keeps their turn
    return { ...state, direction: /** @type {1 | -1} */ (state.direction * -1) };
  }

  // Flip direction
  const newDirection = /** @type {1 | -1} */ (state.direction * -1);
  return { ...state, direction: newDirection };
}

/**
 * Get the current player's ID.
 * @param {import('./types.js').GameState} state
 * @returns {string}
 */
export function getCurrentPlayer(state) {
  return state.players[state.currentPlayerIndex].id;
}

/**
 * Advance the turn to the next player in the current direction.
 * Skips disconnected players.
 * @param {import('./types.js').GameState} state
 * @returns {import('./types.js').GameState}
 */
export function advanceTurn(state) {
  const nextIndex = getNextPlayer(state);
  return { ...state, currentPlayerIndex: nextIndex };
}
