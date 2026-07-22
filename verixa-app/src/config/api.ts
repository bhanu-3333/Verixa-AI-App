// verixa-app/src/config/api.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';


export const API_BASE_URL = (() => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }

  // Resolve host machine IP dynamically via Expo Constants
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).developerLauncherConfig?.manifestString;
  if (hostUri && typeof hostUri === 'string') {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000`;
    }
  }

  // Fallback for Android Emulator or developer machine LAN IP
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://10.245.162.219:8000';
})();

export default API_BASE_URL;
