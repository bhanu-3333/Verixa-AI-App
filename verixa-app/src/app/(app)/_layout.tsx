/**
 * App group layout — protects all authenticated screens.
 * Redirects to login if no JWT found in storage.
 * SharedHeader is hidden on the home screen (it has its own transparent header).
 */

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { getToken } from '../../utils/storage';
import { SharedHeader } from '../../components/SharedHeader';

export default function AppLayout() {
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  // Hide SharedHeader on home — home has its own transparent floating header
  const hideHeader = pathname === '/' || pathname === '/home' || pathname.endsWith('/home');

  useEffect(() => {
    async function check() {
      if (Platform.OS === 'web') {
        await new Promise(r => setTimeout(r, 150));
      }
      const token = await getToken();
      if (!token) {
        router.replace('/(auth)/login');
      } else {
        setReady(true);
      }
    }
    check();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7fa' }}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {!hideHeader && <SharedHeader />}
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
