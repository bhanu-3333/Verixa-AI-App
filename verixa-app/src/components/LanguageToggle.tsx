// src/components/LanguageToggle.tsx

import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, View, Platform } from 'react-native';
import { useLanguage } from './LanguageProvider';
import { SupportedLanguage } from '../services/LanguageService';

/** Globe‑style premium language selector dropdown */
export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const selectLanguage = async (lang: SupportedLanguage) => {
    await setLanguage(lang);
    setIsOpen(false);
  };

  const getLanguageLabel = () => {
    return language === SupportedLanguage.EN ? 'English' : 'தமிழ்';
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={toggleDropdown} style={styles.trigger}>
        <Text style={styles.triggerText}>🌐 {getLanguageLabel()} ▼</Text>
      </Pressable>

      {isOpen && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)} />
          <View style={styles.dropdown}>
            <Pressable
              style={[styles.dropdownItem, language === SupportedLanguage.EN && styles.activeItem]}
              onPress={() => selectLanguage(SupportedLanguage.EN)}
            >
              <Text style={[styles.itemText, language === SupportedLanguage.EN && styles.activeItemText]}>
                • English
              </Text>
            </Pressable>
            <Pressable
              style={[styles.dropdownItem, language === SupportedLanguage.TA && styles.activeItem]}
              onPress={() => selectLanguage(SupportedLanguage.TA)}
            >
              <Text style={[styles.itemText, language === SupportedLanguage.TA && styles.activeItemText]}>
                • தமிழ்
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  triggerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  backdrop: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: -500,
    bottom: -500,
    left: -500,
    right: -500,
    zIndex: 999,
  },
  dropdown: {
    position: 'absolute',
    top: 42,
    right: 0,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  activeItem: {
    backgroundColor: 'rgba(32, 138, 239, 0.15)',
  },
  itemText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  activeItemText: {
    color: '#208AEF',
    fontWeight: '600',
  },
});
