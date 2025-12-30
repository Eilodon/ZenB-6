
import * as Tone from 'tone';
import { SoundPack, CueType, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { AdaptiveAudioManager } from './audio-engine/quality';
import { MasterChain, SpatialAudioEngine } from './audio-engine/effects';
import { TibetanBowlSynth, createPadSynth, createBreathSynths } from './audio-engine/instruments';
import { speak } from './audio-engine/speech';
import { CHORDS } from './audio-engine/constants';

// -- GLOBAL STATE --
let isUnlocked = false;
let isSettingUp = false;

// -- INSTANCES --
let audioManager: AdaptiveAudioManager | null = null;
let masterChain: MasterChain | null = null;
let spatialEngine: SpatialAudioEngine | null = null;
let masterReverb: Tone.Reverb | null = null;

// Instruments
let bowlSynth: TibetanBowlSynth | null = null;
let padSynth: Tone.PolySynth | null = null;
let padChorus: Tone.Chorus | null = null;
let breathInSynth: Tone.NoiseSynth | null = null;
let breathOutSynth: Tone.NoiseSynth | null = null;
let breathFilter: Tone.Filter | null = null;

export const unlockAudio = async () => {
  if (isUnlocked && Tone.context.state === 'running' && masterChain) return true;
  if (isSettingUp) return false;

  try {
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }
    
    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
    }

    if (!masterChain) {
      await setupInstruments();
    }

    // Warm up TTS
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
            window.speechSynthesis.cancel();
            const warmUp = new SpeechSynthesisUtterance(' ');
            warmUp.volume = 0;
            window.speechSynthesis.speak(warmUp);
        } catch (e) {
            console.warn("TTS Warmup warning:", e);
        }
    }

    // Keep alive buffer
    const buffer = Tone.context.createBuffer(1, 1, Tone.context.sampleRate);
    const source = Tone.context.createBufferSource();
    source.buffer = buffer;
    source.connect(Tone.context.destination);
    source.start(0);

    console.log("ZenB Audio Engine: 3.1 Activated");
    isUnlocked = true;
    return true;
  } catch (e) {
    console.error("Audio Unlock Failed:", e);
    isUnlocked = false;
    isSettingUp = false;
    return false;
  }
};

async function setupInstruments() {
  if (isSettingUp) return;
  isSettingUp = true;

  try {
    cleanupAudioResources();

    audioManager = new AdaptiveAudioManager();
    const config = audioManager.getConfig();

    // 1. Master Chain
    masterChain = new MasterChain();
    
    // 2. Reverb
    masterReverb = new Tone.Reverb({
        decay: config.reverbDecay,
        preDelay: 0.2,
        wet: 0.4
    });
    await masterReverb.ready; 
    masterReverb.connect(masterChain.input);

    // 3. Spatial Engine
    spatialEngine = new SpatialAudioEngine(config.useSpatial);

    // --- INST: BOWL ---
    bowlSynth = new TibetanBowlSynth(config.partialCount);
    const bowlPanner = spatialEngine.createSource('bowl', 0, 0.5, -1);
    bowlSynth.connect(bowlPanner);
    bowlPanner.connect(masterReverb);

    // --- INST: PAD ---
    const pad = createPadSynth();
    padSynth = pad.synth;
    padChorus = pad.chorus;
    padChorus.connect(masterReverb);

    // --- INST: BREATH ---
    const breath = createBreathSynths();
    breathInSynth = breath.inhale;
    breathOutSynth = breath.exhale;
    breathFilter = breath.filter;

    const breathPanner = spatialEngine.createSource('breath', 0, 0, 0.5); 
    breathFilter.connect(breathPanner);
    breathPanner.connect(masterReverb);

    console.log("ZenB Instruments: Harmonized (Tier: " + audioManager.getQuality() + ")");
  } catch (error) {
    console.error("Setup Instruments Failed", error);
    masterChain = null;
    isUnlocked = false; 
    throw error; 
  } finally {
    isSettingUp = false;
  }
}

function cleanupAudioResources() {
  try {
    masterChain?.dispose();
    spatialEngine?.dispose();
    masterReverb?.dispose();
    bowlSynth?.dispose();
    padSynth?.dispose();
    padChorus?.dispose();
    breathInSynth?.dispose();
    breathOutSynth?.dispose();
    breathFilter?.dispose();
  } catch (e) {
    console.warn("Audio cleanup warning:", e);
  }
}

export async function playCue(
  cue: CueType,
  enabled: boolean,
  pack: SoundPack,
  duration: number,
  lang: Language = 'en'
): Promise<void> {
  if (!enabled) return;
  if (isSettingUp) return;

  if (Tone.context.state !== 'running') { 
      try { await Tone.context.resume(); } catch {}
  }

  if (!masterChain) { 
      unlockAudio().catch(e => console.error("Auto-setup failed", e));
      return; 
  }

  const time = Tone.now();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  try {
    if (pack === 'musical') {
      if (cue === 'inhale') {
        padSynth?.triggerAttackRelease(CHORDS.warm, duration + 1, time);
      } else if (cue === 'exhale') {
        padSynth?.triggerAttackRelease(CHORDS.neutral, duration + 1, time);
      } else if (cue === 'hold') {
        bowlSynth?.trigger("E5", 0.5);
      }
    } 
    else if (pack === 'bells') {
      if (cue === 'inhale') bowlSynth?.trigger("C3", duration + 4);
      else if (cue === 'exhale') bowlSynth?.trigger("G2", duration + 4);
      else if (cue === 'hold') bowlSynth?.trigger("C5", 2);
    }
    else if (pack === 'breath') {
      if (cue === 'inhale') {
        try { breathFilter?.frequency.cancelScheduledValues(time); } catch {}
        breathFilter?.frequency.setValueAtTime(200, time);
        breathFilter?.frequency.exponentialRampTo(1000, duration * 0.9, time);
        breathInSynth?.triggerAttackRelease(duration, time);
      } else if (cue === 'exhale') {
        try { breathFilter?.frequency.cancelScheduledValues(time); } catch {}
        breathFilter?.frequency.setValueAtTime(800, time);
        breathFilter?.frequency.exponentialRampTo(150, duration * 0.9, time);
        breathOutSynth?.triggerAttackRelease(duration, time);
      }
    }
    else if (pack.startsWith('voice')) {
       let text = "";
       if (pack === 'voice-12') {
         if (cue === 'inhale') text = lang === 'vi' ? "Một" : "One";
         if (cue === 'exhale') text = lang === 'vi' ? "Hai" : "Two";
       } else {
         if (cue === 'inhale') text = t.phases.inhale;
         if (cue === 'exhale') text = t.phases.exhale;
         if (cue === 'hold') text = t.phases.hold;
       }
       if (text) speak(text.toLowerCase(), lang);
    }
  } catch (e) {
    console.warn("Play error:", e);
  }
}

export function cleanupAudio() {
  if (padSynth) padSynth.releaseAll();
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
