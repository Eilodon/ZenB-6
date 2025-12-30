
import { useSettingsStore } from '../../stores/settingsStore';

export class AdaptiveAudioManager {
  getQuality(): 'low' | 'medium' | 'high' {
    const userSetting = useSettingsStore.getState().userSettings.quality;
    if (userSetting !== 'auto') return userSetting as 'low' | 'medium' | 'high';

    // Auto-detection logic
    if (typeof navigator === 'undefined') return 'medium';
    
    // @ts-ignore
    const connection = navigator.connection;
    // @ts-ignore
    const memory = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency || 2;

    const isLowEnd = (memory && memory < 4) || cores < 4;
    const isSlowConnection = connection && (connection.saveData || ['slow-2g', '2g'].includes(connection.effectiveType));

    if (isSlowConnection || isLowEnd) {
      return 'low';
    } else if (cores < 8) {
      return 'medium';
    }
    return 'high';
  }

  getConfig() {
    const q = this.getQuality();
    switch (q) {
      case 'low': return { reverbDecay: 2, partialCount: 1, useSpatial: false };
      case 'medium': return { reverbDecay: 5, partialCount: 3, useSpatial: true };
      case 'high': return { reverbDecay: 8.5, partialCount: 5, useSpatial: true };
    }
  }
}
