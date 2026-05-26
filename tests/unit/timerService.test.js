import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimerService } from '@server/timerService.js';

describe('TimerService', () => {
  let timerService;

  beforeEach(() => {
    vi.useFakeTimers();
    timerService = new TimerService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startTurnTimer', () => {
    it('calls onTimeout after the specified duration', () => {
      const onTimeout = vi.fn();
      timerService.startTurnTimer('ROOM01', 'player1', 30000, onTimeout);

      expect(onTimeout).not.toHaveBeenCalled();

      vi.advanceTimersByTime(30000);

      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('does not call onTimeout before the duration expires', () => {
      const onTimeout = vi.fn();
      timerService.startTurnTimer('ROOM01', 'player1', 30000, onTimeout);

      vi.advanceTimersByTime(29999);

      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('cancels the previous timer when starting a new one for the same key', () => {
      const onTimeout1 = vi.fn();
      const onTimeout2 = vi.fn();

      timerService.startTurnTimer('ROOM01', 'player1', 30000, onTimeout1);
      timerService.startTurnTimer('ROOM01', 'player1', 30000, onTimeout2);

      vi.advanceTimersByTime(30000);

      expect(onTimeout1).not.toHaveBeenCalled();
      expect(onTimeout2).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancelTimer', () => {
    it('prevents onTimeout from being called', () => {
      const onTimeout = vi.fn();
      timerService.startTurnTimer('ROOM01', 'player1', 30000, onTimeout);

      timerService.cancelTimer('ROOM01', 'player1');

      vi.advanceTimersByTime(30000);

      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('does not throw when canceling a non-existent timer', () => {
      expect(() => {
        timerService.cancelTimer('ROOM01', 'nonexistent');
      }).not.toThrow();
    });
  });

  describe('startColorSelectionTimer', () => {
    it('calls onTimeout after 10 seconds', () => {
      const onTimeout = vi.fn();
      timerService.startColorSelectionTimer('ROOM01', 'player1', onTimeout);

      vi.advanceTimersByTime(10000);

      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('does not call onTimeout before 10 seconds', () => {
      const onTimeout = vi.fn();
      timerService.startColorSelectionTimer('ROOM01', 'player1', onTimeout);

      vi.advanceTimersByTime(9999);

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('getRemainingTime', () => {
    it('returns approximate remaining time', () => {
      timerService.startTurnTimer('ROOM01', 'player1', 30000, vi.fn());

      vi.advanceTimersByTime(10000);

      const remaining = timerService.getRemainingTime('ROOM01', 'player1');
      expect(remaining).toBe(20000);
    });

    it('returns 0 for a non-existent timer', () => {
      const remaining = timerService.getRemainingTime('ROOM01', 'nonexistent');
      expect(remaining).toBe(0);
    });

    it('returns 0 after the timer has expired', () => {
      timerService.startTurnTimer('ROOM01', 'player1', 30000, vi.fn());

      vi.advanceTimersByTime(30000);

      const remaining = timerService.getRemainingTime('ROOM01', 'player1');
      expect(remaining).toBe(0);
    });

    it('returns 0 after the timer has been cancelled', () => {
      timerService.startTurnTimer('ROOM01', 'player1', 30000, vi.fn());

      vi.advanceTimersByTime(5000);
      timerService.cancelTimer('ROOM01', 'player1');

      const remaining = timerService.getRemainingTime('ROOM01', 'player1');
      expect(remaining).toBe(0);
    });
  });

  describe('stacking timer', () => {
    it('starts a fresh 30-second timer for stacking decisions', () => {
      const onTimeout1 = vi.fn();
      const onTimeout2 = vi.fn();

      // First turn timer
      timerService.startTurnTimer('ROOM01', 'player1', 30000, onTimeout1);
      vi.advanceTimersByTime(15000);

      // Stacking decision: fresh 30-second timer replaces the old one
      timerService.startTurnTimer('ROOM01', 'player1', 30000, onTimeout2);

      // Old timer should not fire
      vi.advanceTimersByTime(15000);
      expect(onTimeout1).not.toHaveBeenCalled();
      expect(onTimeout2).not.toHaveBeenCalled();

      // New timer fires after its full 30 seconds
      vi.advanceTimersByTime(15000);
      expect(onTimeout2).toHaveBeenCalledTimes(1);
    });
  });
});
