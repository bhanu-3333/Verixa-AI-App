import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import SpeechService from '../../services/SpeechService';
import { useLanguage } from '../LanguageProvider';
import { SupportedLanguage } from '../../services/LanguageService';

interface SpeakReportPanelProps {
  reportSpeechText: string;
}

const C = {
  primary: '#208AEF',
  cardBg: '#151D30',
  text: '#F1F5F9',
  muted: '#94A3B8',
  border: '#1E293B',
  danger: '#EF4444',
};

export const SpeakReportPanel: React.FC<SpeakReportPanelProps> = ({ reportSpeechText }) => {
  const { language } = useLanguage();
  const isTamil = language === SupportedLanguage.TA;
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = useCallback(async () => {
    setIsSpeaking(true);
    const langCode = isTamil ? 'ta-IN' : 'en-US';
    await SpeechService.speak(reportSpeechText, langCode);
    // Note: SpeechService calls onDone internally
    setIsSpeaking(false);
  }, [reportSpeechText, isTamil]);

  const handleStop = useCallback(async () => {
    await SpeechService.stop();
    setIsSpeaking(false);
  }, []);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>🔊 {isTamil ? 'அறிக்கை படிக்கவும்' : 'Speak Out Report'}</Text>
      <Text style={styles.hint}>
        {isTamil
          ? 'அறிக்கை இயல்பான குரலில் படிக்கப்படும். ரகசிய தகவல்கள் தவிர்க்கப்படும்.'
          : 'The generated report will be converted into natural spoken summary for staff/doctor.'}
      </Text>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, isSpeaking && styles.btnDisabled]}
          onPress={handleSpeak}
          disabled={isSpeaking}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>🔊 {isTamil ? 'படிக்கவும்' : 'Speak Report'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnStop, !isSpeaking && styles.btnDisabled]}
          onPress={handleStop}
          disabled={!isSpeaking}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>⏹ {isTamil ? 'நிறுத்து' : 'Stop'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btn}
          onPress={handleSpeak}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>🔁 {isTamil ? 'மீண்டும்' : 'Replay'}</Text>
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
  hint: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    minWidth: 110,
    backgroundColor: C.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnStop: {
    backgroundColor: C.danger,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
