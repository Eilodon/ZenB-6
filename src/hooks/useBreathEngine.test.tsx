import { renderHook, act } from '@testing-library/react';
import { useBreathEngine } from './useBreathEngine';
import { useSessionStore } from '../stores/sessionStore';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as audioService from '../services/audio';
import * as hapticsService from '../services/haptics';

// Mock dependencies to prevent side effects
vi.mock('../services/audio', () => ({
  playCue: vi.fn().mockResolvedValue(undefined),
  unlockAudio: vi.fn(),
  cleanupAudio: vi.fn(),
}));

vi.mock('../services/haptics', () => ({
  hapticPhase: vi.fn(),
  hapticTick: vi.fn(),
}));

describe('useBreathEngine Hook', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSessionStore.setState({
      isActive: false,
      isPaused: false,
      phase: 'inhale',
      cycleCount: 0,
      currentPattern: {
        id: 'test-pattern',
        label: 'Test',
        tag: 'Test',
        description: 'Test',
        timings: { inhale: 1, holdIn: 1, exhale: 1, holdOut: 1 }, // 4 seconds total cycle
        colorTheme: 'neutral'
      }
    });
    
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should initialize with 0 progress', () => {
    const { result } = renderHook(() => useBreathEngine());
    expect(result.current.progressRef.current).toBe(0);
  });

  it('should not update progress when inactive', () => {
    const { result } = renderHook(() => useBreathEngine());
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.progressRef.current).toBe(0);
    expect(useSessionStore.getState().phase).toBe('inhale');
  });

  it('should advance phase when active', () => {
    const { result } = renderHook(() => useBreathEngine());

    // Start Session manually
    act(() => {
      useSessionStore.getState().startSession('box'); // Assuming box is in list or generic
      // Override with our simple 1-1-1-1 test pattern for predictable timing
      useSessionStore.setState({
         currentPattern: {
            id: 'simple',
            label: 'Simple',
            tag: 'Test',
            description: 'Test',
            timings: { inhale: 1, holdIn: 1, exhale: 1, holdOut: 1 },
            colorTheme: 'neutral'
         }
      });
    });

    // Advance 0.5s (Halfway through inhale)
    act(() => {
      vi.advanceTimersByTime(500);
    });
    // Progress should be roughly 0.5
    expect(result.current.progressRef.current).toBeGreaterThan(0.4);
    expect(result.current.progressRef.current).toBeLessThan(0.6);
    expect(useSessionStore.getState().phase).toBe('inhale');

    // Advance another 0.6s (Total 1.1s -> Should be in holdIn)
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(useSessionStore.getState().phase).toBe('holdIn');
    
    // Check if audio cue was called for the new phase
    expect(audioService.playCue).toHaveBeenCalled();
  });

  it('should pause correctly', () => {
    const { result } = renderHook(() => useBreathEngine());

    act(() => {
      useSessionStore.getState().startSession('4-7-8');
    });

    // Advance a bit
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const progressAtPause = result.current.progressRef.current;
    expect(progressAtPause).toBeGreaterThan(0);

    // Pause
    act(() => {
      useSessionStore.getState().togglePause();
    });

    // Advance time while paused
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Progress should not change
    expect(result.current.progressRef.current).toBeCloseTo(progressAtPause, 1); // Float precision
  });
});
