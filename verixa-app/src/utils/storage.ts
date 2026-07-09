/**
 * Verixa AI — Secure Token Storage
 * Wraps AsyncStorage for JWT token management.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'verixa_access_token';
const USER_KEY  = 'verixa_user';

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function saveUser(user: object): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getUser<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function removeUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}

/** Clear everything on logout */
export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
