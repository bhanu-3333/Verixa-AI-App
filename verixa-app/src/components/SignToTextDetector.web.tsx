/**
 * Verixa AI — Sign to Text Detector (Web Implementation)
 *
 * Direct MediaPipe integration with React element video stream.
 * Guarantees callbacks always fire regardless of React re-renders or canvas context states.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';

// Only import the TypeScript types — not the runtime values
import type { Results, NormalizedLandmark } from '@mediapipe/hands';

interface SignToTextDetectorProps {
  onHandsDetected?: (hands: { leftHand: NormalizedLandmark[] | null; rightHand: NormalizedLandmark[] | null }) => void;
  onHandDetected?: (landmarks: NormalizedLandmark[]) => void;
  onHandNotDetected?: () => void;
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function loadMediaPipeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const SCRIPT_ID = 'mediapipe-hands-script';

    if (document.getElementById(SCRIPT_ID)) {
      if ((window as any).Hands) {
        resolve();
      } else {
        const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement;
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('MediaPipe hands.js failed to load')));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = '/mediapipe/hands/hands.js';
    script.async = false;
    script.onload = () => {
      console.log('[SignToTextDetector] hands.js script loaded into global scope.');
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load /mediapipe/hands/hands.js'));
    };
    document.head.appendChild(script);
  });
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export default function SignToTextDetector({
  onHandsDetected,
  onHandDetected,
  onHandNotDetected,
}: SignToTextDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detectorReady, setDetectorReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Keep mutable refs for callbacks to prevent stale closure issues inside MediaPipe async callbacks
  const onHandsDetectedRef = useRef(onHandsDetected);
  const onHandDetectedRef = useRef(onHandDetected);
  const onHandNotDetectedRef = useRef(onHandNotDetected);

  useEffect(() => {
    onHandsDetectedRef.current = onHandsDetected;
    onHandDetectedRef.current = onHandDetected;
    onHandNotDetectedRef.current = onHandNotDetected;
  }, [onHandsDetected, onHandDetected, onHandNotDetected]);

  // Camera initialization via getUserMedia attached directly to videoRef element
  useEffect(() => {
    let streamInstance: MediaStream | null = null;
    let isMounted = true;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      .then((stream) => {
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamInstance = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            video.play().catch(console.warn);
            setCameraReady(true);
            console.log('[SignToTextDetector] Camera stream active.');
          };
        }
      })
      .catch((err) => {
        if (isMounted) {
          setInitError(`Camera permission denied or unavailable: ${err.message}`);
        }
      });

    return () => {
      isMounted = false;
      if (streamInstance) {
        streamInstance.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  // MediaPipe initialization (after camera is ready)
  useEffect(() => {
    if (!cameraReady) return;

    let active = true;
    let animationFrameId: number;

    const initDetector = async () => {
      try {
        await loadMediaPipeScript();

        const HandsClass = (window as any).Hands;
        const HAND_CONNECTIONS = (window as any).HAND_CONNECTIONS as Array<[number, number]>;

        if (typeof HandsClass !== 'function') {
          throw new Error('window.Hands is not a constructor after loading script.');
        }

        const handsDetector = new HandsClass({
          locateFile: (file: string) => `/mediapipe/hands/${file}`,
        });

        handsDetector.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        handsDetector.onResults((results: Results) => {
          if (!active) return;

          let leftHand: NormalizedLandmark[] | null = null;
          let rightHand: NormalizedLandmark[] | null = null;
          const detectedCount = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;

          if (detectedCount > 0) {
            // Parse detected hands
            for (let handIdx = 0; handIdx < results.multiHandLandmarks.length; handIdx++) {
              const landmarks = results.multiHandLandmarks[handIdx];
              const handedness = results.multiHandedness ? results.multiHandedness[handIdx] : null;

              if (handedness && handedness.label) {
                if (handedness.label === 'Left') {
                  leftHand = landmarks;
                } else if (handedness.label === 'Right') {
                  rightHand = landmarks;
                }
              }
            }

            // Fallback: If hands detected but missing or unclassified handedness labels
            if (!leftHand && !rightHand) {
              leftHand = results.multiHandLandmarks[0];
              if (results.multiHandLandmarks.length > 1) {
                rightHand = results.multiHandLandmarks[1];
              }
            }

            // ALWAYS EXECUTE CALLBACKS FIRST — Guaranteed pipeline delivery
            if (onHandDetectedRef.current) {
              onHandDetectedRef.current(results.multiHandLandmarks[0]);
            }
            if (onHandsDetectedRef.current) {
              onHandsDetectedRef.current({ leftHand, rightHand });
            }
          } else {
            if (onHandNotDetectedRef.current) {
              onHandNotDetectedRef.current();
            }
          }

          // Visual Canvas Overlay Drawing
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
            canvas.width = video.clientWidth;
            canvas.height = video.clientHeight;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (detectedCount > 0) {
            for (let handIdx = 0; handIdx < results.multiHandLandmarks.length; handIdx++) {
              const landmarks = results.multiHandLandmarks[handIdx];

              ctx.strokeStyle = handIdx === 0 ? '#00FFCC' : '#FF3366';
              ctx.lineWidth = 3;
              if (HAND_CONNECTIONS) {
                for (const connection of HAND_CONNECTIONS) {
                  const start = landmarks[connection[0]];
                  const end = landmarks[connection[1]];
                  if (start && end) {
                    ctx.beginPath();
                    ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
                    ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
                    ctx.stroke();
                  }
                }
              }

              for (let i = 0; i < landmarks.length; i++) {
                const lm = landmarks[i];
                const isTip = [4, 8, 12, 16, 20].includes(i);
                ctx.fillStyle = isTip ? '#FF3366' : '#FFCC00';
                ctx.beginPath();
                ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, 2 * Math.PI);
                ctx.fill();
              }
            }

            ctx.fillStyle = 'rgba(10, 10, 22, 0.8)';
            ctx.fillRect(12, 12, 180, 30);
            ctx.strokeStyle = '#00FFCC';
            ctx.strokeRect(12, 12, 180, 30);
            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = '#00FFCC';
            ctx.fillText(
              detectedCount === 1 ? '🟢 1 Hand Detected' : '🟢 2 Hands Detected',
              22,
              31
            );
          } else {
            ctx.fillStyle = 'rgba(10, 10, 22, 0.8)';
            ctx.fillRect(12, 12, 180, 30);
            ctx.strokeStyle = '#FF3366';
            ctx.strokeRect(12, 12, 180, 30);
            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = '#FF3366';
            ctx.fillText('🔴 Waiting for Hands...', 22, 31);
          }
        });

        await handsDetector.initialize();
        setDetectorReady(true);
        console.log('[SignToTextDetector] MediaPipe initialized successfully.');

        // Continuous Frame Loop
        let frameCount = 0;
        const processFrame = async () => {
          if (!active) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2 && !video.paused && !video.ended) {
            try {
              frameCount++;
              if (frameCount % 100 === 0) {
                console.log(`[SignToTextDetector] Active frame processing loop (${frameCount} frames)`);
              }
              await handsDetector.send({ image: video });
            } catch (err) {
              console.warn('[SignToTextDetector] Frame error:', err);
            }
          }
          animationFrameId = requestAnimationFrame(processFrame);
        };

        processFrame();
      } catch (err: any) {
        console.error('[SignToTextDetector] ❌ Failed to initialize detector:', err);
        setInitError(err.message || 'MediaPipe initialization failed.');
      }
    };

    initDetector();

    return () => {
      active = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraReady]);

  return (
    <View style={styles.container}>
      {/* Video Element rendered as proper React DOM Element */}
      <video
        ref={videoRef}
        id="mp-camera-video"
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
          transform: 'scaleX(-1)', // Mirror front camera feed
          zIndex: 1,
        }}
      />

      {/* Canvas overlay for landmark drawing */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      />

      {/* Loading overlay */}
      {!detectorReady && !initError && (
        <View style={styles.overlayLoader}>
          <ActivityIndicator size="large" color="#00FFCC" />
          <Text style={styles.statusText}>
            {cameraReady ? 'Loading MediaPipe Hand Tracking...' : 'Accessing Camera...'}
          </Text>
        </View>
      )}

      {/* Error overlay */}
      {initError && (
        <View style={styles.overlayLoader}>
          <Text style={styles.errorText}>⚠ {initError}</Text>
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
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 22, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
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
    paddingHorizontal: 24,
  },
});
