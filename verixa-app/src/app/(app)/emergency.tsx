// src/app/(app)/emergency.tsx
// Emergency SOS screen — confirmation dialog, vibration, GPS, WhatsApp alert

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
import emergencyAlarmService, { AlarmState } from '../../services/EmergencyAlarmService';

/** Emergency SOS Screen */
export default function EmergencyScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<EmergencyHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [emergencyType, setEmergencyType] = useState<'Medical' | 'Police' | 'Fire' | 'General'>('General');
  const [isFallback, setIsFallback] = useState(false);
  const [alarmState, setAlarmState] = useState<AlarmState>(emergencyAlarmService.getState());

  // Subscribe to EmergencyAlarmService state changes
  useEffect(() => {
    const unsubscribe = emergencyAlarmService.subscribe((state) => {
      setAlarmState(state);
    });
    return () => {
      unsubscribe();
      emergencyAlarmService.cleanup();
    };
  }, []);

  // Fetch GPS location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[EmergencyScreen] Location permission denied. Using fallback/mock location.');
          setLocation({ latitude: 17.3850, longitude: 78.4867 });
          setIsFallback(true);
          setLoadingLocation(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setIsFallback(false);
      } catch (e) {
        console.warn('[EmergencyScreen] Location error. Using fallback/mock location:', e);
        setLocation({ latitude: 17.3850, longitude: 78.4867 });
        setIsFallback(true);
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  // Load SOS history
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const hist = await getSOSHistory();
        if (active) {
          setHistory(hist);
        }
      } catch (e) {
        console.warn('[EmergencyScreen] History load error:', e);
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('Authentication token required') || msg.includes('Session expired') || msg.includes('log in again')) {
          if (active) {
            const isWeb = Platform.OS === 'web';
            if (isWeb) {
              window.alert('Session expired. Please login again.');
            } else {
              Alert.alert('Session Expired', 'Please login again.');
            }
            router.replace('/(auth)/login');
          }
        }
      } finally {
        if (active) {
          setLoadingHistory(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Trigger vibration pattern (SOS: · · · — — — · · ·) */
  const triggerVibration = () => {
    if (Platform.OS === 'web') return;
    // SOS pattern: 3 short, 3 long, 3 short
    const SHORT = 200;
    const LONG = 600;
    const GAP = 200;
    Vibration.vibrate([
      SHORT, GAP, SHORT, GAP, SHORT, GAP * 2,
      LONG,  GAP, LONG,  GAP, LONG,  GAP * 2,
      SHORT, GAP, SHORT, GAP, SHORT,
    ]);
  };

  /** Trigger haptic feedback */
  const triggerHaptic = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (_) {
      // Haptics may not be available on web
    }
  };

  /** Main SOS handler — called after user confirms */
  const executeSOS = async () => {
    console.log("handleSOS called");

    // 🚨 IMMEDIATELY start loud local siren & repeating vibration BEFORE any network or location calls!
    emergencyAlarmService.startAlarm(30000);

    setSending(true);
    setSuccess(false);

    // Trigger additional initial vibration/haptic
    triggerVibration();
    await triggerHaptic();

    // If no GPS location yet, still keep the siren running but warn the user
    if (!location) {
      const noLocMsg = t('emergency_no_location') || 'Location unavailable. Local siren is active. WhatsApp alert could not include your location.';
      const isWeb = Platform.OS === 'web';
      if (isWeb) {
        window.alert('⚠️ ' + noLocMsg);
      } else {
        Alert.alert(
          t('emergency_no_location_title') || 'Location Unavailable',
          noLocMsg + '\n\n🔊 Local emergency siren is active on your device.'
        );
      }
      setSending(false);
      return; // Siren keeps playing — user can stop it manually
    }

    const payload: EmergencyPayload = {
      user_id: 'current_user', // resolved from JWT on backend
      type: emergencyType,
      latitude: location.latitude,
      longitude: location.longitude,
    };

    try {
      const res = await sendSOS(payload);
      const isWeb = Platform.OS === 'web';
      if (res.status === 'success' || res.status === 'sent') {
        setSuccess(true);
        if (isWeb) {
          window.alert('✅ ' + t('emergency_success_text'));
        } else {
          Alert.alert(
            '✅ ' + t('emergency_success_text'),
            undefined,
            [{ text: t('ok') || 'OK' }]
          );
        }
      } else {
        setSuccess(false);
        if (isWeb) {
          window.alert('❌ ' + t('emergency_failed_popup_title') + ': ' + res.message + '\n\n🔊 Local siren is still active.');
        } else {
          Alert.alert('❌ ' + t('emergency_failed_popup_title'), res.message + '\n\n🔊 Local siren is still active on your device.');
        }
      }
      // Refresh history
      try {
        const fresh = await getSOSHistory();
        setHistory(fresh);
      } catch (_) {
        // History refresh is non-critical
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send SOS alert.';
      console.warn('[EmergencyScreen] SOS send error:', e);

      // Determine if this is a network/connectivity error
      const isNetworkError = msg.includes('Network Error') || msg.includes('timeout') || msg.includes('ECONNREFUSED') || msg.includes('ERR_NETWORK');

      const isWeb = Platform.OS === 'web';
      const offlineNote = isNetworkError
        ? '\n\n🔊 Local siren is active. WhatsApp alert failed — no network connection.'
        : '\n\n🔊 Local siren is still active on your device.';

      if (isWeb) {
        window.alert('❌ ' + (t('emergency_failed_popup_title') || 'Alert Failed') + ': ' + msg + offlineNote);
      } else {
        Alert.alert(
          '❌ ' + (t('emergency_failed_popup_title') || 'Alert Failed'),
          msg + offlineNote
        );
      }
      if (msg.includes('Authentication token required') || msg.includes('Session expired') || msg.includes('log in again')) {
        router.replace('/(auth)/login');
      }
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (alertId: string) => {
    // Alert.alert confirm doesn't work on web
    const confirmed =
      Platform.OS === 'web'
        ? window.confirm(t('emergency_confirm_delete') || 'Are you sure you want to delete this alert?')
        : true;

    if (!confirmed) return;

    try {
      await deleteSOSHistory(alertId);
      setHistory(prev => prev.filter(h => h.id !== alertId));
    } catch (e) {
      console.warn('[EmergencyScreen] Delete error:', e);
      const msg = e instanceof Error ? e.message : 'Could not delete history entry.';
      Alert.alert(t('emergency_error') || 'Error', msg);
      if (msg.includes('Authentication token required') || msg.includes('Session expired') || msg.includes('log in again')) {
        router.replace('/(auth)/login');
      }
    }
  };

  const mapsUrl =
    location
      ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
      : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← {t('emergency_back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🚨 {t('emergency_title')}</Text>
      </View>

      {/* Location Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📍 {t('emergency_location_title')}</Text>
        {loadingLocation ? (
          <ActivityIndicator color="#e53935" style={{ marginTop: 8 }} />
        ) : location ? (
          <>
            <Text style={styles.coordText}>
              {`${t('emergency_location_lat')}: ${location.latitude.toFixed(6)}`}
            </Text>
            <Text style={styles.coordText}>
              {`${t('emergency_location_lon')}: ${location.longitude.toFixed(6)}`}
            </Text>
            {mapsUrl && (
              <Text style={styles.mapsLink} numberOfLines={1}>
                {mapsUrl}
              </Text>
            )}
            <View style={styles.statusDot}>
              <View style={[styles.greenDot, isFallback && styles.orangeDot]} />
              <Text style={[styles.statusText, isFallback && styles.orangeText]}>
                {isFallback ? t('emergency_location_fallback') : t('emergency_location_ready')}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.errorText}>⚠ {t('emergency_location_unavailable')}</Text>
        )}
      </View>

      {/* Emergency Type Selector */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚨 {t('emergency_type_title')}</Text>
        <View style={styles.typeRow}>
          {(['Medical', 'Police', 'Fire', 'General'] as const).map(typeKey => (
            <TouchableOpacity
              key={typeKey}
              style={[
                styles.typeChip,
                emergencyType === typeKey && styles.typeChipActive,
              ]}
              onPress={() => setEmergencyType(typeKey)}
            >
              <Text style={[
                styles.typeChipText,
                emergencyType === typeKey && styles.typeChipTextActive,
              ]}>
                {typeKey === 'Medical' ? '🏥' : typeKey === 'Police' ? '👮' : typeKey === 'Fire' ? '🔥' : '⚠️'}{' '}
                {typeKey === 'Medical' ? t('emergency_type_medical') :
                 typeKey === 'Police' ? t('emergency_type_police') :
                 typeKey === 'Fire' ? t('emergency_type_fire') :
                 t('emergency_type_general')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* SOS Button Section */}
      <View style={styles.sosSection}>
        <Text style={styles.sosHint}>
          {t('emergency_sos_hint')}
        </Text>
        <SOSButton
            onPress={executeSOS}
            disabled={sending || loadingLocation || !location}
          />

        {/* Active Alarm Control (Stop Alarm) */}
        {alarmState.alarmActive && (
          <View style={styles.activeAlarmContainer}>
            <View style={styles.alarmBadge}>
              <Text style={styles.alarmBadgeText}>🚨 SIREN ACTIVE</Text>
            </View>
            <TouchableOpacity
              style={styles.stopAlarmBtn}
              onPress={() => emergencyAlarmService.stopAlarm()}
              activeOpacity={0.8}
            >
              <Text style={styles.stopAlarmText}>🔇 Stop Alarm</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Web Autoplay / Error Fallback */}
        {alarmState.alarmError && (
          <View style={styles.alarmErrorContainer}>
            <Text style={styles.alarmErrorText}>
              {alarmState.errorMessage || 'Siren blocked by browser autoplay.'}
            </Text>
            <TouchableOpacity
              style={styles.enableAlarmBtn}
              onPress={() => emergencyAlarmService.startAlarm(30000)}
            >
              <Text style={styles.enableAlarmText}>🔊 Tap to Enable Siren</Text>
            </TouchableOpacity>
          </View>
        )}

        {sending && (
          <View style={styles.sendingRow}>
            <ActivityIndicator color="#e53935" />
            <Text style={styles.sendingText}>{t('emergency_sending')}</Text>
          </View>
        )}
        {success && !sending && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>
              ✓ {t('emergency_success_text')}
            </Text>
          </View>
        )}
      </View>

      {/* Alert History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🕑 {t('emergency_history_title')}</Text>
        {loadingHistory ? (
          <ActivityIndicator color="#e53935" />
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>{t('emergency_history_empty')}</Text>
        ) : (
          history.map(entry => (
            <View key={entry.id} style={styles.historyItem}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyType}>
                  {entry.emergency_type === 'Medical' ? t('emergency_type_medical') :
                   entry.emergency_type === 'Police' ? t('emergency_type_police') :
                   entry.emergency_type === 'Fire' ? t('emergency_type_fire') :
                   t('emergency_type_general')}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(entry.created_at).toLocaleString()}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    entry.status === 'sent' ? styles.badgeSent : styles.badgeFailed,
                  ]}
                >
                  <Text style={styles.badgeText}>{entry.status.toUpperCase()}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(entry.id)}
                style={styles.deleteBtn}
              >
                <Text style={styles.deleteText}>{t('emergency_delete')}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0d1117',
    padding: 20,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1c2333',
    borderRadius: 8,
  },
  backText: {
    color: '#8b949e',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f0f6fc',
  },
  card: {
    backgroundColor: '#161b22',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#21262d',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f0f6fc',
    marginBottom: 12,
  },
  coordText: {
    fontSize: 14,
    color: '#8b949e',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  mapsLink: {
    fontSize: 12,
    color: '#388bfd',
    marginTop: 4,
    marginBottom: 8,
  },
  statusDot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3fb950',
  },
  orangeDot: {
    backgroundColor: '#f0883e',
  },
  statusText: {
    color: '#3fb950',
    fontSize: 13,
    fontWeight: '500',
  },
  orangeText: {
    color: '#f0883e',
  },
  errorText: {
    color: '#f85149',
    fontSize: 14,
    marginTop: 4,
  },
  sosSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  sosHint: {
    color: '#8b949e',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  sendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sendingText: {
    color: '#e53935',
    fontSize: 14,
    fontWeight: '500',
  },
  successBanner: {
    backgroundColor: '#0d2818',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#3fb950',
  },
  successText: {
    color: '#3fb950',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    color: '#8b949e',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 10,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#21262d',
  },
  historyInfo: {
    flex: 1,
    gap: 4,
  },
  historyType: {
    color: '#f0f6fc',
    fontSize: 14,
    fontWeight: '600',
  },
  historyDate: {
    color: '#8b949e',
    fontSize: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  badgeSent: {
    backgroundColor: '#0d2818',
    borderWidth: 1,
    borderColor: '#3fb950',
  },
  badgeFailed: {
    backgroundColor: '#2d0f0f',
    borderWidth: 1,
    borderColor: '#f85149',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f0f6fc',
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2d0f0f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f85149',
    marginLeft: 12,
  },
  deleteText: {
    color: '#f85149',
    fontSize: 12,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#161b22',
  },
  typeChipActive: {
    borderColor: '#e53935',
    backgroundColor: '#2d0f0f',
  },
  typeChipText: {
    color: '#8b949e',
    fontSize: 13,
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: '#f85149',
    fontWeight: '700',
  },
  activeAlarmContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  alarmBadge: {
    backgroundColor: '#b71c1c',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ff5252',
  },
  alarmBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  stopAlarmBtn: {
    backgroundColor: '#d32f2f',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#ff6666',
  },
  stopAlarmText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  alarmErrorContainer: {
    marginTop: 12,
    alignItems: 'center',
    backgroundColor: '#2a1a1a',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f44336',
    gap: 8,
    width: '90%',
  },
  alarmErrorText: {
    color: '#ff8a80',
    fontSize: 13,
    textAlign: 'center',
  },
  enableAlarmBtn: {
    backgroundColor: '#e53935',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  enableAlarmText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
