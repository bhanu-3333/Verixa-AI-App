/**
 * Verixa AI — Sign to Text Detector (Web Implementation)
 *
 * WHY SCRIPT TAG INSTEAD OF IMPORT:
 * @mediapipe/hands ships as an IIFE (self-executing script), not an ES module.
 * It registers `Hands` and `HAND_CONNECTIONS` on `window` via closure.
 * Bundlers (webpack/metro) treat it as a module with no exports, so
 * `import { Hands } from '@mediapipe/hands'` returns undefined at runtime,
 * causing "Hands is not a constructor". The correct approach is to inject
 * a <script> tag pointing to the local /mediapipe/hands/hands.js asset,
 * wait for it to load, then read window.Hands.
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

/**
 * Injects the MediaPipe hands.js IIFE script into the document as a <script>
 * tag so it runs in global scope and populates window.Hands.
 * Returns a promise that resolves when the script has loaded (or rejects on error).
 * Calling this a second time is a no-op if the script is already present.
 */
function loadMediaPipeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const SCRIPT_ID = 'mediapipe-hands-script';

    if (document.getElementById(SCRIPT_ID)) {
      // Already injected — resolve immediately if already loaded
      if ((window as any).Hands) {
        resolve();
      } else {
        // Still loading — wait for it
        const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement;
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('MediaPipe hands.js failed to load (existing tag)')));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = '/mediapipe/hands/hands.js';
    script.async = false; // must execute synchronously relative to load order
    script.onload = () => {
      console.log('[SignToTextDetector] hands.js script loaded. window.Hands:', typeof (window as any).Hands);
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load /mediapipe/hands/hands.js — check that the file exists in public/mediapipe/hands/'));
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

  // Camera permission via native browser API (no expo-camera on web)
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        // Find or create a video element for the camera feed
        let video = document.getElementById('mp-camera-video') as HTMLVideoElement | null;
        if (!video) {
          video = document.createElement('video');
          video.id = 'mp-camera-video';
          video.style.position = 'absolute';
          video.style.top = '0';
          video.style.left = '0';
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.objectFit = 'cover';
          video.style.transform = 'scaleX(-1)'; // mirror front camera
          video.style.zIndex = '1';
          video.autoplay = true;
          video.playsInline = true;
          video.muted = true;
          // Attach to the container div (rendered below)
          const container = document.getElementById('mp-camera-container');
          if (container) container.appendChild(video);
        }
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video!.play();
          setCameraReady(true);
          console.log('[SignToTextDetector] Camera stream active. Camera ready.');
        };
      })
      .catch((err) => {
        setInitError(`Camera permission denied or unavailable: ${err.message}`);
      });

    return () => {
      // Stop camera on unmount
      const video = document.getElementById('mp-camera-video') as HTMLVideoElement | null;
      if (video && video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        video.srcObject = null;
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
        console.log('[SignToTextDetector] Loading MediaPipe hands.js via script tag...');
        await loadMediaPipeScript();

        const HandsClass = (window as any).Hands;
        const HAND_CONNECTIONS = (window as any).HAND_CONNECTIONS as Array<[number, number]>;

        if (typeof HandsClass !== 'function') {
          throw new Error(
            `window.Hands is not a constructor after loading script. ` +
            `Got type: ${typeof HandsClass}. ` +
            `Check that /mediapipe/hands/hands.js is a valid IIFE.`
          );
        }

        console.log('[SignToTextDetector] window.Hands found. Creating MediaPipe Hands instance...');

        const handsDetector = new HandsClass({
          locateFile: (file: string) => {
            const url = `/mediapipe/hands/${file}`;
            return url;
          },
        });

        handsDetector.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        handsDetector.onResults((results: Results) => {
          if (!active) return;

          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const video = document.getElementById('mp-camera-video') as HTMLVideoElement | null;
          if (video) {
            if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
              canvas.width = video.clientWidth;
              canvas.height = video.clientHeight;
            }
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

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

              // Draw connections
              ctx.strokeStyle = handIdx === 0 ? '#00FFCC' : '#FF3366';
              ctx.lineWidth = 4;
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

              // Draw landmarks
              for (let i = 0; i < landmarks.length; i++) {
                const lm = landmarks[i];
                const isTip = [4, 8, 12, 16, 20].includes(i);
                ctx.fillStyle = isTip ? '#FF3366' : '#FFCC00';
                ctx.beginPath();
                ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 6, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1.5;
                ctx.stroke();
              }
            }

            // Fallback: If hands are detected but handedness labels were missing or unclassified
            if (!leftHand && !rightHand) {
              leftHand = results.multiHandLandmarks[0];
              if (results.multiHandLandmarks.length > 1) {
                rightHand = results.multiHandLandmarks[1];
              }
            }

            // Draw visual status badge on canvas
            ctx.fillStyle = 'rgba(10, 10, 22, 0.75)';
            ctx.fillRect(12, 12, 175, 32);
            ctx.strokeStyle = '#00FFCC';
            ctx.lineWidth = 1;
            ctx.strokeRect(12, 12, 175, 32);

            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = '#00FFCC';
            ctx.fillText(
              detectedCount === 1 ? '🟢 1 Hand Detected' : '🟢 2 Hands Detected',
              24,
              32
            );

            // Fire latest callbacks via refs
            if (onHandDetectedRef.current) {
              onHandDetectedRef.current(results.multiHandLandmarks[0]);
            }
            if (onHandsDetectedRef.current) {
              onHandsDetectedRef.current({ leftHand, rightHand });
            }
          } else {
            // Draw No Hand Status badge
            ctx.fillStyle = 'rgba(10, 10, 22, 0.75)';
            ctx.fillRect(12, 12, 175, 32);
            ctx.strokeStyle = '#FF3366';
            ctx.lineWidth = 1;
            ctx.strokeRect(12, 12, 175, 32);

            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = '#FF3366';
            ctx.fillText('🔴 No Hand Detected', 24, 32);

            if (onHandNotDetectedRef.current) {
              onHandNotDetectedRef.current();
            }
          }
        });

        console.log('[SignToTextDetector] Calling handsDetector.initialize()...');
        await handsDetector.initialize();
        console.log('[MediaPipe] Model initialized successfully!');
        setDetectorReady(true);

        // Frame processing loop
        let frameCount = 0;
        const processFrame = async () => {
          if (!active) return;
          const video = document.getElementById('mp-camera-video') as HTMLVideoElement | null;
          if (video && video.readyState >= 2) {
            try {
              frameCount++;
              if (frameCount % 60 === 0) {
                console.log('[MediaPipe] Processing frame active...');
              }
              await handsDetector.send({ image: video });
            } catch (err) {
              console.warn('[SignToTextDetector] Frame send error:', err);
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
      {/* Camera container — video element is injected via JS into this div */}
      <div
        id="mp-camera-container"
        style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
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
            {cameraReady ? 'Loading MediaPipe models...' : 'Starting camera...'}
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
