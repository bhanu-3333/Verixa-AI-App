/**
 * Verixa AI — Splash / Loading Screen
 *
 * Assets required (place in assets/images/splash/):
 *   sky.jpeg  — full-screen blue sky background
 *   woman.png — transparent PNG of sign-language woman
 */

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { getToken } from '../utils/storage';

// ─── Colors ────────────────────────────────────────────────────────────────
const CREAM      = '#E5F2C5';
const DARK_GREEN = '#123D32';
const TRACK_COLOR = '#174C3D';
const FILL_COLOR  = '#DDEEBB';

// ─── Durations ─────────────────────────────────────────────────────────────
const PROGRESS_DURATION = 3200;
const HOLD_AFTER_DONE   = 400;

export default function SplashScreen() {
  const { width, height } = useWindowDimensions();

  const [progress, setProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0));
  const floatAnim    = useRef(new Animated.Value(0));
  const fadeIn       = useRef(new Animated.Value(0));
  const navigated    = useRef(false);

  const barWidth = width * 0.48;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeIn.current, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Floating loop — subtle ±6px vertical breathe
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim.current, {
          toValue: -6,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim.current, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Progress animation — useNativeDriver:false needed for width
    Animated.timing(progressAnim.current, {
      toValue: 100,
      duration: PROGRESS_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    const listenerId = progressAnim.current.addListener(({ value }: { value: number }) => {
      setProgress(Math.floor(value));
    });

    const navTimer = setTimeout(async () => {
      if (navigated.current) return;
      navigated.current = true;
      try {
        const token = await getToken();
        router.replace(token ? '/(app)/home' : '/(auth)/login');
      } catch {
        router.replace('/(auth)/login');
      }
    }, PROGRESS_DURATION + HOLD_AFTER_DONE);

    return () => {
      progressAnim.current.removeListener(listenerId);
      clearTimeout(navTimer);
      floatAnim.current.stopAnimation();
      fadeIn.current.stopAnimation();
    };
  }, []);

  const barFillWidth = progressAnim.current.interpolate({
    inputRange:  [0, 100],
    outputRange: [0, barWidth],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.root, { opacity: fadeIn.current }]}>

      {/* LAYER 1 — Full-screen sky background */}
      <ImageBackground
        source={require('../../assets/images/splash/sky.jpeg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* LAYER 2 — "sign" brand + tagline (sits behind woman) */}
      <View
        pointerEvents="none"
        style={[styles.brandBlock, { top: height * 0.07 }]}
      >
        <Text style={[styles.logoText, { fontSize: Math.min(width * 0.25, 100) }]}>
          sign
        </Text>
        <Text style={styles.tagline}>
          Bridging silence. Building understanding.
        </Text>
      </View>

      {/* LAYER 3 — Woman: directly absolute, NO wrapper View, NO absoluteFill */}
      <Animated.Image
        source={require('../../assets/images/splash/woman.png')}
        resizeMode="contain"
        style={{
          position: 'absolute',
          zIndex: 3,
          // Size: large — occupies most of the right half
          width:  width * 1.05,
          height: height * 0.88,
          // Position: right-anchored, starts at ~17% from top
          right: -width * 0.18,
          top:   height * 0.17,
          // Float animation
          transform: [{ translateY: floatAnim.current }],
        }}
      />

      {/* LAYER 4+5 — "Every sign matters." + progress (bottom-left) */}
      <View
        style={[styles.bottomBlock, { bottom: height * 0.055 }]}
        pointerEvents="none"
      >
        <Text style={[styles.everySign, { fontSize: Math.min(width * 0.09, 36) }]}>
          {'Every\nsign\nmatters.'}
        </Text>

        <Text style={styles.percentText}>{progress}%</Text>

        <View style={[styles.trackBar, { width: barWidth }]}>
          <Animated.View style={[styles.fillBar, { width: barFillWidth }]} />
        </View>

        <Text style={styles.loadingLabel}>Loading experiences...</Text>
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'visible',              // never clip children
    backgroundColor: '#5BB8F5',       // sky fallback
  },

  brandBlock: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 2,
  },
  logoText: {
    fontWeight: '900',
    color: CREAM,
    letterSpacing: -2,
    includeFontPadding: false,
    ...Platform.select({
      ios:     { fontFamily: 'Helvetica Neue' },
      android: { fontFamily: 'sans-serif-black' },
      default: { fontFamily: 'Arial Black, Arial, sans-serif' },
    }),
  },
  tagline: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: DARK_GREEN,
    letterSpacing: 0.2,
  },

  bottomBlock: {
    position: 'absolute',
    left: 24,
    zIndex: 5,
  },
  everySign: {
    fontWeight: '900',
    color: DARK_GREEN,
    letterSpacing: -0.5,
    lineHeight: undefined,
    ...Platform.select({
      ios:     { fontFamily: 'Helvetica Neue' },
      android: { fontFamily: 'sans-serif-black' },
      default: { fontFamily: 'Arial Black, Arial, sans-serif' },
    }),
  },
  percentText: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: '600',
    color: DARK_GREEN,
    opacity: 0.75,
    letterSpacing: 0.3,
  },
  trackBar: {
    marginTop: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: TRACK_COLOR,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: FILL_COLOR,
  },
  loadingLabel: {
    marginTop: 8,
    fontSize: 12,
    color: DARK_GREEN,
    opacity: 0.8,
    letterSpacing: 0.2,
  },
});
