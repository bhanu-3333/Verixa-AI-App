/**
 * Verixa AI — Sign Language to Text Screen
 * Milestone 2: Gesture Recognition + Speech Output
 * Phase 2: Alphabet Recognition (A–Z subset)
 *
 * Data flow (Phrase mode):
 *   MediaPipe detector → 21 landmarks → GestureRecognizer → word → sentence
 *
 * Data flow (Alphabet mode):
 *   MediaPipe detector → 21 landmarks → AlphabetRecognizer → letter → currentWord → wordHistory
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import SignToTextDetector from '../../components/SignToTextDetector';
import { recognizeAlphabet, getWordSuggestion } from '../../services/AlphabetRecognizer';
import { recognizeGesture, getSupportedGestures, type GestureResult } from '../../services/GestureRecognizer';
import SpeechService from '../../services/SpeechService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How long (ms) a gesture must be held continuously before it fires */
const HOLD_DURATION_MS = 800;

/** Minimum confidence to accept an alphabet letter */
const ALPHABET_CONFIDENCE_THRESHOLD = 0.70;

/** Maximum word history entries */
const MAX_WORD_HISTORY = 20;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SignToTextScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  // ── Shared state ──
  const [detected, setDetected] = useState(false);
  const [mode, setMode] = useState<'phrase' | 'alphabet'>('phrase');

  // ── Phrase mode state ──
  const [currentGesture, setCurrentGesture] = useState<GestureResult | null>(null);
  const [confirmedWord, setConfirmedWord] = useState<string | null>(null);
  const [sentence, setSentence] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<string[]>([]);

  // ── Alphabet mode state ──
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [currentLetterConfidence, setCurrentLetterConfidence] = useState<number>(0);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [wordHistory, setWordHistory] = useState<string[]>([]);
  const suggestion = getWordSuggestion(currentWord);

  // ── Refs for hold-timer and duplicate prevention ──
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCandidateRef = useRef<string | null>(null);
  const lastConfirmedRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text.trimEnd());
    } catch (err) {
      console.warn('[Clipboard] setStringAsync failed:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // Camera callbacks
  // ---------------------------------------------------------------------------

  const handleHandDetected = useCallback((landmarks: any[]) => {
    setDetected(true);

    if (mode === 'phrase') {
      // ── Phrase mode: use GestureRecognizer ──
      const result = recognizeGesture(landmarks);
      setCurrentGesture(result);
      const candidate = result.word;

      if (candidate) {
        if (candidate !== lastCandidateRef.current) {
          if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
          lastCandidateRef.current = candidate;

          if (candidate !== lastConfirmedRef.current) {
            holdTimerRef.current = setTimeout(() => {
              setConfirmedWord(candidate);
              setSentence((prev) => [...prev, candidate]);
              setTranscript((prev) => [candidate, ...prev].slice(0, 30));
              lastConfirmedRef.current = candidate;
            }, HOLD_DURATION_MS);
          }
        }
      } else {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        lastCandidateRef.current = null;
        lastConfirmedRef.current = null;
      }
    } else {
      // ── Alphabet mode: use AlphabetRecognizer ──
      const { letter, confidence } = recognizeAlphabet(landmarks);
      setCurrentLetter(letter);
      setCurrentLetterConfidence(confidence);
      setCurrentGesture(null);

      const candidate = confidence >= ALPHABET_CONFIDENCE_THRESHOLD ? letter : null;

      if (candidate) {
        if (candidate !== lastCandidateRef.current) {
          if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
          lastCandidateRef.current = candidate;

          if (candidate !== lastConfirmedRef.current) {
            holdTimerRef.current = setTimeout(() => {
              setCurrentWord((prev) => prev + candidate);
              lastConfirmedRef.current = candidate;
            }, HOLD_DURATION_MS);
          }
        }
      } else {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        lastCandidateRef.current = null;
        // Do NOT reset lastConfirmedRef.current when confidence drops while hand is still visible
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleHandNotDetected = useCallback(() => {
    setDetected(false);
    setCurrentGesture(null);
    setCurrentLetter(null);
    setCurrentLetterConfidence(0);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    lastCandidateRef.current = null;
    lastConfirmedRef.current = null;
  }, []);

  // ---------------------------------------------------------------------------
  // Phrase mode controls
  // ---------------------------------------------------------------------------

  const clearTranscriptOnly = () => setTranscript([]);

  const supportedGestures = getSupportedGestures();
  const confidencePct = currentGesture ? Math.round(currentGesture.confidence * 100) : 0;

  // ---------------------------------------------------------------------------
  // Alphabet mode controls
  // ---------------------------------------------------------------------------

  const alphabetBackspace = () =>
    setCurrentWord((prev) => prev.slice(0, -1));

  const alphabetClear = () =>
    setCurrentWord('');

  const alphabetAddWord = () => {
    const trimmed = currentWord.trim();
    if (!trimmed) return;
    setWordHistory((prev) => [trimmed, ...prev].slice(0, MAX_WORD_HISTORY));
    setCurrentWord('');
  };

  const alphabetCopy = () => copyToClipboard(currentWord);

  const alphabetSpeak = () => {
    if (currentWord.trim()) SpeechService.speak(currentWord.trim());
  };

  const alphabetSpace = () => setCurrentWord((prev) => prev + ' ');

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Sign to Text</Text>
            <Text style={styles.headerSub}>Milestone 2 — Gesture Recognition & Sentence Builder</Text>
          </View>
        </View>

        {/* ── Mode Toggle ── */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'phrase' && styles.toggleButtonActive]}
            onPress={() => setMode('phrase')}
          >
            <Text style={[styles.toggleButtonText, mode === 'phrase' && styles.toggleButtonTextActive]}>
              Phrase
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'alphabet' && styles.toggleButtonActive]}
            onPress={() => setMode('alphabet')}
          >
            <Text style={[styles.toggleButtonText, mode === 'alphabet' && styles.toggleButtonTextActive]}>
              Alphabet
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Workspace ── */}
        <View style={[styles.workspace, isMobile ? styles.workspaceMobile : styles.workspaceDesktop]}>

          {/* ── Left Column: Camera & Live Transcript ── */}
          <View style={[styles.leftColumn, isMobile ? styles.leftColumnMobile : styles.leftColumnDesktop]}>
            <View style={styles.cameraPanel}>
              <SignToTextDetector
                onHandDetected={handleHandDetected}
                onHandNotDetected={handleHandNotDetected}
              />

              {/* Overlay: Phrase mode — gesture name */}
              {mode === 'phrase' && detected && currentGesture?.word && (
                <View style={styles.gestureOverlay}>
                  <Text style={styles.gestureOverlayWord}>{currentGesture.word}</Text>
                  <View style={styles.confidenceBar}>
                    <View
                      style={[
                        styles.confidenceFill,
                        { width: `${confidencePct}%` as any },
                        confidencePct >= 80 ? styles.confHigh : confidencePct >= 70 ? styles.confMid : styles.confLow,
                      ]}
                    />
                  </View>
                  <Text style={styles.confidenceLabel}>{confidencePct}% confidence</Text>
                </View>
              )}

              {/* Overlay: Alphabet mode — letter */}
              {mode === 'alphabet' && detected && currentLetter && (
                <View style={styles.gestureOverlay}>
                  <Text style={styles.gestureOverlayWord}>{currentLetter}</Text>
                  <View style={styles.confidenceBar}>
                    <View
                      style={[
                        styles.confidenceFill,
                        { width: `${Math.round(currentLetterConfidence * 100)}%` as any },
                        currentLetterConfidence >= 0.8 ? styles.confHigh : currentLetterConfidence >= 0.7 ? styles.confMid : styles.confLow,
                      ]}
                    />
                  </View>
                  <Text style={styles.confidenceLabel}>
                    {Math.round(currentLetterConfidence * 100)}% confidence
                    {currentLetterConfidence < ALPHABET_CONFIDENCE_THRESHOLD ? ' (too low)' : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Live Transcript History (Below Camera) — Phrase mode only */}
            {mode === 'phrase' && (
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
            )}

            {/* Word History — Alphabet mode only */}
            {mode === 'alphabet' && (
              <View style={styles.transcriptBox}>
                <View style={styles.transcriptHeader}>
                  <Text style={styles.transcriptTitle}>Word History ({wordHistory.length}/{MAX_WORD_HISTORY})</Text>
                  {wordHistory.length > 0 && (
                    <TouchableOpacity onPress={() => setWordHistory([])}>
                      <Text style={styles.clearBtn}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView
                  style={styles.transcriptScroll}
                  contentContainerStyle={styles.transcriptContent}
                  nestedScrollEnabled={true}
                >
                  {wordHistory.length === 0 ? (
                    <Text style={styles.transcriptEmpty}>No words added yet. Sign letters and tap ➕ Add Word.</Text>
                  ) : (
                    <View style={styles.transcriptList}>
                      {wordHistory.map((word, idx) => (
                        <View key={idx} style={styles.transcriptItemRow}>
                          <Text style={styles.transcriptBullet}>•</Text>
                          <Text style={styles.transcriptItemText}>{word}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* ── Right Column: Recognition State & Mode UI ── */}
          <View style={[styles.dataPanel, isMobile ? styles.dataPanelMobile : styles.dataPanelDesktop]}>

            {/* Status badge */}
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Recognition State</Text>
              <View style={[styles.statusBadge, detected ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={styles.statusBadgeText}>
                  {detected ? 'HAND DETECTED' : 'NO HAND'}
                </Text>
              </View>
            </View>

            {/* ── PHRASE MODE UI ── */}
            {mode === 'phrase' && (
              <>
                {/* Last confirmed word card */}
                <View style={styles.wordCard}>
                  {confirmedWord ? (
                    <>
                      <Text style={styles.wordCardLabel}>Last recognized word</Text>
                      <Text style={styles.wordCardWord}>{confirmedWord}</Text>
                    </>
                  ) : (
                    <Text style={styles.wordCardPlaceholder}>
                      Hold a sign gesture for {HOLD_DURATION_MS / 1000}s to recognize it
                    </Text>
                  )}
                </View>

                {/* Live recognizer state */}
                {detected && (
                  <View style={styles.liveState}>
                    <Text style={styles.liveStateLabel}>Live state</Text>
                    <Text style={styles.liveStateValue}>
                      {currentGesture?.word
                        ? `Candidate: "${currentGesture.word}" (${confidencePct}%)`
                        : 'Gesture not recognized'}
                    </Text>
                  </View>
                )}

                {/* Sentence Builder Section */}
                <View style={styles.sentenceSection}>
                  <Text style={styles.sectionTitle}>Sentence Builder</Text>
                  <View style={styles.sentenceBox}>
                    <Text style={sentence.length > 0 ? styles.sentenceText : styles.sentencePlaceholder}>
                      {sentence.length > 0 ? sentence.join(' ') : 'Your sentence will appear here...'}
                    </Text>
                  </View>

                  {/* Controls Row */}
                  <View style={styles.controlsGrid}>
                    <TouchableOpacity
                      style={[styles.controlButton, styles.speakAllBtn]}
                      onPress={() => sentence.length > 0 && SpeechService.speak(sentence.join(' '))}
                      disabled={sentence.length === 0}
                    >
                      <Text style={styles.controlButtonText}>🔊 Speak Sentence</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButton, styles.copyBtn]}
                      onPress={() => sentence.length > 0 && copyToClipboard(sentence.join(' '))}
                      disabled={sentence.length === 0}
                    >
                      <Text style={styles.controlButtonText}>📋 Copy Sentence</Text>
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
                      onPress={() => { setSentence([]); setConfirmedWord(null); }}
                      disabled={sentence.length === 0}
                    >
                      <Text style={styles.controlButtonText}>🗑️ Clear Sentence</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Supported gestures legend */}
                <View style={styles.legend}>
                  <Text style={styles.legendTitle}>Supported gestures ({supportedGestures.length})</Text>
                  <ScrollView
                    horizontal={false}
                    contentContainerStyle={styles.legendGrid}
                    showsVerticalScrollIndicator={true}
                    style={styles.legendScroll}
                  >
                    {supportedGestures.map((g) => (
                      <View key={g} style={styles.legendChip}>
                        <Text style={styles.legendChipText}>{g}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}

            {/* ── ALPHABET MODE UI ── */}
            {mode === 'alphabet' && (
              <>
                {/* Current Letter Card */}
                <View style={styles.wordCard}>
                  {currentLetter ? (
                    <>
                      <Text style={styles.wordCardLabel}>Current Letter</Text>
                      <Text style={[
                        styles.wordCardWord,
                        currentLetterConfidence < ALPHABET_CONFIDENCE_THRESHOLD && styles.wordCardWordDim,
                      ]}>
                        {currentLetter}
                      </Text>
                      <Text style={styles.wordCardConf}>
                        {Math.round(currentLetterConfidence * 100)}% confidence
                        {currentLetterConfidence < ALPHABET_CONFIDENCE_THRESHOLD
                          ? ' — below threshold'
                          : currentLetterConfidence >= ALPHABET_CONFIDENCE_THRESHOLD
                          ? ' ✓'
                          : ''}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.wordCardPlaceholder}>
                      Show a letter sign to the camera
                    </Text>
                  )}
                </View>

                {/* Current Word Section */}
                <View style={styles.sentenceSection}>
                  <Text style={styles.sectionTitle}>Current Word</Text>
                  <View style={styles.sentenceBox}>
                    <Text style={currentWord.length > 0 ? styles.sentenceText : styles.sentencePlaceholder}>
                      {currentWord.length > 0 ? currentWord : 'Letters will appear here...'}
                    </Text>
                  </View>

                  {/* Suggested Word (if available) */}
                  {!!suggestion && (
                    <View style={styles.suggestionContainer}>
                      <Text style={styles.suggestionLabel}>Did you mean:</Text>
                      <TouchableOpacity
                        style={styles.suggestionBtnActive}
                        onPress={() => setCurrentWord(suggestion)}
                      >
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Alphabet Controls Grid */}
                  <View style={styles.controlsGrid}>
                    <TouchableOpacity
                      style={[styles.controlButton, styles.backspaceBtn]}
                      onPress={alphabetBackspace}
                      disabled={currentWord.length === 0}
                    >
                      <Text style={styles.controlButtonText}>⌫ Backspace</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButton, styles.clearBtnColor]}
                      onPress={alphabetClear}
                      disabled={currentWord.length === 0}
                    >
                      <Text style={styles.controlButtonText}>🗑 Clear</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButton, styles.addWordBtn]}
                      onPress={alphabetAddWord}
                      disabled={currentWord.trim().length === 0}
                    >
                      <Text style={styles.controlButtonText}>➕ Add Word</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButton, styles.spaceBtn]}
                      onPress={alphabetSpace}
                    >
                      <Text style={styles.controlButtonText}>␣ Space</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButton, styles.copyBtn]}
                      onPress={alphabetCopy}
                      disabled={currentWord.length === 0}
                    >
                      <Text style={styles.controlButtonText}>📋 Copy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButton, styles.speakAllBtn]}
                      onPress={alphabetSpeak}
                      disabled={currentWord.trim().length === 0}
                    >
                      <Text style={styles.controlButtonText}>🔊 Speak</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Alphabet legend */}
                <View style={styles.legend}>
                  <Text style={styles.legendTitle}>Recognized letters (12)</Text>
                  <View style={styles.legendGrid}>
                    {['A','B','C','D','F','I','L','O','S','V','W','Y'].map((l) => (
                      <View
                        key={l}
                        style={[styles.legendChip, currentLetter === l && styles.legendChipActive]}
                      >
                        <Text style={[styles.legendChipText, currentLetter === l && styles.legendChipTextActive]}>
                          {l}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}

          </View>
        </View>
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
    padding: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  backButton: {
    backgroundColor: '#1f1f3a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#00FFCC',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitles: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    color: '#a0a0c0',
    marginTop: 2,
  },

  // Mode Toggle
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 14,
    backgroundColor: '#13132b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f1f3a',
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#00FFCC',
  },
  toggleButtonText: {
    color: '#a0a0c0',
    fontWeight: '600',
    fontSize: 14,
  },
  toggleButtonTextActive: {
    color: '#0a0a16',
  },

  // Workspace layout
  workspace: {
    flex: 1,
    gap: 16,
  },
  workspaceMobile: {
    flexDirection: 'column',
  },
  workspaceDesktop: {
    flexDirection: 'row',
  },

  // Columns
  leftColumn: {
    gap: 16,
  },
  leftColumnMobile: {
    width: '100%',
  },
  leftColumnDesktop: {
    flex: 1.2,
  },
  dataPanel: {
    backgroundColor: '#13132b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f1f3a',
    gap: 14,
  },
  dataPanelMobile: {
    width: '100%',
  },
  dataPanelDesktop: {
    flex: 0.8,
  },

  // Camera panel
  cameraPanel: {
    width: '100%',
    aspectRatio: 4 / 3,
    alignSelf: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1f1f3a',
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
  },

  // Gesture / Letter overlay on camera
  gestureOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10, 10, 22, 0.85)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 30,
    borderWidth: 1,
    borderColor: 'rgba(0,255,204,0.3)',
  },
  gestureOverlayWord: {
    fontSize: 36,
    fontWeight: '800',
    color: '#00FFCC',
    letterSpacing: 2,
    marginBottom: 8,
  },
  confidenceBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  confidenceFill: {
    height: 4,
    borderRadius: 2,
  },
  confHigh: { backgroundColor: '#00FFCC' },
  confMid:  { backgroundColor: '#FFCC00' },
  confLow:  { backgroundColor: '#FF9900' },
  confidenceLabel: {
    fontSize: 11,
    color: '#a0a0c0',
  },

  // Recognition Header
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f3a',
    paddingBottom: 12,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeActive: {
    backgroundColor: 'rgba(0,255,204,0.15)',
    borderWidth: 1,
    borderColor: '#00FFCC',
  },
  badgeInactive: {
    backgroundColor: 'rgba(255,51,102,0.15)',
    borderWidth: 1,
    borderColor: '#FF3366',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#fff',
  },

  // Word card
  wordCard: {
    backgroundColor: '#0d0d24',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
    minHeight: 80,
    justifyContent: 'center',
  },
  wordCardLabel: {
    fontSize: 11,
    color: '#a0a0c0',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  wordCardWord: {
    fontSize: 48,
    fontWeight: '800',
    color: '#00FFCC',
    letterSpacing: 4,
  },
  wordCardWordDim: {
    color: '#5a5a8a',
  },
  wordCardConf: {
    fontSize: 11,
    color: '#a0a0c0',
    marginTop: 4,
  },
  wordCardPlaceholder: {
    fontSize: 13,
    color: '#5a5a8a',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Live state
  liveState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d0d24',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1f1f3a',
  },
  liveStateLabel: {
    fontSize: 11,
    color: '#5a5a8a',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  liveStateValue: {
    fontSize: 12,
    color: '#a0a0c0',
    flex: 1,
  },

  // Transcript / Word History panel (below camera)
  transcriptBox: {
    backgroundColor: '#0d0d24',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f1f3a',
    flex: 1,
    minHeight: 140,
    maxHeight: 220,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f3a',
    paddingBottom: 8,
    marginBottom: 8,
  },
  transcriptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  clearBtn: {
    fontSize: 11,
    color: '#FF3366',
    fontWeight: '600',
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptContent: {
    paddingBottom: 8,
  },
  transcriptEmpty: {
    fontSize: 12,
    color: '#4e4e75',
    fontStyle: 'italic',
  },
  transcriptList: {
    gap: 6,
  },
  transcriptItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  transcriptBullet: {
    color: '#00FFCC',
    fontSize: 14,
    lineHeight: 18,
  },
  transcriptItemText: {
    fontSize: 13,
    color: '#d0d0f5',
    fontWeight: '500',
    lineHeight: 18,
  },

  // Sentence / Word Builder Section
  sentenceSection: {
    backgroundColor: '#0d0d24',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sentenceBox: {
    backgroundColor: '#13132b',
    borderWidth: 1,
    borderColor: '#1f1f3a',
    borderRadius: 8,
    padding: 12,
    minHeight: 50,
    justifyContent: 'center',
  },
  sentenceText: {
    fontSize: 18,
    color: '#00FFCC',
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 1,
  },
  sentencePlaceholder: {
    fontSize: 13,
    color: '#4e4e75',
    fontStyle: 'italic',
  },

  // Controls Grid
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  speakAllBtn: {
    backgroundColor: 'rgba(0, 255, 204, 0.15)',
    borderColor: '#00FFCC',
  },
  copyBtn: {
    backgroundColor: 'rgba(255, 204, 0, 0.15)',
    borderColor: '#FFCC00',
  },
  backspaceBtn: {
    backgroundColor: 'rgba(255, 153, 0, 0.15)',
    borderColor: '#FF9900',
  },
  clearBtnColor: {
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    borderColor: '#FF3366',
  },
  addWordBtn: {
    backgroundColor: 'rgba(100, 60, 255, 0.15)',
    borderColor: '#6B3FFF',
  },
  spaceBtn: {
    backgroundColor: 'rgba(0, 180, 255, 0.15)',
    borderColor: '#00B4FF',
  },

  // Legend
  legend: {
    gap: 8,
    flex: 1,
    minHeight: 80,
  },
  legendTitle: {
    fontSize: 11,
    color: '#5a5a8a',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  legendScroll: {
    flex: 1,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 10,
  },
  legendChip: {
    backgroundColor: '#1a1a35',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  legendChipActive: {
    backgroundColor: 'rgba(0,255,204,0.2)',
    borderColor: '#00FFCC',
  },
  legendChipText: {
    fontSize: 13,
    color: '#a0a0c0',
    fontWeight: '600',
  },
  legendChipTextActive: {
    color: '#00FFCC',
  },
  suggestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
    paddingHorizontal: 4,
  },
  suggestionLabel: {
    color: '#a0a0c0',
    fontSize: 13,
  },
  suggestionBtnActive: {
    backgroundColor: 'rgba(0, 255, 204, 0.15)',
    borderColor: '#00FFCC',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  suggestionText: {
    color: '#00FFCC',
    fontSize: 14,
    fontWeight: '700',
  },
});
