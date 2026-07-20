// src/components/SharedHeader.tsx

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LanguageToggle } from './LanguageToggle';

/** A sleek global header containing app branding and the LanguageToggle dropdown */
export const SharedHeader: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verixa AI</Text>
      <LanguageToggle />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A', // Sleek dark theme color
    paddingTop: Platform.OS === 'ios' ? 50 : (Platform.OS === 'android' ? 40 : 15),
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    zIndex: 999, // Ensure it floats above content
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
});
