/**
 * Verixa AI — Splash / Loading Screen
 * Closely matches the provided reference design.
 *
 * Assets required (place in assets/images/splash/):
 *   sky.png    — full-screen blue sky background
 *   woman.png  — transparent PNG of sign-language woman
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { getToken } from '../utils/storage';

// ─── Colors ────────────────────────────────────────────────────────────────
const CREAM        = '#E5F2C5';   // "sign" logo text
const DARK_GREEN   = '#123D32';   // tagline + supporting text
const TRACK_COLOR  = '#174C3D';   // progress bar track
const FILL_COLOR   = '#DDEEBB';   // progress bar fill

// ─── Durations ─────────────────────────────────────────────────────────────
const PROGRESS_DURATION = 3200;   // ms — 0 → 100 %
const HOLD_AFTER_DONE   = 400;    // ms — pause at 100 % before nav

export default function SplashScreen() {
  const { width, height } = useWindowDimensions();

  // ── Progress state ──────────────────────────────────────────────────────
  const [progress, setProgress] = useState(0);          // 0–100 integer
  const progressAnim = useRef(new Animated.Value(0));
  const floatAnim    = useRef(new Animated.Value(0));
  const fadeIn       = useRef(new Animated.Value(0));
  const navigated    = useRef(false);

  // ── Responsive sizing ───────────────────────────────────────────────────
  const logoSize     = Math.min(width * 0.28, 120);     // "sign" font size
  const womanWidth   = width * 0.90;                    // nearly full width
  const womanHeight  = height * 0.72;                   // tall, fills lower screen
  const barWidth     = width * 0.48;

  useEffect(() => {
    // 1. Fade in the whole screen
    Animated.timing(fadeIn.current, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // 2. Floating woman loop
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

    // 3. Progress bar animation (drives both the bar width AND the % counter)
    Animated.timing(progressAnim.current, {
      toValue: 100,
      duration: PROGRESS_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,   // needed for width interpolation
    }).start();

    // 4. JS listener to update the displayed number
    const listenerId = progressAnim.current.addListener(({ value }: { value: number }) => {
      setProgress(Math.floor(value));
    });

    // 5. Navigate when done
    const navTimer = setTimeout(async () => {
      if (navigated.current) return;
      navigated.current = true;
      try {
        const token = await getToken();
        if (token) {
          router.replace('/(app)/home');
        } else {
          router.replace('/(auth)/login');
        }
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

  // Interpolate bar fill width from 0 → barWidth
  const barFillWidth = progressAnim.current.interpolate({
    inputRange:  [0, 100],
    outputRange: [0, barWidth],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.root, { opacity: fadeIn.current }]}>
      {/* ── LAYER 1: Full-screen sky background ─────────────────────── */}
      <ImageBackground
        source={require('../../assets/images/splash/sky.jpeg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* ── LAYER 2: Brand text (behind woman so she overlaps it) ─────── */}
      <View style={[styles.brandBlock, { top: height * 0.08 }]} pointerEvents="none">
        <Text
          style={[styles.logoText, { fontSize: Math.min(width * 0.26, 108) }]}
          adjustsFontSizeToFit={false}
        >
          sign
        </Text>
        <Text style={styles.tagline}>Bridging silence. Building understanding.</Text>
      </View>

      {/* ── LAYER 3: Transparent woman (floats on right) ─────────────── */}
      <View
        pointerEvents="none"
        style={[
          styles.womanWrapper,
          {
            width:  womanWidth,
            height: womanHeight,
            right:  -width * 0.08,   // bleed slightly off right edge
            top:    height * 0.26,   // face visible from ~26% down
          },
        ]}
      >
        <Animated.Image
          source={require('../../assets/images/splash/woman.png')}
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateY: floatAnim.current }] },
          ]}
          resizeMode="contain"
        />
      </View>

      {/* ── LAYER 4 + 5: Bottom-left foreground content ──────────────── */}
      <View style={[styles.bottomBlock, { bottom: height * 0.06 }]}>
        {/* "Every sign matters." */}
        <Text style={[styles.everySign, { fontSize: Math.min(width * 0.09, 36) }]}>
          {'Every\nsign\nmatters.'}
        </Text>

        {/* Loading percentage */}
        <Text style={styles.percentText}>{progress}%</Text>

        {/* Progress bar */}
        <View style={[styles.trackBar, { width: barWidth }]}>
          <Animated.View style={[styles.fillBar, { width: barFillWidth }]} />
        </View>

        {/* Loading label */}
        <Text style={styles.loadingLabel}>Loading experiences...</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#5BB8F5', // fallback sky colour while image loads
  },

  // ── Brand block ──────────────────────────────────────────────────────────
  brandBlock: {
    position: 'absolute',
    left: 28,
    right: 28,
    zIndex: 2,
  },
  logoText: {
    fontWeight: '900',
    color: CREAM,
    letterSpacing: -2,
    lineHeight: undefined,    // let it be auto
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

  // ── Woman wrapper ────────────────────────────────────────────────────────
  womanWrapper: {
    position: 'absolute',
    zIndex: 3,
  },

  // ── Bottom block ─────────────────────────────────────────────────────────
  bottomBlock: {
    position: 'absolute',
    left: 28,
    zIndex: 5,
  },
  everySign: {
    fontWeight: '900',
    color: DARK_GREEN,
    lineHeight: undefined,
    letterSpacing: -0.5,
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
