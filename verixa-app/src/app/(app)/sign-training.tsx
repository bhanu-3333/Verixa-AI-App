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

const PHRASES = [
  "CAN I CALL SOMEONE",
  "MY NAME IS",
  "I HAVE LOST MY PURSE",
  "CAN YOU HELP ME",
  "CAN YOU REPEAT WHAT YOU SAID",
  "WHERE IS THIS ADDRESS",
  "CAN YOU CONVEY THIS TO SOMEONE",
  "CAN I GET YOUR NUMBER",
  "WHO ARE YOU",
  "HOW CAN I HELP YOU"
];

export default function SignTrainingScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const [selectedPhrase, setSelectedPhrase] = useState<string>(PHRASES[0]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Recording State
  const [recordingState, setRecordingState] = useState<'idle' | 'countdown' | 'recording' | 'saving'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordedFrames, setRecordedFrames] = useState<FrameHands[]>([]);

  // Ref to track multi-hand landmarks during the active recording window
  const activeFramesRef = useRef<FrameHands[]>([]);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hand tracking feedback
  const [handDetected, setHandDetected] = useState(false);

  // Fetch stats on mount
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await SignService.getStats();
      setStats(res);
    } catch (err) {
      console.warn('[SignTraining] Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  const handleHandsDetected = (hands: { leftHand: any[] | null; rightHand: any[] | null }) => {
    setHandDetected(hands.leftHand !== null || hands.rightHand !== null);

    if (recordingState === 'recording') {
      const frame: FrameHands = {
        leftHand: hands.leftHand ? hands.leftHand.map(l => ({ x: l.x, y: l.y, z: l.z })) : null,
        rightHand: hands.rightHand ? hands.rightHand.map(l => ({ x: l.x, y: l.y, z: l.z })) : null,
      };
      activeFramesRef.current.push(frame);
      setRecordedFrames([...activeFramesRef.current]);
    }
  };

  const handleHandNotDetected = () => {
    setHandDetected(false);
    if (recordingState === 'recording') {
      // Record an empty hands frame (backend handles fill zeros)
      const frame: FrameHands = { leftHand: null, rightHand: null };
      activeFramesRef.current.push(frame);
      setRecordedFrames([...activeFramesRef.current]);
    }
  };

  const startCountdown = () => {
    if (recordingState !== 'idle') return;
    setRecordingState('countdown');
    setCountdown(3);
    activeFramesRef.current = [];
    setRecordedFrames([]);

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
    setRecordingState('recording');
    setRecordingTime(0);

    recordTimerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        // Record for exactly 3 seconds
        if (prev >= 2.9) {
          if (recordTimerRef.current) clearInterval(recordTimerRef.current);
          stopAndSaveRecording();
          return 3.0;
        }
        return prev + 0.1;
      });
    }, 100);
  };

  const stopAndSaveRecording = async () => {
    setRecordingState('saving');
    const finalFrames = activeFramesRef.current;
    
    if (finalFrames.length === 0) {
      alert('No frames captured. Please keep your hands visible.');
      setRecordingState('idle');
      return;
    }

    try {
      await SignService.recordSample(selectedPhrase, finalFrames);
      // Reload stats after successful save
      await fetchStats();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setRecordingState('idle');
    }
  };

  const handleDeleteLast = async () => {
    const currentCount = stats?.phrase_stats[selectedPhrase] || 0;
    if (currentCount === 0) {
      alert('No samples recorded for this phrase yet.');
      return;
    }

    if (confirm(`Are you sure you want to delete the latest sample for "${selectedPhrase}"?`)) {
      try {
        setLoadingStats(true);
        await SignService.deleteLatestSample(selectedPhrase);
        await fetchStats();
      } catch (err: any) {
        alert(`Delete failed: ${err.message}`);
      } finally {
        setLoadingStats(false);
      }
    }
  };

  const getProgressColor = (count: number) => {
    if (count >= 100) return '#00E676';
    if (count >= 50) return '#00B0FF';
    return '#FFC107';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Dataset Recorder</Text>
            <Text style={styles.headerSub}>Developer Mode — dynamic gesture collection</Text>
          </View>
        </View>

        {/* Workspace Layout */}
        <View style={[styles.workspace, isMobile ? styles.workspaceMobile : styles.workspaceDesktop]}>
          
          {/* Left Column: Phrase List Selection & Stats */}
          <View style={[styles.leftColumn, isMobile ? styles.leftColumnMobile : styles.leftColumnDesktop]}>
            <Text style={styles.sectionTitle}>Gesture Phrases ({PHRASES.length})</Text>
            <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollListContent}>
              {PHRASES.map((phrase) => {
                const count = stats?.phrase_stats[phrase] || 0;
                const isSelected = selectedPhrase === phrase;
                const targetMet = count >= 50;

                return (
                  <TouchableOpacity
                    key={phrase}
                    style={[styles.phraseItem, isSelected && styles.phraseItemActive]}
                    onPress={() => setSelectedPhrase(phrase)}
                    disabled={recordingState !== 'idle'}
                  >
                    <View style={styles.phraseItemLeft}>
                      <Text style={[styles.phraseText, isSelected && styles.phraseTextActive]}>
                        {phrase}
                      </Text>
                    </View>
                    <View style={styles.badgeRow}>
                      <Text style={[
                        styles.countText, 
                        { color: getProgressColor(count) },
                        isSelected && styles.phraseTextActive
                      ]}>
                        {count} / 50
                      </Text>
                      {targetMet && (
                        <Text style={styles.checkIcon}>✓</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            {stats && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Collection Summary</Text>
                <Text style={styles.summaryValue}>{stats.total_samples} total sequences recorded</Text>
              </View>
            )}
          </View>

          {/* Right Column: Camera, Live Capture & Controls */}
          <View style={[styles.rightColumn, isMobile ? styles.rightColumnMobile : styles.rightColumnDesktop]}>
            <View style={styles.cameraBox}>
              <SignToTextDetector
                onHandsDetected={handleHandsDetected}
                onHandNotDetected={handleHandNotDetected}
              />

              {/* Overlay states */}
              {recordingState === 'countdown' && (
                <View style={styles.overlayLayer}>
                  <Text style={styles.countdownText}>{countdown}</Text>
                  <Text style={styles.overlaySubText}>Get ready to start signing...</Text>
                </View>
              )}

              {recordingState === 'recording' && (
                <View style={[styles.overlayLayer, styles.overlayRecording]}>
                  <Text style={styles.recordingText}> RECORDING</Text>
                  <Text style={styles.recordingTimer}>{recordingTime.toFixed(1)}s</Text>
                  <Text style={styles.recordingFrames}>{recordedFrames.length} frames captured</Text>
                </View>
              )}

              {recordingState === 'saving' && (
                <View style={styles.overlayLayer}>
                  <ActivityIndicator size="large" color="#00FFCC" />
                  <Text style={styles.savingText}>Processing & uploading sequence...</Text>
                </View>
              )}
            </View>

            {/* Controls panel */}
            <View style={styles.controlsPanel}>
              <Text style={styles.selectedPhraseLabel}>Selected target phrase:</Text>
              <Text style={styles.selectedPhraseValue}>{selectedPhrase}</Text>

              {/* Status bar */}
              <View style={styles.statusBar}>
                <View style={[styles.statusIndicator, handDetected ? styles.indicatorActive : styles.indicatorInactive]} />
                <Text style={styles.statusLabel}>
                  {handDetected ? 'Hands visible inside frame' : 'No hands visible'}
                </Text>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.recordBtn, recordingState !== 'idle' && styles.recordBtnDisabled]}
                  onPress={startCountdown}
                  disabled={recordingState !== 'idle'}
                >
                  <Text style={styles.recordBtnText}>🎥 Start Recording</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.deleteBtn, recordingState !== 'idle' && styles.recordBtnDisabled]}
                  onPress={handleDeleteLast}
                  disabled={recordingState !== 'idle'}
                >
                  <Text style={styles.deleteBtnText}>🗑 Delete Last</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a16',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#0a0a16',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginRight: 16,
  },
  backButtonText: {
    color: '#00FFCC',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 11,
    color: '#a0aec0',
    marginTop: 1,
  },
  workspace: {
    flex: 1,
    padding: 16,
  },
  workspaceDesktop: {
    flexDirection: 'row',
  },
  workspaceMobile: {
    flexDirection: 'column',
  },
  leftColumn: {
    backgroundColor: '#121226',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
  },
  leftColumnDesktop: {
    width: 320,
    marginRight: 16,
  },
  leftColumnMobile: {
    marginBottom: 16,
    maxHeight: 280,
  },
  rightColumn: {
    flex: 1,
    backgroundColor: '#121226',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    justifyContent: 'space-between',
  },
  rightColumnDesktop: {},
  rightColumnMobile: {
    minHeight: 480,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  scrollList: {
    flex: 1,
  },
  scrollListContent: {
    paddingBottom: 8,
  },
  phraseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  phraseItemActive: {
    backgroundColor: 'rgba(0, 255, 204, 0.08)',
    borderColor: 'rgba(0, 255, 204, 0.25)',
  },
  phraseItemLeft: {
    flex: 1,
    marginRight: 8,
  },
  phraseText: {
    color: '#a0aec0',
    fontSize: 12,
    fontWeight: '600',
  },
  phraseTextActive: {
    color: '#00FFCC',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 4,
  },
  checkIcon: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryBox: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
  },
  summaryTitle: {
    color: '#718096',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  cameraBox: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 250,
  },
  overlayLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 22, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  overlayRecording: {
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
  },
  countdownText: {
    fontSize: 72,
    fontWeight: '800',
    color: '#00FFCC',
  },
  overlaySubText: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  recordingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF3366',
  },
  recordingTimer: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    marginVertical: 10,
  },
  recordingFrames: {
    color: '#a0aec0',
    fontSize: 13,
  },
  savingText: {
    color: '#00FFCC',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  controlsPanel: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  selectedPhraseLabel: {
    fontSize: 10,
    color: '#718096',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  selectedPhraseValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  indicatorActive: {
    backgroundColor: '#00FFCC',
  },
  indicatorInactive: {
    backgroundColor: '#FF3366',
  },
  statusLabel: {
    fontSize: 11,
    color: '#a0aec0',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
  },
  recordBtn: {
    flex: 2,
    height: 48,
    backgroundColor: '#00FFCC',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  recordBtnDisabled: {
    opacity: 0.5,
  },
  recordBtnText: {
    color: '#0a0a16',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteBtn: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(255, 51, 102, 0.1)',
    borderWidth: 1,
    borderColor: '#FF3366',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#FF3366',
    fontSize: 13,
    fontWeight: '700',
  },
});
