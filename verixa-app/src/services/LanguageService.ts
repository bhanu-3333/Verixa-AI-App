// src/services/LanguageService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../locales/en';
import ta from '../locales/ta';

/** Supported language codes */
export enum SupportedLanguage {
  EN = 'en',
  TA = 'ta',
}

/** Key used for persisting language selection */
const STORAGE_KEY = 'language';

/** In‑memory current language – defaults to English */
let currentLanguage: SupportedLanguage = SupportedLanguage.EN;

/** Translation dictionary – extendable for future languages */
const translationDictionary: Record<string, { en: string; ta: string }> = {
  HELP_ME: { en: 'Help me', ta: 'எனக்கு உதவி வேண்டும்' },
  THANK_YOU: { en: 'Thank you', ta: 'நன்றி' },
  YES: { en: 'Yes', ta: 'ஆம்' },
  NO: { en: 'No', ta: 'இல்லை' },
  CALL_DOCTOR: { en: 'Call doctor', ta: 'மருத்துவரை அழைக்கவும்' },
  EMERGENCY_ALERT: { en: 'Emergency Alert', ta: 'அவசர உதவி' },
  I_NEED_WATER: { en: 'I need water', ta: 'எனக்கு தண்ணீர் வேண்டும்' },
  I_NEED_FOOD: { en: 'I need food', ta: 'எனக்கு உணவு வேண்டும்' },
};

/** Persist the selected language to AsyncStorage */
async function persistLanguage(lang: SupportedLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch (e) {
    console.warn('[LanguageService] Failed to persist language:', e);
  }
}

/** Retrieve the persisted language (if any) */
async function loadPersistedLanguage(): Promise<SupportedLanguage> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && (stored === SupportedLanguage.EN || stored === SupportedLanguage.TA)) {
      currentLanguage = stored as SupportedLanguage;
    }
  } catch (e) {
    console.warn('[LanguageService] Failed to load persisted language:', e);
  }
  return currentLanguage;
}

/** Set the current language and persist it */
export async function setLanguage(lang: SupportedLanguage): Promise<void> {
  currentLanguage = lang;
  await persistLanguage(lang);
}

/** Get the current language (synchronous) */
export function getLanguage(): SupportedLanguage {
  return currentLanguage;
}

/** Translate a key based on the current language */
export function translate(key: string): string {
  const entry = translationDictionary[key];
  if (!entry) {
    console.warn(`[LanguageService] Missing translation for key: ${key}`);
    return key;
  }
  return entry[currentLanguage] || entry.en;
}

/** Translate a key using locale files (en.ts / ta.ts) */
const locales: Record<string, Record<string, string>> = { en, ta };
export function t(key: string): string {
  const dict = locales[currentLanguage] || locales.en;
  const value = dict[key] || locales.en[key];
  if (!value) {
    console.warn(`[LanguageService] Missing translation: "${key}" (language: ${currentLanguage})`);
    return key;
  }
  return value;
}

// Load persisted language when the module is first used (for non-React consumers)
loadPersistedLanguage();
