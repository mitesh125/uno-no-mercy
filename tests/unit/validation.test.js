import { describe, it, expect } from 'vitest';
import {
  validateDisplayName,
  generateRoomCode,
  isValidRoomCode,
  isDuplicateName,
} from '@server/validation.js';

describe('validateDisplayName', () => {
  describe('valid names', () => {
    it('accepts a simple name', () => {
      const result = validateDisplayName('Alice');
      expect(result).toEqual({ ok: true, value: 'Alice' });
    });

    it('accepts a name with exactly 2 characters', () => {
      const result = validateDisplayName('AB');
      expect(result).toEqual({ ok: true, value: 'AB' });
    });

    it('accepts a name with exactly 20 characters', () => {
      const name = 'A'.repeat(20);
      const result = validateDisplayName(name);
      expect(result).toEqual({ ok: true, value: name });
    });

    it('accepts names with spaces, hyphens, and underscores', () => {
      const result = validateDisplayName('Player-One_2');
      expect(result).toEqual({ ok: true, value: 'Player-One_2' });
    });

    it('accepts names with numbers', () => {
      const result = validateDisplayName('Player123');
      expect(result).toEqual({ ok: true, value: 'Player123' });
    });

    it('trims leading and trailing whitespace', () => {
      const result = validateDisplayName('  Alice  ');
      expect(result).toEqual({ ok: true, value: 'Alice' });
    });

    it('accepts a name with internal spaces', () => {
      const result = validateDisplayName('John Doe');
      expect(result).toEqual({ ok: true, value: 'John Doe' });
    });
  });

  describe('invalid names', () => {
    it('rejects a name that is too short (1 char)', () => {
      const result = validateDisplayName('A');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('at least 2');
    });

    it('rejects an empty string', () => {
      const result = validateDisplayName('');
      expect(result.ok).toBe(false);
    });

    it('rejects a name that is too long (21 chars)', () => {
      const name = 'A'.repeat(21);
      const result = validateDisplayName(name);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('at most 20');
    });

    it('rejects names with invalid characters', () => {
      const result = validateDisplayName('Player@Home');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('rejects names with special symbols', () => {
      const result = validateDisplayName('Hello!World');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('rejects whitespace-only names', () => {
      const result = validateDisplayName('     ');
      expect(result.ok).toBe(false);
    });

    it('rejects non-string input', () => {
      const result = validateDisplayName(123);
      expect(result.ok).toBe(false);
    });

    it('rejects a name that becomes too short after trimming', () => {
      const result = validateDisplayName('  A  ');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('at least 2');
    });
  });
});

describe('generateRoomCode', () => {
  it('generates a 6-character string', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
  });

  it('generates only uppercase alphanumeric characters', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('generates different codes on successive calls', () => {
    const codes = new Set();
    for (let i = 0; i < 50; i++) {
      codes.add(generateRoomCode());
    }
    // With 36^6 possible codes, 50 codes should almost certainly all be unique
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('isValidRoomCode', () => {
  it('accepts a valid 6-char uppercase alphanumeric code', () => {
    expect(isValidRoomCode('ABC123')).toBe(true);
  });

  it('accepts all uppercase letters', () => {
    expect(isValidRoomCode('ABCDEF')).toBe(true);
  });

  it('accepts all digits', () => {
    expect(isValidRoomCode('123456')).toBe(true);
  });

  it('rejects lowercase letters', () => {
    expect(isValidRoomCode('abc123')).toBe(false);
  });

  it('rejects codes that are too short', () => {
    expect(isValidRoomCode('ABC12')).toBe(false);
  });

  it('rejects codes that are too long', () => {
    expect(isValidRoomCode('ABC1234')).toBe(false);
  });

  it('rejects codes with special characters', () => {
    expect(isValidRoomCode('ABC-12')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidRoomCode('')).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(isValidRoomCode(123456)).toBe(false);
  });
});

describe('isDuplicateName', () => {
  it('detects exact duplicate', () => {
    expect(isDuplicateName('Alice', ['Alice', 'Bob'])).toBe(true);
  });

  it('detects case-insensitive duplicate', () => {
    expect(isDuplicateName('alice', ['Alice', 'Bob'])).toBe(true);
  });

  it('detects uppercase vs lowercase', () => {
    expect(isDuplicateName('ALICE', ['alice', 'Bob'])).toBe(true);
  });

  it('detects mixed case duplicate', () => {
    expect(isDuplicateName('aLiCe', ['Alice', 'Bob'])).toBe(true);
  });

  it('returns false when no duplicate exists', () => {
    expect(isDuplicateName('Charlie', ['Alice', 'Bob'])).toBe(false);
  });

  it('returns false for empty existing names list', () => {
    expect(isDuplicateName('Alice', [])).toBe(false);
  });

  it('handles trimmed comparison', () => {
    expect(isDuplicateName('  Alice  ', ['Alice', 'Bob'])).toBe(true);
  });
});
