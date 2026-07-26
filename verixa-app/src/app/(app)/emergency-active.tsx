// src/app/(app)/emergency-active.tsx
// Emergency Active screen — UI restyled to home light blue theme. No emojis.
// ALL logic, backend calls, state, and hooks are UNCHANGED.

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '../../components/LanguageProvider';
import emergencyAlarmService, {
  AlarmState,
  prepareEmergencyAlarm,
  startEmergencyAlarm,
  stopEmergencyAlarm,
  cleanupEmergencyAlarm,
} from '../../services/EmergencyAlarmService';
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

export default function EmergencyActiveScreen() {
  const router   = useRouter();
  const { t }    = useLanguage();
  const insets   = useSafeAreaInsets();

  // ── All original state — UNTOUCHED ───────────────────────────────────────
  const params = useLocalSearchParams<{
    alert_id?: string;
    emergency_type?: string;
    latitude?: string;
    longitude?: string;
    maps_link?: string;
  }>();

  const [alarmState, setAlarmState] = useState<AlarmState>(emergencyAlarmService.getState());
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const alertId      = params.alert_id || '';
  const emergencyType = params.emergency_type || 'General';
  const latitude     = params.latitude  ? parseFloat(params.latitude)  : null;
  const longitude    = params.longitude ? parseFloat(params.longitude) : null;
  const mapsLink     = params.maps_link || (latitude && longitude ? `https://www.google.com/maps?q=${latitude},${longitude}&ll=${latitude},${longitude}&z=17` : null);

  // ── All original logic — UNTOUCHED ───────────────────────────────────────
  useEffect(() => {
    prepareEmergencyAlarm();
    const unsubscribe = emergencyAlarmService.subscribe((state) => { setAlarmState(state); });
    return () => { unsubscribe(); cleanupEmergencyAlarm(); };
  }, []);

  useEffect(() => {
    if (alarmState.alarmActive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else { pulseAnim.setValue(1); }
  }, [alarmState.alarmActive, pulseAnim]);

  const handleOpenMaps = async () => {
    if (!mapsLink) return;
    try {
      const canOpen = await Linking.canOpenURL(mapsLink);
      if (canOpen) await Linking.openURL(mapsLink);
      else Platform.OS === 'web' ? window.open(mapsLink, '_blank') : Alert.alert(t('emergency_error') || 'Error', 'Unable to open Google Maps link.');
    } catch (e) {
      Platform.OS === 'web' ? window.open(mapsLink, '_blank') : Alert.alert(t('emergency_error') || 'Error', 'Could not open maps URL.');
    }
  };

  const handleToggleAlarm = async () => {
    if (alarmState.alarmActive) await stopEmergencyAlarm();
    else await startEmergencyAlarm(0);
  };

  const handleBack = async () => { await cleanupEmergencyAlarm(); router.back(); };

  const getLocalizedType = (type: string) => {
    switch (type) {
      case 'Medical': return t('emergency_type_medical') || 'Medical';
      case 'Police':  return t('emergency_type_police')  || 'Police';
      case 'Fire':    return t('emergency_type_fire')    || 'Fire';
      default:        return t('emergency_type_general') || 'General';
    }
  };

  const getTypeIcon = (type: string): React.ReactNode => {
    const size = 16; const color = TEXT_DARK;
    switch (type) {
      case 'Medical': return <MaterialCommunityIcons name="hospital-box-outline" size={size} color={color} />;
      case 'Police':  return <MaterialCommunityIcons name="shield-account-outline" size={size} color={color} />;
      case 'Fire':    return <MaterialCommunityIcons name="fire" size={size} color={DANGER} />;
      default:        return <MaterialCommunityIcons name="alert-circle-outline" size={size} color={WARNING} />;
    }
  };

  return (
    <ScrollView
      style={S.root}
      contentContainerStyle={[S.container, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={handleBack} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={20} color={PRIMARY} />
        </TouchableOpacity>
        <View style={S.headerTextWrap}>
          <MaterialCommunityIcons name="bell-alert" size={22} color={DANGER} style={{ marginRight: 8 }} />
          <Text style={S.headerTitle}>{t('emergency_active_title') || 'Emergency Alert Active'}</Text>
        </View>
      </View>

      {/* ── Alert Status Card ──────────────────────────────────────────── */}
      <View style={[S.card, S.alertCard]}>
        <View style={S.alertHeaderRow}>
          <View style={S.sentBadge}>
            <Feather name="check-circle" size={12} color={SUCCESS} style={{ marginRight: 5 }} />
            <Text style={S.sentBadgeText}>{t('emergency_sos_status') || 'SOS Status'}: SENT</Text>
          </View>
          {!!alertId && (
            <Text style={S.alertIdText}>ID: {alertId.slice(-6)}</Text>
          )}
        </View>

        <Text style={S.alertNotice}>
          {t('emergency_contact_alerted') || 'Your emergency contact has been alerted.'}
        </Text>

        {/* Emergency Type */}
        <View style={S.detailRow}>
          <Text style={S.detailLabel}>{t('emergency_type_label') || 'Emergency Type'}:</Text>
          <View style={S.detailValueRow}>
            {getTypeIcon(emergencyType)}
            <Text style={[S.detailValue, { marginLeft: 6 }]}>{getLocalizedType(emergencyType)}</Text>
          </View>
        </View>

        {/* Location */}
        <View style={S.detailRow}>
          <Text style={S.detailLabel}>{t('emergency_location_label') || 'Location'}:</Text>
          <Text style={S.detailValue}>
            {latitude && longitude ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : t('emergency_location_unavailable') || 'GPS Location Attached'}
          </Text>
        </View>

        {/* Maps button */}
        {mapsLink && (
          <TouchableOpacity style={S.mapsBtn} onPress={handleOpenMaps} activeOpacity={0.85}>
            <Feather name="map-pin" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={S.mapsBtnText}>{t('emergency_open_maps') || 'Open Location in Maps'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Alarm Control Card ─────────────────────────────────────────── */}
      <View style={[S.card, alarmState.alarmActive && S.alarmCardActive]}>
        <Animated.View style={[
          S.alarmIconCircle,
          alarmState.alarmActive && S.alarmIconCircleActive,
          { transform: [{ scale: pulseAnim }] },
        ]}>
          <MaterialCommunityIcons
            name={alarmState.alarmActive ? 'volume-high' : 'bullhorn-outline'}
            size={38}
            color={alarmState.alarmActive ? '#fff' : PRIMARY}
          />
        </Animated.View>

        <Text style={[S.alarmTitle, alarmState.alarmActive && { color: DANGER }]}>
          {alarmState.alarmActive
            ? (t('emergency_alarm_active') || 'Emergency Alarm Active')
            : (t('emergency_alarm_section_title') || 'Nearby Emergency Alarm')}
        </Text>

        <Text style={S.alarmDesc}>
          {t('emergency_alarm_description') || 'Use this alarm if you need immediate attention from people nearby.'}
        </Text>

        <TouchableOpacity
          style={[S.alarmBtn, alarmState.alarmActive && S.alarmBtnStop]}
          onPress={handleToggleAlarm}
          activeOpacity={0.85}
          disabled={alarmState.alarmLoading}
        >
          <MaterialCommunityIcons
            name={alarmState.alarmLoading ? 'loading' : alarmState.alarmActive ? 'stop-circle' : 'volume-high'}
            size={20}
            color="#fff"
            style={{ marginRight: 10 }}
          />
          <Text style={S.alarmBtnText}>
            {alarmState.alarmLoading
              ? (t('loading') || 'Loading...')
              : alarmState.alarmActive
              ? 'STOP EMERGENCY ALARM'
              : 'ACTIVATE EMERGENCY ALARM'}
          </Text>
        </TouchableOpacity>

        {/* Live status badges */}
        {alarmState.alarmActive && (
          <View style={S.statusBadgesRow}>
            <View style={[S.miniBadge, alarmState.sirenAudioPlaying ? S.miniBadgeSuccess : S.miniBadgeWarn]}>
              <MaterialCommunityIcons
                name={alarmState.sirenAudioPlaying ? 'volume-high' : 'volume-off'}
                size={12}
                color={alarmState.sirenAudioPlaying ? SUCCESS : WARNING}
                style={{ marginRight: 4 }}
              />
              <Text style={[S.miniBadgeText, { color: alarmState.sirenAudioPlaying ? SUCCESS : WARNING }]}>
                {alarmState.sirenAudioPlaying ? 'Siren Active' : 'Siren Audio Failed'}
              </Text>
            </View>
            <View style={[S.miniBadge, alarmState.vibrationActive ? S.miniBadgeSuccess : S.miniBadgeNeutral]}>
              <MaterialCommunityIcons
                name="vibrate"
                size={12}
                color={alarmState.vibrationActive ? SUCCESS : TEXT_LIGHT}
                style={{ marginRight: 4 }}
              />
              <Text style={[S.miniBadgeText, { color: alarmState.vibrationActive ? SUCCESS : TEXT_LIGHT }]}>
                {alarmState.vibrationActive ? 'Vibration Active' : 'Vibration Stopped'}
              </Text>
            </View>
          </View>
        )}

        {/* Error */}
        {alarmState.alarmError && alarmState.errorMessage && (
          <View style={S.errorBox}>
            <Feather name="alert-triangle" size={14} color={DANGER} style={{ marginRight: 6 }} />
            <Text style={S.errorBoxText}>{alarmState.errorMessage}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  root:      { flex: 1, backgroundColor: PAGE_BG },
  container: { padding: 16, paddingBottom: 60 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center',
  },
  headerTextWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle:    { fontSize: 20, color: TEXT_DARK, ...BOLD_FONT, flex: 1 },

  // Card base
  card: {
    backgroundColor: CARD_BG,
    borderRadius:    20,
    padding:         18,
    marginBottom:    16,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.05,
    shadowRadius:    6,
    elevation:       2,
  },

  // Alert card
  alertCard:      { borderWidth: 1.5, borderColor: SUCCESS + '40' },
  alertHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sentBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SUCCESS + '18',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: SUCCESS + '40',
  },
  sentBadgeText: { color: SUCCESS, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  alertIdText:   {
    color: TEXT_LIGHT, fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  alertNotice: { fontSize: 17, color: TEXT_DARK, ...BOLD_FONT, marginBottom: 14, lineHeight: 23 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderTopWidth: 1, borderColor: '#EFF5FC',
  },
  detailLabel:    { color: TEXT_MID, fontSize: 14 },
  detailValueRow: { flexDirection: 'row', alignItems: 'center' },
  detailValue:    { color: TEXT_DARK, fontSize: 15, fontWeight: '600' },
  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 14, backgroundColor: PRIMARY,
    paddingVertical: 13, paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  mapsBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Alarm card
  alarmCardActive: { borderWidth: 1.5, borderColor: DANGER + '50' },
  alarmIconCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, alignSelf: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
  },
  alarmIconCircleActive: {
    backgroundColor: DANGER,
    shadowColor: DANGER, shadowOpacity: 0.35,
  },
  alarmTitle: {
    fontSize: 20, color: TEXT_DARK, ...BOLD_FONT,
    textAlign: 'center', marginBottom: 8,
  },
  alarmDesc: {
    color: TEXT_MID, fontSize: 13,
    textAlign: 'center', marginBottom: 22,
    lineHeight: 19, paddingHorizontal: 8,
  },
  alarmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: DANGER,
    width: '100%', paddingVertical: 16, borderRadius: 16,
    shadowColor: DANGER, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30, shadowRadius: 8, elevation: 4,
  },
  alarmBtnStop: {
    backgroundColor: '#B91C1C',
    shadowColor: '#B91C1C',
  },
  alarmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },

  // Status badges
  statusBadgesRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 10, marginTop: 14,
  },
  miniBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  miniBadgeSuccess: { backgroundColor: SUCCESS + '12', borderColor: SUCCESS + '40' },
  miniBadgeWarn:    { backgroundColor: WARNING + '12', borderColor: WARNING + '40' },
  miniBadgeNeutral: { backgroundColor: ICON_BG, borderColor: '#C5D8F0' },
  miniBadgeText:    { fontSize: 12, fontWeight: '600' },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginTop: 14, backgroundColor: DANGER + '0D',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: DANGER + '30',
  },
  errorBoxText: { color: DANGER, fontSize: 13, flex: 1, lineHeight: 18 },
});
