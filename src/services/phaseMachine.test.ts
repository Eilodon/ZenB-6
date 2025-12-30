import { describe, it, expect } from 'vitest';
import { nextPhaseRaw, nextPhaseSkipZero, isCycleBoundary, isPatternValid } from './phaseMachine';
import { BreathPattern } from '../types';

describe('PhaseMachine Logic', () => {
  // Pattern chuẩn 4-7-8
  const pattern478: BreathPattern = {
    id: '4-7-8',
    label: 'Relax',
    tag: 'Test',
    description: 'Test',
    timings: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 },
    colorTheme: 'warm'
  };

  // Pattern Box Breathing (4-4-4-4)
  const patternBox: BreathPattern = {
    ...pattern478,
    id: 'box',
    timings: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 }
  };

  describe('isPatternValid', () => {
    it('should validate correct patterns', () => {
      expect(isPatternValid(pattern478)).toBe(true);
    });

    it('should reject invalid timings (total duration 0)', () => {
      const invalidPattern = { ...pattern478, timings: { inhale: 0, holdIn: 0, exhale: 0, holdOut: 0 } };
      expect(isPatternValid(invalidPattern)).toBe(false);
    });
  });

  describe('nextPhaseRaw', () => {
    it('should transition correctly in a full cycle (Box Breathing)', () => {
      expect(nextPhaseRaw('inhale', patternBox)).toBe('holdIn');
      expect(nextPhaseRaw('holdIn', patternBox)).toBe('exhale');
      expect(nextPhaseRaw('exhale', patternBox)).toBe('holdOut');
      expect(nextPhaseRaw('holdOut', patternBox)).toBe('inhale');
    });

    it('should transition correctly when holdOut is missing (4-7-8)', () => {
      expect(nextPhaseRaw('exhale', pattern478)).toBe('inhale'); // 4-7-8 jumps holdOut
    });
  });

  describe('nextPhaseSkipZero', () => {
    it('should skip phases with 0 duration', () => {
      // 4-7-8 has holdOut = 0. Exhale -> (skip holdOut) -> Inhale
      expect(nextPhaseSkipZero('exhale', pattern478)).toBe('inhale');
    });

    it('should handle complex skips (e.g., Kapalabhati-style: fast inhale/exhale only)', () => {
      const fastPattern = { ...pattern478, timings: { inhale: 1, holdIn: 0, exhale: 1, holdOut: 0 } };
      expect(nextPhaseSkipZero('inhale', fastPattern)).toBe('exhale'); // Skips holdIn
      expect(nextPhaseSkipZero('exhale', fastPattern)).toBe('inhale'); // Skips holdOut
    });
  });

  describe('isCycleBoundary', () => {
    it('should identify inhale as the start of a new cycle', () => {
      expect(isCycleBoundary('inhale')).toBe(true);
      expect(isCycleBoundary('exhale')).toBe(false);
      expect(isCycleBoundary('holdIn')).toBe(false);
    });
  });
});
