/**
 * Verixa AI — Home Screen
 * Displays logged-in user info. Logout clears token and returns to Login.
 */

import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  ScrollView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { getUser, clearAuth } from '../../utils/storage';
import type { User } from '../../services/authService';

export default function HomeScreen() {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser<User>().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  async function handleLogout() {
    // Alert.alert doesn't work on web — confirm directly
    const confirmed =
      Platform.OS === 'web'
        ? window.confirm('Are you sure you want to logout?')
        : true; // on native we'll use a simpler direct logout

    if (confirmed) {
      await clearAuth();
      router.replace('/(auth)/login');
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Verixa AI</Text>
        <Text style={styles.headerSub}>Dashboard</Text>
      </View>

      {/* Welcome Card */}
      <View style={styles.card}>
        <Text style={styles.welcomeLabel}>Welcome back,</Text>
        <Text style={styles.welcomeName}>{user?.name ?? '—'}</Text>
      </View>

      {/* User Info Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account Details</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Name</Text>
          <Text style={styles.rowValue}>{user?.name ?? '—'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{user?.email ?? '—'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Language</Text>
          <Text style={styles.rowValue}>{user?.preferred_language?.toUpperCase() ?? 'EN'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Status</Text>
          <View style={[styles.badge, user?.is_active ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={styles.badgeText}>{user?.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
      </View>

      {/* Auth status notice */}
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          ✓ Authenticated via JWT · Phase 3 Complete
        </Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const C = { primary: '#208AEF', bg: '#f5f7fa', text: '#1a1a2e', muted: '#666', danger: '#e53935' };

const styles = StyleSheet.create({
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  container:    { flexGrow: 1, backgroundColor: C.bg, paddingBottom: 40 },

  header:       { backgroundColor: C.primary, paddingTop: 64, paddingBottom: 28, paddingHorizontal: 24 },
  headerTitle:  { fontSize: 26, fontWeight: '700', color: '#fff' },
  headerSub:    { fontSize: 14, color: '#d0eaff', marginTop: 2 },

  card:         {
    backgroundColor: '#fff', marginHorizontal: 20, marginTop: 20,
    borderRadius: 14, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  welcomeLabel: { fontSize: 14, color: C.muted },
  welcomeName:  { fontSize: 24, fontWeight: '700', color: C.text, marginTop: 4 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },

  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowLabel:     { fontSize: 14, color: C.muted },
  rowValue:     { fontSize: 14, fontWeight: '600', color: C.text, flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  divider:      { height: 1, backgroundColor: '#f0f2f5' },

  badge:        { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeActive:  { backgroundColor: '#e6f4ea' },
  badgeInactive:{ backgroundColor: '#fce8e6' },
  badgeText:    { fontSize: 12, fontWeight: '600', color: '#2e7d32' },

  notice:       {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: '#e8f4fd', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  noticeText:   { fontSize: 13, color: '#1565c0', textAlign: 'center' },

  logoutBtn:    {
    marginHorizontal: 20, marginTop: 24,
    backgroundColor: C.danger, borderRadius: 10,
    paddingVertical: 15, alignItems: 'center',
  },
  logoutText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
});
