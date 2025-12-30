
export type BreathPhase = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';
export type CueType = 'inhale' | 'exhale' | 'hold' | 'finish';

// Updated BreathingType with new patterns
export type BreathingType = 
  | '4-7-8' 
  | 'box' 
  | 'calm'
  | 'coherence'
  | 'deep-relax'
  | '7-11'
  | 'awake'
  | 'triangle'
  | 'tactical'
  | 'buteyko'
  | 'wim-hof';

export type ColorTheme = 'warm' | 'cool' | 'neutral';
export type Language = 'en' | 'vi';
export type SoundPack = 'musical' | 'bells' | 'breath' | 'voice-en' | 'voice-vi' | 'voice-12';

// Discriminated Union for Quality Configuration
export type QualityTier = 'auto' | 'low' | 'medium' | 'high';

export type QualityConfig = 
  | { tier: 'auto'; dpr: number; segments: number }
  | { tier: 'low'; dpr: 1; segments: 48 }
  | { tier: 'medium'; dpr: 1.5; segments: 72 }
  | { tier: 'high'; dpr: 2; segments: 128 };

export type UserSettings = {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  hapticStrength: 'light' | 'medium' | 'heavy';
  theme: ColorTheme;
  quality: QualityTier;
  reduceMotion: boolean;
  showTimer: boolean;
  language: Language; 
  soundPack: SoundPack;
  streak: number;
  lastBreathDate: string; // ISO Date string (YYYY-MM-DD)
  lastUsedPattern: BreathingType;
};

export type SessionHistoryItem = {
  id: string;
  timestamp: number;
  durationSec: number;
  patternId: BreathingType;
  cycles: number;
};

// Strict SessionStats
export type SessionStats = {
  durationSec: number;
  cyclesCompleted: number;
  patternId: BreathingType;
  timestamp: number;
};

export type BreathPattern = {
  id: BreathingType;
  label: string;
  tag: string;
  description: string;
  timings: Record<BreathPhase, number>; // seconds
  colorTheme: ColorTheme;
  recommendedCycles?: number;
};

// Expanded Library of 11 Patterns
export const BREATHING_PATTERNS: Record<string, BreathPattern> = {
  '4-7-8': {
    id: '4-7-8',
    label: 'Relax',
    tag: 'Sleep & Anxiety',
    description: 'A natural tranquilizer for the nervous system.',
    timings: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 },
    colorTheme: 'warm',
    recommendedCycles: 4,
  },
  box: {
    id: 'box',
    label: 'Focus',
    tag: 'Concentration',
    description: 'Used by Navy SEALs to heighten performance.',
    timings: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 },
    colorTheme: 'neutral',
    recommendedCycles: 6,
  },
  calm: {
    id: 'calm',
    label: 'Balance',
    tag: 'Coherence',
    description: 'Restores balance to your heart rate variability.',
    timings: { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 },
    colorTheme: 'cool',
    recommendedCycles: 8,
  },
  // --- NEW PATTERNS ---
  coherence: {
    id: 'coherence',
    label: 'Coherence',
    tag: 'Heart Health',
    description: 'Optimizes Heart Rate Variability (HRV). The "Golden Ratio" of breathing.',
    timings: { inhale: 6, holdIn: 0, exhale: 6, holdOut: 0 },
    colorTheme: 'cool',
    recommendedCycles: 10,
  },
  'deep-relax': {
    id: 'deep-relax',
    label: 'Deep Rest',
    tag: 'Stress Relief',
    description: 'Doubling the exhalation to trigger the parasympathetic system.',
    timings: { inhale: 4, holdIn: 0, exhale: 8, holdOut: 0 },
    colorTheme: 'warm',
    recommendedCycles: 6,
  },
  '7-11': {
    id: '7-11',
    label: '7-11',
    tag: 'Deep Calm',
    description: 'A powerful technique for panic attacks and deep anxiety.',
    timings: { inhale: 7, holdIn: 0, exhale: 11, holdOut: 0 },
    colorTheme: 'warm',
    recommendedCycles: 4,
  },
  awake: {
    id: 'awake',
    label: 'Energize',
    tag: 'Wake Up',
    description: 'Fast-paced rhythm to boost alertness and energy levels.',
    timings: { inhale: 4, holdIn: 0, exhale: 2, holdOut: 0 },
    colorTheme: 'cool',
    recommendedCycles: 15,
  },
  triangle: {
    id: 'triangle',
    label: 'Triangle',
    tag: 'Yoga',
    description: 'A geometric pattern for emotional stability and control.',
    timings: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 0 },
    colorTheme: 'neutral',
    recommendedCycles: 8,
  },
  tactical: {
    id: 'tactical',
    label: 'Tactical',
    tag: 'Advanced Focus',
    description: 'Extended Box Breathing for high-stress situations.',
    timings: { inhale: 5, holdIn: 5, exhale: 5, holdOut: 5 },
    colorTheme: 'neutral',
    recommendedCycles: 5,
  },
  buteyko: {
    id: 'buteyko',
    label: 'Light Air',
    tag: 'Health',
    description: 'Reduced breathing to improve oxygen uptake (Buteyko Method).',
    timings: { inhale: 3, holdIn: 0, exhale: 3, holdOut: 4 },
    colorTheme: 'cool',
    recommendedCycles: 12,
  },
  'wim-hof': {
    id: 'wim-hof',
    label: 'Tummo Power',
    tag: 'Immunity',
    description: 'Controlled hyperventilation phase. Charge your body with oxygen.',
    timings: { inhale: 2.5, holdIn: 0, exhale: 1.5, holdOut: 0 }, // Fast and powerful
    colorTheme: 'warm', // Fire theme
    recommendedCycles: 30, // 30-40 reps
  }
};
