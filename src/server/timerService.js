/**
 * TimerService manages turn timers and color selection timeouts.
 * Each timer is keyed by `${roomCode}:${playerId}`.
 */

import { TURN_TIMER_MS, COLOR_SELECTION_TIMER_MS } from './types.js';

export class TimerService {
  constructor() {
    /** @type {Map<string, { timeout: NodeJS.Timeout, startedAt: number, durationMs: number }>} */
    this.timers = new Map();
  }

  /**
   * Build the map key for a timer.
   * @param {string} roomCode
   * @param {string} playerId
   * @returns {string}
   */
  _key(roomCode, playerId) {
    return `${roomCode}:${playerId}`;
  }

  /**
   * Start a turn timer. Calls onTimeout when the duration expires.
   * If a timer already exists for this key, it is cancelled first.
   * @param {string} roomCode
   * @param {string} playerId
   * @param {number} durationMs - Duration in milliseconds
   * @param {() => void} onTimeout - Callback when timer expires
   */
  startTurnTimer(roomCode, playerId, durationMs, onTimeout) {
    const key = this._key(roomCode, playerId);

    // Cancel any existing timer for this key
    this._cancelByKey(key);

    const timeout = setTimeout(() => {
      this.timers.delete(key);
      onTimeout();
    }, durationMs);

    this.timers.set(key, {
      timeout,
      startedAt: Date.now(),
      durationMs,
    });
  }

  /**
   * Cancel an active timer for the given room and player.
   * @param {string} roomCode
   * @param {string} playerId
   */
  cancelTimer(roomCode, playerId) {
    const key = this._key(roomCode, playerId);
    this._cancelByKey(key);
  }

  /**
   * Start a color selection timer (10 seconds).
   * Calls onTimeout if the player doesn't choose a color in time.
   * @param {string} roomCode
   * @param {string} playerId
   * @param {() => void} onTimeout - Callback when timer expires
   */
  startColorSelectionTimer(roomCode, playerId, onTimeout) {
    this.startTurnTimer(roomCode, playerId, COLOR_SELECTION_TIMER_MS, onTimeout);
  }

  /**
   * Get the remaining time in milliseconds for an active timer.
   * Returns 0 if no timer is active for this key.
   * @param {string} roomCode
   * @param {string} playerId
   * @returns {number} Milliseconds remaining
   */
  getRemainingTime(roomCode, playerId) {
    const key = this._key(roomCode, playerId);
    const entry = this.timers.get(key);

    if (!entry) {
      return 0;
    }

    const elapsed = Date.now() - entry.startedAt;
    const remaining = entry.durationMs - elapsed;
    return Math.max(0, remaining);
  }

  /**
   * Cancel a timer by its internal key.
   * @param {string} key
   * @private
   */
  _cancelByKey(key) {
    const entry = this.timers.get(key);
    if (entry) {
      clearTimeout(entry.timeout);
      this.timers.delete(key);
    }
  }
}
