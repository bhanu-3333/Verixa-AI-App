/**
 * Verixa AI — Sign to Text Detector (Web Implementation)
 * Camera Demo Mode — live video feed via getUserMedia.
 * No MediaPipe, no detector.html, no landmark detection, no AI predictions.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';

interface SignToTextDetectorProps {
  onHandsDetected?: (hands: any) => void;
  onHandDetected?: (landmarks: any) => void;
  onHandNotDetected?: () => void;
}

export default function SignToTextDetector({}: SignToTextDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let streamInstance: MediaStream | null = null;
    let active = true;

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
        .then((stream) => {
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamInstance = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current
              .play()
              .then(() => {
                if (active) setLoading(false);
              })
              .catch(() => {
                if (active) setLoading(false);
              });
          }
        })
        .catch(() => {
          if (active) {
            setError('Camera unavailable');
            setLoading(false);
          }
        });
    } else {
      setError('Camera API unavailable');
      setLoading(false);
    }

    return () => {
      active = false;
      if (streamInstance) {
        streamInstance.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          zIndex: 1,
        }}
      />

      {loading && !error && (
        <View style={styles.overlayLoader}>
          <ActivityIndicator size="large" color="#1A56DB" />
        </View>
      )}

      {error && (
        <View style={styles.overlayLoader}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
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
  overlayLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a16',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

