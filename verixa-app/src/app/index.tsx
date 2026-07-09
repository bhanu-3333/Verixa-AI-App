/**
 * Verixa AI — Splash Screen
 * Shows for 2 seconds then routes based on stored JWT token.
 */

import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { getToken } from '../utils/storage';

export default function Splash() {
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const token = await getToken();
        if (token) {
          router.replace('/(app)/home');
        } else {
          router.replace('/(auth)/login');
        }
      } catch {
        router.replace('/(auth)/login');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Verixa AI</Text>
      <Text style={styles.tagline}>Smart Communication</Text>
      <ActivityIndicator style={styles.spinner} color="#fff" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#d0eaff',
  },
  spinner: {
    marginTop: 40,
  },
});
