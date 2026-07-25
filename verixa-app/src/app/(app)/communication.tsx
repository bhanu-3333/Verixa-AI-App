import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SignLanguageAvatar, SignLanguageAvatarRef } from '../../components/SignLanguageAvatar';
import { translateTextToSigml } from '../../services/avatarService';
import { useLanguage } from '../../components/LanguageProvider';

export default function CommunicationScreen() {
  const { t, language } = useLanguage();
  const avatarRef = useRef<SignLanguageAvatarRef>(null);
  const recognitionRef = useRef<any>(null);

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState('anna');

  // Avatar character options
  const avatarOptions = ['anna', 'marc', 'francoise', 'luna', 'siggi', 'robotboy', 'beatrice', 'genie', 'otis', 'darshan', 'candy', 'max', 'carmen'];

  async function handlePlayWithText(inputText: string) {
    if (!inputText.trim()) return;
    setErrorMsg(null);
    try {
      setLoading(true);
      setStatusMessage('Generating Sign...');
      const sigml = await translateTextToSigml(inputText.trim());
      setStatusMessage('Playing Sign Avatar...');
      avatarRef.current?.play(sigml);
    } catch (err: any) {
      const msg = err.message || 'Failed to translate sign text.';
      setErrorMsg(msg);
      setStatusMessage('');
      if (msg.includes('Session expired') || msg.includes('log in again')) {
        setTimeout(() => router.replace('/(auth)/login'), 2000);
      }
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  }

  function handlePlay() {
    handlePlayWithText(text);
  }

  function handleStop() {
    avatarRef.current?.stop();
    if (isListening) stopListening();
    setStatusMessage('');
  }

  function handleAvatarChange(name: string) {
    setSelectedAvatar(name);
    avatarRef.current?.setAvatar(name);
  }

  // Voice Input Speech-to-Text Handler
  const toggleListening = () => {
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognition =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setErrorMsg('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('Listening for speech...');
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setText(transcript);
          if (event.results[0].isFinal) {
            setStatusMessage('Recognized voice! Generating sign...');
            handlePlayWithText(transcript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setStatusMessage('');
        setErrorMsg(`Speech recognition error: ${event.error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setStatusMessage('');
      setErrorMsg('Failed to launch voice microphone input.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
      setStatusMessage('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ {t('bank_back') || 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Text / Voice to Sign</Text>
          <Text style={styles.headerSub}>Interactive 3D Sign Avatar Translation</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar WebGL Player Frame */}
        <View style={styles.playerCard}>
          <SignLanguageAvatar
            ref={avatarRef}
            initialAvatar={selectedAvatar}
            onError={(msg) => setErrorMsg(msg)}
          />
          {statusMessage !== '' && (
            <View style={styles.statusOverlay}>
              <ActivityIndicator size="small" color="#00FFCC" style={{ marginRight: 8 }} />
              <Text style={styles.statusOverlayText}>{statusMessage}</Text>
            </View>
          )}
        </View>

        {/* Avatar Character Switcher */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Avatar Character</Text>
          <View style={styles.avatarRow}>
            {avatarOptions.map((av) => (
              <TouchableOpacity
                key={av}
                style={[
                  styles.avBadge,
                  selectedAvatar === av ? styles.avBadgeActive : styles.avBadgeInactive,
                ]}
                onPress={() => handleAvatarChange(av)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.avBadgeText,
                    selectedAvatar === av
                      ? styles.avBadgeTextActive
                      : styles.avBadgeTextInactive,
                  ]}
                >
                  {av}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Input translation form */}
        <View style={styles.card}>
          <View style={styles.inputHeaderRow}>
            <Text style={styles.sectionTitle}>Text or Voice Input</Text>
            {isListening && (
              <View style={styles.liveListeningBadge}>
                <Text style={styles.liveListeningBadgeText}>● LISTENING</Text>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={(t) => {
                setText(t);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Type text or tap 🎙️ Microphone to speak..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={3}
            />
            
            {/* Dedicated Microphone Button */}
            <TouchableOpacity
              style={[
                styles.micButton,
                isListening && styles.micButtonActive
              ]}
              onPress={toggleListening}
              activeOpacity={0.8}
            >
              <Text style={styles.micButtonIcon}>{isListening ? '⏹️' : '🎙️'}</Text>
            </TouchableOpacity>
          </View>

          {errorMsg && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠ {errorMsg}</Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPlay, (loading || isListening) && styles.btnDisabled]}
              onPress={handlePlay}
              disabled={loading || isListening}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnText}>▶  Generate Sign</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnStop]}
              onPress={handleStop}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>■  Stop</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vocabulary info */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Signing Vocabulary & Features</Text>
          <Text style={styles.noticeText}>
            • Voice Input: Tap <Text style={styles.boldText}>🎙️ Microphone</Text> to speak hands-free.
          </Text>
          <Text style={styles.noticeText}>
            • Automatic Avatar: Recognized voice automatically generates 3D sign gestures.
          </Text>
          <Text style={styles.noticeText}>
            • Pre-mapped words: <Text style={styles.boldText}>hello</Text>, <Text style={styles.boldText}>welcome</Text>, <Text style={styles.boldText}>red</Text> (others fingerspelled).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const C = {
  primary: '#208AEF',
  bg: '#0f172a',
  cardBg: '#1e293b',
  text: '#f8fafc',
  muted: '#94a3b8',
  danger: '#f43f5e',
  border: '#334155',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 44 : 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backBtn: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '400',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    color: '#d0eaff',
    marginTop: 2,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  playerCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  statusOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.4)',
  },
  statusOverlayText: {
    color: '#00FFCC',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: C.cardBg,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  liveListeningBadge: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.danger,
  },
  liveListeningBadgeText: {
    color: C.danger,
    fontSize: 11,
    fontWeight: '800',
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  avBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  avBadgeActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  avBadgeInactive: {
    backgroundColor: '#0f172a',
    borderColor: C.border,
  },
  avBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  avBadgeTextActive: {
    color: '#fff',
  },
  avBadgeTextInactive: {
    color: C.muted,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#0f172a',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 48,
    fontSize: 15,
    color: C.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  micButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: '#334155',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: C.danger,
  },
  micButtonIcon: {
    fontSize: 18,
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  btnPlay: {
    backgroundColor: C.primary,
  },
  btnStop: {
    backgroundColor: '#475569',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  noticeCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: C.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  noticeTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  noticeText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  boldText: {
    color: '#fff',
    fontWeight: '600',
  },
});
