/**
 * Verixa AI — Profile Screen
 * Displays the logged-in user's registration details.
 * Home page theme. No emojis. Backend untouched.
 */

import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform,
  Alert, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getUser, getToken, clearAuth } from '../../utils/storage';
import { getMe } from '../../services/authService';

// ─── Extended user type — includes emergency contact fields ──────────────────
interface FullUser {
  id:                             string;
  name:                           string;
  email:                          string;
  preferred_language:             string;
  is_active:                      boolean;
  created_at?:                    string;
  emergency_contact_name?:        string;
  emergency_contact_phone?:       string;
  emergency_contact_relationship?: string;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY    = '#1A56DB';
const PAGE_BG    = '#E8F2FF';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#0C1E3C';
const TEXT_MID   = '#6B7A8D';
const TEXT_LIGHT = '#A0AEC0';
const ICON_BG    = '#DCE8F8';
const DANGER     = '#EF4444';
const SUCCESS    = '#10B981';
const BASE_W     = 390;

const BOLD_FONT: any = Platform.select({
  ios:     { fontFamily: 'Helvetica Neue', fontWeight: '700' },
  android: { fontFamily: 'sans-serif', fontWeight: '700' },
  default: { fontFamily: 'Arial, sans-serif', fontWeight: '700' },
});

function scale(size: number, w: number, min: number, max: number) {
  return Math.max(min, Math.min(max, (w / BASE_W) * size));
}

// ─── Single info row ──────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={R.infoRow}>
      <View style={R.infoIcon}>
        <MaterialCommunityIcons name={icon as any} size={18} color={PRIMARY} />
      </View>
      <View style={R.infoText}>
        <Text style={R.infoLabel}>{label}</Text>
        <Text style={R.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { width }  = useWindowDimensions();
  const insets     = useSafeAreaInsets();
  const hPad       = scale(20, width, 14, 28);

  const [user,    setUser]    = useState<FullUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user — try fresh from server, fallback to cached
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const fresh = await getMe(token) as FullUser;
          setUser(fresh);
        } else {
          const cached = await getUser<FullUser>();
          setUser(cached);
        }
      } catch {
        const cached = await getUser<FullUser>();
        setUser(cached);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleLogout() {
    const confirm = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to logout?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Logout', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });
    if (confirm) {
      await clearAuth();
      router.replace('/(auth)/login');
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const langLabel = user?.preferred_language === 'ta' ? 'Tamil' : 'English';

  if (loading) {
    return (
      <View style={[R.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={R.safeArea}>
      {/* Header */}
      <View style={[R.header, { paddingTop: insets.top + 4, paddingHorizontal: hPad }]}>
        <TouchableOpacity
          style={R.backBtn}
          onPress={() => router.replace('/(app)/home')}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={scale(20, width, 18, 24)} color={PRIMARY} />
        </TouchableOpacity>
        <View style={R.headerText}>
          <Text style={[R.headerTitle, { fontSize: scale(20, width, 17, 24) }]}>My Profile</Text>
          <Text style={[R.headerSub, { fontSize: scale(12, width, 10, 14) }]}>
            Your account information
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[R.scroll, { paddingHorizontal: hPad }]}
      >
        {/* Avatar circle + name */}
        <View style={R.avatarSection}>
          <View style={R.avatarCircle}>
            <Text style={[R.avatarInitials, { fontSize: scale(36, width, 28, 46) }]}>
              {initials}
            </Text>
          </View>
          <Text style={[R.avatarName, { fontSize: scale(22, width, 18, 28) }]}>
            {user?.name ?? 'User'}
          </Text>
          {joinDate && (
            <Text style={[R.joinDate, { fontSize: scale(12, width, 10, 14) }]}>
              Member since {joinDate}
            </Text>
          )}
        </View>

        {/* Personal Info Card */}
        <View style={R.card}>
          <View style={R.cardTitleRow}>
            <View style={R.cardIconCircle}>
              <MaterialCommunityIcons name="account-outline" size={16} color={PRIMARY} />
            </View>
            <Text style={[R.cardTitle, { fontSize: scale(14, width, 12, 17) }]}>
              Personal Information
            </Text>
          </View>
          <View style={R.divider} />
          <InfoRow icon="account"          label="Full Name"           value={user?.name ?? ''} />
          <InfoRow icon="email-outline"    label="Email Address"       value={user?.email ?? ''} />
          <InfoRow icon="translate"        label="Preferred Language"  value={langLabel} />
        </View>

        {/* Emergency Contact Card */}
        <View style={R.card}>
          <View style={R.cardTitleRow}>
            <View style={[R.cardIconCircle, { backgroundColor: DANGER + '18' }]}>
              <MaterialCommunityIcons name="phone-alert-outline" size={16} color={DANGER} />
            </View>
            <Text style={[R.cardTitle, { fontSize: scale(14, width, 12, 17) }]}>
              Emergency Contact
            </Text>
          </View>
          <View style={R.divider} />
          <InfoRow icon="account-heart-outline"  label="Contact Name"     value={user?.emergency_contact_name ?? ''} />
          <InfoRow icon="phone-outline"           label="Phone Number"     value={user?.emergency_contact_phone ?? ''} />
          <InfoRow icon="account-group-outline"   label="Relationship"     value={user?.emergency_contact_relationship ?? ''} />
        </View>

        {/* Account Settings Card */}
        <View style={R.card}>
          <View style={R.cardTitleRow}>
            <View style={R.cardIconCircle}>
              <MaterialCommunityIcons name="cog-outline" size={16} color={PRIMARY} />
            </View>
            <Text style={[R.cardTitle, { fontSize: scale(14, width, 12, 17) }]}>
              Account
            </Text>
          </View>
          <View style={R.divider} />

          {/* Account ID row */}
          <View style={R.infoRow}>
            <View style={R.infoIcon}>
              <MaterialCommunityIcons name="identifier" size={18} color={PRIMARY} />
            </View>
            <View style={R.infoText}>
              <Text style={R.infoLabel}>Account ID</Text>
              <Text style={[R.infoValue, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12 }]}>
                {user?.id ? user.id.slice(0, 16) + '...' : '—'}
              </Text>
            </View>
          </View>

          {/* Status row */}
          <View style={R.infoRow}>
            <View style={R.infoIcon}>
              <MaterialCommunityIcons name="shield-check-outline" size={18} color={SUCCESS} />
            </View>
            <View style={R.infoText}>
              <Text style={R.infoLabel}>Account Status</Text>
              <View style={R.statusRow}>
                <View style={R.statusDot} />
                <Text style={[R.infoValue, { color: SUCCESS }]}>Active & Verified</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout button */}
        <TouchableOpacity
          style={R.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="logout" size={scale(18, width, 16, 21)} color={DANGER} style={{ marginRight: 10 }} />
          <Text style={[R.logoutText, { fontSize: scale(15, width, 13, 17) }]}>
            Logout
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const R = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  scroll:   { paddingTop: 24, paddingBottom: 40 },

  // Header
  header: {
    backgroundColor:   CARD_BG,
    flexDirection:     'row',
    alignItems:        'center',
    paddingBottom:     14,
    borderBottomWidth: 1,
    borderBottomColor: '#E0ECF8',
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.06,
    shadowRadius:      6,
    elevation:         4,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, flexShrink: 0,
  },
  headerText:  { flex: 1 },
  headerTitle: { color: TEXT_DARK, ...BOLD_FONT },
  headerSub:   { color: TEXT_MID, marginTop: 2 },

  // Avatar section
  avatarSection: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  avatarCircle: {
    width:           96,
    height:          96,
    borderRadius:    48,
    backgroundColor: PRIMARY,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     PRIMARY,
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.30,
    shadowRadius:    12,
    elevation:       6,
    marginBottom:    4,
  },
  avatarInitials: { color: '#fff', fontWeight: '700' },
  avatarName:     { color: TEXT_DARK, ...BOLD_FONT },
  activeBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: SUCCESS + '18',
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderRadius:    20,
    borderWidth:     1,
    borderColor:     SUCCESS + '40',
    gap:             6,
  },
  activeDot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: SUCCESS },
  activeBadgeText: { color: SUCCESS, fontSize: 12, fontWeight: '700' },
  joinDate:        { color: TEXT_LIGHT, marginTop: 2 },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius:    20,
    padding:         16,
    marginBottom:    16,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.05,
    shadowRadius:    6,
    elevation:       2,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { color: TEXT_DARK, ...BOLD_FONT },
  divider:   { height: 1, backgroundColor: '#EFF5FC', marginBottom: 14 },

  // Info row
  infoRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    gap:            12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F9FF',
  },
  infoIcon: {
    width:           34,
    height:          34,
    borderRadius:    17,
    backgroundColor: ICON_BG,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  infoText:  { flex: 1, justifyContent: 'center' },
  infoLabel: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  infoValue: { fontSize: 14, color: TEXT_DARK, fontWeight: '600' },

  // Status
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: SUCCESS },

  // Logout
  logoutBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#FEF2F2',
    borderRadius:    16,
    paddingVertical: 15,
    marginTop:       4,
    borderWidth:     1.5,
    borderColor:     DANGER + '30',
  },
  logoutText: { color: DANGER, fontWeight: '700' },
});
