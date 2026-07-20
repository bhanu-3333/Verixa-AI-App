/**
 * Verixa AI — Speech Service
 * Synthesizes text-to-speech using expo-speech.
 */

import * as Speech from 'expo-speech';
import { getLanguage, SupportedLanguage } from '../services/LanguageService';

class SpeechService {
  private isSpeakingState = false;

  /**
   * Speak a text string.
   * If already speaking, it will stop the current speech before speaking the new one.
   */
  public async speak(text: string, language: string = getLanguage() === SupportedLanguage.TA ? 'ta-IN' : 'en-US'): Promise<void> {
    try {
      if (this.isSpeakingState) {
        await Speech.stop();
      }

      this.isSpeakingState = true;
      Speech.speak(text, {
        language,
        onDone: () => {
          this.isSpeakingState = false;
        },
        onError: (err) => {
          console.error('[SpeechService] Error during speaking:', err);
          this.isSpeakingState = false;
        },
      });
    } catch (error) {
      console.error('[SpeechService] Failed to speak:', error);
      this.isSpeakingState = false;
    }
  }

  /**
   * Stop any active speech.
   */
  public async stop(): Promise<void> {
    try {
      await Speech.stop();
      this.isSpeakingState = false;
    } catch (error) {
      console.error('[SpeechService] Failed to stop speech:', error);
    }
  }

  /**
   * Check if speech is currently active.
   */
  public isSpeaking(): boolean {
    return this.isSpeakingState;
  }
}

export default new SpeechService();
