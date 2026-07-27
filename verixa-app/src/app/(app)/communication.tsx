/**
 * Verixa AI — Sign Translator / Text to Sign Screen
 * UI restyled to match Home screen theme (light blue, white cards).
 * ALL business logic, backend calls, refs, and state are UNCHANGED.
 */

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
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SignLanguageAvatar, SignLanguageAvatarRef } from '../../components/SignLanguageAvatar';
import { translateTextToSigml } from '../../services/avatarService';
import { useLanguage } from '../../components/LanguageProvider';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Design tokens — mirrors home.tsx ────────────────────────────────────────
const PRIMARY    = '#1A56DB';
const PAGE_BG    = '#E8F2FF';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#0C1E3C';
const TEXT_MID   = '#6B7A8D';
const TEXT_LIGHT = '#A0AEC0';
const ICON_BG    = '#DCE8F8';
const DANGER     = '#f43f5e';
const BASE_W     = 390;

function scale(size: number, w: number, min: number, max: number) {
  return Math.max(min, Math.min(max, (w / BASE_W) * size));
}

// ─── Bold font — mirrors home.tsx ────────────────────────────────────────────
const BOLD_FONT: any = Platform.select({
  ios:     { fontFamily: 'Helvetica Neue', fontWeight: '700' },
  android: { fontFamily: 'sans-serif', fontWeight: '700' },
  default: { fontFamily: 'Arial, sans-serif', fontWeight: '700' },
});

export default function CommunicationScreen() {
  // ── All original state & logic — UNTOUCHED ──────────────────────────────
  const { t, language } = useLanguage();
  const avatarRef = useRef<SignLanguageAvatarRef>(null);
  const recognitionRef = useRef<any>(null);

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState('anna');

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

  function handlePlay() { handlePlayWithText(text); }

  function handleStop() {
    avatarRef.current?.stop();
    if (isListening) stopListening();
    setStatusMessage('');
  }

  function handleAvatarChange(name: string) {
    setSelectedAvatar(name);
    avatarRef.current?.setAvatar(name);
  }

  const toggleListening = () => {
    if (isListening) { stopListening(); return; }

    if (Platform.OS !== 'web') {
      setErrorMsg(
        language === 'ta'
          ? 'குரல் உள்ளீடு தற்போது கிடைக்கவில்லை. உங்கள் செய்தியை தட்டச்சு செய்யவும்.'
          : 'Voice input unavailable. Please type your message.'
      );
      return;
    }

    const SpeechRecognition =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setErrorMsg(
        language === 'ta'
          ? 'குரல் உள்ளீடு இந்த உலாவியில் ஆதரிக்கப்படவில்லை.'
          : 'Voice input is not supported in this browser.'
      );
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

      recognition.onend = () => { setIsListening(false); };

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
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
      setStatusMessage('');
    }
  };
  // ── End of original logic ───────────────────────────────────────────────

  const { width } = useWindowDimensions();
  const insets    = useSafeAreaInsets();
  const hPad      = scale(16, width, 12, 22);

  return (
    <SafeAreaView style={S.safeArea}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[S.header, {
        paddingTop:        insets.top + scale(12, width, 8, 16),
        paddingHorizontal: hPad,
      }]}>
        <TouchableOpacity
          style={S.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={scale(20, width, 18, 24)} color={PRIMARY} />
        </TouchableOpacity>

        <View style={S.headerText}>
          <Text style={[S.headerTitle, { fontSize: scale(20, width, 17, 24) }]}>
            Text / Voice to Sign
          </Text>
          <Text style={[S.headerSub, { fontSize: scale(12, width, 11, 14) }]}>
            Interactive 3D Sign Avatar Translation
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[S.scroll, { paddingHorizontal: hPad, paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Avatar WebGL Player ─────────────────────────────────────── */}
        <View style={S.playerCard}>
          <SignLanguageAvatar
            ref={avatarRef}
            initialAvatar={selectedAvatar}
            onError={(msg) => setErrorMsg(msg)}
          />
          {statusMessage !== '' && (
            <View style={S.statusOverlay}>
              <ActivityIndicator size="small" color={PRIMARY} style={{ marginRight: 8 }} />
              <Text style={S.statusOverlayText}>{statusMessage}</Text>
            </View>
          )}
        </View>

        {/* ── Avatar Character Selector ───────────────────────────────── */}
        <View style={S.card}>
          <Text style={[S.sectionLabel, { fontSize: scale(11, width, 10, 13) }]}>
            SELECT AVATAR CHARACTER
          </Text>
          <View style={S.avatarRow}>
            {avatarOptions.map((av) => (
              <TouchableOpacity
                key={av}
                style={[
                  S.avChip,
                  selectedAvatar === av ? S.avChipActive : S.avChipInactive,
                ]}
                onPress={() => handleAvatarChange(av)}
                activeOpacity={0.8}
              >
                <Text style={[
                  S.avChipText,
                  { fontSize: scale(13, width, 11, 15) },
                  selectedAvatar === av ? S.avChipTextActive : S.avChipTextInactive,
                ]}>
                  {av}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Text / Voice Input ──────────────────────────────────────── */}
        <View style={S.card}>
          {/* Row: label + listening badge */}
          <View style={S.inputLabelRow}>
            <Text style={[S.sectionLabel, { fontSize: scale(11, width, 10, 13) }]}>
              TEXT OR VOICE INPUT
            </Text>
            {isListening && (
              <View style={S.listeningBadge}>
                <View style={S.listeningDot} />
                <Text style={S.listeningText}>LISTENING</Text>
              </View>
            )}
          </View>

          {/* Input + mic */}
          <View style={S.inputWrap}>
            <TextInput
              style={[S.textInput, { fontSize: scale(14, width, 12, 16) }]}
              value={text}
              onChangeText={(v) => { setText(v); if (errorMsg) setErrorMsg(null); }}
              placeholder="Type text or tap  Microphone to speak..."
              placeholderTextColor={TEXT_LIGHT}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[S.micBtn, isListening && S.micBtnActive]}
              onPress={toggleListening}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={isListening ? 'stop' : 'microphone'}
                size={scale(18, width, 16, 22)}
                color={isListening ? '#fff' : PRIMARY}
              />
            </TouchableOpacity>
          </View>

          {/* Error */}
          {errorMsg && (
            <View style={S.errorBox}>
              <Feather name="alert-circle" size={14} color={DANGER} style={{ marginRight: 6 }} />
              <Text style={[S.errorText, { fontSize: scale(13, width, 11, 15) }]}>
                {errorMsg}
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={S.btnRow}>
            <TouchableOpacity
              style={[S.btn, S.btnPlay, (loading || isListening) && S.btnDisabled]}
              onPress={handlePlay}
              disabled={loading || isListening}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <MaterialCommunityIcons name="play" size={scale(16, width, 14, 19)} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={[S.btnText, { fontSize: scale(15, width, 13, 17) }]}>Generate Sign</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[S.btn, S.btnStop]}
              onPress={handleStop}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="stop" size={scale(16, width, 14, 19)} color={TEXT_DARK} style={{ marginRight: 6 }} />
              <Text style={[S.btnText, { fontSize: scale(15, width, 13, 17), color: TEXT_DARK }]}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Vocabulary Info Card ────────────────────────────────────── */}
        <View style={S.infoCard}>
          <View style={S.infoTitleRow}>
            <View style={S.infoIconCircle}>
              <MaterialCommunityIcons name="information-outline" size={18} color={PRIMARY} />
            </View>
            <Text style={[S.infoTitle, { fontSize: scale(14, width, 12, 16) }]}>
              Signing Vocabulary & Features
            </Text>
          </View>

          {[
            { icon: 'microphone' as const,       text: 'Voice Input: Tap Microphone to speak hands-free.',                              bold: 'Microphone' },
            { icon: 'human-handsup' as const,    text: 'Automatic Avatar: Recognized voice automatically generates 3D sign gestures.', bold: null },
            { icon: 'text-box-outline' as const, text: 'Pre-mapped words: hello, welcome, red (others fingerspelled).',                 bold: null },
          ].map((item, i) => (
            <View key={i} style={S.infoRow}>
              <View style={S.infoRowIcon}>
                <MaterialCommunityIcons name={item.icon} size={14} color={PRIMARY} />
              </View>
              <Text style={[S.infoText, { fontSize: scale(13, width, 11, 15) }]}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection:   'row',
    alignItems:      'center',
    paddingBottom:   16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0ECF8',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    6,
    elevation:       4,
  },
  backBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: ICON_BG,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     12,
  },
  headerText: { flex: 1 },
  headerTitle: {
    color: TEXT_DARK,
    ...BOLD_FONT,
  },
  headerSub: {
    color:     TEXT_MID,
    marginTop: 2,
  },

  // ── Scroll ───────────────────────────────────────────────────────────────
  scroll: { paddingTop: 20 },

  // ── Avatar player ────────────────────────────────────────────────────────
  playerCard: {
    borderRadius: 20,
    overflow:     'hidden',
    backgroundColor: CARD_BG,
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation:    3,
    marginBottom: 16,
    position:     'relative',
  },
  statusOverlay: {
    position:        'absolute',
    bottom:          12,
    left:            12,
    right:           12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius:    10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     '#C5D8F0',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.08,
    shadowRadius:    4,
    elevation:       2,
  },
  statusOverlayText: {
    color:      PRIMARY,
    fontSize:   13,
    fontWeight: '700',
  },

  // ── Shared card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: CARD_BG,
    borderRadius:    20,
    padding:         16,
    marginBottom:    16,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.04,
    shadowRadius:    6,
    elevation:       2,
  },

  // ── Section label ────────────────────────────────────────────────────────
  sectionLabel: {
    color:          TEXT_MID,
    fontWeight:     '700',
    letterSpacing:  0.8,
    textTransform:  'uppercase',
    marginBottom:   12,
  },

  // ── Avatar chips ─────────────────────────────────────────────────────────
  avatarRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },
  avChip: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      20,
    borderWidth:       1.5,
  },
  avChipActive: {
    backgroundColor: PRIMARY,
    borderColor:     PRIMARY,
  },
  avChipInactive: {
    backgroundColor: ICON_BG,
    borderColor:     '#C5D8F0',
  },
  avChipText:         { fontWeight: '600' },
  avChipTextActive:   { color: '#fff' },
  avChipTextInactive: { color: TEXT_DARK },

  // ── Input section ────────────────────────────────────────────────────────
  inputLabelRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   12,
  },
  listeningBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: 'rgba(244,63,94,0.1)',
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     DANGER,
    gap:             5,
  },
  listeningDot: {
    width:           7,
    height:          7,
    borderRadius:    4,
    backgroundColor: DANGER,
  },
  listeningText: {
    color:      DANGER,
    fontSize:   11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  inputWrap: {
    position:    'relative',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: PAGE_BG,
    borderColor:     '#C5D8F0',
    borderWidth:     1.5,
    borderRadius:    14,
    paddingHorizontal: 14,
    paddingVertical:   12,
    paddingRight:    52,
    color:           TEXT_DARK,
    minHeight:       90,
    textAlignVertical: 'top',
  },
  micBtn: {
    position:        'absolute',
    right:           10,
    bottom:          10,
    backgroundColor: ICON_BG,
    width:           38,
    height:          38,
    borderRadius:    19,
    alignItems:      'center',
    justifyContent:  'center',
  },
  micBtnActive: {
    backgroundColor: DANGER,
  },
  errorBox: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: 'rgba(244,63,94,0.07)',
    borderRadius:    10,
    padding:         10,
    marginBottom:    12,
    borderWidth:     1,
    borderColor:     'rgba(244,63,94,0.2)',
  },
  errorText: {
    color:  DANGER,
    flex:   1,
    fontWeight: '500',
  },

  // ── Buttons ──────────────────────────────────────────────────────────────
  btnRow: {
    flexDirection: 'row',
    gap:           12,
  },
  btn: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius:   14,
  },
  btnPlay: {
    backgroundColor: PRIMARY,
    shadowColor:     PRIMARY,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.30,
    shadowRadius:    8,
    elevation:       4,
  },
  btnStop: {
    backgroundColor: ICON_BG,
    borderWidth:     1.5,
    borderColor:     '#C5D8F0',
  },
  btnDisabled: { opacity: 0.55 },
  btnText:     { color: '#fff', fontWeight: '700' },

  // ── Info card ────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: CARD_BG,
    borderRadius:    20,
    padding:         16,
    marginBottom:    8,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.04,
    shadowRadius:    6,
    elevation:       2,
    gap:             10,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
    marginBottom:  4,
  },
  infoIconCircle: {
    width:           34,
    height:          34,
    borderRadius:    17,
    backgroundColor: ICON_BG,
    alignItems:      'center',
    justifyContent:  'center',
  },
  infoTitle: {
    color: TEXT_DARK,
    ...BOLD_FONT,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           8,
  },
  infoRowIcon: {
    width:           24,
    height:          24,
    borderRadius:    12,
    backgroundColor: ICON_BG,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       1,
    flexShrink:      0,
  },
  infoText: {
    color:      TEXT_MID,
    flex:       1,
    lineHeight: 20,
  },
});
