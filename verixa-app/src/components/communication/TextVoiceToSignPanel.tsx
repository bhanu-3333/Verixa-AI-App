import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { translateTextToSigml } from '../../services/avatarService';
import { useLanguage } from '../LanguageProvider';
import { SupportedLanguage } from '../../services/LanguageService';

interface TextVoiceToSignPanelProps {
  avatarRef: React.RefObject<any>;
  avatarReady: boolean;
  onSendTextMessage?: (text: string) => void;
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
};

export const TextVoiceToSignPanel: React.FC<TextVoiceToSignPanelProps> = ({
  avatarRef,
  avatarReady,
  onSendTextMessage,
  staffType = 'staff',
}) => {
  const { language } = useLanguage();
  const isTamil = language === SupportedLanguage.TA;

  const [inputMessage, setInputMessage] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognizedVoiceText, setRecognizedVoiceText] = useState<string | null>(null);

  const isHospital = staffType === 'doctor';

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
    if (isListening) {
      setIsListening(false);
      return;
    }

    if (Platform.OS === 'web' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = isTamil ? 'ta-IN' : 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);

      rec.onresult = (event: any) => {
        const spoken = event.results[0]?.[0]?.transcript;
        if (spoken) {
          setRecognizedVoiceText(spoken);
          setInputMessage(spoken);
        }
      };

      rec.start();
    } else {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        const fallbackText = isTamil
          ? isHospital ? 'தயவுசெய்து உங்கள் அடையாள சான்றை வழங்கவும்' : 'தயவுசெய்து உங்கள் சான்றுகளை சரிபார்க்கவும்'
          : isHospital ? 'Please provide your identity proof.' : 'Please confirm your account details.';
        setRecognizedVoiceText(fallbackText);
        setInputMessage(fallbackText);
      }, 1200);
    }
  }, [isListening, isTamil, isHospital]);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>
        {isHospital ? '🧑‍⚕️' : '🧑‍💼'}{' '}
        {isTamil
          ? isHospital ? 'மருத்துவர் → குறியீட்டு மொழி' : 'வங்கி ஊழியர் → குறியீட்டு மொழி'
          : isHospital ? 'Doctor → Sign Language' : 'Bank Staff → Sign Language'}
      </Text>

      <Text style={styles.hint}>
        {isTamil
          ? isHospital
            ? 'நோயாளிக்கு அனுப்ப வேண்டிய செய்தியை தட்டச்சு செய்யுங்கள் அல்லது பேசுங்கள்.'
            : 'வாடிக்கையாளருக்கு அனுப்ப வேண்டிய செய்தியை தட்டச்சு செய்யுங்கள் அல்லது பேசுங்கள்.'
          : isHospital
            ? 'Type or speak a message for the patient to translate into Sign Language.'
            : 'Type or speak a message for the customer to translate into Sign Language.'}
      </Text>

      {/* Input box */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder={
            isTamil
              ? isHospital ? 'நோயாளிக்கான செய்தி...' : 'வாடிக்கையாளருக்கான செய்தி...'
              : isHospital ? 'Type message for the patient...' : 'Type message for the customer...'
          }
          placeholderTextColor="#64748b"
          returnKeyType="send"
          onSubmitEditing={handleTextSubmit}
        />

        <TouchableOpacity
          style={[styles.voiceBtn, isListening && styles.voiceBtnActive]}
          onPress={handleVoiceInput}
          activeOpacity={0.8}
        >
          <Text style={styles.voiceBtnIcon}>{isListening ? '🎙' : '🎤'}</Text>
        </TouchableOpacity>
      </View>

      {/* Recognized Voice Text display */}
      {recognizedVoiceText ? (
        <View style={styles.speechDisplayBox}>
          <Text style={styles.speechDisplayLabel}>{isTamil ? 'உணரப்பட்ட பேச்சு:' : 'Recognized Speech:'}</Text>
          <Text style={styles.speechDisplayText}>"{recognizedVoiceText}"</Text>
        </View>
      ) : null}

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.submitBtn, (!inputMessage.trim() || isTranslating) && styles.btnDisabled]}
        disabled={!inputMessage.trim() || isTranslating}
        onPress={handleTextSubmit}
        activeOpacity={0.8}
      >
        {isTranslating ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>🤟 {isTamil ? 'குறியீட்டு மொழியில் காட்டு' : 'Show in Sign Language'}</Text>
        )}
      </TouchableOpacity>

      {/* Avatar Loading status banner */}
      {!avatarReady && (
        <View style={styles.preparingBanner}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={styles.preparingText}>
            {isTamil ? 'குறியீட்டு மொழி அவதார் தயாராகிறது...' : 'Preparing Sign Language Avatar...'}
          </Text>
        </View>
      )}
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
  },
  voiceBtn: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  voiceBtnActive: {
    borderColor: C.accent,
    backgroundColor: 'rgba(0, 210, 255, 0.2)',
  },
  voiceBtnIcon: {
    fontSize: 18,
  },
  speechDisplayBox: {
    backgroundColor: '#0B0F19',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  speechDisplayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
    marginBottom: 2,
  },
  speechDisplayText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.accent,
    fontStyle: 'italic',
  },
  submitBtn: {
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  preparingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  preparingText: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
  },
});
