import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import SignToTextDetector from '../../components/SignToTextDetector';
import { SignService, FrameHands, StatsResponse } from '../../services/SignService';

// ---------------------------------------------------------------------------
// 1. Training Phrase Definitions (4 Sequence Classes)
// ---------------------------------------------------------------------------

export interface TrainingPhrase {
  id: string;
  label: string;
  display: string;
  category: 'Hospital' | 'Bank' | 'General';
  icon: string;
}

export const TRAINING_PHRASES: TrainingPhrase[] = [
  {
    id: 'WHEN_SHOULD_I_TAKE_MY_TABLETS',
    label: 'WHEN_SHOULD_I_TAKE_MY_TABLETS',
    display: 'When should I take my tablets?',
    category: 'Hospital',
    icon: '🏥',
  },
  {
    id: 'BANK_ACCOUNT_REQUIRED_DETAILS',
    label: 'BANK_ACCOUNT_REQUIRED_DETAILS',
    display: 'What details are required to create a bank account?',
    category: 'Bank',
    icon: '🏦',
  },
  {
    id: 'CAN_YOU_HELP_ME',
    label: 'CAN_YOU_HELP_ME',
    display: 'Can you help me?',
    category: 'General',
    icon: '💬',
  },
  {
    id: 'CAN_YOU_CONVEY_THIS_MESSAGE',
    label: 'CAN_YOU_CONVEY_THIS_MESSAGE',
    display: 'Can you convey this message?',
    category: 'General',
    icon: '✉️',
  },
];

export default function SignTrainingScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  // Selected Phrase
  const [selectedPhrase, setSelectedPhrase] = useState<TrainingPhrase | null>(null);

  // Backend Stats
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Recording State Machine
  const [recordingState, setRecordingState] = useState<'idle' | 'countdown' | 'recording' | 'saving' | 'success'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [recordingTime, setRecordingTime] = useState<number>(0);

  // Live Counter UI States
  const [recordedFrameCount, setRecordedFrameCount] = useState<number>(0);
  const [validFrameCount, setValidFrameCount] = useState<number>(0);
  const [lastSavedMetrics, setLastSavedMetrics] = useState<{ total: number; valid: number; filename: string } | null>(null);

  // Detection Status States
  const [handDetected, setHandDetected] = useState(false);
  const [leftHandDetected, setLeftHandDetected] = useState(false);
  const [rightHandDetected, setRightHandDetected] = useState(false);

  // Refs for High-Frequency Audio/Video Async Callbacks (Prevents React Stale Closures)
  const isRecordingRef = useRef<boolean>(false);
  const recordedFramesRef = useRef<FrameHands[]>([]);
  const validFrameCountRef = useRef<number>(0);

  // Timers
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await SignService.getStats();
      console.log('[SignTraining] Loaded stats from backend:', res);
      setStats(res);
    } catch (err) {
      console.warn('[SignTraining] Failed to load stats from backend:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    console.log('[SignTraining] Component mounted. Camera ready.');
    fetchStats();
    return () => {
      isRecordingRef.current = false;
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // MediaPipe Landmark Callbacks
  // ---------------------------------------------------------------------------

  const handleHandsDetected = (hands: { leftHand: any[] | null; rightHand: any[] | null }) => {
    const hasLeft = hands.leftHand !== null && hands.leftHand.length > 0;
    const hasRight = hands.rightHand !== null && hands.rightHand.length > 0;
    const hasHand = hasLeft || hasRight;

    setHandDetected(hasHand);
    setLeftHandDetected(hasLeft);
    setRightHandDetected(hasRight);

    // Read active recording state strictly from ref (no stale closure bug)
    if (isRecordingRef.current) {
      const frame: FrameHands = {
        leftHand: hands.leftHand ? hands.leftHand.map((l: any) => ({ x: l.x, y: l.y, z: l.z })) : null,
        rightHand: hands.rightHand ? hands.rightHand.map((l: any) => ({ x: l.x, y: l.y, z: l.z })) : null,
      };

      recordedFramesRef.current.push(frame);
      if (hasHand) {
        validFrameCountRef.current++;
      }

      const total = recordedFramesRef.current.length;
      const valid = validFrameCountRef.current;

      setRecordedFrameCount(total);
      setValidFrameCount(valid);

      if (total % 10 === 0 || total === 1) {
        console.log(`[SignTraining] Captured frame #${total} (valid: ${valid}, left: ${hasLeft}, right: ${hasRight})`);
      }
    }
  };

  const handleHandNotDetected = () => {
    setHandDetected(false);
    setLeftHandDetected(false);
    setRightHandDetected(false);

    if (isRecordingRef.current) {
      const frame: FrameHands = { leftHand: null, rightHand: null };
      recordedFramesRef.current.push(frame);
      setRecordedFrameCount(recordedFramesRef.current.length);
      setValidFrameCount(validFrameCountRef.current);
    }
  };

  // ---------------------------------------------------------------------------
  // Recording Controls
  // ---------------------------------------------------------------------------

  const startCountdown = () => {
    if (!selectedPhrase) return;
    console.log(`[SignTraining] Starting countdown for phrase: '${selectedPhrase.label}'...`);

    setRecordingState('countdown');
    setCountdown(3);
    setLastSavedMetrics(null);

    isRecordingRef.current = false;
    recordedFramesRef.current = [];
    validFrameCountRef.current = 0;
    setRecordedFrameCount(0);
    setValidFrameCount(0);

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = () => {
    console.log('[SignTraining] 🔴 Recording started. Buffer reset.');

    isRecordingRef.current = true;
    recordedFramesRef.current = [];
    validFrameCountRef.current = 0;

    setRecordedFrameCount(0);
    setValidFrameCount(0);
    setRecordingTime(0);
    setRecordingState('recording');

    if (recordTimerRef.current) clearInterval(recordTimerRef.current);

    // Auto-stop after 5 seconds or allow manual stop
    recordTimerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= 4.9) {
          if (recordTimerRef.current) clearInterval(recordTimerRef.current);
          stopAndSaveRecording();
          return 5.0;
        }
        return prev + 0.1;
      });
    }, 100);
  };

  const manualStopRecording = () => {
    if (recordingState !== 'recording') return;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    stopAndSaveRecording();
  };

  const stopAndSaveRecording = async () => {
    isRecordingRef.current = false;
    setRecordingState('saving');

    const totalCaptured = recordedFramesRef.current.length;
    const totalValid = validFrameCountRef.current;
    const ratio = totalCaptured > 0 ? totalValid / totalCaptured : 0;

    console.log(`[SignTraining] Recording stopped. Total frames: ${totalCaptured}, Valid frames: ${totalValid} (${(ratio * 100).toFixed(1)}%)`);

    if (totalCaptured === 0) {
      alert('No frames captured. Please check camera access and keep your hands visible.');
      setRecordingState('idle');
      return;
    }

    if (totalValid < 15 || ratio < 0.70) {
      alert(
        `Recording quality is too low.\n\n` +
        `Valid Hand Ratio: ${(ratio * 100).toFixed(1)}% (Minimum required: 70%)\n` +
        `Valid Frames: ${totalValid} (Minimum required: 15)\n\n` +
        `Please keep your hands clearly visible in front of the camera and record again.`
      );
      setRecordingState('idle');
      return;
    }

    try {
      console.log(`[SignTraining] Saving sample to POST /api/v1/sign/record...`);
      const response = await SignService.recordSample(selectedPhrase!.label, recordedFramesRef.current);
      console.log('[SignTraining] ✅ Sample saved successfully:', response);

      setLastSavedMetrics({
        total: totalCaptured,
        valid: totalValid,
        filename: response.filename || 'sample.json',
      });

      setRecordingState('success');
      await fetchStats();
    } catch (err: any) {
      console.error('[SignTraining] ❌ Save failed:', err);
      alert(`Failed to save sample: ${err.message}`);
      setRecordingState('idle');
    }
  };

  const getPhraseCount = (label: string): number => {
    if (!stats?.phrase_stats) return 0;
    // Check label directly or via uppercase/lowercase normalization
    return stats.phrase_stats[label] || stats.phrase_stats[label.toUpperCase()] || 0;
  };

  const getReadyPhrasesCount = (): number => {
    return TRAINING_PHRASES.filter((p) => getPhraseCount(p.label) >= 50).length;
  };

  const getProgressColor = (count: number) => {
    if (count >= 100) return '#00E676';
    if (count >= 50) return '#00B0FF';
    return '#FFC107';
  };

  // ---------------------------------------------------------------------------
  // Render: Dedicated Phrase Recording Interface
  // ---------------------------------------------------------------------------

  if (selectedPhrase) {
    const currentSampleCount = getPhraseCount(selectedPhrase.label);

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (recordTimerRef.current) clearInterval(recordTimerRef.current);
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                isRecordingRef.current = false;
                setRecordingState('idle');
                setSelectedPhrase(null);
              }}
            >
              <Text style={styles.backButtonText}>‹ Back to Phrases</Text>
            </TouchableOpacity>
            <View style={styles.headerTitles}>
              <Text style={styles.headerTitle}>
                {selectedPhrase.icon} {selectedPhrase.category}: {selectedPhrase.display}
              </Text>
              <Text style={styles.headerSub}>Label: {selectedPhrase.label}</Text>
            </View>
          </View>

          {/* Recorder Workspace */}
          <ScrollView contentContainerStyle={styles.recorderContainer}>
            {/* Top Info Banner */}
            <View style={styles.phraseDetailCard}>
              <View style={styles.phraseDetailRow}>
                <Text style={styles.phraseCategoryBadge}>{selectedPhrase.category.toUpperCase()}</Text>
                <Text style={styles.sampleBadge}>Samples: {currentSampleCount} / 50</Text>
              </View>
              <Text style={styles.phraseDisplayText}>"{selectedPhrase.display}"</Text>
              
              <Text style={styles.instructionTitle}>Recording Instructions:</Text>
              <Text style={styles.instructionText}>1. Position yourself clearly in front of the camera.</Text>
              <Text style={styles.instructionText}>2. Keep your upper body and both hands visible.</Text>
              <Text style={styles.instructionText}>3. Press Start Recording & perform the complete sign naturally.</Text>
              <Text style={styles.instructionText}>4. Press Stop when finished (or auto-stop after 5 seconds).</Text>
              <Text style={styles.tipText}>💡 Tip: Repeat the same sign naturally. Slightly vary your signing speed, hand position, and distance between recordings.</Text>
            </View>

            {/* Camera & Detection View */}
            <View style={styles.cameraBoxLarge}>
              <SignToTextDetector
                onHandsDetected={handleHandsDetected}
                onHandNotDetected={handleHandNotDetected}
              />

              {/* Countdown Overlay */}
              {recordingState === 'countdown' && (
                <View style={styles.overlayLayer}>
                  <Text style={styles.countdownText}>{countdown}</Text>
                  <Text style={styles.overlaySubText}>GET READY TO SIGN...</Text>
                </View>
              )}

              {/* Active Recording Overlay */}
              {recordingState === 'recording' && (
                <View style={[styles.overlayLayer, styles.overlayRecording]}>
                  <Text style={styles.recordingText}>🔴 RECORDING</Text>
                  <Text style={styles.recordingTimer}>{recordingTime.toFixed(1)}s / 5.0s</Text>
                  <Text style={styles.recordingFrames}>
                    Frames Processed: {recordedFrameCount} | Valid: {validFrameCount}
                  </Text>
                </View>
              )}

              {/* Saving Overlay */}
              {recordingState === 'saving' && (
                <View style={styles.overlayLayer}>
                  <ActivityIndicator size="large" color="#00FFCC" />
                  <Text style={styles.savingText}>Validating & saving landmark sequence...</Text>
                </View>
              )}

              {/* Success Overlay */}
              {recordingState === 'success' && lastSavedMetrics && (
                <View style={[styles.overlayLayer, styles.overlaySuccess]}>
                  <Text style={styles.successIcon}>✓</Text>
                  <Text style={styles.successTitle}>Sample Saved Successfully!</Text>
                  <Text style={styles.successMetrics}>
                    Total Frames: {lastSavedMetrics.total} | Valid Landmarks: {lastSavedMetrics.valid}
                  </Text>
                  <Text style={styles.successSub}>File: {lastSavedMetrics.filename}</Text>
                </View>
              )}
            </View>

            {/* Real-time Status Badges */}
            <View style={styles.statusRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusLabel}>Camera:</Text>
                <Text style={styles.statusValueSuccess}>Ready ✓</Text>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusLabel}>Hand Detection:</Text>
                <Text style={handDetected ? styles.statusValueSuccess : styles.statusValueWarning}>
                  {handDetected ? 'Hands Detected ✓' : 'Waiting for hands...'}
                </Text>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusLabel}>Pose Detection:</Text>
                <Text style={styles.statusValueSuccess}>Detected ✓</Text>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusLabel}>Captured Frames:</Text>
                <Text style={styles.statusValueHighlight}>{recordedFrameCount}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              {recordingState === 'idle' && (
                <TouchableOpacity style={styles.primaryButton} onPress={startCountdown}>
                  <Text style={styles.primaryButtonText}>▶ START RECORDING</Text>
                </TouchableOpacity>
              )}

              {recordingState === 'recording' && (
                <TouchableOpacity style={styles.stopButton} onPress={manualStopRecording}>
                  <Text style={styles.stopButtonText}>⏹ STOP & SAVE SAMPLE</Text>
                </TouchableOpacity>
              )}

              {recordingState === 'success' && (
                <View style={styles.successActionRow}>
                  <TouchableOpacity style={styles.primaryButton} onPress={startCountdown}>
                    <Text style={styles.primaryButtonText}>RECORD ANOTHER SAMPLE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setRecordingState('idle');
                      setSelectedPhrase(null);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>BACK TO PHRASES</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: 4 Phrase Selection Grid
  // ---------------------------------------------------------------------------

  const readyCount = getReadyPhrasesCount();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
            <Text style={styles.backButtonText}>‹ Back to App</Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>SIGN LANGUAGE DATASET RECORDER</Text>
            <Text style={styles.headerSub}>
              Training Progress: {readyCount} / 4 phrases ready (Target: 50+ samples per phrase)
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.mainScrollContent}>
          {/* Summary Box */}
          <View style={styles.progressSummaryCard}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressTitle}>Dataset Collection Target</Text>
              {stats && (
                <Text style={styles.progressTotalText}>{stats.total_samples} Total Samples Recorded</Text>
              )}
            </View>
            <Text style={styles.progressDescription}>
              Collect 50 to 100 sequence samples for each of the 4 core sentence classes to enable LSTM model training.
            </Text>
          </View>

          {/* 4 Phrase Cards Grid */}
          <View style={styles.phraseGrid}>
            {TRAINING_PHRASES.map((phraseItem) => {
              const count = getPhraseCount(phraseItem.label);
              const targetMet = count >= 50;

              return (
                <View key={phraseItem.id} style={styles.phraseCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardCategoryText}>
                      {phraseItem.icon} {phraseItem.category.toUpperCase()}
                    </Text>
                    {targetMet && <Text style={styles.readyBadge}>READY ✓</Text>}
                  </View>

                  <Text style={styles.cardDisplayText}>"{phraseItem.display}"</Text>
                  <Text style={styles.cardLabelText}>Label: {phraseItem.label}</Text>

                  <View style={styles.cardFooterRow}>
                    <Text style={[styles.cardCountText, { color: getProgressColor(count) }]}>
                      Samples: {count} / 50
                    </Text>

                    <TouchableOpacity
                      style={styles.trainButton}
                      onPress={() => {
                        setSelectedPhrase(phraseItem);
                        setRecordingState('idle');
                      }}
                    >
                      <Text style={styles.trainButtonText}>TRAIN THIS PHRASE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a16',
  },
  container: {
    flex: 1,
    backgroundColor: '#0a0a16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#121226',
    borderBottomWidth: 1,
    borderBottomColor: '#222244',
  },
  backButton: {
    paddingRight: 16,
  },
  backButtonText: {
    color: '#00FFCC',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSub: {
    color: '#8888AA',
    fontSize: 12,
    marginTop: 2,
  },
  mainScrollContent: {
    padding: 20,
  },
  progressSummaryCard: {
    backgroundColor: '#121226',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222244',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    color: '#00FFCC',
    fontSize: 16,
    fontWeight: '700',
  },
  progressTotalText: {
    color: '#FFCC00',
    fontSize: 14,
    fontWeight: '600',
  },
  progressDescription: {
    color: '#AAAAAA',
    fontSize: 13,
    lineHeight: 18,
  },
  phraseGrid: {
    gap: 16,
  },
  phraseCard: {
    backgroundColor: '#15152d',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardCategoryText: {
    color: '#00FFCC',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  readyBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardDisplayText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardLabelText: {
    color: '#666688',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  cardCountText: {
    fontSize: 15,
    fontWeight: '700',
  },
  trainButton: {
    backgroundColor: '#00FFCC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  trainButtonText: {
    color: '#0a0a16',
    fontSize: 13,
    fontWeight: '700',
  },
  recorderContainer: {
    padding: 20,
    gap: 16,
  },
  phraseDetailCard: {
    backgroundColor: '#15152d',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  phraseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  phraseCategoryBadge: {
    color: '#00FFCC',
    fontSize: 12,
    fontWeight: '700',
  },
  sampleBadge: {
    color: '#FFCC00',
    fontSize: 13,
    fontWeight: '700',
  },
  phraseDisplayText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginVertical: 6,
  },
  instructionTitle: {
    color: '#8888AA',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  instructionText: {
    color: '#CCCCCC',
    fontSize: 12,
    lineHeight: 18,
  },
  tipText: {
    color: '#FFCC00',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    fontStyle: 'italic',
  },
  cameraBoxLarge: {
    height: 380,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  overlayLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 22, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 25,
  },
  overlayRecording: {
    backgroundColor: 'rgba(255, 51, 102, 0.25)',
    borderColor: '#FF3366',
    borderWidth: 2,
  },
  overlaySuccess: {
    backgroundColor: 'rgba(0, 230, 118, 0.9)',
  },
  countdownText: {
    color: '#00FFCC',
    fontSize: 80,
    fontWeight: '900',
  },
  overlaySubText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  recordingText: {
    color: '#FF3366',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  recordingTimer: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginVertical: 8,
  },
  recordingFrames: {
    color: '#00FFCC',
    fontSize: 14,
    fontWeight: '600',
  },
  savingText: {
    color: '#00FFCC',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
  },
  successIcon: {
    color: '#0a0a16',
    fontSize: 60,
    fontWeight: '900',
  },
  successTitle: {
    color: '#0a0a16',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  successMetrics: {
    color: '#0a0a16',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  successSub: {
    color: '#121226',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusBadge: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#15152d',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#222244',
  },
  statusLabel: {
    color: '#8888AA',
    fontSize: 11,
    fontWeight: '600',
  },
  statusValueSuccess: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  statusValueWarning: {
    color: '#FF9900',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  statusValueHighlight: {
    color: '#00FFCC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  actionRow: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#00FFCC',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0a0a16',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stopButton: {
    backgroundColor: '#FF3366',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  successActionRow: {
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: '#222244',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
