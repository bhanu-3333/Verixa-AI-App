/**
 * Verixa AI — Login Screen
 */

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { loginUser } from '../../services/authService';
import { saveToken, saveUser } from '../../utils/storage';

export default function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser({ email: email.trim(), password });

      // Save token and user — await both to ensure they're written before navigating
      await saveToken(data.access_token);
      await saveUser(data.user);

      // On web, use a small delay to ensure AsyncStorage (localStorage) flush
      if (Platform.OS === 'web') {
        setTimeout(() => {
          router.replace('/(app)/home');
        }, 100);
      } else {
        router.replace('/(app)/home');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail  ||
        'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <Text style={styles.title}>Verixa AI</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {error !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#aaa"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Login</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => router.push('/(auth)/register')}
          disabled={loading}
        >
          <Text style={styles.linkText}>
            Don't have an account?{' '}
            <Text style={styles.linkBold}>Create Account</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const C = { primary: '#208AEF', bg: '#f5f7fa', text: '#1a1a2e', muted: '#666' };

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: C.bg },
  container:   { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  title:       { fontSize: 32, fontWeight: '700', color: C.primary, textAlign: 'center', marginBottom: 6 },
  subtitle:    { fontSize: 15, color: C.muted, textAlign: 'center', marginBottom: 24 },
  errorBox:    { backgroundColor: '#fce8e6', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText:   { color: '#c62828', fontSize: 14, textAlign: 'center' },
  label:       { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 6 },
  input:       {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#dde1e7',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: C.text, marginBottom: 18,
  },
  btn:         { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  link:        { marginTop: 24, alignItems: 'center' },
  linkText:    { fontSize: 14, color: C.muted },
  linkBold:    { color: C.primary, fontWeight: '700' },
});
