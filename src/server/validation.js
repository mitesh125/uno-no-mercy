/**
 * Validation utilities for display names and room codes.
 */

/**
 * Allowed characters pattern for display names: letters, numbers, spaces, hyphens, underscores.
 */
const ALLOWED_NAME_CHARS = /^[a-zA-Z0-9 \-_]+$/;

/**
 * Room code format: exactly 6 uppercase alphanumeric characters.
 */
const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;

/**
 * Characters used for room code generation.
 */
const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Validates a display name.
 * Rules:
 * - Must be 2-20 characters after trimming
 * - Only letters, numbers, spaces, hyphens, and underscores allowed
 * - Must contain at least one non-space character
 *
 * @param {string} name - The display name to validate
 * @returns {{ ok: true, value: string } | { ok: false, error: string }}
 */
export function validateDisplayName(name) {
  if (typeof name !== 'string') {
    return { ok: false, error: 'Display name must be a string' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { ok: false, error: 'Display name must be at least 2 characters' };
  }

  if (trimmed.length > 20) {
    return { ok: false, error: 'Display name must be at most 20 characters' };
  }

  if (!ALLOWED_NAME_CHARS.test(trimmed)) {
    return { ok: false, error: 'Display name contains invalid characters. Only letters, numbers, spaces, hyphens, and underscores are allowed' };
  }

  if (trimmed.replace(/\s/g, '').length === 0) {
    return { ok: false, error: 'Display name must contain at least one non-space character' };
  }

  return { ok: true, value: trimmed };
}

/**
 * Generates a random 6-character uppercase alphanumeric room code.
 *
 * @returns {string} A 6-character room code matching [A-Z0-9]{6}
 */
export function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const index = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[index];
  }
  return code;
}

/**
 * Validates that a string is a valid room code format.
 *
 * @param {string} code - The code to validate
 * @returns {boolean} True if the code matches ^[A-Z0-9]{6}$
 */
export function isValidRoomCode(code) {
  if (typeof code !== 'string') {
    return false;
  }
  return ROOM_CODE_PATTERN.test(code);
}

/**
 * Checks if a name is a duplicate of any existing name (case-insensitive).
 *
 * @param {string} name - The name to check
 * @param {string[]} existingNames - Array of existing names to compare against
 * @returns {boolean} True if the name is a case-insensitive duplicate
 */
export function isDuplicateName(name, existingNames) {
  const normalized = name.trim().toLowerCase();
  return existingNames.some(existing => existing.trim().toLowerCase() === normalized);
}
