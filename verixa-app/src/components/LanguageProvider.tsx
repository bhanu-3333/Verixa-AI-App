// src/components/LanguageProvider.tsx

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupportedLanguage, setLanguage as setLanguageServiceLang } from '../services/LanguageService';
import en from '../locales/en';
import ta from '../locales/ta';

/** Locales dictionary mapping */
const locales: Record<SupportedLanguage, Record<string, string>> = {
  [SupportedLanguage.EN]: en,
  [SupportedLanguage.TA]: ta,
};

/** Context shape */
interface LanguageContextProps {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string) => string;
  isLanguageReady: boolean;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

/** Provider component – single source of truth for UI language state */
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(SupportedLanguage.EN);
  const [isLanguageReady, setIsLanguageReady] = useState<boolean>(false);

  // Load persisted language on app mount
  useEffect(() => {
    async function load() {
      try {
        const stored = await AsyncStorage.getItem('language');
        if (stored === SupportedLanguage.EN || stored === SupportedLanguage.TA) {
          const langVal = stored as SupportedLanguage;
          setLanguageState(langVal);
          setLanguageServiceLang(langVal);
        } else {
          setLanguageState(SupportedLanguage.EN);
          setLanguageServiceLang(SupportedLanguage.EN);
        }
      } catch (e) {
        console.warn('[LanguageProvider] Failed to load persisted language:', e);
        setLanguageState(SupportedLanguage.EN);
      } finally {
        setIsLanguageReady(true);
      }
    }
    load();
  }, []);

  // Update React state IMMEDIATELY for instant UI re-render, then persist
  const changeLanguage = useCallback(async (newLang: SupportedLanguage) => {
    // 1. Instant React state update
    setLanguageState(newLang);
    // 2. Keep LanguageService module variable in sync for non-React callers (e.g. SpeechService)
    setLanguageServiceLang(newLang);

    // 3. Asynchronously persist to storage
    try {
      await AsyncStorage.setItem('language', newLang);
    } catch (e) {
      console.warn('[LanguageProvider] Failed to persist language:', e);
    }
  }, []);

  // Reactive translator function bound directly to current language state
  const t = useCallback(
    (key: string): string => {
      const dict = locales[language] || locales[SupportedLanguage.EN];
      const val = dict[key] ?? locales[SupportedLanguage.EN][key];
      if (!val) {
        console.warn(`[LanguageProvider] Missing translation for key "${key}" in language "${language}"`);
        return key;
      }
      return val;
    },
    [language]
  );

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage: changeLanguage,
      t,
      isLanguageReady,
    }),
    [language, changeLanguage, t, isLanguageReady]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

/** Hook for consuming the language context */
export const useLanguage = (): LanguageContextProps => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};

