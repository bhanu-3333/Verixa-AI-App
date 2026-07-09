/**
 * App group layout — protects all authenticated screens.
 * Redirects to login if no JWT found in storage.
 */

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { getToken } from '../../utils/storage';

export default function AppLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function check() {
      // Small delay on web ensures AsyncStorage (localStorage) has flushed
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

  return <Stack screenOptions={{ headerShown: false }} />;
}
