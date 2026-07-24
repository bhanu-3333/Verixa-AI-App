import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import SignToTextDetector from '../SignToTextDetector';
import SpeechService from '../../services/SpeechService';
import { recognizeGesture, GestureResult } from '../../services/GestureRecognizer';
import { recognizeAlphabet } from '../../services/AlphabetRecognizer';
import { useLanguage } from '../LanguageProvider';
import { SupportedLanguage } from '../../services/LanguageService';

interface SignToTextVoicePanelProps {
  staffType?: 'staff' | 'doctor';
}

const C = {
  primary: '#208AEF',
  accent: '#00D2FF',
  cardBg: '#151D30',
  text: '#F1F5F9',
  muted: '#94A3B8',
  border: '#1E293B',
  success: '#10B981',
  danger: '#EF4444',
};

export const SignToTextVoicePanel: React.FC<SignToTextVoicePanelProps> = ({ staffType = 'staff' }) => {
  const { language } = useLanguage();
  const isTamil = language === SupportedLanguage.TA;

  const [recognitionMode, setRecognitionMode] = useState<'phrase' | 'alphabet'>('phrase');
  const [signRecognizing, setSignRecognizing] = useState(false);
  const [detected, setDetected] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<GestureResult | null>(null);
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [lowConfidenceNotice, setLowConfidenceNotice] = useState<boolean>(false);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCandidateRef = useRef<string | null>(null);
  const lastConfirmedRef = useRef<string | null>(null);

  const handleHandDetected = useCallback((landmarks: any[]) => {
    setDetected(true);
    setSignRecognizing(true);
    setLowConfidenceNotice(false);

    if (recognitionMode === 'phrase') {
      const result = recognizeGesture(landmarks);
      setCurrentGesture(result);

      if (result.confidence > 0 && result.confidence < 0.5) {
        setLowConfidenceNotice(true);
      }

      const candidate = result.word;
      if (candidate && result.confidence >= 0.5) {
        if (candidate !== lastCandidateRef.current) {
          if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
          lastCandidateRef.current = candidate;
          if (candidate !== lastConfirmedRef.current) {
            holdTimerRef.current = setTimeout(() => {
              setRecognizedText((prev) => (prev ? prev + ' ' + candidate : candidate));
              lastConfirmedRef.current = candidate;
            }, 800);
          }
        }
      } else {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        lastCandidateRef.current = null;
      }
    } else {
      const { letter, confidence } = recognizeAlphabet(landmarks);
      setCurrentLetter(letter);
      setCurrentGesture(null);

      if (confidence > 0 && confidence < 0.6) {
        setLowConfidenceNotice(true);
      }

      const candidate = confidence >= 0.6 ? letter : null;
      if (candidate) {
        if (candidate !== lastCandidateRef.current) {
          if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
          lastCandidateRef.current = candidate;
          if (candidate !== lastConfirmedRef.current) {
            holdTimerRef.current = setTimeout(() => {
              setCurrentWord((prev) => prev + candidate);
              lastConfirmedRef.current = candidate;
            }, 800);
          }
        }
      } else {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        lastCandidateRef.current = null;
      }
    }
  }, [recognitionMode]);

  const handleHandNotDetected = useCallback(() => {
    setDetected(false);
    setSignRecognizing(false);
    setCurrentGesture(null);
    setCurrentLetter(null);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    lastCandidateRef.current = null;
  }, []);

  const handleSpeakToStaff = async () => {
    if (!recognizedText) return;
    const langCode = isTamil ? 'ta-IN' : 'en-US';
    await SpeechService.speak(recognizedText, langCode);
  };

  const handleClear = () => {
    setRecognizedText(null);
    setCurrentWord('');
    lastCandidateRef.current = null;
    lastConfirmedRef.current = null;
  };

  const handleTryAgain = () => {
    handleClear();
    setLowConfidenceNotice(false);
  };

  const handleConfirmAlphabetWord = () => {
    if (currentWord.trim()) {
      setRecognizedText((prev) => (prev ? prev + ' ' + currentWord.trim() : currentWord.trim()));
      setCurrentWord('');
    }
  };

  const staffLabel = staffType === 'doctor'
    ? (isTamil ? 'மருத்துவரிடம் பேசவும்' : 'Speak to Doctor')
    : (isTamil ? 'வங்கி ஊழியரிடம் பேசவும்' : 'Speak to Bank Staff');

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>🤟 {isTamil ? 'குறியீடு → உரை / குரல்' : 'Sign Language → Text / Voice'}</Text>

      {/* Mode selection */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, recognitionMode === 'phrase' && styles.modeBtnActive]}
          onPress={() => setRecognitionMode('phrase')}
        >
          <Text style={[styles.modeBtnText, recognitionMode === 'phrase' && styles.modeBtnTextActive]}>
            {isTamil ? 'சொற்றொடர் முறை' : 'Phrase Mode'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, recognitionMode === 'alphabet' && styles.modeBtnActive]}
          onPress={() => setRecognitionMode('alphabet')}
        >
          <Text style={[styles.modeBtnText, recognitionMode === 'alphabet' && styles.modeBtnTextActive]}>
            {isTamil ? 'எழுத்து முறை' : 'Alphabet Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Camera preview */}
      <View style={styles.cameraContainer}>
        <SignToTextDetector
          onHandDetected={handleHandDetected}
          onHandNotDetected={handleHandNotDetected}
        />
        {!detected && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{isTamil ? 'சைகைக்காக காத்திருக்கிறது...' : 'Waiting for sign...'}</Text>
          </View>
        )}
        {signRecognizing && detected && (
          <View style={[styles.statusBadge, styles.statusBadgeActive]}>
            <ActivityIndicator size="small" color={C.accent} />
            <Text style={[styles.statusText, { color: C.accent }]}>{isTamil ? 'சைகை கண்டறிகிறது...' : 'Recognizing sign...'}</Text>
          </View>
        )}
      </View>

      {/* Low confidence notice */}
      {lowConfidenceNotice && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠ {isTamil ? 'சைகை தெளிவாக இல்லை. மீண்டும் முயற்சிக்கவும்.' : 'Sign not recognized clearly. Please try again.'}
          </Text>
        </View>
      )}

      {/* Detection status summary */}
      <View style={styles.detectionBox}>
        {recognitionMode === 'phrase' ? (
          <>
            <Text style={styles.label}>{isTamil ? 'கண்டறிந்த சைகை:' : 'Detected Gesture:'}</Text>
            <Text style={styles.value}>
              {detected && currentGesture?.word ? currentGesture.word : (isTamil ? 'சைகை இல்லை' : 'No gesture detected')}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>{isTamil ? 'உருவாகும் வார்த்தை:' : 'Building Word:'}</Text>
            <Text style={styles.value}>
              {currentWord || '—'} {detected && currentLetter ? `[${currentLetter}]` : ''}
            </Text>
            <View style={styles.miniBtnRow}>
              <TouchableOpacity style={styles.miniBtn} onPress={() => setCurrentWord(prev => prev.slice(0, -1))}>
                <Text style={styles.miniBtnText}>Del</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.miniBtn} onPress={() => setCurrentWord('')}>
                <Text style={styles.miniBtnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.miniBtn, styles.miniBtnPrimary]} onPress={handleConfirmAlphabetWord}>
                <Text style={[styles.miniBtnText, { color: '#fff' }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Recognized text result box */}
      <View style={styles.resultBox}>
        <Text style={styles.resultLabel}>{isTamil ? 'அடையாளம் காணப்பட்ட செய்தி:' : 'Recognized Message:'}</Text>
        <Text style={styles.resultText}>{recognizedText || (isTamil ? 'செய்தி எதுவும் பெறப்படவில்லை' : 'No message recognized yet')}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, !recognizedText && styles.btnDisabled]}
          onPress={handleSpeakToStaff}
          disabled={!recognizedText}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>🔊 {staffLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSecondary} onPress={handleTryAgain} activeOpacity={0.8}>
          <Text style={styles.btnSecondaryText}>🔁 {isTamil ? 'மீண்டும் முயற்சி' : 'Try Again'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSecondary} onPress={handleClear} activeOpacity={0.8}>
          <Text style={styles.btnSecondaryText}>🗑 {isTamil ? 'அழி' : 'Clear'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: C.cardBg,
    borderColor: C.border,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 18,
    marginTop: 12,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  modeBtnActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(32, 138, 239, 0.15)',
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
  },
  modeBtnTextActive: {
    color: C.primary,
  },
  cameraContainer: {
    height: 240,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0B0F19',
    position: 'relative',
    borderWidth: 1,
    borderColor: C.border,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadgeActive: {
    borderColor: C.accent,
    borderWidth: 1,
  },
  statusText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: C.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  warningText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  detectionBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: C.accent,
    marginTop: 2,
  },
  miniBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  miniBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  miniBtnPrimary: {
    backgroundColor: C.primary,
  },
  miniBtnText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  resultBox: {
    backgroundColor: '#0B0F19',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    marginBottom: 4,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 2,
    minWidth: 140,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: C.primary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnSecondary: {
    flex: 1,
    minWidth: 90,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnSecondaryText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
