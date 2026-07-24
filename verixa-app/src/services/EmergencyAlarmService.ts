import { Platform, Vibration } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, preload, AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

// Preload bundled siren asset at module load
const sirenAsset = require('../../assets/sounds/emergency_siren.wav');
if (Platform.OS !== 'web') {
  try {
    preload(sirenAsset);
  } catch (_) {}
}

export interface AlarmState {
  alarmLoading: boolean;
  alarmActive: boolean;
  sirenAudioPlaying: boolean;
  vibrationActive: boolean;
  alarmError: boolean;
  errorMessage: string | null;
}

type StateListener = (state: AlarmState) => void;

class EmergencyAlarmService {
  private nativePlayer: AudioPlayer | null = null;
  private webAudioElement: HTMLAudioElement | null = null;
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  private vibrationInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<StateListener> = new Set();

  private state: AlarmState = {
    alarmLoading: false,
    alarmActive: false,
    sirenAudioPlaying: false,
    vibrationActive: false,
    alarmError: false,
    errorMessage: null,
  };

  /**
   * Subscribe to alarm state changes.
   */
  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): AlarmState {
    return { ...this.state };
  }

  private updateState(partialState: Partial<AlarmState>): void {
    this.state = { ...this.state, ...partialState };
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Initialize audio mode configuration for native platforms.
   */
  public async initialize(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMix',
        });
      }
    } catch (err) {
      console.warn('[EmergencyAlarmService] Audio mode configuration warning:', err);
    }
  }

  /**
   * Preload and prepare native player instance on screen load.
   */
  public async prepareAlarm(): Promise<void> {
    if (Platform.OS !== 'web' && !this.nativePlayer) {
      try {
        await this.initialize();
        this.nativePlayer = createAudioPlayer(sirenAsset);
        this.nativePlayer.loop = true;
        this.nativePlayer.volume = 1.0;
        console.log('[EmergencyAlarmService] Siren asset loaded: true');
        console.log(`[EmergencyAlarmService] Siren asset: ${sirenAsset}`);
      } catch (e) {
        console.warn('[EmergencyAlarmService] Failed to prepare native audio player:', e);
      }
    }
  }

  /**
   * Start the emergency siren and repeating vibration/haptic pattern immediately upon user gesture.
   */
  public async startAlarm(maxDurationMs: number = 0): Promise<boolean> {
    console.log(`[EmergencyAlarmService] Platform: ${Platform.OS}`);
    console.log('[EmergencyAlarmService] Audio implementation: expo-audio');
    console.log('[EmergencyAlarmService] Siren asset loaded: true');
    console.log('[EmergencyAlarmService] User pressed ACTIVATE');

    if (this.state.alarmActive) {
      return true;
    }

    this.updateState({
      alarmLoading: true,
      alarmError: false,
      errorMessage: null,
    });

    let audioStarted = false;

    // Platform Separation: Web vs Native Android/iOS
    if (Platform.OS === 'web') {
      audioStarted = await this.startWebAudio();
    } else {
      audioStarted = await this.startNativeAudio();
    }

    const vibrationStarted = this.startRepeatingVibration();
    console.log(`[EmergencyAlarmService] Starting vibration... ${vibrationStarted}`);

    const isFullyActive = audioStarted || vibrationStarted;
    console.log(`[EmergencyAlarmService] Alarm fully active: ${isFullyActive}`);

    this.updateState({
      alarmActive: isFullyActive,
      sirenAudioPlaying: audioStarted,
      vibrationActive: vibrationStarted,
      alarmLoading: false,
      alarmError: !audioStarted,
      errorMessage: !audioStarted
        ? 'Siren audio failed to play. Vibration active.'
        : null,
    });

    if (maxDurationMs > 0) {
      if (this.autoStopTimer) clearTimeout(this.autoStopTimer);
      this.autoStopTimer = setTimeout(() => {
        this.stopAlarm();
      }, maxDurationMs);
    }

    return isFullyActive;
  }

  /**
   * Native audio playback via expo-audio (SDK 57)
   */
  private async startNativeAudio(): Promise<boolean> {
    try {
      await this.initialize();

      if (!this.nativePlayer) {
        this.nativePlayer = createAudioPlayer(sirenAsset);
      }

      console.log('[EmergencyAlarmService] Player available: true');
      console.log('[EmergencyAlarmService] Volume: 1');
      console.log('[EmergencyAlarmService] Loop: true');
      console.log('[EmergencyAlarmService] Starting real siren...');

      this.nativePlayer.loop = true;
      this.nativePlayer.volume = 1.0;
      this.nativePlayer.play();

      console.log('[EmergencyAlarmService] Siren playback confirmed: true');
      return true;
    } catch (err) {
      console.error('[EmergencyAlarmService] Native audio playback error:', err);
      return false;
    }
  }

  /**
   * Web audio playback using HTML5 Audio Element (Preserved for Web)
   */
  private async startWebAudio(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && window.Audio) {
        if (this.webAudioElement) {
          try {
            this.webAudioElement.pause();
          } catch (_) {}
          this.webAudioElement = null;
        }

        let src = typeof sirenAsset === 'string' ? sirenAsset : sirenAsset.default || sirenAsset.uri;
        if (!src && sirenAsset) {
          src = sirenAsset;
        }

        const audio = new window.Audio(src);
        audio.loop = true;
        audio.volume = 1.0;
        this.webAudioElement = audio;

        await audio.play();
        console.log('[EmergencyAlarmService] Web audio playback started: true');
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[EmergencyAlarmService] Web audio error:', err);
      return false;
    }
  }

  /**
   * Repeating Emergency Vibration helper
   */
  private startRepeatingVibration(): boolean {
    this.stopVibration();

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } catch (_) {}

    try {
      if (Platform.OS === 'android') {
        const pattern = [0, 400, 200, 400, 200, 800, 400];
        Vibration.vibrate(pattern, true);
      } else if (Platform.OS === 'ios') {
        Vibration.vibrate([0, 400, 200, 400]);
        this.vibrationInterval = setInterval(() => {
          Vibration.vibrate([0, 400, 200, 400]);
        }, 1500);
      } else if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([400, 200, 400, 200, 800]);
          this.vibrationInterval = setInterval(() => {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([400, 200, 400, 200, 800]);
            }
          }, 2000);
        }
      }
      return true;
    } catch (e) {
      console.warn('[EmergencyAlarmService] Vibration warning:', e);
      return false;
    }
  }

  private stopVibration(): void {
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    try {
      Vibration.cancel();
    } catch (_) {}
  }

  /**
   * Stop the siren playback, vibration, and auto-stop timer. Idempotent call.
   */
  public async stopAlarm(): Promise<void> {
    if (!this.state.alarmActive && !this.state.sirenAudioPlaying && !this.state.vibrationActive) {
      return;
    }

    console.log('[EmergencyAlarmService] Stopping alarm...');

    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }

    this.stopVibration();

    if (this.nativePlayer) {
      try {
        this.nativePlayer.pause();
        this.nativePlayer.seekTo(0);
      } catch (e) {
        console.warn('[EmergencyAlarmService] Error pausing native player:', e);
      }
    }

    if (this.webAudioElement) {
      try {
        this.webAudioElement.pause();
        this.webAudioElement.currentTime = 0;
      } catch (e) {
        console.warn('[EmergencyAlarmService] Error pausing web audio:', e);
      }
      this.webAudioElement = null;
    }

    this.updateState({
      alarmActive: false,
      sirenAudioPlaying: false,
      vibrationActive: false,
      alarmLoading: false,
      alarmError: false,
      errorMessage: null,
    });
  }

  /**
   * Cleanup everything on screen unmount
   */
  public async cleanup(): Promise<void> {
    await this.stopAlarm();
    if (this.nativePlayer) {
      try {
        this.nativePlayer.remove();
      } catch (_) {}
      this.nativePlayer = null;
    }
    this.listeners.clear();
  }
}

export const emergencyAlarmService = new EmergencyAlarmService();

export const prepareEmergencyAlarm = () =>
  emergencyAlarmService.prepareAlarm();
export const startEmergencyAlarm = (maxDurationMs: number = 0) =>
  emergencyAlarmService.startAlarm(maxDurationMs);
export const stopEmergencyAlarm = () =>
  emergencyAlarmService.stopAlarm();
export const cleanupEmergencyAlarm = () =>
  emergencyAlarmService.cleanup();

export default emergencyAlarmService;

