
import * as Tone from 'tone';

/**
 * MASTER CHAIN (EQ -> Comp -> Limit)
 */
export class MasterChain {
  public input: Tone.EQ3;
  private compressor: Tone.Compressor;
  private limiter: Tone.Limiter;

  constructor() {
    this.limiter = new Tone.Limiter(-0.5).toDestination();
    this.compressor = new Tone.Compressor({
      threshold: -24,
      ratio: 3,
      attack: 0.003,
      release: 0.25,
      knee: 10
    });
    this.input = new Tone.EQ3({
      low: 0,
      mid: -2,
      high: -4, // Softer roll-off for Zen feel
      lowFrequency: 200,
      highFrequency: 4000
    });

    this.input.chain(this.compressor, this.limiter);
  }

  dispose() {
    this.input.dispose();
    this.compressor.dispose();
    this.limiter.dispose();
  }
}

/**
 * SPATIAL AUDIO ENGINE
 */
export class SpatialAudioEngine {
  private sources: Map<string, Tone.Panner3D | Tone.Panner>;
  private isHighQuality: boolean;

  constructor(isHighQuality: boolean) {
    this.isHighQuality = isHighQuality;
    this.sources = new Map();
    
    if (this.isHighQuality) {
       try {
         const ctx = Tone.getContext();
         const listener = ctx.listener;
         if (listener && listener.positionX) {
             try { 
                 const now = ctx.currentTime;
                 if (listener.positionX.setValueAtTime) listener.positionX.setValueAtTime(0, now);
                 if (listener.positionY.setValueAtTime) listener.positionY.setValueAtTime(0, now);
                 if (listener.positionZ.setValueAtTime) listener.positionZ.setValueAtTime(0.5, now);
             } catch (err) {
                 // Suppress listener errors
             }
         }
       } catch (e) {
         console.warn("Spatial Audio Listener init warning", e);
       }
    }
  }

  createSource(id: string, x: number, y: number, z: number): Tone.ToneAudioNode {
    try {
        if (this.sources.has(id)) {
            const oldSource = this.sources.get(id);
            if (oldSource) {
                oldSource.disconnect();
                oldSource.dispose();
            }
        }
    } catch(e) {}

    if (this.isHighQuality) {
      const panner = new Tone.Panner3D({
        panningModel: 'HRTF',
        positionX: x,
        positionY: y,
        positionZ: z,
        refDistance: 1,
        rolloffFactor: 1
      });
      this.sources.set(id, panner);
      return panner;
    } else {
      const panner = new Tone.Panner(Math.max(-1, Math.min(1, x))); 
      this.sources.set(id, panner);
      return panner;
    }
  }
  
  dispose() {
     this.sources.forEach(s => {
         try { s.dispose(); } catch {}
     });
     this.sources.clear();
  }
}
