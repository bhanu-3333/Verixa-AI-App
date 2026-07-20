// src/components/SOSButton.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, StyleSheet, Text, View, Animated, Easing, Platform } from 'react-native';

/**
 * Reusable, premium SOS button.
 *
 * Props:
 *  - onPress: async callback that performs the SOS request.
 *  - disabled?: external disable flag (e.g., when the screen is locked).
 *  - size?: diameter of the circular button (default 120).
 *
 * Behaviour:
 *  • Large red circular button with a pulsing animation when enabled.
 *  • Shows a confirmation dialog before invoking the async onPress.
 *  • While the request is in progress the button shows a spinner and is disabled.
 */
export interface SOSButtonProps {
  onPress: () => Promise<void>;
  disabled?: boolean;
  size?: number;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ onPress, disabled = false, size = 120 }) => {
  const [loading, setLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation – runs only when button is enabled and not loading
  useEffect(() => {
    if (disabled || loading) {
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
  }, [disabled, loading, scaleAnim]);

  const isDisabled = disabled || loading;

  const handlePress = () => {
    console.log("SOS Button Pressed");
    if (isDisabled) {
      console.log("SOS Button Press ignored - Button is disabled or loading");
      return;
    }

    // Platform.OS === 'web' fallback because Alert.alert is a no-op on Web
    const isWeb = typeof window !== 'undefined' && (Platform.OS === 'web' || !Alert.alert);
    if (isWeb) {
      const confirmSend = window.confirm('Are you sure you want to send an emergency alert?');
      if (confirmSend) {
        (async () => {
          try {
            setLoading(true);
            await onPress();
          } finally {
            setLoading(false);
          }
        })();
      }
      return;
    }

    Alert.alert(
      'Confirm SOS',
      'Are you sure you want to send an emergency alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await onPress();
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <Pressable onPress={handlePress} style={[styles.pressable, { width: size, height: size, borderRadius: size / 2 }]}>
      <Animated.View
        style={[
          styles.button,
          { width: size, height: size, borderRadius: size / 2 },
          { transform: [{ scale: scaleAnim }] },
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <Text style={styles.text}>SOS</Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: { alignItems: 'center', justifyContent: 'center' },
  button: {
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  disabled: { opacity: 0.6 },
  text: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
});

export default SOSButton;
