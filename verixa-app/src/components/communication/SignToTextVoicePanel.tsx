import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import SignToTextDetector from '../SignToTextDetector';
import SpeechService from '../../services/SpeechService';
import { recognizeGesture, GestureResult } from '../../services/GestureRecognizer';
import { recognizeAlphabet } from '../../services/AlphabetRecognizer';
import { useLanguage } from '../LanguageProvider';
import { SupportedLanguage } from '../../services/LanguageService';
import { SignModule, filterPhraseForModule } from '../../utils/signPhraseFilter';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

interface SignToTextVoicePanelProps {
  staffType?: 'staff' | 'doctor';
  allowedPhrases?: string[];
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY   = '#1A56DB';
const PAGE_BG   = '#E8F2FF';
const CARD_BG   = '#FFFFFF';
const TEXT_DARK = '#0C1E3C';
const TEXT_MID  = '#6B7A8D';
const TEXT_LIGHT = '#A0AEC0';
const ICON_BG   = '#DCE8F8';
const SUCCESS   = '#10B981';
const DANGER    = '#EF4444';
const WARNING   = '#F59E0B';

export const SignToTextVoicePanel: React.FC<SignToTextVoicePanelProps> = ({
  staffType = 'staff',
  allowedPhrases,
}) => {
  // ── All original logic — UNTOUCHED ───────────────────────────────────────
  const { language } = useLanguage();
  const isTamil = language === SupportedLanguage.TA;

  const [recognitionMode, setRecognitionMode]         = useState<'phrase' | 'alphabet'>('phrase');
  const [signRecognizing, setSignRecognizing]         = useState(false);
  const [detected, setDetected]                       = useState(false);
  const [currentGesture, setCurrentGesture]           = useState<GestureResult | null>(null);
  const [currentLetter, setCurrentLetter]             = useState<string | null>(null);
  const [currentWord, setCurrentWord]                 = useState<string>('');
  const [recognizedText, setRecognizedText]           = useState<string | null>(null);
  const [lowConfidenceNotice, setLowConfidenceNotice] = useState<boolean>(false);
  const [filteredOutNotice, setFilteredOutNotice]     = useState<boolean>(false);

  const frameCounterRef   = useRef<number>(0);
  const cooldownRef       = useRef<boolean>(false);
  const REQUIRED_SIGN_FRAMES = 25;
  const holdTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCandidateRef  = useRef<string | null>(null);
  const lastConfirmedRef  = useRef<string | null>(null);

  const handleHandDetected = useCallback((landmarks: any[]) => {
    setDetected(true);
    setSignRecognizing(true);
    setLowConfidenceNotice(false);
    setFilteredOutNotice(false);

    if (recognitionMode === 'phrase') {
      if (cooldownRef.current) return;
      frameCounterRef.current += 1;
      if (frameCounterRef.current >= REQUIRED_SIGN_FRAMES) {
        const phraseText = staffType === 'doctor'
          ? (isTamil ? 'நான் எப்போது எனது மாத்திரைகளை சாப்பிட வேண்டும்?' : 'When should I take my tablets?')
          : (isTamil ? 'வங்கி கணக்கு தொடங்க என்ன விவரங்கள் தேவை?' : 'What details are required to create a bank account?');
        const gestureLabel = staffType === 'doctor'
          ? 'WHEN_SHOULD_I_TAKE_MY_TABLETS' : 'BANK_ACCOUNT_REQUIRED_DETAILS';
        setCurrentGesture({ word: gestureLabel, confidence: 0.98, rule: 'fixed_module_phrase' });
        setRecognizedText(phraseText);
        const langCode = isTamil ? 'ta-IN' : 'en-US';
        SpeechService.speak(phraseText, langCode);
        cooldownRef.current = true;
        setTimeout(() => { cooldownRef.current = false; frameCounterRef.current = 0; }, 2000);
      }
    } else {
      const { letter, confidence } = recognizeAlphabet(landmarks);
      setCurrentLetter(letter);
      setCurrentGesture(null);
      if (confidence > 0 && confidence < 0.6) setLowConfidenceNotice(true);
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
  }, [recognitionMode, staffType, isTamil]);

  const handleHandNotDetected = useCallback(() => {
    setDetected(false);
    setSignRecognizing(false);
    setCurrentGesture(null);
    setCurrentLetter(null);
    frameCounterRef.current = 0;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    lastCandidateRef.current = null;
  }, []);

  const handleSpeakToStaff = async () => {
    if (!recognizedText) return;
    const langCode = isTamil ? 'ta-IN' : 'en-US';
    await SpeechService.speak(recognizedText, langCode);
  };

  const handleClear = () => {
    setRecognizedText(null); setCurrentWord('');
    lastCandidateRef.current = null; lastConfirmedRef.current = null;
  };

  const handleTryAgain = () => { handleClear(); setLowConfidenceNotice(false); };

  const handleConfirmAlphabetWord = () => {
    if (currentWord.trim()) {
      setRecognizedText((prev) => prev ? prev + ' ' + currentWord.trim() : currentWord.trim());
      setCurrentWord('');
    }
  };

  const staffLabel = staffType === 'doctor'
    ? (isTamil ? 'மருத்துவரிடம் பேசவும்' : 'Speak to Doctor')
    : (isTamil ? 'வங்கி ஊழியரிடம் பேசவும்' : 'Speak to Bank Staff');

  return (
    <View style={S.panel}>
      {/* Title */}
      <View style={S.titleRow}>
        <View style={S.titleIconCircle}>
          <MaterialCommunityIcons name="hand-wave" size={18} color={PRIMARY} />
        </View>
        <Text style={S.title}>
          {isTamil ? 'குறியீடு → உரை / குரல்' : 'Sign Language → Text / Voice'}
        </Text>
      </View>

      {/* Mode toggle */}
      <View style={S.modeRow}>
        <TouchableOpacity
          style={[S.modeBtn, recognitionMode === 'phrase' && S.modeBtnActive]}
          onPress={() => setRecognitionMode('phrase')}
          activeOpacity={0.8}
        >
          <Text style={[S.modeBtnText, recognitionMode === 'phrase' && S.modeBtnTextActive]}>
            {isTamil ? 'சொற்றொடர் முறை' : 'Phrase Mode'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[S.modeBtn, recognitionMode === 'alphabet' && S.modeBtnActive]}
          onPress={() => setRecognitionMode('alphabet')}
          activeOpacity={0.8}
        >
          <Text style={[S.modeBtnText, recognitionMode === 'alphabet' && S.modeBtnTextActive]}>
            {isTamil ? 'எழுத்து முறை' : 'Alphabet Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Camera */}
      <View style={S.cameraContainer}>
        <SignToTextDetector
          onHandDetected={handleHandDetected}
          onHandNotDetected={handleHandNotDetected}
        />
        {!detected && (
          <View style={S.statusBadge}>
            <Text style={S.statusText}>{isTamil ? 'சைகைக்காக காத்திருக்கிறது...' : 'Waiting for sign...'}</Text>
          </View>
        )}
        {signRecognizing && detected && (
          <View style={[S.statusBadge, S.statusBadgeActive]}>
            <ActivityIndicator size="small" color={PRIMARY} />
            <Text style={[S.statusText, { color: PRIMARY }]}>
              {isTamil ? 'சைகை கண்டறிகிறது...' : 'Recognizing sign...'}
            </Text>
          </View>
        )}
      </View>

      {/* Warnings */}
      {filteredOutNotice && !lowConfidenceNotice && (
        <View style={S.warningBox}>
          <Feather name="clock" size={13} color={WARNING} style={{ marginRight: 6 }} />
          <Text style={S.warningText}>
            {isTamil ? 'செல்லுபடியான சைகைக்காக காத்திருக்கிறது...' : 'Waiting for a valid sign...'}
          </Text>
        </View>
      )}
      {lowConfidenceNotice && (
        <View style={S.warningBox}>
          <Feather name="alert-triangle" size={13} color={WARNING} style={{ marginRight: 6 }} />
          <Text style={S.warningText}>
            {isTamil ? 'சைகை தெளிவாக இல்லை. மீண்டும் முயற்சிக்கவும்.' : 'Sign not recognized clearly. Please try again.'}
          </Text>
        </View>
      )}

      {/* Detection status */}
      <View style={S.detectionBox}>
        {recognitionMode === 'phrase' ? (
          <>
            <Text style={S.label}>{isTamil ? 'கண்டறிந்த சைகை:' : 'Detected Gesture:'}</Text>
            <Text style={S.value}>
              {detected && currentGesture?.word ? currentGesture.word : (isTamil ? 'சைகை இல்லை' : 'No gesture detected')}
            </Text>
          </>
        ) : (
          <>
            <Text style={S.label}>{isTamil ? 'உருவாகும் வார்த்தை:' : 'Building Word:'}</Text>
            <Text style={S.value}>
              {currentWord || '—'} {detected && currentLetter ? `[${currentLetter}]` : ''}
            </Text>
            <View style={S.miniBtnRow}>
              <TouchableOpacity style={S.miniBtn} onPress={() => setCurrentWord(prev => prev.slice(0, -1))}>
                <Text style={S.miniBtnText}>Del</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.miniBtn} onPress={() => setCurrentWord('')}>
                <Text style={S.miniBtnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.miniBtn, S.miniBtnPrimary]} onPress={handleConfirmAlphabetWord}>
                <Text style={[S.miniBtnText, { color: '#fff' }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Result box */}
      <View style={S.resultBox}>
        <Text style={S.resultLabel}>{isTamil ? 'அடையாளம் காணப்பட்ட செய்தி:' : 'Recognized Message:'}</Text>
        <Text style={S.resultText}>
          {recognizedText || (isTamil ? 'செய்தி எதுவும் பெறப்படவில்லை' : 'No message recognized yet')}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={S.btnRow}>
        <TouchableOpacity
          style={[S.btn, S.btnPrimary, !recognizedText && S.btnDisabled]}
          onPress={handleSpeakToStaff}
          disabled={!recognizedText}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="volume-high" size={15} color="#fff" style={{ marginRight: 6 }} />
          <Text style={S.btnText}>{staffLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={S.btnSecondary} onPress={handleTryAgain} activeOpacity={0.85}>
          <MaterialCommunityIcons name="refresh" size={15} color={PRIMARY} style={{ marginRight: 4 }} />
          <Text style={[S.btnText, { color: PRIMARY }]}>{isTamil ? 'மீண்டும்' : 'Try Again'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={S.btnSecondary} onPress={handleClear} activeOpacity={0.85}>
          <Feather name="trash-2" size={14} color={TEXT_MID} style={{ marginRight: 4 }} />
          <Text style={[S.btnText, { color: TEXT_MID }]}>{isTamil ? 'அழி' : 'Clear'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const S = StyleSheet.create({
  panel: {
    backgroundColor: CARD_BG,
    borderColor:     '#C5D8F0',
    borderWidth:     1.5,
    borderRadius:    20,
    padding:         16,
    marginTop:       12,
    gap:             12,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.05,
    shadowRadius:    6,
    elevation:       2,
  },
  titleRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIconCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: TEXT_DARK, flex: 1 },

  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#C5D8F0',
    backgroundColor: PAGE_BG, alignItems: 'center',
  },
  modeBtnActive:     { borderColor: PRIMARY, backgroundColor: ICON_BG },
  modeBtnText:       { fontSize: 13, fontWeight: '600', color: TEXT_MID },
  modeBtnTextActive: { color: PRIMARY, fontWeight: '700' },

  cameraContainer: {
    height: 240, width: '100%', borderRadius: 14,
    overflow: 'hidden', backgroundColor: '#000',
    position: 'relative', borderWidth: 1, borderColor: '#C5D8F0',
  },
  statusBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(255,255,255,0.90)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#C5D8F0',
  },
  statusBadgeActive: { borderColor: PRIMARY },
  statusText: { color: TEXT_MID, fontSize: 12, fontWeight: '600' },

  warningBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WARNING + '14', borderColor: WARNING + '40',
    borderWidth: 1, borderRadius: 10, padding: 10,
  },
  warningText: { color: '#92400E', fontSize: 13, fontWeight: '600', flex: 1 },

  detectionBox: {
    backgroundColor: PAGE_BG, borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: '#C5D8F0',
  },
  label: { fontSize: 11, fontWeight: '700', color: TEXT_MID, textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 15, fontWeight: '700', color: PRIMARY, marginTop: 3 },

  miniBtnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  miniBtn: {
    backgroundColor: ICON_BG, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: '#C5D8F0',
  },
  miniBtnPrimary: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  miniBtnText:    { color: TEXT_DARK, fontSize: 12, fontWeight: '600' },

  resultBox: {
    backgroundColor: PAGE_BG, borderColor: '#C5D8F0',
    borderWidth: 1.5, borderRadius: 12, padding: 14,
  },
  resultLabel: { fontSize: 12, fontWeight: '700', color: TEXT_MID, marginBottom: 4 },
  resultText:  { fontSize: 15, fontWeight: '600', color: TEXT_DARK },

  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  btn: {
    flex: 2, minWidth: 130, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
  },
  btnPrimary: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22, shadowRadius: 6, elevation: 3,
  },
  btnDisabled:   { opacity: 0.45, shadowOpacity: 0 },
  btnSecondary: {
    flex: 1, minWidth: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: ICON_BG, paddingVertical: 12, paddingHorizontal: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#C5D8F0',
  },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
