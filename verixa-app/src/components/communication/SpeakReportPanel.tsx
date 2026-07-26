import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import SpeechService from '../../services/SpeechService';
import { useLanguage } from '../LanguageProvider';
import { SupportedLanguage } from '../../services/LanguageService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SpeakReportPanelProps {
  reportSpeechText: string;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY   = '#1A56DB';
const PAGE_BG   = '#E8F2FF';
const CARD_BG   = '#FFFFFF';
const TEXT_DARK = '#0C1E3C';
const TEXT_MID  = '#6B7A8D';
const ICON_BG   = '#DCE8F8';
const DANGER    = '#EF4444';

export const SpeakReportPanel: React.FC<SpeakReportPanelProps> = ({ reportSpeechText }) => {
  // ── All original logic — UNTOUCHED ───────────────────────────────────────
  const { language } = useLanguage();
  const isTamil = language === SupportedLanguage.TA;
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = useCallback(async () => {
    setIsSpeaking(true);
    const langCode = isTamil ? 'ta-IN' : 'en-US';
    await SpeechService.speak(reportSpeechText, langCode);
    setIsSpeaking(false);
  }, [reportSpeechText, isTamil]);

  const handleStop = useCallback(async () => {
    await SpeechService.stop();
    setIsSpeaking(false);
  }, []);

  return (
    <View style={S.panel}>
      {/* Title row */}
      <View style={S.titleRow}>
        <View style={S.titleIconCircle}>
          <MaterialCommunityIcons name="volume-high" size={18} color={PRIMARY} />
        </View>
        <Text style={S.title}>
          {isTamil ? 'அறிக்கை படிக்கவும்' : 'Speak Out Report'}
        </Text>
      </View>

      <Text style={S.hint}>
        {isTamil
          ? 'அறிக்கை இயல்பான குரலில் படிக்கப்படும். ரகசிய தகவல்கள் தவிர்க்கப்படும்.'
          : 'The generated report will be converted into natural spoken summary for staff/doctor.'}
      </Text>

      <View style={S.btnRow}>
        {/* Speak */}
        <TouchableOpacity
          style={[S.btn, S.btnPrimary, isSpeaking && S.btnDisabled]}
          onPress={handleSpeak}
          disabled={isSpeaking}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="play" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={S.btnText}>{isTamil ? 'படிக்கவும்' : 'Speak Report'}</Text>
        </TouchableOpacity>

        {/* Stop */}
        <TouchableOpacity
          style={[S.btn, S.btnStop, !isSpeaking && S.btnDisabled]}
          onPress={handleStop}
          disabled={!isSpeaking}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="stop" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={S.btnText}>{isTamil ? 'நிறுத்து' : 'Stop'}</Text>
        </TouchableOpacity>

        {/* Replay */}
        <TouchableOpacity style={[S.btn, S.btnSecondary]} onPress={handleSpeak} activeOpacity={0.85}>
          <MaterialCommunityIcons name="refresh" size={16} color={PRIMARY} style={{ marginRight: 6 }} />
          <Text style={[S.btnText, { color: PRIMARY }]}>{isTamil ? 'மீண்டும்' : 'Replay'}</Text>
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
  titleRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIconCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: TEXT_DARK, flex: 1 },
  hint:  { fontSize: 13, color: TEXT_MID, lineHeight: 18 },
  btnRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
    marginTop:     4,
  },
  btn: {
    flex:           1,
    minWidth:       100,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical:  12,
    paddingHorizontal: 14,
    borderRadius:   12,
  },
  btnPrimary: {
    backgroundColor: PRIMARY,
    shadowColor:     PRIMARY,
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.22,
    shadowRadius:    6,
    elevation:       3,
  },
  btnStop: {
    backgroundColor: DANGER,
    shadowColor:     DANGER,
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.18,
    shadowRadius:    6,
    elevation:       2,
  },
  btnSecondary: {
    backgroundColor: ICON_BG,
    borderWidth:     1.5,
    borderColor:     '#C5D8F0',
  },
  btnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  btnText:     { color: '#fff', fontSize: 13, fontWeight: '700' },
});
