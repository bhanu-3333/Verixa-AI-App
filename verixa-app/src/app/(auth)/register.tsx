/**
 * Verixa AI — Register Screen
 * Calls POST /api/v1/auth/register → shows success → navigates to Login
 */

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { registerUser } from '../../services/authService';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  async function handleRegister() {
    setError('');
    setSuccess('');

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    // Emergency contact validation
    if (!emergencyName.trim() || !emergencyPhone.trim() || !emergencyRelation.trim()) {
      setError('All fields are required.');
      return;
    }
    if (!/^\d{10}$/.test(emergencyPhone.trim())) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        emergency_contact_relationship: emergencyRelation.trim(),
      });
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => router.replace('/(auth)/login'), 1500);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail  ||
        'Registration failed. Please try again.';
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

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Verixa AI</Text>

        {/* Error banner */}
        {error !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Success banner */}
        {success !== '' && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor="#aaa"
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />

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
          placeholder="Min. 6 characters"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Re-enter password"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!loading}
        />

        {/* Emergency Contact Name */}
        <Text style={styles.label}>Emergency Contact Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Contact name"
          placeholderTextColor="#aaa"
          autoCapitalize="words"
          value={emergencyName}
          onChangeText={setEmergencyName}
          editable={!loading}
        />

        {/* Emergency Contact Phone Number */}
        <Text style={styles.label}>Emergency Contact Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="10‑digit phone"
          placeholderTextColor="#aaa"
          keyboardType="phone-pad"
          value={emergencyPhone}
          onChangeText={setEmergencyPhone}
          editable={!loading}
        />

        {/* Emergency Contact Relationship */}
        <Text style={styles.label}>Relationship</Text>
        <TextInput
          style={styles.input}
          placeholder="Relationship (e.g., brother)"
          placeholderTextColor="#aaa"
          value={emergencyRelation}
          onChangeText={setEmergencyRelation}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Create Account</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => router.replace('/(auth)/login')}
          disabled={loading}
        >
          <Text style={styles.linkText}>
            Already have an account?{' '}
            <Text style={styles.linkBold}>Login</Text>
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
  successBox:  { backgroundColor: '#e6f4ea', borderRadius: 8, padding: 12, marginBottom: 16 },
  successText: { color: '#2e7d32', fontSize: 14, textAlign: 'center' },
  label:       { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 6 },
  input:       {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#dde1e7',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: C.text, marginBottom: 18,
  },
  btn:         {
    backgroundColor: C.primary, borderRadius: 10,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  link:        { marginTop: 24, alignItems: 'center' },
  linkText:    { fontSize: 14, color: C.muted },
  linkBold:    { color: C.primary, fontWeight: '700' },
});
