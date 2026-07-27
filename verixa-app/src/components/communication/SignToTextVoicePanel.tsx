import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import SignToTextDetector from '../SignToTextDetector';
import SpeechService from '../../services/SpeechService';
import { useLanguage } from '../LanguageProvider';
import { SupportedLanguage } from '../../services/LanguageService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SignLanguageAvatarRef } from '../SignLanguageAvatar';
import { translateTextToSigml } from '../../services/avatarService';

interface SignToTextVoicePanelProps {
  staffType?: 'staff' | 'doctor';
  allowedPhrases?: string[];
  avatarRef?: React.RefObject<SignLanguageAvatarRef | null>;
  onSentenceRecognized?: (phraseText: string) => void;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY   = '#1A56DB';
const PAGE_BG   = '#E8F2FF';
const CARD_BG   = '#FFFFFF';
const TEXT_DARK = '#0C1E3C';
const TEXT_MID  = '#6B7A8D';
const ICON_BG   = '#DCE8F8';
const WARNING   = '#F59E0B';

export const SignToTextVoicePanel: React.FC<SignToTextVoicePanelProps> = ({
  staffType = 'staff',
  allowedPhrases,
  avatarRef,
  onSentenceRecognized,
}) => {
  const { language } = useLanguage();
  const isTamil = language === SupportedLanguage.TA;

  const [signRecognizing, setSignRecognizing] = useState(false);
  const [recognizedText, setRecognizedText]   = useState<string | null>(null);

  const phraseText = staffType === 'doctor'
    ? (isTamil ? 'நான் எப்போது எனது மாத்திரைகளை சாப்பிட வேண்டும்?' : 'When should I take my tablets?')
    : (isTamil ? 'வங்கி கணக்கு தொடங்க என்ன விவரங்கள் தேவை?' : 'What details are required to create a bank account?');

  const handleRecognizeDemoSign = useCallback(() => {
    if (signRecognizing) return;

    setSignRecognizing(true);
    setRecognizedText(null);

    setTimeout(() => {
      setRecognizedText(phraseText);
      setSignRecognizing(false);

      const langCode = isTamil ? 'ta-IN' : 'en-US';
      SpeechService.speak(phraseText, langCode);

      if (avatarRef?.current) {
        translateTextToSigml(phraseText.toLowerCase()).then((sigml) => {
          avatarRef.current?.play(sigml);
        }).catch(() => {});
      }

      if (onSentenceRecognized) {
        onSentenceRecognized(phraseText);
      }
    }, 2000);
  }, [phraseText, isTamil, avatarRef, onSentenceRecognized, signRecognizing]);

  const handleSpeakToStaff = async () => {
    if (!recognizedText) return;
    const langCode = isTamil ? 'ta-IN' : 'en-US';
    await SpeechService.speak(recognizedText, langCode);
  };

  const handleTryAgain = () => {
    setRecognizedText(null);
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

      {/* Camera Preview */}
      <View style={S.cameraContainer}>
        <SignToTextDetector />
      </View>

      {/* Instruction text */}
      <Text style={S.instructionText}>
        {isTamil ? '🖐️ உங்கள் சைகையை செய்யவும். முடிந்ததும் கீழே அழுத்தவும்' : '🖐️ Perform your sign. When finished press Recognize Sign'}
      </Text>

      {/* Action button */}
      <TouchableOpacity
        style={[S.btnCapture, signRecognizing && S.btnDisabled]}
        onPress={handleRecognizeDemoSign}
        disabled={signRecognizing}
        activeOpacity={0.85}
      >
        {signRecognizing ? (
          <>
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
            <Text style={S.btnCaptureText}>
              {isTamil ? 'சைகை அறியப்படுகிறது...' : 'Recognizing Sign...'}
            </Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="camera-iris" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={S.btnCaptureText}>
              {recognizedText
                ? (isTamil ? 'மீண்டும் முயற்சிக்கவும் (Try Again)' : 'Try Again')
                : (isTamil ? 'சைகையை கண்டறி (Recognize Sign)' : 'Recognize Sign')}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Result box */}
      <View style={S.resultBox}>
        <Text style={S.resultLabel}>{isTamil ? 'அடையாளம் காணப்பட்ட செய்தி:' : 'Recognized Message:'}</Text>
        <Text style={S.resultText}>
          {recognizedText || (isTamil ? 'செய்தி எதுவும் பெறப்படவில்லை' : 'No message recognized yet')}
        </Text>
      </View>

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
  instructionText: {
    color: TEXT_MID,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 4,
  },
  btnCapture: {
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 2,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  btnCaptureText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

