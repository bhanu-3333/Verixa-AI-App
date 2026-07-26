/**
 * Verixa AI — Sign Language Dataset Recorder (Text to Sign)
 * UI restyled to match Home screen light blue theme.
 * ALL business logic, backend calls, refs, and state are UNCHANGED.
 */

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
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import SignToTextDetector from '../../components/SignToTextDetector';
import { SignService, FrameHands, StatsResponse } from '../../services/SignService';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Design tokens — mirrors home.tsx ────────────────────────────────────────
const PRIMARY    = '#1A56DB';
const PAGE_BG    = '#E8F2FF';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#0C1E3C';
const TEXT_MID   = '#6B7A8D';
const TEXT_LIGHT = '#A0AEC0';
const ICON_BG    = '#DCE8F8';
const SUCCESS    = '#10B981';
const DANGER     = '#EF4444';
const WARNING    = '#F59E0B';
const BASE_W     = 390;

const BOLD_FONT: any = Platform.select({
  ios:     { fontFamily: 'Helvetica Neue', fontWeight: '700' },
  android: { fontFamily: 'sans-serif', fontWeight: '700' },
  default: { fontFamily: 'Arial, sans-serif', fontWeight: '700' },
});

function scale(size: number, w: number, min: number, max: number) {
  return Math.max(min, Math.min(max, (w / BASE_W) * size));
}

// ─── Category color map ───────────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  Hospital: '#0EA5E9',
  Bank:     '#6366F1',
  General:  '#10B981',
};

// ─── Category icon map (vector, no emoji) ────────────────────────────────────
function CategoryIcon({ category, size }: { category: string; size: number }) {
  const color = CAT_COLOR[category] ?? PRIMARY;
  if (category === 'Hospital')
    return <MaterialCommunityIcons name="hospital-building" size={size} color={color} />;
  if (category === 'Bank')
    return <MaterialCommunityIcons name="bank" size={size} color={color} />;
  return <MaterialCommunityIcons name="chat-outline" size={size} color={color} />;
}

// ---------------------------------------------------------------------------
// Training Phrase Definitions — UNCHANGED
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
  const { width } = useWindowDimensions();
  const insets    = useSafeAreaInsets();
  const hPad      = scale(16, width, 12, 22);

  // ── All original state — UNTOUCHED ────────────────────────────────────────
  const [selectedPhrase, setSelectedPhrase]   = useState<TrainingPhrase | null>(null);
  const [stats, setStats]                     = useState<StatsResponse | null>(null);
  const [loadingStats, setLoadingStats]       = useState(true);
  const [recordingState, setRecordingState]   = useState<'idle' | 'countdown' | 'recording' | 'saving' | 'success'>('idle');
  const [countdown, setCountdown]             = useState<number>(3);
  const [recordingTime, setRecordingTime]     = useState<number>(0);
  const [recordedFrameCount, setRecordedFrameCount] = useState<number>(0);
  const [validFrameCount, setValidFrameCount] = useState<number>(0);
  const [lastSavedMetrics, setLastSavedMetrics] = useState<{ total: number; valid: number; filename: string } | null>(null);
  const [handDetected, setHandDetected]       = useState(false);
  const [leftHandDetected, setLeftHandDetected]   = useState(false);
  const [rightHandDetected, setRightHandDetected] = useState(false);

  const isRecordingRef     = useRef<boolean>(false);
  const recordedFramesRef  = useRef<FrameHands[]>([]);
  const validFrameCountRef = useRef<number>(0);
  const countdownTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── All original logic — UNTOUCHED ───────────────────────────────────────
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await SignService.getStats();
      setStats(res);
    } catch (err) {
      console.warn('[SignTraining] Failed to load stats from backend:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
    return () => {
      isRecordingRef.current = false;
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  const handleHandsDetected = (hands: { leftHand: any[] | null; rightHand: any[] | null }) => {
    const hasLeft  = hands.leftHand  !== null && hands.leftHand.length  > 0;
    const hasRight = hands.rightHand !== null && hands.rightHand.length > 0;
    const hasHand  = hasLeft || hasRight;
    setHandDetected(hasHand);
    setLeftHandDetected(hasLeft);
    setRightHandDetected(hasRight);
    if (isRecordingRef.current) {
      const frame: FrameHands = {
        leftHand:  hands.leftHand  ? hands.leftHand.map((l: any)  => ({ x: l.x, y: l.y, z: l.z })) : null,
        rightHand: hands.rightHand ? hands.rightHand.map((l: any) => ({ x: l.x, y: l.y, z: l.z })) : null,
      };
      recordedFramesRef.current.push(frame);
      if (hasHand) validFrameCountRef.current++;
      setRecordedFrameCount(recordedFramesRef.current.length);
      setValidFrameCount(validFrameCountRef.current);
    }
  };

  const handleHandNotDetected = () => {
    setHandDetected(false); setLeftHandDetected(false); setRightHandDetected(false);
    if (isRecordingRef.current) {
      recordedFramesRef.current.push({ leftHand: null, rightHand: null });
      setRecordedFrameCount(recordedFramesRef.current.length);
      setValidFrameCount(validFrameCountRef.current);
    }
  };

  const startCountdown = () => {
    if (!selectedPhrase) return;
    setRecordingState('countdown'); setCountdown(3); setLastSavedMetrics(null);
    isRecordingRef.current = false;
    recordedFramesRef.current = []; validFrameCountRef.current = 0;
    setRecordedFrameCount(0); setValidFrameCount(0);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(countdownTimerRef.current!); startRecording(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = () => {
    isRecordingRef.current = true;
    recordedFramesRef.current = []; validFrameCountRef.current = 0;
    setRecordedFrameCount(0); setValidFrameCount(0); setRecordingTime(0);
    setRecordingState('recording');
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    recordTimerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= 4.9) { clearInterval(recordTimerRef.current!); stopAndSaveRecording(); return 5.0; }
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
    const totalValid    = validFrameCountRef.current;
    const ratio         = totalCaptured > 0 ? totalValid / totalCaptured : 0;
    if (totalCaptured === 0) {
      alert('No frames captured. Please check camera access and keep your hands visible.');
      setRecordingState('idle'); return;
    }
    if (totalValid < 15 || ratio < 0.70) {
      alert(`Recording quality is too low.\n\nValid Hand Ratio: ${(ratio * 100).toFixed(1)}% (Minimum required: 70%)\nValid Frames: ${totalValid} (Minimum required: 15)\n\nPlease keep your hands clearly visible in front of the camera and record again.`);
      setRecordingState('idle'); return;
    }
    try {
      const response = await SignService.recordSample(selectedPhrase!.label, recordedFramesRef.current);
      setLastSavedMetrics({ total: totalCaptured, valid: totalValid, filename: response.filename || 'sample.json' });
      setRecordingState('success');
      await fetchStats();
    } catch (err: any) {
      alert(`Failed to save sample: ${err.message}`);
      setRecordingState('idle');
    }
  };

  const getPhraseCount    = (label: string) => !stats?.phrase_stats ? 0 : (stats.phrase_stats[label] || stats.phrase_stats[label.toUpperCase()] || 0);
  const getReadyPhrasesCount = () => TRAINING_PHRASES.filter((p) => getPhraseCount(p.label) >= 50).length;
  const getProgressColor  = (count: number) => count >= 100 ? SUCCESS : count >= 50 ? PRIMARY : WARNING;

  // ── RENDER: Phrase Recording Interface ─────────────────────────────────────
  if (selectedPhrase) {
    const currentSampleCount = getPhraseCount(selectedPhrase.label);
    const catColor = CAT_COLOR[selectedPhrase.category] ?? PRIMARY;

    return (
      <SafeAreaView style={S.safeArea}>
        {/* Header */}
        <View style={[S.header, { paddingTop: insets.top + 4, paddingHorizontal: hPad }]}>
          <TouchableOpacity
            style={S.backBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => {
              if (recordTimerRef.current) clearInterval(recordTimerRef.current);
              if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
              isRecordingRef.current = false;
              setRecordingState('idle');
              setSelectedPhrase(null);
            }}
          >
            <Feather name="arrow-left" size={scale(20, width, 18, 24)} color={PRIMARY} />
          </TouchableOpacity>
          <View style={S.headerText}>
            <Text style={[S.headerTitle, { fontSize: scale(17, width, 14, 20) }]}>
              {selectedPhrase.category}: Recording
            </Text>
            <Text style={[S.headerSub, { fontSize: scale(12, width, 10, 14) }]}>
              Label: {selectedPhrase.label}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[S.scrollContent, { paddingHorizontal: hPad }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Phrase Detail Card */}
          <View style={S.card}>
            <View style={S.cardHeaderRow}>
              <View style={[S.catChip, { backgroundColor: catColor + '18', borderColor: catColor + '40' }]}>
                <CategoryIcon category={selectedPhrase.category} size={13} />
                <Text style={[S.catChipText, { color: catColor, marginLeft: 5 }]}>
                  {selectedPhrase.category.toUpperCase()}
                </Text>
              </View>
              <View style={S.samplePill}>
                <Text style={[S.samplePillText, { color: getProgressColor(currentSampleCount) }]}>
                  {currentSampleCount} / 50 samples
                </Text>
              </View>
            </View>

            <Text style={[S.phraseDisplay, { fontSize: scale(18, width, 15, 22) }]}>
              "{selectedPhrase.display}"
            </Text>

            <View style={S.divider} />

            <Text style={[S.instructionHeading, { fontSize: scale(12, width, 11, 14) }]}>
              Recording Instructions
            </Text>
            {[
              'Position yourself clearly in front of the camera.',
              'Keep your upper body and both hands visible.',
              'Press Start Recording & perform the complete sign naturally.',
              'Press Stop when finished (or auto-stop after 5 seconds).',
            ].map((step, i) => (
              <View key={i} style={S.instructionRow}>
                <View style={S.stepBubble}><Text style={S.stepNum}>{i + 1}</Text></View>
                <Text style={[S.instructionText, { fontSize: scale(12, width, 11, 14) }]}>{step}</Text>
              </View>
            ))}

            <View style={S.tipBox}>
              <Ionicons name="bulb-outline" size={14} color={WARNING} style={{ marginRight: 6 }} />
              <Text style={[S.tipText, { fontSize: scale(12, width, 11, 13) }]}>
                Slightly vary your signing speed, hand position, and distance between recordings.
              </Text>
            </View>
          </View>

          {/* Camera Feed */}
          <View style={S.cameraBox}>
            <SignToTextDetector
              onHandsDetected={handleHandsDetected}
              onHandNotDetected={handleHandNotDetected}
            />

            {recordingState === 'countdown' && (
              <View style={S.overlay}>
                <Text style={S.countdownNum}>{countdown}</Text>
                <Text style={S.overlaySubText}>GET READY TO SIGN...</Text>
              </View>
            )}

            {recordingState === 'recording' && (
              <View style={[S.overlay, S.overlayRecording]}>
                <View style={S.recDot} />
                <Text style={S.recordingLabel}>RECORDING</Text>
                <Text style={S.recordingTimer}>{recordingTime.toFixed(1)}s / 5.0s</Text>
                <Text style={[S.recordingFrames, { fontSize: scale(13, width, 11, 15) }]}>
                  Frames: {recordedFrameCount}  |  Valid: {validFrameCount}
                </Text>
              </View>
            )}

            {recordingState === 'saving' && (
              <View style={S.overlay}>
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text style={S.savingText}>Validating & saving sequence...</Text>
              </View>
            )}

            {recordingState === 'success' && lastSavedMetrics && (
              <View style={[S.overlay, S.overlaySuccess]}>
                <View style={S.successCircle}>
                  <Feather name="check" size={36} color="#fff" />
                </View>
                <Text style={S.successTitle}>Sample Saved!</Text>
                <Text style={[S.successMeta, { fontSize: scale(13, width, 11, 15) }]}>
                  {lastSavedMetrics.total} frames  |  {lastSavedMetrics.valid} valid
                </Text>
                <Text style={[S.successFile, { fontSize: scale(11, width, 10, 13) }]}>
                  {lastSavedMetrics.filename}
                </Text>
              </View>
            )}
          </View>

          {/* Status Badges */}
          <View style={S.statusRow}>
            {[
              { label: 'Camera',       value: 'Ready',              ok: true },
              { label: 'Hand',         value: handDetected ? 'Detected' : 'Waiting...', ok: handDetected },
              { label: 'Pose',         value: 'Detected',           ok: true },
              { label: 'Frames',       value: String(recordedFrameCount), ok: true, highlight: true },
            ].map((b, i) => (
              <View key={i} style={S.statusBadge}>
                <Text style={[S.statusLabel, { fontSize: scale(10, width, 9, 12) }]}>{b.label}</Text>
                <Text style={[
                  S.statusValue,
                  { fontSize: scale(12, width, 11, 14) },
                  b.highlight ? { color: PRIMARY } : b.ok ? { color: SUCCESS } : { color: WARNING },
                ]}>
                  {b.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={S.actionArea}>
            {recordingState === 'idle' && (
              <TouchableOpacity style={[S.btnPrimary]} onPress={startCountdown} activeOpacity={0.85}>
                <MaterialCommunityIcons name="record-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[S.btnPrimaryText, { fontSize: scale(15, width, 13, 17) }]}>Start Recording</Text>
              </TouchableOpacity>
            )}

            {recordingState === 'recording' && (
              <TouchableOpacity style={S.btnStop} onPress={manualStopRecording} activeOpacity={0.85}>
                <MaterialCommunityIcons name="stop-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[S.btnPrimaryText, { fontSize: scale(15, width, 13, 17) }]}>Stop & Save Sample</Text>
              </TouchableOpacity>
            )}

            {recordingState === 'success' && (
              <View style={{ gap: 12 }}>
                <TouchableOpacity style={S.btnPrimary} onPress={startCountdown} activeOpacity={0.85}>
                  <MaterialCommunityIcons name="refresh" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={[S.btnPrimaryText, { fontSize: scale(15, width, 13, 17) }]}>Record Another Sample</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.btnSecondary} onPress={() => { setRecordingState('idle'); setSelectedPhrase(null); }} activeOpacity={0.85}>
                  <Text style={[S.btnSecondaryText, { fontSize: scale(14, width, 12, 16) }]}>Back to Phrases</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── RENDER: Phrase Selection List ──────────────────────────────────────────
  const readyCount = getReadyPhrasesCount();

  return (
    <SafeAreaView style={S.safeArea}>
      {/* Header */}
      <View style={[S.header, { paddingTop: insets.top + 4, paddingHorizontal: hPad }]}>
        <TouchableOpacity
          style={S.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => router.replace('/')}
        >
          <Feather name="arrow-left" size={scale(20, width, 18, 24)} color={PRIMARY} />
        </TouchableOpacity>
        <View style={S.headerText}>
          <Text style={[S.headerTitle, { fontSize: scale(17, width, 14, 20) }]}>
            Sign Language Dataset Recorder
          </Text>
          <Text style={[S.headerSub, { fontSize: scale(12, width, 10, 14) }]}>
            Training Progress: {readyCount} / 4 phrases ready
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[S.scrollContent, { paddingHorizontal: hPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={S.card}>
          <View style={S.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={[S.summaryTitle, { fontSize: scale(15, width, 13, 17) }]}>
                Dataset Collection Target
              </Text>
              <Text style={[S.summaryDesc, { fontSize: scale(12, width, 11, 14) }]}>
                Collect 50–100 sequence samples for each of the 4 core sentence classes to enable LSTM model training.
              </Text>
            </View>
            {stats && (
              <View style={S.totalBadge}>
                <Text style={[S.totalNum, { fontSize: scale(22, width, 18, 26) }]}>
                  {stats.total_samples}
                </Text>
                <Text style={[S.totalLabel, { fontSize: scale(10, width, 9, 12) }]}>
                  Total{'\n'}Samples
                </Text>
              </View>
            )}
          </View>

          {/* Progress bar */}
          <View style={S.progressBarTrack}>
            <View style={[S.progressBarFill, { width: `${Math.min((readyCount / 4) * 100, 100)}%` as any }]} />
          </View>
          <Text style={[S.progressBarLabel, { fontSize: scale(11, width, 10, 13) }]}>
            {readyCount} of 4 phrases ready (50+ samples each)
          </Text>
        </View>

        {/* Phrase Cards */}
        <View style={{ gap: scale(14, width, 10, 18) }}>
          {TRAINING_PHRASES.map((phraseItem) => {
            const count     = getPhraseCount(phraseItem.label);
            const targetMet = count >= 50;
            const catColor  = CAT_COLOR[phraseItem.category] ?? PRIMARY;
            const pct       = Math.min((count / 50) * 100, 100);

            return (
              <View key={phraseItem.id} style={S.phraseCard}>
                {/* Top row: category chip + ready badge */}
                <View style={S.cardHeaderRow}>
                  <View style={[S.catChip, { backgroundColor: catColor + '18', borderColor: catColor + '40' }]}>
                    <CategoryIcon category={phraseItem.category} size={13} />
                    <Text style={[S.catChipText, { color: catColor, marginLeft: 5 }]}>
                      {phraseItem.category.toUpperCase()}
                    </Text>
                  </View>
                  {targetMet && (
                    <View style={S.readyBadge}>
                      <Feather name="check-circle" size={12} color={SUCCESS} style={{ marginRight: 4 }} />
                      <Text style={S.readyText}>READY</Text>
                    </View>
                  )}
                </View>

                {/* Phrase text */}
                <Text style={[S.phraseDisplay, { fontSize: scale(16, width, 14, 19) }]}>
                  "{phraseItem.display}"
                </Text>
                <Text style={[S.phraseLabel, { fontSize: scale(11, width, 10, 13) }]}>
                  Label: {phraseItem.label}
                </Text>

                {/* Mini progress bar */}
                <View style={S.miniTrack}>
                  <View style={[S.miniFill, { width: `${pct}%` as any, backgroundColor: getProgressColor(count) }]} />
                </View>

                {/* Footer: count + button */}
                <View style={S.cardFooter}>
                  <Text style={[S.countText, { fontSize: scale(14, width, 12, 16), color: getProgressColor(count) }]}>
                    {count} / 50 samples
                  </Text>
                  <TouchableOpacity
                    style={S.trainBtn}
                    onPress={() => { setSelectedPhrase(phraseItem); setRecordingState('idle'); }}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons name="play-circle" size={15} color="#fff" style={{ marginRight: 5 }} />
                    <Text style={[S.trainBtnText, { fontSize: scale(13, width, 11, 15) }]}>Train this phrase</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// StyleSheet — light blue home theme
// ---------------------------------------------------------------------------

const S = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: PAGE_BG },
  scrollContent: { paddingTop: 20, paddingBottom: 40 },

  // Header
  header: {
    backgroundColor:  CARD_BG,
    flexDirection:    'row',
    alignItems:       'center',
    paddingBottom:    14,
    borderBottomWidth: 1,
    borderBottomColor: '#E0ECF8',
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 2 },
    shadowOpacity:    0.06,
    shadowRadius:     6,
    elevation:        4,
  },
  backBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: ICON_BG,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     12,
    flexShrink:      0,
  },
  headerText:  { flex: 1 },
  headerTitle: { color: TEXT_DARK, ...BOLD_FONT },
  headerSub:   { color: TEXT_MID, marginTop: 2 },

  // Shared card
  card: {
    backgroundColor: CARD_BG,
    borderRadius:    20,
    padding:         16,
    marginBottom:    16,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.04,
    shadowRadius:    6,
    elevation:       2,
  },

  // Summary card
  summaryRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  summaryTitle: { color: TEXT_DARK, ...BOLD_FONT, marginBottom: 6 },
  summaryDesc:  { color: TEXT_MID, lineHeight: 19 },
  totalBadge: {
    backgroundColor: ICON_BG,
    borderRadius:    14,
    padding:         12,
    alignItems:      'center',
    minWidth:        64,
  },
  totalNum:    { color: PRIMARY, ...BOLD_FONT },
  totalLabel:  { color: TEXT_MID, textAlign: 'center', marginTop: 2 },
  progressBarTrack: {
    height:          8,
    backgroundColor: '#E0ECF8',
    borderRadius:    4,
    overflow:        'hidden',
    marginBottom:    6,
  },
  progressBarFill: {
    height:          '100%',
    backgroundColor: PRIMARY,
    borderRadius:    4,
  },
  progressBarLabel: { color: TEXT_LIGHT },

  // Category chip
  catChip: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      12,
    borderWidth:       1,
  },
  catChipText: { fontWeight: '700', letterSpacing: 0.6 },

  // Ready badge
  readyBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: SUCCESS + '18',
    borderRadius:    10,
    paddingHorizontal: 8,
    paddingVertical:  4,
    borderWidth:     1,
    borderColor:     SUCCESS + '40',
  },
  readyText: { color: SUCCESS, fontSize: 11, fontWeight: '700' },

  // Phrase card
  phraseCard: {
    backgroundColor: CARD_BG,
    borderRadius:    20,
    padding:         16,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.04,
    shadowRadius:    6,
    elevation:       2,
  },
  cardHeaderRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   10,
  },
  phraseDisplay: { color: TEXT_DARK, ...BOLD_FONT, marginBottom: 4 },
  phraseLabel:   { color: TEXT_LIGHT, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 10 },
  miniTrack: {
    height:          5,
    backgroundColor: '#E0ECF8',
    borderRadius:    3,
    overflow:        'hidden',
    marginBottom:    12,
  },
  miniFill:  { height: '100%', borderRadius: 3 },
  cardFooter: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingTop:     10,
    borderTopWidth: 1,
    borderTopColor: '#EFF5FC',
  },
  countText: { ...BOLD_FONT },
  trainBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderRadius:    12,
    shadowColor:     PRIMARY,
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.25,
    shadowRadius:    6,
    elevation:       3,
  },
  trainBtnText: { color: '#fff', fontWeight: '700' },

  // Phrase detail (recorder view)
  divider:    { height: 1, backgroundColor: '#EFF5FC', marginVertical: 12 },
  instructionHeading: { color: TEXT_MID, fontWeight: '700', letterSpacing: 0.4, marginBottom: 8 },
  instructionRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  stepBubble: {
    width:           22, height: 22, borderRadius: 11,
    backgroundColor: ICON_BG,
    alignItems:      'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNum:        { color: PRIMARY, fontSize: 11, fontWeight: '700' },
  instructionText: { color: TEXT_MID, flex: 1, lineHeight: 18 },
  tipBox: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: WARNING + '14',
    borderRadius:    10,
    padding:         10,
    marginTop:       8,
    borderWidth:     1,
    borderColor:     WARNING + '30',
  },
  tipText: { color: '#92400E', flex: 1, lineHeight: 18 },
  samplePill: {
    backgroundColor: ICON_BG,
    borderRadius:    10,
    paddingHorizontal: 10,
    paddingVertical:  4,
  },
  samplePillText: { fontWeight: '700' },

  // Camera box
  cameraBox: {
    height:          360,
    borderRadius:    20,
    overflow:        'hidden',
    backgroundColor: '#000',
    position:        'relative',
    marginBottom:    14,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.08,
    shadowRadius:    8,
    elevation:       3,
  },

  // Overlays
  overlay: {
    position:        'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.90)',
    justifyContent:  'center',
    alignItems:      'center',
    zIndex:          25,
    gap:             8,
  },
  overlayRecording: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth:     2,
    borderColor:     DANGER,
  },
  overlaySuccess: {
    backgroundColor: 'rgba(16,185,129,0.92)',
  },
  countdownNum:    { color: PRIMARY, fontSize: 80, ...BOLD_FONT },
  overlaySubText:  { color: TEXT_DARK, fontSize: 15, fontWeight: '700' },
  recDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: DANGER,
  },
  recordingLabel:  { color: DANGER, fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  recordingTimer:  { color: TEXT_DARK, fontSize: 30, fontWeight: '700' },
  recordingFrames: { color: TEXT_MID },
  savingText:      { color: TEXT_DARK, fontSize: 14, fontWeight: '600', marginTop: 8 },
  successCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6,
  },
  successTitle:  { color: '#fff', fontSize: 20, fontWeight: '800' },
  successMeta:   { color: 'rgba(255,255,255,0.90)', fontWeight: '600' },
  successFile:   { color: 'rgba(255,255,255,0.75)', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  // Status badges
  statusRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
    marginBottom:  14,
  },
  statusBadge: {
    flex:            1,
    minWidth:        130,
    backgroundColor: CARD_BG,
    borderRadius:    14,
    padding:         12,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.04,
    shadowRadius:    4,
    elevation:       1,
  },
  statusLabel: { color: TEXT_LIGHT, fontWeight: '600', marginBottom: 4 },
  statusValue: { fontWeight: '700' },

  // Action buttons
  actionArea: { marginBottom: 8 },
  btnPrimary: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: PRIMARY,
    paddingVertical: 15,
    borderRadius:    14,
    shadowColor:     PRIMARY,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.30,
    shadowRadius:    8,
    elevation:       4,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnStop: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: DANGER,
    paddingVertical: 15,
    borderRadius:    14,
    shadowColor:     DANGER,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.25,
    shadowRadius:    8,
    elevation:       3,
  },
  btnSecondary: {
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: ICON_BG,
    paddingVertical: 14,
    borderRadius:    14,
    borderWidth:     1.5,
    borderColor:     '#C5D8F0',
  },
  btnSecondaryText: { color: TEXT_DARK, fontWeight: '700' },
});
