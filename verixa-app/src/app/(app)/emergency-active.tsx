// src/app/(app)/emergency-active.tsx
// Emergency Active / Assistance screen — manual siren trigger, status overview, location links

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
  startEmergencyAlarm,
  stopEmergencyAlarm,
  cleanupEmergencyAlarm,
} from '../../services/EmergencyAlarmService';

export default function EmergencyActiveScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{
    alert_id?: string;
    emergency_type?: string;
    latitude?: string;
    longitude?: string;
    maps_link?: string;
  }>();

  const [alarmState, setAlarmState] = useState<AlarmState>(emergencyAlarmService.getState());

  // Pulse animation for active alarm icon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Route parameters
  const alertId = params.alert_id || '';
  const emergencyType = params.emergency_type || 'General';
  const latitude = params.latitude ? parseFloat(params.latitude) : null;
  const longitude = params.longitude ? parseFloat(params.longitude) : null;
  const mapsLink =
    params.maps_link ||
    (latitude && longitude
      ? `https://www.google.com/maps?q=${latitude},${longitude}&ll=${latitude},${longitude}&z=17`
      : null);

  // Subscribe to EmergencyAlarmService state changes
  useEffect(() => {
    const unsubscribe = emergencyAlarmService.subscribe((state) => {
      setAlarmState(state);
    });

    return () => {
      unsubscribe();
      // Ensure alarm is stopped and resources released when leaving screen
      cleanupEmergencyAlarm();
    };
  }, []);

  // Pulsing animation effect when alarm is active
  useEffect(() => {
    if (alarmState.alarmActive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 600,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [alarmState.alarmActive, pulseAnim]);

  const handleOpenMaps = async () => {
    if (!mapsLink) return;
    try {
      const canOpen = await Linking.canOpenURL(mapsLink);
      if (canOpen) {
        await Linking.openURL(mapsLink);
      } else {
        if (Platform.OS === 'web') {
          window.open(mapsLink, '_blank');
        } else {
          Alert.alert(t('emergency_error') || 'Error', 'Unable to open Google Maps link.');
        }
      }
    } catch (e) {
      if (Platform.OS === 'web') {
        window.open(mapsLink, '_blank');
      } else {
        Alert.alert(t('emergency_error') || 'Error', 'Could not open maps URL.');
      }
    }
  };

  const handleToggleAlarm = async () => {
    if (alarmState.alarmActive) {
      await stopEmergencyAlarm();
    } else {
      // Start continuous looping alarm
      await startEmergencyAlarm(0);
    }
  };

  const handleBack = async () => {
    await cleanupEmergencyAlarm();
    router.back();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Medical':
        return '🏥';
      case 'Police':
        return '👮';
      case 'Fire':
        return '🔥';
      default:
        return '⚠️';
    }
  };

  const getLocalizedType = (type: string) => {
    switch (type) {
      case 'Medical':
        return t('emergency_type_medical') || 'Medical';
      case 'Police':
        return t('emergency_type_police') || 'Police';
      case 'Fire':
        return t('emergency_type_fire') || 'Fire';
      default:
        return t('emergency_type_general') || 'General';
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backText}>← {t('emergency_back') || 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          🚨 {t('emergency_active_title') || 'Emergency Alert Active'}
        </Text>
      </View>

      {/* Main Subtitle / Notification Card */}
      <View style={styles.alertCard}>
        <View style={styles.alertHeaderRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>✓ {t('emergency_sos_status') || 'SOS Status'}: SENT</Text>
          </View>
          {alertId ? <Text style={styles.alertIdText}>ID: {alertId.slice(-6)}</Text> : null}
        </View>

        <Text style={styles.alertNoticeTitle}>
          {t('emergency_contact_alerted') || 'Your emergency contact has been alerted.'}
        </Text>

        {/* Emergency Type Details */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('emergency_type_label') || 'Emergency Type'}:</Text>
          <Text style={styles.detailValue}>
            {getTypeIcon(emergencyType)} {getLocalizedType(emergencyType)}
          </Text>
        </View>

        {/* Location Details */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('emergency_location_label') || 'Location'}:</Text>
          <Text style={styles.detailValue}>
            {latitude && longitude
              ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
              : t('emergency_location_unavailable') || 'GPS Location Attached'}
          </Text>
        </View>

        {/* Open in Maps Button */}
        {mapsLink && (
          <TouchableOpacity style={styles.mapsBtn} onPress={handleOpenMaps} activeOpacity={0.8}>
            <Text style={styles.mapsBtnText}>
              🗺️ {t('emergency_open_maps') || 'Open Location in Maps'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Local Siren Alarm Control Card */}
      <View style={[styles.alarmCard, alarmState.alarmActive && styles.alarmCardActive]}>
        <Animated.View
          style={[
            styles.iconCircle,
            alarmState.alarmActive && styles.iconCircleActive,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={styles.alarmIcon}>{alarmState.alarmActive ? '🔊' : '📢'}</Text>
        </Animated.View>

        <Text style={styles.alarmSectionTitle}>
          {alarmState.alarmActive
            ? `🔊 ${t('emergency_alarm_active') || 'Emergency Alarm Active'}`
            : t('emergency_alarm_section_title') || 'Nearby Emergency Alarm'}
        </Text>

        <Text style={styles.alarmDescription}>
          {t('emergency_alarm_description') ||
            'Use this alarm if you need immediate attention from people nearby.'}
        </Text>

        {/* Alarm Toggle Button (Trigger Alarm <-> Stop Alarm) */}
        <TouchableOpacity
          style={[styles.mainAlarmBtn, alarmState.alarmActive && styles.stopAlarmBtn]}
          onPress={handleToggleAlarm}
          activeOpacity={0.85}
          disabled={alarmState.alarmLoading}
        >
          <Text style={styles.mainAlarmBtnText}>
            {alarmState.alarmLoading
              ? t('loading') || 'Loading...'
              : alarmState.alarmActive
              ? `⏹ ${t('emergency_stop_alarm') || 'STOP ALARM'}`
              : `🔊 ${t('emergency_trigger_alarm') || 'TRIGGER EMERGENCY ALARM'}`}
          </Text>
        </TouchableOpacity>

        {/* Autoplay / Playback Error Warning */}
        {alarmState.alarmError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              ⚠️ {alarmState.errorMessage || 'Failed to start local emergency alarm playback.'}
            </Text>
          </View>
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
    marginBottom: 20,
    gap: 12,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#1c2333',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  backText: {
    color: '#8b949e',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#f0f6fc',
  },
  alertCard: {
    backgroundColor: '#161b22',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#238636',
  },
  alertHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: '#0d2818',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3fb950',
  },
  statusBadgeText: {
    color: '#3fb950',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  alertIdText: {
    color: '#8b949e',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  alertNoticeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0f6fc',
    marginBottom: 16,
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#21262d',
  },
  detailLabel: {
    color: '#8b949e',
    fontSize: 14,
  },
  detailValue: {
    color: '#f0f6fc',
    fontSize: 15,
    fontWeight: '600',
  },
  mapsBtn: {
    marginTop: 16,
    backgroundColor: '#1f6feb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  mapsBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  alarmCard: {
    backgroundColor: '#161b22',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  alarmCardActive: {
    borderColor: '#ff4d4d',
    backgroundColor: '#260a0a',
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#21262d',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#30363d',
  },
  iconCircleActive: {
    backgroundColor: '#8c1d1d',
    borderColor: '#ff5252',
  },
  alarmIcon: {
    fontSize: 40,
  },
  alarmSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f0f6fc',
    marginBottom: 8,
    textAlign: 'center',
  },
  alarmDescription: {
    color: '#8b949e',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  mainAlarmBtn: {
    backgroundColor: '#e53935',
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#e53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#ff6666',
  },
  stopAlarmBtn: {
    backgroundColor: '#b71c1c',
    borderColor: '#ff1744',
    shadowColor: '#ff1744',
  },
  mainAlarmBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  errorContainer: {
    marginTop: 16,
    backgroundColor: '#3d1414',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff4d4d',
    width: '100%',
  },
  errorText: {
    color: '#ff8a80',
    fontSize: 13,
    textAlign: 'center',
  },
});
