/**
 * Verixa AI — Sign Language to Text Screen
 * Camera Demo Mode — live video preview + simulated 2-second recognition
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import SpeechService from '../../services/SpeechService';
import { useLanguage } from '../../components/LanguageProvider';
import SignToTextDetector from '../../components/SignToTextDetector';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PHRASES = [
  "CAN_YOU_HELP_ME",
  "CAN_YOU_CONVEY_THIS_MESSAGE"
];

// Helper to convert phrase to localization key
const getLocKey = (phrase: string): string => {
  const clean = phrase.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
  return `phrase_${clean}`;
};

export default function SignToTextScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { t } = useLanguage();

  // ── Demo state ──
  const [detected, setDetected] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [stablePhrase, setStablePhrase] = useState<string | null>(null);
  const [predictionMessage, setPredictionMessage] = useState<string>('Ready');
  const [sentence, setSentence] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [btnText, setBtnText] = useState('Recognize Sign');

  // Clear states when screen mounts/resets
  useEffect(() => {
    setDetected(false);
    setIsPredicting(false);
    setStablePhrase(null);
    setPredictionMessage('Ready');
    setSentence([]);
    setTranscript([]);
    setBtnText('Recognize Sign');
  }, []);

  // ── Demo Recognition: 2-second simulated recognition ──
  const handleDemoRecognize = () => {
    if (isPredicting) return;

    setIsPredicting(true);
    setDetected(false);
    setStablePhrase(null);
    setPredictionMessage('Recognizing Sign...');

    setTimeout(() => {
      const phrases = ['CAN_YOU_HELP_ME', 'CAN_YOU_CONVEY_THIS_MESSAGE'];
      const chosen = phrases[Math.floor(Math.random() * phrases.length)];
      const phraseText = t(getLocKey(chosen));

      setDetected(true);
      setStablePhrase(chosen);
      setPredictionMessage('✅ SIGN RECOGNIZED');
      setSentence((prev) => [...prev, phraseText]);
      setTranscript((prev) => [phraseText, ...prev].slice(0, 30));

      if (autoSpeak) {
        SpeechService.speak(phraseText);
      }

      setIsPredicting(false);
      setBtnText('Try Again');
    }, 2000);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text.trimEnd());
    } catch (err) {
      console.warn('[Clipboard] setStringAsync failed:', err);
    }
  };

  const clearTranscriptOnly = () => setTranscript([]);

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color="#1A56DB" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Sign Language Translator</Text>
          <Text style={styles.headerSub}>Real-time Sign Language to Text</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* ── Workspace ── */}
        <View style={[styles.workspace, isMobile ? styles.workspaceMobile : styles.workspaceDesktop]}>

          {/* ── Left Column: Camera, Instruction, Button & Live Transcript ── */}
          <View style={[styles.leftColumn, isMobile ? styles.leftColumnMobile : styles.leftColumnDesktop]}>
            <View style={styles.cameraPanel}>
              <SignToTextDetector />
            </View>

            {/* Instruction Below Camera */}
            <Text style={styles.instructionText}>
              🖐️ Perform your sign. When finished press Recognize Sign
            </Text>

            {/* Recognize Sign Button — Placed close to camera */}
            <TouchableOpacity
              style={[styles.recognizeDemoBtn, isPredicting && styles.btnDisabled]}
              onPress={handleDemoRecognize}
              disabled={isPredicting}
              activeOpacity={0.85}
            >
              {isPredicting ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.recognizeDemoBtnText}>Recognizing Sign...</Text>
                </>
              ) : (
                <Text style={styles.recognizeDemoBtnText}>{btnText}</Text>
              )}
            </TouchableOpacity>

            {/* Live Transcript History (Below Camera & Button) */}
            <View style={styles.transcriptBox}>
              <View style={styles.transcriptHeader}>
                <Text style={styles.transcriptTitle}>Live Transcript History</Text>
                {transcript.length > 0 && (
                  <TouchableOpacity onPress={clearTranscriptOnly}>
                    <Text style={styles.clearBtn}>Clear History</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView
                style={styles.transcriptScroll}
                contentContainerStyle={styles.transcriptContent}
                nestedScrollEnabled={true}
              >
                {transcript.length === 0 ? (
                  <Text style={styles.transcriptEmpty}>No gestures tracked yet.</Text>
                ) : (
                  <View style={styles.transcriptList}>
                    {transcript.map((item, idx) => (
                      <View key={idx} style={styles.transcriptItemRow}>
                        <Text style={styles.transcriptBullet}>•</Text>
                        <Text style={styles.transcriptItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>

          {/* ── Right Column: Recognition Card & Controls ── */}
          <View style={[styles.dataPanel, isMobile ? styles.dataPanelMobile : styles.dataPanelDesktop]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  isPredicting ? styles.badgePredicting : detected ? styles.badgeActive : styles.badgeInactive,
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {isPredicting ? 'RECOGNIZING SIGN...' : detected ? 'SIGN RECOGNIZED' : 'READY'}
                </Text>
              </View>
            </View>

            {/* ── Top Recognition Card (Reduced height by ~50%, centered text) ── */}
            <View style={styles.wordCard}>
              {stablePhrase ? (
                <>
                  <Text style={styles.wordCardLabel}>✅ SIGN RECOGNIZED</Text>
                  <Text style={styles.wordCardWord}>{t(getLocKey(stablePhrase))}</Text>
                </>
              ) : (
                <Text style={styles.wordCardPlaceholder}>
                  {predictionMessage || 'Ready for sign...'}
                </Text>
              )}
            </View>

            {/* Sentence Builder Section */}
            <View style={styles.sentenceSection}>
              <Text style={styles.sectionTitle}>Committed Phrases</Text>
              <View style={styles.sentenceBox}>
                <Text style={sentence.length > 0 ? styles.sentenceText : styles.sentencePlaceholder}>
                  {sentence.length > 0 ? sentence.join(' ') : 'Committed gestures will construct a sentence...'}
                </Text>
              </View>

              {/* Auto Speak Toggle Option */}
              <TouchableOpacity
                style={[styles.toggleAutoSpeakBtn, autoSpeak && styles.toggleAutoSpeakBtnActive]}
                onPress={() => setAutoSpeak(!autoSpeak)}
              >
                <Text style={[styles.toggleAutoSpeakBtnText, autoSpeak && styles.toggleAutoSpeakBtnTextActive]}>
                  {autoSpeak ? '🔊 Auto Speak: ENABLED' : '🔈 Auto Speak: DISABLED'}
                </Text>
              </TouchableOpacity>

              {/* Controls Grid */}
              <View style={styles.controlsGrid}>
                <TouchableOpacity
                  style={[styles.controlButton, styles.speakAllBtn]}
                  onPress={() => sentence.length > 0 && SpeechService.speak(sentence.join(' '))}
                  disabled={sentence.length === 0}
                >
                  <Text style={[styles.controlButtonText, styles.speakAllBtnText]}>🔊 Speak All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, styles.copyBtn]}
                  onPress={() => sentence.length > 0 && copyToClipboard(sentence.join(' '))}
                  disabled={sentence.length === 0}
                >
                  <Text style={styles.controlButtonText}>📋 Copy Text</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, styles.backspaceBtn]}
                  onPress={() => setSentence((prev) => prev.slice(0, -1))}
                  disabled={sentence.length === 0}
                >
                  <Text style={styles.controlButtonText}>⌫ Backspace</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, styles.clearBtnColor]}
                  onPress={() => { setSentence([]); setStablePhrase(null); setDetected(false); }}
                  disabled={sentence.length === 0}
                >
                  <Text style={styles.controlButtonText}>🗑️ Clear All</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Legend list of Phrases */}
            <View style={styles.legend}>
              <Text style={styles.legendTitle}>Supported Sign Phrases</Text>
              <ScrollView
                horizontal={false}
                contentContainerStyle={styles.legendGrid}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                style={styles.legendScroll}
              >
                {PHRASES.map((phrase) => (
                  <View key={phrase} style={styles.legendChip}>
                    <Text style={styles.legendChipText}>{t(getLocKey(phrase))}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


// ---------------------------------------------------------------------------
// Styles — Compact Translator App Theme
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8F2FF',
  },
  scrollContainer: {
    padding: 12,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0ECF8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCE8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  headerTextContainer: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0C1E3C',
  },
  headerSub: {
    fontSize: 11,
    color: '#6B7A8D',
    marginTop: 1,
  },
  workspace: {
    flex: 1,
    gap: 12,
  },
  workspaceMobile: {
    flexDirection: 'column',
  },
  workspaceDesktop: {
    flexDirection: 'row',
  },
  leftColumn: {
    gap: 8,
  },
  leftColumnMobile: {
    width: '100%',
  },
  leftColumnDesktop: {
    flex: 1.2,
  },
  instructionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7A8D',
    textAlign: 'center',
    marginVertical: 2,
  },
  dataPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#C5D8F0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  dataPanelMobile: {
    width: '100%',
  },
  dataPanelDesktop: {
    flex: 0.8,
  },
  cameraPanel: {
    width: '100%',
    aspectRatio: 4 / 3,
    alignSelf: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#C5D8F0',
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0ECF8',
    paddingBottom: 8,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0C1E3C',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgeActive: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  badgePredicting: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  badgeInactive: {
    backgroundColor: '#DCE8F8',
    borderWidth: 1,
    borderColor: '#C5D8F0',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#0C1E3C',
  },
  /* ── Reduced top white recognition card height by ~50%, centered text ── */
  wordCard: {
    backgroundColor: '#E8F2FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C5D8F0',
    minHeight: 44,
  },
  wordCardLabel: {
    fontSize: 10,
    color: '#10B981',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '800',
    textAlign: 'center',
  },
  wordCardWord: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A56DB',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  wordCardPlaceholder: {
    fontSize: 13,
    color: '#6B7A8D',
    textAlign: 'center',
    fontWeight: '600',
  },
  transcriptBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#C5D8F0',
    flex: 1,
    minHeight: 110,
    maxHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0ECF8',
    paddingBottom: 6,
    marginBottom: 6,
  },
  transcriptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0C1E3C',
  },
  clearBtn: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptContent: {
    paddingBottom: 6,
  },
  transcriptEmpty: {
    fontSize: 12,
    color: '#6B7A8D',
    fontStyle: 'italic',
  },
  transcriptList: {
    gap: 4,
  },
  transcriptItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  transcriptBullet: {
    color: '#1A56DB',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  transcriptItemText: {
    fontSize: 13,
    color: '#0C1E3C',
    fontWeight: '500',
    lineHeight: 18,
  },
  sentenceSection: {
    backgroundColor: '#E8F2FF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#C5D8F0',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7A8D',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sentenceBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C5D8F0',
    borderRadius: 10,
    padding: 10,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentenceText: {
    fontSize: 15,
    color: '#1A56DB',
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  sentencePlaceholder: {
    fontSize: 12,
    color: '#A0AEC0',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  toggleAutoSpeakBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C5D8F0',
    alignItems: 'center',
  },
  toggleAutoSpeakBtnActive: {
    backgroundColor: '#DCE8F8',
    borderColor: '#1A56DB',
  },
  toggleAutoSpeakBtnText: {
    fontSize: 11,
    color: '#6B7A8D',
    fontWeight: '600',
  },
  toggleAutoSpeakBtnTextActive: {
    color: '#1A56DB',
    fontWeight: '700',
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  controlButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  controlButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0C1E3C',
  },
  speakAllBtn: {
    backgroundColor: '#1A56DB',
    borderColor: '#1A56DB',
  },
  speakAllBtnText: {
    color: '#FFFFFF',
  },
  copyBtn: {
    backgroundColor: '#DCE8F8',
    borderColor: '#C5D8F0',
  },
  backspaceBtn: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  clearBtnColor: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  legend: {
    gap: 6,
    flex: 1,
    minHeight: 60,
  },
  legendTitle: {
    fontSize: 10,
    color: '#6B7A8D',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  legendScroll: {
    flex: 1,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingBottom: 6,
  },
  legendChip: {
    backgroundColor: '#DCE8F8',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#C5D8F0',
  },
  legendChipText: {
    fontSize: 12,
    color: '#0C1E3C',
    fontWeight: '600',
  },
  recognizeDemoBtn: {
    backgroundColor: '#1A56DB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 2,
  },
  recognizeDemoBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    backgroundColor: '#A0AEC0',
    shadowOpacity: 0,
    elevation: 0,
  },
});

