// verixa-app/src/services/EmergencyAlarmService.ts
import { Audio } from 'expo-av';
import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface AlarmState {
  alarmLoading: boolean;
  alarmActive: boolean;
  alarmError: boolean;
  errorMessage: string | null;
}

type StateListener = (state: AlarmState) => void;

class EmergencyAlarmService {
  private sound: Audio.Sound | null = null;
  private webAudioElement: HTMLAudioElement | null = null;
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  private vibrationInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<StateListener> = new Set();

  private state: AlarmState = {
    alarmLoading: false,
    alarmActive: false,
    alarmError: false,
    errorMessage: null,
  };

  /**
   * Subscribe to alarm state changes.
   */
  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    // Send current state immediately
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
   * Initialize audio mode configuration.
   */
  public async initialize(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });
      }
    } catch (err) {
      console.warn('[EmergencyAlarmService] initialize audio mode warning:', err);
    }
  }

  /**
   * Start the emergency siren and repeating vibration/haptic pattern immediately.
   */
  public async startAlarm(maxDurationMs: number = 0): Promise<boolean> {
    if (this.state.alarmActive) {
      console.log('[EmergencyAlarmService] Alarm is already active, ignoring duplicate start.');
      return true;
    }

    this.updateState({
      alarmLoading: true,
      alarmError: false,
      errorMessage: null,
    });

    // Start repeating vibration immediately
    this.startRepeatingVibration();

    let startedSuccessfully = false;

    // Platform specific audio playback
    if (Platform.OS === 'web') {
      startedSuccessfully = await this.startWebAudio();
    } else {
      startedSuccessfully = await this.startNativeAudio();
    }

    if (startedSuccessfully) {
      this.updateState({
        alarmActive: true,
        alarmLoading: false,
        alarmError: false,
        errorMessage: null,
      });

      // Schedule auto-stop only if maxDurationMs > 0
      if (maxDurationMs > 0) {
        if (this.autoStopTimer) clearTimeout(this.autoStopTimer);
        this.autoStopTimer = setTimeout(() => {
          console.log(`[EmergencyAlarmService] Auto-stopping alarm after ${maxDurationMs / 1000}s`);
          this.stopAlarm();
        }, maxDurationMs);
      }
    } else {
      this.updateState({
        alarmActive: false,
        alarmLoading: false,
        alarmError: true,
        errorMessage: this.state.errorMessage || 'Failed to start siren playback.',
      });
    }

    return startedSuccessfully;
  }

  /**
   * Native audio playback via expo-av
   */
  private async startNativeAudio(): Promise<boolean> {
    try {
      await this.initialize();

      if (this.sound) {
        try {
          await this.sound.unloadAsync();
        } catch (_) {}
        this.sound = null;
      }

      // Load local siren asset
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/emergency_siren.wav'),
        {
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
        }
      );

      this.sound = sound;
      await this.sound.playAsync();
      return true;
    } catch (err) {
      console.error('[EmergencyAlarmService] startNativeAudio error:', err);
      this.updateState({
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Web audio playback using HTML5 Audio or expo-av fallback
   */
  private async startWebAudio(): Promise<boolean> {
    try {
      // 1. Attempt expo-av sound
      if (this.sound) {
        try {
          await this.sound.unloadAsync();
        } catch (_) {}
        this.sound = null;
      }

      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/emergency_siren.wav'),
          {
            shouldPlay: true,
            isLooping: true,
            volume: 1.0,
          }
        );
        this.sound = sound;
        await this.sound.playAsync();
        return true;
      } catch (expoErr) {
        console.warn('[EmergencyAlarmService] expo-av web play failed, falling back to HTML5 Audio:', expoErr);
      }

      // 2. Fallback HTML5 Audio Element
      if (typeof window !== 'undefined') {
        if (this.webAudioElement) {
          this.webAudioElement.pause();
          this.webAudioElement = null;
        }

        const sirenAsset = require('../../assets/sounds/emergency_siren.wav');
        const src = typeof sirenAsset === 'string' ? sirenAsset : sirenAsset.default || sirenAsset.uri || sirenAsset;

        const audio = new window.Audio(src);
        audio.loop = true;
        audio.volume = 1.0;
        this.webAudioElement = audio;

        await audio.play();
        return true;
      }
      return false;
    } catch (err) {
      console.error('[EmergencyAlarmService] startWebAudio error (likely autoplay policy):', err);
      this.updateState({
        errorMessage: 'Browser blocked autoplay. Tap "Enable Alarm" to start siren.',
      });
      return false;
    }
  }

  /**
   * Stop the siren playback, vibration, and auto-stop timer.
   */
  public async stopAlarm(): Promise<void> {
    console.log('[EmergencyAlarmService] Stopping alarm...');

    // Clear auto stop timer
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }

    // Stop vibration
    this.stopVibration();

    // Stop native sound
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (e) {
        console.warn('[EmergencyAlarmService] Error unloading native sound:', e);
      }
      this.sound = null;
    }

    // Stop web audio
    if (this.webAudioElement) {
      try {
        this.webAudioElement.pause();
        this.webAudioElement.currentTime = 0;
      } catch (e) {
        console.warn('[EmergencyAlarmService] Error stopping web audio:', e);
      }
      this.webAudioElement = null;
    }

    this.updateState({
      alarmActive: false,
      alarmLoading: false,
    });
  }

  /**
   * Repeating Emergency Vibration helper
   */
  private startRepeatingVibration(): void {
    this.stopVibration();

    // Trigger initial haptic
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } catch (_) {}

    if (Platform.OS === 'android') {
      // Repeat pattern starting at index 0 on Android
      // [wait, vibrate, wait, vibrate...]
      const pattern = [0, 400, 200, 400, 200, 800, 400];
      Vibration.vibrate(pattern, true);
    } else if (Platform.OS === 'ios') {
      // iOS doesn't support repeat parameter in Vibration.vibrate, use interval
      Vibration.vibrate([0, 400, 200, 400]);
      this.vibrationInterval = setInterval(() => {
        Vibration.vibrate([0, 400, 200, 400]);
      }, 1500);
    } else if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([400, 200, 400, 200, 800]);
          this.vibrationInterval = setInterval(() => {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([400, 200, 400, 200, 800]);
            }
          }, 2000);
        } catch (_) {}
      }
    }
  }

  /**
   * Stop all active vibrations
   */
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
   * Cleanup everything on screen unmount
   */
  public async cleanup(): Promise<void> {
    await this.stopAlarm();
    this.listeners.clear();
  }
}

export const emergencyAlarmService = new EmergencyAlarmService();

export const startEmergencyAlarm = (maxDurationMs: number = 0) =>
  emergencyAlarmService.startAlarm(maxDurationMs);
export const stopEmergencyAlarm = () =>
  emergencyAlarmService.stopAlarm();
export const cleanupEmergencyAlarm = () =>
  emergencyAlarmService.cleanup();

export default emergencyAlarmService;
