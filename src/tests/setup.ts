import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Web Audio API (Tone.js dependency)
class AudioContextMock {
  createGain() { return { connect: vi.fn(), gain: { value: 0 } }; }
  createOscillator() { return { connect: vi.fn(), start: vi.fn(), stop: vi.fn() }; }
  createDynamicsCompressor() { return { connect: vi.fn(), threshold: {}, ratio: {} }; }
  createBufferSource() { return { connect: vi.fn(), start: vi.fn(), stop: vi.fn() }; }
  decodeAudioData() { return Promise.resolve({}); }
  get currentTime() { return 0; }
  get state() { return 'suspended'; }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
}
window.AudioContext = AudioContextMock as any;
(window as any).webkitAudioContext = AudioContextMock as any;

// Mock WakeLock
Object.defineProperty(navigator, 'wakeLock', {
  value: {
    request: vi.fn().mockResolvedValue({
      release: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  },
});

// Mock ResizeObserver
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock requestAnimationFrame for consistent timing in tests
// Note: Vitest's useFakeTimers often handles this, but explicit mocking can be safer for complex hooks
window.requestAnimationFrame = (callback) => setTimeout(callback, 16) as unknown as number;
window.cancelAnimationFrame = (id) => clearTimeout(id);
