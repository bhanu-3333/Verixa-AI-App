// src/app/(app)/emergency.tsx
// Emergency SOS screen — UI restyled to home light blue theme. No emojis.
// ALL logic, backend calls, state, and hooks are UNCHANGED.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Platform,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../components/LanguageProvider';
import {
  sendSOS,
  getSOSHistory,
  deleteSOSHistory,
  EmergencyPayload,
  EmergencyHistoryEntry,
} from '../../services/EmergencyService';
import { SOSButton } from '../../components/SOSButton';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
const WARNING    = '#F59E0B';

const BOLD_FONT: any = Platform.select({
  ios:     { fontFamily: 'Helvetica Neue', fontWeight: '700' },
  android: { fontFamily: 'sans-serif', fontWeight: '700' },
  default: { fontFamily: 'Arial, sans-serif', fontWeight: '700' },
});

// Emergency type config — icon + label key
const EMERGENCY_TYPES = [
  { key: 'Medical', icon: 'hospital-box-outline', labelKey: 'emergency_type_medical' },
  { key: 'Police',  icon: 'shield-account-outline', labelKey: 'emergency_type_police' },
  { key: 'Fire',    icon: 'fire',                  labelKey: 'emergency_type_fire' },
  { key: 'General', icon: 'alert-circle-outline',  labelKey: 'emergency_type_general' },
] as const;

export default function EmergencyScreen() {
  const router   = useRouter();
  const { t }    = useLanguage();
  const insets   = useSafeAreaInsets();

  // ── All original state — UNTOUCHED ───────────────────────────────────────
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [location, setLocation]               = useState<{ latitude: number; longitude: number } | null>(null);
  const [sending, setSending]                 = useState(false);
  const [success, setSuccess]                 = useState(false);
  const [history, setHistory]                 = useState<EmergencyHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory]   = useState(true);
  const [emergencyType, setEmergencyType]     = useState<'Medical' | 'Police' | 'Fire' | 'General'>('General');
  const [isFallback, setIsFallback]           = useState(false);

  // ── All original logic — UNTOUCHED ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocation({ latitude: 17.3850, longitude: 78.4867 });
          setIsFallback(true); setLoadingLocation(false); return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setIsFallback(false);
      } catch (e) {
        setLocation({ latitude: 17.3850, longitude: 78.4867 });
        setIsFallback(true);
      } finally { setLoadingLocation(false); }
    })();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const hist = await getSOSHistory();
        if (active) setHistory(hist);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('Authentication token required') || msg.includes('Session expired') || msg.includes('log in again')) {
          if (active) {
            Platform.OS === 'web' ? window.alert('Session expired. Please login again.') : Alert.alert('Session Expired', 'Please login again.');
            router.replace('/(auth)/login');
          }
        }
      } finally { if (active) setLoadingHistory(false); }
    })();
    return () => { active = false; };
  }, []);

  const triggerHaptic = async () => {
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (_) {}
  };

  const executeSOS = async () => {
    setSending(true); setSuccess(false);
    await triggerHaptic();
    if (!location) {
      const noLocMsg = t('emergency_no_location') || 'Cannot send SOS without GPS coordinates.';
      Platform.OS === 'web' ? window.alert(noLocMsg) : Alert.alert(t('emergency_no_location_title') || 'No Location', noLocMsg);
      setSending(false); return;
    }
    const payload: EmergencyPayload = { user_id: 'current_user', type: emergencyType, latitude: location.latitude, longitude: location.longitude };
    try {
      const res = await sendSOS(payload);
      const isWeb = Platform.OS === 'web';
      const isRealWhatsAppSuccess = res.status === 'success' && res.data?.whatsapp_status === 'success' && res.data?.delivery_status === 'accepted' && Boolean(res.data?.meta_response_id);
      const isMocked = res.status === 'mocked' || res.data?.whatsapp_status === 'mocked' || res.data?.delivery_status === 'mocked';
      const mapsLink = location ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}&ll=${location.latitude},${location.longitude}&z=17` : '';
      const navigateToActiveScreen = () => { router.push({ pathname: '/(app)/emergency-active' as any, params: { alert_id: res.alert_id || '', emergency_type: emergencyType, latitude: location.latitude.toString(), longitude: location.longitude.toString(), maps_link: mapsLink } }); };
      if (isRealWhatsAppSuccess) {
        setSuccess(true);
        const alertMsg = t('emergency_alert_sent') || 'Emergency WhatsApp alert sent successfully.';
        isWeb ? (window.alert(alertMsg), navigateToActiveScreen()) : Alert.alert(t('emergency_title') || 'Emergency Alert', alertMsg, [{ text: t('ok') || 'OK', onPress: navigateToActiveScreen }]);
      } else if (isMocked) {
        setSuccess(false);
        const mockMsg = t('emergency_test_mode_text') || 'Test Mode — No real WhatsApp message was sent.';
        isWeb ? (window.alert(mockMsg), navigateToActiveScreen()) : Alert.alert(t('emergency_title') || 'Emergency Alert (Test Mode)', mockMsg, [{ text: t('ok') || 'OK', onPress: navigateToActiveScreen }]);
      } else {
        setSuccess(false);
        const errMsg = res.message || res.data?.error_message || t('emergency_alert_failed') || 'Emergency alert could not be sent.';
        isWeb ? window.alert(errMsg) : Alert.alert(t('emergency_failed_popup_title') || 'SOS Failed', errMsg);
      }
      try { const fresh = await getSOSHistory(); setHistory(fresh); } catch (_) {}
    } catch (e) {
      setSuccess(false);
      const msg = e instanceof Error ? e.message : (t('emergency_alert_failed') || 'Failed to send SOS alert.');
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert(t('emergency_failed_popup_title') || 'SOS Failed', msg);
      if (msg.includes('Authentication token required') || msg.includes('Session expired') || msg.includes('log in again')) router.replace('/(auth)/login');
    } finally { setSending(false); }
  };

  const handleDelete = async (alertId: string) => {
    const confirmed = Platform.OS === 'web' ? window.confirm(t('emergency_confirm_delete') || 'Delete this alert?') : true;
    if (!confirmed) return;
    try {
      await deleteSOSHistory(alertId);
      setHistory(prev => prev.filter(h => h.id !== alertId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not delete history entry.';
      Alert.alert(t('emergency_error') || 'Error', msg);
      if (msg.includes('Authentication token required') || msg.includes('Session expired') || msg.includes('log in again')) router.replace('/(auth)/login');
    }
  };

  const mapsUrl = location ? `https://maps.google.com/?q=${location.latitude},${location.longitude}` : null;

  return (
    <ScrollView
      style={S.root}
      contentContainerStyle={[S.container, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={20} color={PRIMARY} />
        </TouchableOpacity>
        <View style={S.headerTextWrap}>
          <MaterialCommunityIcons name="bell-alert" size={22} color={DANGER} style={{ marginRight: 8 }} />
          <Text style={S.headerTitle}>{t('emergency_title')}</Text>
        </View>
      </View>

      {/* ── Location Card ──────────────────────────────────────────────── */}
      <View style={S.card}>
        <View style={S.cardTitleRow}>
          <View style={S.cardIconCircle}>
            <Feather name="map-pin" size={15} color={PRIMARY} />
          </View>
          <Text style={S.cardTitle}>{t('emergency_location_title')}</Text>
        </View>

        {loadingLocation ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 8 }} />
        ) : location ? (
          <>
            <Text style={S.coordText}>Lat: {location.latitude.toFixed(6)}</Text>
            <Text style={S.coordText}>Lon: {location.longitude.toFixed(6)}</Text>
            {mapsUrl && (
              <Text style={S.mapsLink} numberOfLines={1}>{mapsUrl}</Text>
            )}
            <View style={S.gpsStatusRow}>
              <View style={[S.gpsDot, isFallback ? S.gpsDotWarn : S.gpsDotOk]} />
              <Text style={[S.gpsStatusText, isFallback ? S.gpsWarnText : S.gpsOkText]}>
                {isFallback ? t('emergency_location_fallback') : t('emergency_location_ready')}
              </Text>
            </View>
          </>
        ) : (
          <View style={S.errorRow}>
            <Feather name="alert-circle" size={14} color={DANGER} style={{ marginRight: 6 }} />
            <Text style={S.errorText}>{t('emergency_location_unavailable')}</Text>
          </View>
        )}
      </View>

      {/* ── Emergency Type ─────────────────────────────────────────────── */}
      <View style={S.card}>
        <View style={S.cardTitleRow}>
          <View style={S.cardIconCircle}>
            <MaterialCommunityIcons name="bell-alert" size={15} color={PRIMARY} />
          </View>
          <Text style={S.cardTitle}>{t('emergency_type_title')}</Text>
        </View>
        <View style={S.typeRow}>
          {EMERGENCY_TYPES.map(({ key, icon, labelKey }) => {
            const active = emergencyType === key;
            return (
              <TouchableOpacity
                key={key}
                style={[S.typeChip, active && S.typeChipActive]}
                onPress={() => setEmergencyType(key)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={icon as any}
                  size={15}
                  color={active ? '#fff' : TEXT_MID}
                  style={{ marginRight: 5 }}
                />
                <Text style={[S.typeChipText, active && S.typeChipTextActive]}>
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── SOS Button Section ─────────────────────────────────────────── */}
      <View style={S.sosSection}>
        <Text style={S.sosHint}>{t('emergency_sos_hint')}</Text>
        <SOSButton onPress={executeSOS} disabled={sending || loadingLocation || !location} />

        {sending && (
          <View style={S.sendingRow}>
            <ActivityIndicator color={DANGER} />
            <Text style={S.sendingText}>{t('emergency_sending')}</Text>
          </View>
        )}
        {success && !sending && (
          <View style={S.successBanner}>
            <Feather name="check-circle" size={16} color={SUCCESS} style={{ marginRight: 8 }} />
            <Text style={S.successText}>{t('emergency_success_text')}</Text>
          </View>
        )}
      </View>

      {/* ── Alert History ──────────────────────────────────────────────── */}
      <View style={S.card}>
        <View style={S.cardTitleRow}>
          <View style={S.cardIconCircle}>
            <Feather name="clock" size={15} color={PRIMARY} />
          </View>
          <Text style={S.cardTitle}>{t('emergency_history_title')}</Text>
        </View>

        {loadingHistory ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 8 }} />
        ) : history.length === 0 ? (
          <Text style={S.emptyText}>{t('emergency_history_empty')}</Text>
        ) : (
          history.map(entry => {
            const isSent = entry.status === 'sent';
            return (
              <View key={entry.id} style={S.historyItem}>
                <View style={S.historyInfo}>
                  <Text style={S.historyType}>
                    {entry.emergency_type === 'Medical' ? t('emergency_type_medical') :
                     entry.emergency_type === 'Police'  ? t('emergency_type_police')  :
                     entry.emergency_type === 'Fire'    ? t('emergency_type_fire')    :
                     t('emergency_type_general')}
                  </Text>
                  <Text style={S.historyDate}>{new Date(entry.created_at).toLocaleString()}</Text>
                  <View style={[S.statusBadge, isSent ? S.badgeSent : S.badgeFailed]}>
                    <Text style={[S.badgeText, { color: isSent ? SUCCESS : DANGER }]}>
                      {entry.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={S.deleteBtn} onPress={() => handleDelete(entry.id)} activeOpacity={0.8}>
                  <Feather name="trash-2" size={14} color={DANGER} style={{ marginRight: 4 }} />
                  <Text style={S.deleteText}>{t('emergency_delete')}</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  root:      { flex: 1, backgroundColor: PAGE_BG },
  container: { padding: 16, paddingBottom: 60 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  20,
    gap:           12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTextWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle:    { fontSize: 22, color: TEXT_DARK, ...BOLD_FONT },

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
  cardTitleRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: { fontSize: 15, color: TEXT_DARK, ...BOLD_FONT },

  // Location
  coordText: {
    fontSize: 13, color: TEXT_MID, marginBottom: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  mapsLink:  { fontSize: 12, color: PRIMARY, marginTop: 4, marginBottom: 8 },
  gpsStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  gpsDot:       { width: 8, height: 8, borderRadius: 4 },
  gpsDotOk:     { backgroundColor: SUCCESS },
  gpsDotWarn:   { backgroundColor: WARNING },
  gpsStatusText: { fontSize: 13, fontWeight: '600' },
  gpsOkText:     { color: SUCCESS },
  gpsWarnText:   { color: WARNING },
  errorRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  errorText: { color: DANGER, fontSize: 13 },

  // Emergency type chips
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5, borderColor: '#C5D8F0',
    backgroundColor: ICON_BG,
  },
  typeChipActive:     { backgroundColor: DANGER, borderColor: DANGER },
  typeChipText:       { color: TEXT_MID, fontSize: 13, fontWeight: '600' },
  typeChipTextActive: { color: '#fff', fontWeight: '700' },

  // SOS section
  sosSection: { alignItems: 'center', marginBottom: 20, gap: 16 },
  sosHint: {
    color: TEXT_MID, fontSize: 13,
    textAlign: 'center', lineHeight: 20, paddingHorizontal: 10,
  },
  sendingRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sendingText: { color: DANGER, fontSize: 14, fontWeight: '600' },
  successBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SUCCESS + '18',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18,
    borderWidth: 1, borderColor: SUCCESS + '40',
  },
  successText: { color: SUCCESS, fontSize: 14, fontWeight: '600' },

  // Empty
  emptyText: { color: TEXT_LIGHT, fontSize: 13, textAlign: 'center', paddingVertical: 8 },

  // History items
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor:    '#EFF5FC',
  },
  historyInfo:  { flex: 1, gap: 3 },
  historyType:  { color: TEXT_DARK, fontSize: 14, fontWeight: '700' },
  historyDate:  { color: TEXT_LIGHT, fontSize: 12 },
  statusBadge:  {
    alignSelf: 'flex-start', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 6, marginTop: 4, borderWidth: 1,
  },
  badgeSent:   { backgroundColor: SUCCESS + '12', borderColor: SUCCESS + '40' },
  badgeFailed: { backgroundColor: DANGER  + '12', borderColor: DANGER  + '40' },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: DANGER + '10',
    borderRadius: 10, borderWidth: 1, borderColor: DANGER + '30',
    marginLeft: 10,
  },
  deleteText: { color: DANGER, fontSize: 12, fontWeight: '600' },
});
