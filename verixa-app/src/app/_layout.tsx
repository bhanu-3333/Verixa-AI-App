/**
 * Verixa AI — Root Layout
 * Entry point for expo-router.
 * Route groups:
 *   /        → index.tsx  (splash)
 *   /(auth)/ → login, register
 *   /(app)/  → home (JWT-protected)
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { LanguageProvider } from '../components/LanguageProvider';

// Keep the native splash visible until we're ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide native splash — our JS splash screen takes over
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <LanguageProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index"  options={{ animation: 'none' }} />
          <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
          <Stack.Screen name="(app)"  options={{ animation: 'fade' }} />
        </Stack>
      </LanguageProvider>
    </>
  );
}
