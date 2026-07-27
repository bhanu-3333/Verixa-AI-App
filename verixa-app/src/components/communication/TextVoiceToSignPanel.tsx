import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { translateTextToSigml } from '../../services/avatarService';
import { useLanguage } from '../LanguageProvider';
import { SupportedLanguage } from '../../services/LanguageService';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

interface TextVoiceToSignPanelProps {
  avatarRef: React.RefObject<any>;
  avatarReady: boolean;
  onSendTextMessage?: (text: string) => void;
  staffType?: 'staff' | 'doctor';
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

export const TextVoiceToSignPanel: React.FC<TextVoiceToSignPanelProps> = ({
  avatarRef,
  avatarReady,
  onSendTextMessage,
  staffType = 'staff',
}) => {
  // ── All original logic — UNTOUCHED ───────────────────────────────────────
  const { language } = useLanguage();
  const isTamil    = language === SupportedLanguage.TA;
  const isHospital = staffType === 'doctor';

  const [inputMessage, setInputMessage]               = useState('');
  const [isTranslating, setIsTranslating]             = useState(false);
  const [isListening, setIsListening]                 = useState(false);
  const [recognizedVoiceText, setRecognizedVoiceText] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice]                 = useState<string | null>(null);

  const handleTranslateAndPlay = useCallback(async (textToPlay: string) => {
    if (!textToPlay.trim()) return;
    const cleanText = textToPlay.trim();
    setIsTranslating(true);
    try {
      const sigml = await translateTextToSigml(cleanText.toLowerCase());
      avatarRef.current?.play(sigml);
      onSendTextMessage?.(cleanText);
    } catch (err: any) {
      console.warn('[TextVoiceToSignPanel] SiGML translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  }, [avatarRef, onSendTextMessage]);

  const handleTextSubmit = useCallback(() => {
    if (!inputMessage.trim()) return;
    const text = inputMessage;
    setInputMessage('');
    setRecognizedVoiceText(null);
    handleTranslateAndPlay(text);
  }, [inputMessage, handleTranslateAndPlay]);

  const handleVoiceInput = useCallback(() => {
    if (isListening) { setIsListening(false); return; }
    setVoiceNotice(null);

    if (Platform.OS === 'web' && (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window))) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = isTamil ? 'ta-IN' : 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart  = () => {
        console.log('[DEBUG] Voice recognition initialized');
        setIsListening(true);
      };
      rec.onend    = () => setIsListening(false);
      rec.onerror  = () => setIsListening(false);
      rec.onresult = (event: any) => {
        const spoken = event.results[0]?.[0]?.transcript;
        if (spoken) {
          setRecognizedVoiceText(spoken);
          setInputMessage(spoken);
          handleTranslateAndPlay(spoken);
        }
      };
      rec.start();
    } else {
      setVoiceNotice(
        isTamil
          ? 'குரல் அங்கீகாரம் Expo Go அல்லது இந்த உலாவியில் ஆதரிக்கப்படவில்லை. குரல் உள்ளீட்டிற்கு Development Build, APK அல்லது Chrome தேவை. செய்தியை தட்டச்சு செய்யவும்.'
          : 'Voice recognition is unavailable in Expo Go / this browser. Voice input requires a Development Build, standalone APK, or Chrome. Please type your message.'
      );
    }
  }, [isListening, isTamil, handleTranslateAndPlay]);

  return (
    <View style={S.panel}>
      {/* Title */}
      <View style={S.titleRow}>
        <View style={S.titleIconCircle}>
          <MaterialCommunityIcons
            name={isHospital ? 'doctor' : 'account-tie'}
            size={18}
            color={PRIMARY}
          />
        </View>
        <Text style={S.title}>
          {isTamil
            ? (isHospital ? 'மருத்துவர் → குறியீட்டு மொழி' : 'வங்கி ஊழியர் → குறியீட்டு மொழி')
            : (isHospital ? 'Doctor → Sign Language' : 'Bank Staff → Sign Language')}
        </Text>
      </View>

      <Text style={S.hint}>
        {isTamil
          ? (isHospital
            ? 'நோயாளிக்கு அனுப்ப வேண்டிய செய்தியை தட்டச்சு செய்யுங்கள் அல்லது பேசுங்கள்.'
            : 'வாடிக்கையாளருக்கு அனுப்ப வேண்டிய செய்தியை தட்டச்சு செய்யுங்கள் அல்லது பேசுங்கள்.')
          : (isHospital
            ? 'Type or speak a message for the patient to translate into Sign Language.'
            : 'Type or speak a message for the customer to translate into Sign Language.')}
      </Text>

      {/* Input + mic */}
      <View style={S.inputRow}>
        <TextInput
          style={S.textInput}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder={
            isTamil
              ? (isHospital ? 'நோயாளிக்கான செய்தி...' : 'வாடிக்கையாளருக்கான செய்தி...')
              : (isHospital ? 'Type message for the patient...' : 'Type message for the customer...')
          }
          placeholderTextColor={TEXT_LIGHT}
          returnKeyType="send"
          onSubmitEditing={handleTextSubmit}
        />
        <TouchableOpacity
          style={[S.micBtn, isListening && S.micBtnActive]}
          onPress={handleVoiceInput}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name={isListening ? 'stop' : 'microphone'}
            size={18}
            color={isListening ? '#fff' : PRIMARY}
          />
        </TouchableOpacity>
      </View>

      {/* Recognized speech display */}
      {recognizedVoiceText ? (
        <View style={S.speechBox}>
          <Text style={S.speechLabel}>{isTamil ? 'உணரப்பட்ட பேச்சு:' : 'Recognized Speech:'}</Text>
          <Text style={S.speechText}>"{recognizedVoiceText}"</Text>
        </View>
      ) : null}

      {/* Voice notice for Expo Go / Unsupported environments */}
      {voiceNotice ? (
        <View style={S.noticeBox}>
          <Feather name="info" size={14} color="#D97706" style={{ marginRight: 6 }} />
          <Text style={S.noticeText}>{voiceNotice}</Text>
        </View>
      ) : null}

      {/* Submit */}
      <TouchableOpacity
        style={[S.submitBtn, (!inputMessage.trim() || isTranslating) && S.btnDisabled]}
        disabled={!inputMessage.trim() || isTranslating}
        onPress={handleTextSubmit}
        activeOpacity={0.85}
      >
        {isTranslating
          ? <ActivityIndicator size="small" color="#fff" />
          : <>
              <MaterialCommunityIcons name="hand-wave" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={S.submitBtnText}>
                {isTamil ? 'குறியீட்டு மொழியில் காட்டு' : 'Show in Sign Language'}
              </Text>
            </>
        }
      </TouchableOpacity>

      {/* Avatar preparing banner */}
      {!avatarReady && (
        <View style={S.preparingBanner}>
          <ActivityIndicator size="small" color={PRIMARY} />
          <Text style={S.preparingText}>
            {isTamil ? 'குறியீட்டு மொழி அவதார் தயாராகிறது...' : 'Preparing Sign Language Avatar...'}
          </Text>
        </View>
      )}
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
  hint:  { fontSize: 13, color: TEXT_MID, lineHeight: 18 },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textInput: {
    flex:              1,
    backgroundColor:   PAGE_BG,
    borderColor:       '#C5D8F0',
    borderWidth:       1.5,
    borderRadius:      12,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:          14,
    color:             TEXT_DARK,
  },
  micBtn: {
    width:           42,
    height:          42,
    borderRadius:    21,
    backgroundColor: ICON_BG,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     '#C5D8F0',
  },
  micBtnActive: { backgroundColor: DANGER, borderColor: DANGER },

  speechBox: {
    backgroundColor: PAGE_BG, borderRadius: 10, padding: 10,
    borderWidth: 1.5, borderColor: '#C5D8F0',
  },
  speechLabel: { fontSize: 11, fontWeight: '700', color: TEXT_MID, marginBottom: 3 },
  speechText:  { fontSize: 14, fontWeight: '600', color: PRIMARY, fontStyle: 'italic' },

  submitBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius:    14,
    shadowColor:     PRIMARY,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.25,
    shadowRadius:    8,
    elevation:       4,
  },
  btnDisabled:    { opacity: 0.45, shadowOpacity: 0 },
  submitBtnText:  { color: '#fff', fontSize: 14, fontWeight: '700' },

  preparingBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    backgroundColor: ICON_BG,
    padding:         10,
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     '#C5D8F0',
  },
  preparingText: { fontSize: 12, color: TEXT_MID, fontWeight: '600' },

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  noticeText: { fontSize: 12, color: '#92400E', fontWeight: '600', flex: 1 },
});
