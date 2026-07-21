/**
 * Verixa AI — Sign to Text Detector (Native Placeholder)
 * Opens the camera view on native platforms to support modular architecture without crashing.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface SignToTextDetectorProps {
  onHandsDetected?: (hands: { leftHand: any[] | null; rightHand: any[] | null }) => void;
  onHandDetected?: (landmarks: any[]) => void;
  onHandNotDetected?: () => void;
}

export default function SignToTextDetector({
  onHandDetected,
  onHandNotDetected,
}: SignToTextDetectorProps) {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00FFCC" />
        <Text style={styles.statusText}>Checking camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Camera permission is required.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="front" />
      
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Real-time hand tracking runs on Web.
        </Text>
        <Text style={styles.subBannerText}>
          (Requires custom Native Development Build for Mobile)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a16',
    padding: 20,
  },
  statusText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#FF3366',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  banner: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(10, 10, 22, 0.85)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bannerText: {
    color: '#00FFCC',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  subBannerText: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});
