// src/components/SOSButton.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export interface SOSButtonProps {
  onPress: () => Promise<void>;
  disabled?: boolean;
  size?: number;
  /** Hold duration in milliseconds (default 1800ms) */
  holdDurationMs?: number;
}

export const SOSButton: React.FC<SOSButtonProps> = ({
  onPress,
  disabled = false,
  size = 140,
  holdDurationMs = 1800,
}) => {
  const [loading, setLoading] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartTimeRef = useRef<number>(0);
  const triggeredRef = useRef<boolean>(false);

  // Pulse animation when idle and enabled
  useEffect(() => {
    if (disabled || loading || isHolding) {
      scaleAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.08,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [disabled, loading, isHolding, scaleAnim]);

  const isDisabled = disabled || loading;

  const triggerSOS = async () => {
    if (triggeredRef.current || loading) return;
    triggeredRef.current = true;
    setIsHolding(false);
    setProgressPercent(100);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } catch (_) {}

    try {
      setLoading(true);
      await onPress();
    } finally {
      setLoading(false);
      triggeredRef.current = false;
      setProgressPercent(0);
    }
  };

  const handlePressIn = () => {
    if (isDisabled) return;

    triggeredRef.current = false;
    setIsHolding(true);
    setProgressPercent(0);
    holdStartTimeRef.current = Date.now();

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (_) {}

    if (holdTimerRef.current) clearInterval(holdTimerRef.current);

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      const pct = Math.min(100, Math.floor((elapsed / holdDurationMs) * 100));
      setProgressPercent(pct);

      if (pct >= 100) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        triggerSOS();
      }
    }, 40);
  };

  const handlePressOut = () => {
    if (triggeredRef.current) return;

    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    const elapsed = Date.now() - holdStartTimeRef.current;
    setIsHolding(false);

    // If hold was released early (before holdDurationMs)
    if (elapsed < holdDurationMs) {
      setProgressPercent(0);
      // On Web or fast tap, fall back to confirmation dialog if tapped without holding
      if (elapsed < 300) {
        handleQuickTapFallback();
      }
    }
  };

  const handleQuickTapFallback = () => {
    const isWeb = typeof window !== 'undefined' && (Platform.OS === 'web' || !Alert.alert);
    if (isWeb) {
      const confirmSend = window.confirm('Hold SOS button for 2 seconds to activate, or click OK to activate immediately.');
      if (confirmSend) {
        triggerSOS();
      }
      return;
    }

    Alert.alert(
      'Activate Emergency SOS',
      'Hold the SOS button for 2 seconds to activate, or tap Activate below.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate Now',
          style: 'destructive',
          onPress: () => triggerSOS(),
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.outerContainer}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[styles.pressable, { width: size + 20, height: size + 20 }]}
      >
        <Animated.View
          style={[
            styles.button,
            { width: size, height: size, borderRadius: size / 2 },
            { transform: [{ scale: isHolding ? 1.12 : scaleAnim }] },
            isDisabled && styles.disabled,
            isHolding && styles.buttonHolding,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : isHolding ? (
            <View style={styles.holdingContent}>
              <Text style={styles.percentText}>{progressPercent}%</Text>
              <Text style={styles.holdSubText}>HOLDING...</Text>
            </View>
          ) : (
            <View style={styles.idleContent}>
              <Text style={styles.text}>SOS</Text>
              <Text style={styles.subText}>HOLD 2s</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>

      {isHolding && (
        <Text style={styles.hintLabel}>Keep holding to activate emergency siren...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#ff6666',
  },
  buttonHolding: {
    backgroundColor: '#b71c1c',
    borderColor: '#ff1744',
  },
  disabled: { opacity: 0.6 },
  idleContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  subText: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700', marginTop: 2 },
  percentText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  holdSubText: { color: '#ff8a80', fontSize: 10, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  hintLabel: {
    color: '#ff8a80',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SOSButton;
