/**
 * Verixa AI — Sign Language to Text Screen
 * Custom dynamic sequence recognition system for 10 predefined phrases
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import SignToTextDetector from '../../components/SignToTextDetector';
import { recognizeAlphabet, getWordSuggestion } from '../../services/AlphabetRecognizer';
import { SignService, FrameHands, PredictResponse } from '../../services/SignService';
import SpeechService from '../../services/SpeechService';
import { SupportedLanguage } from '../../services/LanguageService';
import { useLanguage } from '../../components/LanguageProvider';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOLD_DURATION_MS = 800;
const ALPHABET_CONFIDENCE_THRESHOLD = 0.70;
const MAX_WORD_HISTORY = 20;

// Dynamic Sequence Recognition Constants
const SEQUENCE_LENGTH = 30;
const CONFIDENCE_THRESHOLD = 0.80;
const COOLDOWN_DURATION_MS = 2000;
const INFERENCE_INTERVAL_MS = 450; // run sliding window inference every 450ms

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

// Helper to convert phrase to localization key
const getLocKey = (phrase: string): string => {
  const clean = phrase.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
  return `phrase_${clean}`;
};

export default function SignToTextScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { t, language } = useLanguage();

  // ── Shared state ──
  const [detected, setDetected] = useState(false);
  const [mode, setMode] = useState<'phrase' | 'alphabet'>('phrase');

  // ── Phrase mode state (Sequence LSTM-based) ──
  const [isPredicting, setIsPredicting] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<PredictResponse | null>(null);
  const [predictionMessage, setPredictionMessage] = useState<string>('');
  const [sentence, setSentence] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // ── Alphabet mode state ──
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [currentLetterConfidence, setCurrentLetterConfidence] = useState<number>(0);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [wordHistory, setWordHistory] = useState<string[]>([]);
  const suggestion = getWordSuggestion(currentWord);

  // ── Queue & Timing Refs ──
  const landmarkQueueRef = useRef<FrameHands[]>([]);
  const isPredictingRef = useRef(false);
  const lastInferenceTimeRef = useRef<number>(0);
  const recentPredictionsRef = useRef<string[]>([]);
  const cooldownRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCandidateRef = useRef<string | null>(null);
  const lastConfirmedRef = useRef<string | null>(null);

  // Clear states when mode changes
  useEffect(() => {
    landmarkQueueRef.current = [];
    isPredictingRef.current = false;
    recentPredictionsRef.current = [];
    cooldownRef.current = false;
    setLastPrediction(null);
    setPredictionMessage('');
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    lastCandidateRef.current = null;
    lastConfirmedRef.current = null;
  }, [mode]);

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text.trimEnd());
    } catch (err) {
      console.warn('[Clipboard] setStringAsync failed:', err);
    }
  };

  // ── Dynamic Sign Predictor Trigger ──
  const runSequenceInference = async (isManual = false) => {
    if (isPredictingRef.current) return;
    if (cooldownRef.current) return;
    
    const frames = landmarkQueueRef.current;
    if (frames.length < 5) {
      if (isManual) setPredictionMessage(t('phrase_show_sign'));
      return;
    }

    try {
      isPredictingRef.current = true;
      setIsPredicting(true);
      setPredictionMessage('');

      const res = await SignService.predictPhrase(frames);
      setLastPrediction(res);

      if (res.accepted && res.phrase) {
        // Validation & Smoothing logic (Same class predicted in 2 consecutive windows)
        const recent = recentPredictionsRef.current;
        recent.push(res.phrase);
        if (recent.length > 3) recent.shift();

        const isStable = recent.length >= 2 && recent.every(p => p === res.phrase);

        if (isStable || isManual) {
          const phraseText = t(getLocKey(res.phrase));
          setSentence((prev) => [...prev, phraseText]);
          setTranscript((prev) => [phraseText, ...prev].slice(0, 30));

          if (autoSpeak) {
            SpeechService.speak(phraseText);
          }

          // Trigger cooldown
          cooldownRef.current = true;
          setPredictionMessage('Phrase committed!');
          setTimeout(() => {
            cooldownRef.current = false;
            setPredictionMessage('');
          }, COOLDOWN_DURATION_MS);

          // Clear history and queue
          recentPredictionsRef.current = [];
          landmarkQueueRef.current = [];
        } else {
          setPredictionMessage('Stabilizing gesture...');
        }
      } else {
        recentPredictionsRef.current = [];
        setPredictionMessage(t('phrase_not_recognized'));
      }
    } catch (err: any) {
      console.warn('[SignToText] Prediction API failed:', err);
      setPredictionMessage('Prediction server offline');
    } finally {
      isPredictingRef.current = false;
      setIsPredicting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Camera callbacks
  // ---------------------------------------------------------------------------

  const handleHandsDetected = useCallback((hands: { leftHand: any[] | null; rightHand: any[] | null }) => {
    setDetected(true);

    if (mode === 'phrase') {
      // Accumulate sequence window
      const frame: FrameHands = {
        leftHand: hands.leftHand ? hands.leftHand.map(l => ({ x: l.x, y: l.y, z: l.z })) : null,
        rightHand: hands.rightHand ? hands.rightHand.map(l => ({ x: l.x, y: l.y, z: l.z })) : null,
      };

      landmarkQueueRef.current.push(frame);
      if (landmarkQueueRef.current.length > SEQUENCE_LENGTH) {
        landmarkQueueRef.current.shift();
      }

      // Throttled Sliding Window Prediction
      const now = Date.now();
      if (landmarkQueueRef.current.length >= SEQUENCE_LENGTH && (now - lastInferenceTimeRef.current >= INFERENCE_INTERVAL_MS)) {
        lastInferenceTimeRef.current = now;
        runSequenceInference(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, autoSpeak]);

  const handleHandDetectedLegacy = useCallback((landmarks: any[]) => {
    if (mode === 'alphabet') {
      const { letter, confidence } = recognizeAlphabet(landmarks);
      setCurrentLetter(letter);
      setCurrentLetterConfidence(confidence);

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
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleHandNotDetected = useCallback(() => {
    setDetected(false);
    setCurrentLetter(null);
    setCurrentLetterConfidence(0);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    lastCandidateRef.current = null;
    lastConfirmedRef.current = null;

    if (mode === 'phrase') {
      // Gracefully clear/decay the sliding window queue when hands leave camera range
      landmarkQueueRef.current = [];
      recentPredictionsRef.current = [];
    }
  }, [mode]);

  const clearTranscriptOnly = () => setTranscript([]);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
            <Text style={styles.backButtonText}>‹ {t('emergency_back')}</Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>{t('emergency_title')}</Text>
            <Text style={styles.headerSub}>Dynamic Sequence Neural-Network Sign to Text</Text>
          </View>
        </View>

        {/* ── Mode Toggle ── */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'phrase' && styles.toggleButtonActive]}
            onPress={() => setMode('phrase')}
          >
            <Text style={[styles.toggleButtonText, mode === 'phrase' && styles.toggleButtonTextActive]}>
              Phrase Mode (Neural-Net)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'alphabet' && styles.toggleButtonActive]}
            onPress={() => setMode('alphabet')}
          >
            <Text style={[styles.toggleButtonText, mode === 'alphabet' && styles.toggleButtonTextActive]}>
              Alphabet Mode
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Workspace ── */}
        <View style={[styles.workspace, isMobile ? styles.workspaceMobile : styles.workspaceDesktop]}>

          {/* ── Left Column: Camera & Live Transcript ── */}
          <View style={[styles.leftColumn, isMobile ? styles.leftColumnMobile : styles.leftColumnDesktop]}>
            <View style={styles.cameraPanel}>
              <SignToTextDetector
                onHandsDetected={handleHandsDetected}
                onHandDetected={handleHandDetectedLegacy}
                onHandNotDetected={handleHandNotDetected}
              />

              {/* Overlay: Phrase mode results */}
              {mode === 'phrase' && detected && (
                <View style={styles.gestureOverlay}>
                  {isPredicting ? (
                    <ActivityIndicator size="small" color="#00FFCC" />
                  ) : (
                    <Text style={styles.gestureOverlayWord}>
                      {lastPrediction?.phrase ? t(getLocKey(lastPrediction.phrase)) : t('phrase_show_sign')}
                    </Text>
                  )}
                  {lastPrediction && (
                    <View style={styles.confidenceBar}>
                      <View
                        style={[
                          styles.confidenceFill,
                          { width: `${Math.round(lastPrediction.confidence * 100)}%` as any },
                          lastPrediction.accepted ? styles.confHigh : styles.confLow,
                        ]}
                      />
                    </View>
                  )}
                  <Text style={styles.confidenceLabel}>
                    {lastPrediction ? `${Math.round(lastPrediction.confidence * 100)}% confidence` : predictionMessage || 'Tracking hands...'}
                  </Text>
                </View>
              )}

              {/* Overlay: Alphabet mode letter */}
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
                  </Text>
                </View>
              )}
            </View>

            {/* Live Transcript History (Below Camera) */}
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

            {/* Word History — Alphabet mode */}
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

          {/* ── Right Column: Controls & Mode UI ── */}
          <View style={[styles.dataPanel, isMobile ? styles.dataPanelMobile : styles.dataPanelDesktop]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Recognition State</Text>
              <View style={[styles.statusBadge, detected ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={styles.statusBadgeText}>
                  {detected ? 'TRACKING ACTIVE' : 'NO HANDS'}
                </Text>
              </View>
            </View>

            {/* ── PHRASE MODE UI ── */}
            {mode === 'phrase' && (
              <>
                <View style={styles.wordCard}>
                  {lastPrediction?.phrase ? (
                    <>
                      <Text style={styles.wordCardLabel}>Last prediction</Text>
                      <Text style={styles.wordCardWord}>{t(getLocKey(lastPrediction.phrase))}</Text>
                    </>
                  ) : (
                    <Text style={styles.wordCardPlaceholder}>
                      Show your hands and perform the gesture sequence for {SEQUENCE_LENGTH} frames
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
                      <Text style={styles.controlButtonText}>🔊 Speak All</Text>
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
                      onPress={() => { setSentence([]); setLastPrediction(null); }}
                      disabled={sentence.length === 0}
                    >
                      <Text style={styles.controlButtonText}>🗑️ Clear All</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButton, styles.manualRecognizeBtn]}
                      onPress={() => runSequenceInference(true)}
                      disabled={isPredicting}
                    >
                      <Text style={styles.controlButtonText}>⚡ Recognize Now</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButton, styles.tryAgainBtn]}
                      onPress={() => {
                        landmarkQueueRef.current = [];
                        recentPredictionsRef.current = [];
                        setLastPrediction(null);
                        setPredictionMessage('Queue reset. Show your sign again.');
                      }}
                    >
                      <Text style={styles.controlButtonText}>🔄 Reset Queue</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Legend list of 10 Phrases */}
                <View style={styles.legend}>
                  <Text style={styles.legendTitle}>Predefined phrase vocabulary (10)</Text>
                  <ScrollView
                    horizontal={false}
                    contentContainerStyle={styles.legendGrid}
                    showsVerticalScrollIndicator={true}
                    style={styles.legendScroll}
                  >
                    {PHRASES.map((phrase) => (
                      <View key={phrase} style={styles.legendChip}>
                        <Text style={styles.legendChipText}>{t(getLocKey(phrase))}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}

            {/* ── ALPHABET MODE UI ── */}
            {mode === 'alphabet' && (
              <>
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
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.wordCardPlaceholder}>
                      Show a letter sign to the camera
                    </Text>
                  )}
                </View>

                <View style={styles.sentenceSection}>
                  <Text style={styles.sectionTitle}>Current Word</Text>
                  <View style={styles.sentenceBox}>
                    <Text style={currentWord.length > 0 ? styles.sentenceText : styles.sentencePlaceholder}>
                      {currentWord.length > 0 ? currentWord : 'Letters will appear here...'}
                    </Text>
                  </View>

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
    fontSize: 13,
  },
  toggleButtonTextActive: {
    color: '#0a0a16',
  },
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
  gestureOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10, 10, 22, 0.9)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 30,
    borderWidth: 1,
    borderColor: 'rgba(0,255,204,0.3)',
  },
  gestureOverlayWord: {
    fontSize: 26,
    fontWeight: '800',
    color: '#00FFCC',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
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
  confLow:  { backgroundColor: '#FF3366' },
  confMid:  { backgroundColor: '#FFCC00' },
  confidenceLabel: {
    fontSize: 11,
    color: '#a0a0c0',
  },
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
    fontSize: 28,
    fontWeight: '800',
    color: '#00FFCC',
    letterSpacing: 1,
    textAlign: 'center',
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
  toggleAutoSpeakBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  toggleAutoSpeakBtnActive: {
    backgroundColor: 'rgba(0, 255, 204, 0.06)',
    borderColor: 'rgba(0, 255, 204, 0.2)',
  },
  toggleAutoSpeakBtnText: {
    fontSize: 12,
    color: '#a0a0c0',
    fontWeight: '600',
  },
  toggleAutoSpeakBtnTextActive: {
    color: '#00FFCC',
  },
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
  manualRecognizeBtn: {
    backgroundColor: 'rgba(0, 180, 255, 0.15)',
    borderColor: '#00B4FF',
  },
  tryAgainBtn: {
    backgroundColor: 'rgba(100, 60, 255, 0.15)',
    borderColor: '#6B3FFF',
  },
  addWordBtn: {
    backgroundColor: 'rgba(100, 60, 255, 0.15)',
    borderColor: '#6B3FFF',
  },
  spaceBtn: {
    backgroundColor: 'rgba(0, 180, 255, 0.15)',
    borderColor: '#00B4FF',
  },
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
