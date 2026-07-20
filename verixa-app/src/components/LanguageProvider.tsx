// src/components/LanguageProvider.tsx

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupportedLanguage, setLanguage, t } from '../services/LanguageService';

/** Context shape */
interface LanguageContextProps {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

/** Provider component – wrap the whole app (e.g., in _layout.tsx) */
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<SupportedLanguage>(SupportedLanguage.EN);

  // Load persisted language on mount
  useEffect(() => {
    async function load() {
      try {
        const stored = await AsyncStorage.getItem('language');
        if (stored === 'en' || stored === 'ta') {
          await setLanguage(stored as SupportedLanguage);
          setLangState(stored as SupportedLanguage);
        } else {
          await setLanguage(SupportedLanguage.EN);
          setLangState(SupportedLanguage.EN);
        }
      } catch (e) {
        console.warn('[LanguageProvider] Failed to load persisted language:', e);
        setLangState(SupportedLanguage.EN);
      }
    }
    load();
  }, []);

  const changeLanguage = async (lang: SupportedLanguage) => {
    await setLanguage(lang);
    setLangState(lang);
  };

  // Expose a local t function bound to the reactive language state
  const reactiveT = (key: string) => {
    return t(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t: reactiveT }}>
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
