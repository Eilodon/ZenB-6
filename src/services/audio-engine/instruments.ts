
import * as Tone from 'tone';

/**
 * TIBETAN BOWL SYNTH
 * Uses FM Synthesis with inharmonic partials
 */
export class TibetanBowlSynth {
  private output: Tone.Gain;
  private fundamental: Tone.FMSynth;
  private partials: Tone.FMSynth[];

  constructor(partialCount: number) {
    this.output = new Tone.Gain(0.6);
    
    // Fundamental
    this.fundamental = new Tone.FMSynth({
      harmonicity: 1,
      modulationIndex: 2,
      oscillator: { type: "sine" },
      envelope: { attack: 0.1, decay: 4, sustain: 0.2, release: 8 },
      modulation: { type: "sine" },
      modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
    }).connect(this.output);

    // Inharmonic partials
    const ratios = [2.51, 4.23, 5.91, 8.17, 9.84];
    
    this.partials = ratios.slice(0, partialCount).map((ratio, i) => {
      const partial = new Tone.FMSynth({
        harmonicity: ratio,
        modulationIndex: 15 + i * 3,
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 2 - (i * 0.2), sustain: 0.1, release: 5 - i },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.01, decay: 0, sustain: 1, release: 0.5 }
      }).connect(this.output);
      
      partial.volume.value = -12 - (i * 4); 
      return partial;
    });
  }

  trigger(note: Tone.FrequencyClass | string, duration: number) {
    const now = Tone.now();
    this.fundamental.triggerAttackRelease(note, duration + 2, now);
    
    this.partials.forEach((partial, i) => {
      partial.triggerAttackRelease(
        note, 
        duration + 1 - (i * 0.2), 
        now + (i * 0.005)
      );
    });
  }

  connect(dest: Tone.ToneAudioNode) {
    this.output.connect(dest);
  }

  dispose() {
    this.fundamental.dispose();
    this.partials.forEach(p => p.dispose());
    this.output.dispose();
  }
}

// Helper to create Ambient Pad
export const createPadSynth = () => {
  const chorus = new Tone.Chorus(2.5, 4.5, 0.4).start();
  const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fatsawtooth", count: 3, spread: 20 },
      envelope: { attack: 2, decay: 3, sustain: 0.6, release: 4 }
  }).connect(chorus);
  synth.volume.value = -14;
  return { synth, chorus };
};

// Helper to create Breath Noise
export const createBreathSynths = () => {
  const filter = new Tone.Filter(400, "lowpass", -12);
  
  const inhale = new Tone.NoiseSynth({
      noise: { type: 'brown' },
      envelope: { attack: 0.5, decay: 0.1, sustain: 1, release: 1.5 }
  }).connect(filter);
  inhale.volume.value = -12;

  const exhale = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.5, decay: 0.1, sustain: 1, release: 1.5 }
  }).connect(filter);
  exhale.volume.value = -16;

  return { inhale, exhale, filter };
};
