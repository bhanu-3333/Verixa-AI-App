import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import SpeechService from '../../services/SpeechService';
import { SignLanguageAvatar, SignLanguageAvatarRef } from '../../components/SignLanguageAvatar';
import { translateTextToSigml } from '../../services/avatarService';
import { startBankSession, sendBankMessage, completeBankSession, ChatMessage } from '../../services/bankService';
import { getUser } from '../../utils/storage';
import { SupportedLanguage } from '../../services/LanguageService';
import { useLanguage } from '../../components/LanguageProvider';
import SignToTextDetector from '../../components/SignToTextDetector';
import { recognizeAlphabet, getWordSuggestion } from '../../services/AlphabetRecognizer';
import { recognizeGesture, getSupportedGestures, type GestureResult } from '../../services/GestureRecognizer';
import { CommunicationModeSelector, CommunicationMode } from '../../components/communication/CommunicationModeSelector';
import { SpeakReportPanel } from '../../components/communication/SpeakReportPanel';
import { SignToTextVoicePanel } from '../../components/communication/SignToTextVoicePanel';
import { TextVoiceToSignPanel } from '../../components/communication/TextVoiceToSignPanel';

const C = {
  primary: '#208AEF',
  accent: '#00D2FF',
  bg: '#0B0F19',
  cardBg: '#151D30',
  text: '#F1F5F9',
  muted: '#94A3B8',
  danger: '#EF4444',
  success: '#10B981',
  border: '#1E293B',
};

// Step progress indicator
function StepIndicator({ current, total, isTamil }: { current: number; total: number; isTamil: boolean }) {
  return (
    <View style={stepStyles.container}>
      {Array.from({ length: total }, (_, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <React.Fragment key={idx}>
            <View
              style={[
                stepStyles.dot,
                done && stepStyles.dotDone,
                active && stepStyles.dotActive,
              ]}
            >
              <Text style={[stepStyles.dotText, (done || active) && stepStyles.dotTextActive]}>
                {done ? '✓' : idx}
              </Text>
            </View>
            {idx < total && (
              <View style={[stepStyles.line, done && stepStyles.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(32, 138, 239, 0.15)',
  },
  dotDone: {
    borderColor: C.success,
    backgroundColor: C.success,
  },
  dotText: { fontSize: 13, fontWeight: '700', color: C.muted },
  dotTextActive: { color: C.primary },
  line: {
    flex: 0.2,
    width: 30,
    height: 2,
    backgroundColor: C.border,
    marginHorizontal: 8,
  },
  lineDone: { backgroundColor: C.success },
});

export default function BankScreen() {
  const avatarRef = useRef<SignLanguageAvatarRef>(null);
  const { width: screenWidth } = useWindowDimensions();
  const { language, t } = useLanguage();

  // Flow step state: 1 (Select Service), 2 (Summary Card), 3 (Form), 4 (AI Chat & Avatar), 5 (Success Screen)
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formFields, setFormFields] = useState<Record<string, string>>({});

  // Chat State (kept for session backend — not displayed in new UI)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Step 4 UI state
  type BankCommMode = null | 'speak' | 'sign_to_text' | 'text_to_sign';
  const [bankCommMode, setBankCommMode] = useState<BankCommMode>(null);

  // Avatar preloading & readiness
  const [avatarMounted, setAvatarMounted] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);

  // Speak Report
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Sign → Text
  const [signRecognizedText, setSignRecognizedText] = useState<string | null>(null);
  const [signRecognizing, setSignRecognizing] = useState(false);

  // Text / Voice → Sign
  const [staffInput, setStaffInput] = useState('');
  const [sendingToSign, setSendingToSign] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Hand tracking state (Sign→Text camera panel)
  const [detected, setDetected] = useState(false);
  const [recognitionMode, setRecognitionMode] = useState<'phrase' | 'alphabet'>('phrase');
  const [currentGesture, setCurrentGesture] = useState<GestureResult | null>(null);
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [currentLetterConfidence, setCurrentLetterConfidence] = useState<number>(0);
  const [currentWord, setCurrentWord] = useState<string>('');

  // Refs for hold-timer and duplicate prevention
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCandidateRef = useRef<string | null>(null);
  const lastConfirmedRef = useRef<string | null>(null);

  useEffect(() => {
    getUser<any>().then((u) => setUser(u));
  }, []);

  const isTamil = language === SupportedLanguage.TA;

  // Step 1 Options
  const SERVICES = useMemo(() => [
    { id: 'Create Account', label: t('bank_service_create_account') || 'Create New Account', icon: '📝' },
    { id: 'Fund Transfer', label: t('bank_service_fund_transfer') || 'Fund Transfer', icon: '💸' },
    { id: 'Block ATM', label: t('bank_service_block_atm') || 'Block ATM Card', icon: '💳' },
  ], [language, t]);

  // ── Sensitive-field masking helpers ────────────────────────────────────────
  const maskAadhaar = (v: string) => {
    const d = v.replace(/\D/g, '');
    return d.length >= 4 ? `XXXX XXXX ${d.slice(-4)}` : 'XXXX XXXX XXXX';
  };
  const maskAccount = (v: string) => {
    const d = v.replace(/\D/g, '');
    return d.length >= 4 ? `XXXXXX${d.slice(-4)}` : 'XXXXXXXXXX';
  };
  const maskCard = (v: string) => {
    const d = v.replace(/\D/g, '');
    return d.length >= 4 ? `XXXX XXXX XXXX ${d.slice(-4)}` : 'XXXX XXXX XXXX XXXX';
  };

  // ── Bank Service Report builder ─────────────────────────────────────────────
  const buildBankReportRows = useCallback(() => {
    const rows: { label: string; value: string; highlight?: boolean }[] = [];
    const svc = SERVICES.find((s) => s.id === selectedService);
    rows.push({ label: isTamil ? 'சேவை' : 'Service', value: svc?.label || selectedService });
    rows.push({ label: isTamil ? 'வங்கி' : 'Bank', value: 'Verixa Smart Bank' });
    rows.push({
      label: isTamil ? 'நிலை' : 'Status',
      value: isTamil ? 'ஊழியர் ஆய்வுக்கு தயார்' : 'Ready for Staff Review',
      highlight: true,
    });

    if (selectedService === 'Create Account') {
      if (formFields.name) rows.push({ label: isTamil ? 'பெயர்' : 'Name', value: formFields.name });
      if (formFields.aadhaar) rows.push({ label: isTamil ? 'ஆதார்' : 'Aadhaar', value: maskAadhaar(formFields.aadhaar) });
      if (formFields.pan) rows.push({ label: 'PAN', value: formFields.pan.toUpperCase() });
      if (formFields.mobile) rows.push({ label: isTamil ? 'மொபைல்' : 'Mobile', value: formFields.mobile });
    } else if (selectedService === 'Fund Transfer') {
      if (formFields.beneficiary) rows.push({ label: isTamil ? 'பெறுவோர்' : 'Beneficiary', value: formFields.beneficiary });
      if (formFields.account_number) rows.push({ label: isTamil ? 'கணக்கு' : 'Account', value: maskAccount(formFields.account_number) });
      if (formFields.ifsc) rows.push({ label: 'IFSC', value: formFields.ifsc.toUpperCase() });
      if (formFields.amount) rows.push({ label: isTamil ? 'தொகை' : 'Amount', value: `₹ ${formFields.amount}` });
    } else if (selectedService === 'Block ATM') {
      if (formFields.card_number) rows.push({ label: isTamil ? 'அட்டை' : 'Card', value: maskCard(formFields.card_number) });
      if (formFields.reason) rows.push({ label: isTamil ? 'காரணம்' : 'Reason', value: formFields.reason });
    }
    return rows;
  }, [selectedService, formFields, SERVICES, isTamil]);

  const buildBankReportSpeech = useCallback(() => {
    const svc = SERVICES.find((s) => s.id === selectedService);
    const parts: string[] = [];
    if (isTamil) {
      parts.push(`வங்கி சேவை: ${svc?.label || selectedService}.`);
      parts.push('வெரிக்ஸா ஸ்மார்ட் வங்கி.');
      if (selectedService === 'Create Account') {
        if (formFields.name) parts.push(`வாடிக்கையாளர் பெயர்: ${formFields.name}.`);
        if (formFields.pan) parts.push(`பான் எண்: ${formFields.pan.toUpperCase()}.`);
      } else if (selectedService === 'Fund Transfer') {
        if (formFields.beneficiary) parts.push(`பெறுவோர்: ${formFields.beneficiary}.`);
        if (formFields.amount) parts.push(`தொகை: ரூபாய் ${formFields.amount}.`);
      } else if (selectedService === 'Block ATM') {
        if (formFields.reason) parts.push(`தடுக்கும் காரணம்: ${formFields.reason}.`);
      }
      parts.push('ஊழியர் ஆய்வுக்கு தயார்.');
    } else {
      parts.push(`Banking service: ${svc?.label || selectedService}.`);
      parts.push('Bank: Verixa Smart Bank.');
      if (selectedService === 'Create Account') {
        if (formFields.name) parts.push(`Customer name: ${formFields.name}.`);
        if (formFields.pan) parts.push(`PAN number: ${formFields.pan.toUpperCase()}.`);
      } else if (selectedService === 'Fund Transfer') {
        if (formFields.beneficiary) parts.push(`Beneficiary: ${formFields.beneficiary}.`);
        if (formFields.amount) parts.push(`Transfer amount: Rupees ${formFields.amount}.`);
      } else if (selectedService === 'Block ATM') {
        if (formFields.reason) parts.push(`Reason for blocking: ${formFields.reason}.`);
      }
      parts.push('Ready for bank staff review.');
    }
    return parts.join(' ');
  }, [selectedService, formFields, SERVICES, isTamil]);

  // Step 2 Summary info mappings
  const getRequiredDocs = (srv: string) => {
    switch (srv) {
      case 'Create Account': return t('bank_docs_create_account') || 'Aadhaar Card, PAN Card, Passport Photo, Address Proof';
      case 'Fund Transfer': return t('bank_docs_fund_transfer') || 'Beneficiary Details, Account Number, IFSC Code';
      case 'Block ATM': return t('bank_docs_block_atm') || 'ATM Card Number, Registered Mobile Number';
      default: return '';
    }
  };

  const getEstTime = (srv: string) => {
    switch (srv) {
      case 'Create Account': return t('bank_time_create_account') || '30–45 minutes';
      case 'Fund Transfer': return t('bank_time_fund_transfer') || '5–10 minutes';
      case 'Block ATM': return t('bank_time_block_atm') || '5 minutes';
      default: return '';
    }
  };

  const getGreetingMessage = (srv: string) => {
    switch (srv) {
      case 'Create Account': return t('bank_greeting_create_account') || 'Welcome! I will help you open a new bank account.';
      case 'Fund Transfer': return t('bank_greeting_fund_transfer') || 'Welcome! I will assist you with the fund transfer.';
      case 'Block ATM': return t('bank_greeting_block_atm') || 'Hello! I will help you block your ATM card immediately.';
      default: return t('bank_greeting_other') || 'Hello! I am your banking assistant. How can I help you today?';
    }
  };

  // Step 3 Service Specific fields
  const renderFormFields = () => {
    const handleFieldChange = (key: string, val: string) => {
      setFormFields((prev) => ({ ...prev, [key]: val }));
    };

    if (selectedService === 'Create Account') {
      return (
        <View style={styles.formContainer}>
          <Text style={styles.formLabel}>{t('bank_form_full_name') || 'Full Name'}</Text>
          <TextInput
            style={styles.textInput}
            value={formFields.name || ''}
            onChangeText={(t) => handleFieldChange('name', t)}
            placeholder={t('bank_form_full_name') || 'Enter your name...'}
            placeholderTextColor="#64748b"
          />

          <Text style={styles.formLabel}>{t('bank_form_aadhaar') || 'Aadhaar Number'}</Text>
          <TextInput
            style={styles.textInput}
            value={formFields.aadhaar || ''}
            onChangeText={(t) => handleFieldChange('aadhaar', t)}
            placeholder="12-digit Aadhaar Number"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
            maxLength={12}
          />

          <Text style={styles.formLabel}>{t('bank_form_pan') || 'PAN Number'}</Text>
          <TextInput
            style={styles.textInput}
            value={formFields.pan || ''}
            onChangeText={(t) => handleFieldChange('pan', t)}
            placeholder="10-digit Alphanumeric PAN"
            placeholderTextColor="#64748b"
            autoCapitalize="characters"
            maxLength={10}
          />

          <Text style={styles.formLabel}>{t('bank_form_mobile') || 'Mobile Number'}</Text>
          <TextInput
            style={styles.textInput}
            value={formFields.mobile || ''}
            onChangeText={(t) => handleFieldChange('mobile', t)}
            placeholder="10-digit Registered Mobile Number"
            placeholderTextColor="#64748b"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
      );
    } else if (selectedService === 'Fund Transfer') {
      return (
        <View style={styles.formContainer}>
          <Text style={styles.formLabel}>{t('bank_form_beneficiary') || 'Beneficiary Name'}</Text>
          <TextInput
            style={styles.textInput}
            value={formFields.beneficiary || ''}
            onChangeText={(t) => handleFieldChange('beneficiary', t)}
            placeholder="Beneficiary Name"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.formLabel}>{t('bank_form_account_number') || 'Account Number'}</Text>
          <TextInput
            style={styles.textInput}
            value={formFields.account_number || ''}
            onChangeText={(t) => handleFieldChange('account_number', t)}
            placeholder="Recipient Account Number"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
          />

          <Text style={styles.formLabel}>{t('bank_form_ifsc') || 'IFSC Code'}</Text>
          <TextInput
            style={styles.textInput}
            value={formFields.ifsc || ''}
            onChangeText={(t) => handleFieldChange('ifsc', t)}
            placeholder="IFSC Code (e.g. SBIN0001234)"
            placeholderTextColor="#64748b"
            autoCapitalize="characters"
          />

          <Text style={styles.formLabel}>{t('bank_form_amount') || 'Amount'}</Text>
          <TextInput
            style={styles.textInput}
            value={formFields.amount || ''}
            onChangeText={(t) => handleFieldChange('amount', t)}
            placeholder="Transfer Amount"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
          />
        </View>
      );
    } else if (selectedService === 'Block ATM') {
      return (
        <View style={styles.formContainer}>
          <Text style={styles.formLabel}>{t('bank_form_card_number') || 'ATM Card Number'}</Text>
          <TextInput
            style={styles.textInput}
            value={formFields.card_number || ''}
            onChangeText={(t) => handleFieldChange('card_number', t)}
            placeholder="16-digit Card Number"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
            maxLength={16}
          />

          <Text style={styles.formLabel}>{t('bank_form_reason') || 'Reason'}</Text>
          <TextInput
            style={styles.textInput}
            value={formFields.reason || ''}
            onChangeText={(t) => handleFieldChange('reason', t)}
            placeholder="Reason for blocking card..."
            placeholderTextColor="#64748b"
          />
        </View>
      );
    }
    return null;
  };

  const isFormValid = () => {
    if (selectedService === 'Create Account') {
      return (
        formFields.name?.trim() &&
        formFields.aadhaar?.trim() &&
        formFields.pan?.trim() &&
        formFields.mobile?.trim()
      );
    } else if (selectedService === 'Fund Transfer') {
      return (
        formFields.beneficiary?.trim() &&
        formFields.account_number?.trim() &&
        formFields.ifsc?.trim() &&
        formFields.amount?.trim()
      );
    } else if (selectedService === 'Block ATM') {
      return formFields.card_number?.trim() && formFields.reason?.trim();
    }
    return false;
  };

  // Step 4 Initialization: Start backend session and proceed to report screen
  const initAIChatSession = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const payload = {
        user_id: user?.id || 'guest_user',
        bank_name: 'Verixa Smart Bank',
        service_type: selectedService,
        language: language,
      };
      const res = await startBankSession(payload);
      setSessionId(res.session_id);
      setBankCommMode(null);
      setStep(4);
      // Preload avatar in background immediately
      setAvatarMounted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start banking session.');
    } finally {
      setLoading(false);
    }
  };

  // Speak the Bank Report (TTS)
  const handleSpeakReport = useCallback(async () => {
    setIsSpeaking(true);
    const text = buildBankReportSpeech();
    await SpeechService.speak(text, isTamil ? 'ta-IN' : 'en-US');
    setIsSpeaking(false);
  }, [buildBankReportSpeech, isTamil]);

  const handleStopSpeaking = useCallback(async () => {
    await SpeechService.stop();
    setIsSpeaking(false);
  }, []);

  // Text / Voice → Sign: send typed or voice-captured message to avatar
  const handleSendTextToSign = useCallback(async () => {
    if (!staffInput.trim()) return;
    const text = staffInput.trim();
    setStaffInput('');
    setSendingToSign(true);
    try {
      const sigml = await translateTextToSigml(text.toLowerCase());
      avatarRef.current?.play(sigml);
      if (sessionId) {
        sendBankMessage({
          user_id: user?.id || 'guest_user',
          session_id: sessionId,
          message: text,
          language,
        }).catch(() => {});
      }
    } catch (err: any) {
      console.warn('[BankScreen] SiGML error:', err);
    } finally {
      setSendingToSign(false);
    }
  }, [staffInput, sessionId, user, language]);

  // Voice input for Text/Voice → Sign panel (Browser STT)
  const handleVoiceInput = useCallback(() => {
    if (isListening) { setIsListening(false); return; }
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
        const spoken = event.results[0][0].transcript;
        if (spoken) setStaffInput(spoken);
      };
      rec.start();
    } else {
      // Native fallback
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        setStaffInput(isTamil ? 'வணக்கம், உங்கள் சேவை தொடர்கிறது' : 'Hello, your service is being processed');
      }, 1500);
    }
  }, [isListening, isTamil]);

  // Hand gesture camera callbacks (Sign → Text panel)
  const handleHandDetected = useCallback((landmarks: any[]) => {
    setDetected(true);
    setSignRecognizing(true);
    if (recognitionMode === 'phrase') {
      const result = recognizeGesture(landmarks);
      setCurrentGesture(result);
      const candidate = result.word;
      if (candidate) {
        if (candidate !== lastCandidateRef.current) {
          if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
          lastCandidateRef.current = candidate;
          if (candidate !== lastConfirmedRef.current) {
            holdTimerRef.current = setTimeout(() => {
              setSignRecognizedText((prev) => (prev ? prev + ' ' + candidate : candidate));
              lastConfirmedRef.current = candidate;
            }, 800);
          }
        }
      } else {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        lastCandidateRef.current = null;
        lastConfirmedRef.current = null;
      }
    } else {
      const { letter, confidence } = recognizeAlphabet(landmarks);
      setCurrentLetter(letter);
      setCurrentLetterConfidence(confidence);
      setCurrentGesture(null);
      const candidate = confidence >= 0.7 ? letter : null;
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
    setCurrentLetterConfidence(0);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    lastCandidateRef.current = null;
    lastConfirmedRef.current = null;
  }, []);

  const handleAlphabetConfirmWord = () => {
    if (currentWord.trim()) {
      setSignRecognizedText((prev) => (prev ? prev + ' ' + currentWord.trim() : currentWord.trim()));
      setCurrentWord('');
    }
  };

  // Complete and save session inside MongoDB
  const handleCompleteSession = async () => {
    if (!sessionId) return;
    setLoading(true);
    setErrorMsg(null);

    const payload = {
      user_id: user?.id || 'guest_user',
      session_id: sessionId,
      service_type: selectedService,
      form_data: formFields,
      chat_history: chatMessages,
      language: language,
    };

    try {
      await completeBankSession(payload);
      setStep(5);
      // Wait and return to dashboard
      setTimeout(() => {
        router.replace('/(app)/home');
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit dynamic form.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step > 1 && step < 5) {
              setStep(step - 1);
            } else {
              router.back();
            }
          }}
        >
          <Text style={styles.backBtnText}>‹ {isTamil ? 'முந்தைய' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>🏦 {isTamil ? t('bank_title') : 'Bank Mode'}</Text>
          <Text style={styles.headerSub}>
            {step === 1 && (isTamil ? t('bank_step1_subtitle') : 'Step 1 — Select banking service')}
            {step === 2 && (isTamil ? t('bank_step2_subtitle') : 'Step 2 — Service details summary')}
            {step === 3 && (isTamil ? t('bank_step3_subtitle') : 'Step 3 — Service form')}
            {step === 4 && (isTamil ? t('bank_step4_subtitle') : 'Step 4 — AI Interactive Chat')}
            {step === 5 && (isTamil ? t('bank_step5_subtitle') : 'Step 5 — Completed')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {step < 5 && <StepIndicator current={step} total={4} isTamil={isTamil} />}

        {errorMsg && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {errorMsg}</Text>
          </View>
        )}

        {/* STEP 1: Service Selection */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{isTamil ? t('bank_select_service') : 'Choose a banking service to get started'}</Text>
            <View style={styles.grid}>
              {SERVICES.map((srv) => (
                <TouchableOpacity
                  key={srv.id}
                  style={[
                    styles.gridCard,
                    selectedService === srv.id && styles.gridCardActive,
                  ]}
                  onPress={() => setSelectedService(srv.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.gridCardIcon}>{srv.icon}</Text>
                  <Text style={styles.gridCardLabel}>{srv.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, !selectedService && styles.disabledButton]}
              disabled={!selectedService}
              onPress={() => setStep(2)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{isTamil ? t('bank_next') : 'Next ›'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Service Summary Card */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{isTamil ? t('bank_service_summary') : 'Service Summary Card'}</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{isTamil ? t('bank_service_name') : 'Service Name'}:</Text>
                <Text style={styles.summaryValue}>{SERVICES.find((s) => s.id === selectedService)?.label}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{isTamil ? t('bank_current_status') : 'Current Status'}:</Text>
                <Text style={[styles.summaryValue, styles.statusValue]}>{isTamil ? t('bank_status_pending') : 'Pending'}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{isTamil ? t('bank_required_docs') : 'Required Documents'}:</Text>
                <Text style={styles.summaryValue}>{getRequiredDocs(selectedService)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{isTamil ? t('bank_est_time') : 'Estimated Processing Time'}:</Text>
                <Text style={styles.summaryValue}>{getEstTime(selectedService)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStep(3)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{isTamil ? t('bank_next') : 'Next ›'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: Service Form */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{isTamil ? t('bank_form_title') : 'Fill Service Details'}</Text>
            {renderFormFields()}

            <TouchableOpacity
              style={[styles.primaryButton, !isFormValid() && styles.disabledButton]}
              disabled={!isFormValid()}
              onPress={initAIChatSession}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{isTamil ? t('bank_form_submit') : 'Proceed to Communication'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 4: Bank Service Report + 3 Communication Options */}
        {step === 4 && (
          <View style={styles.chatSection}>
            {/* ── Background-preloaded avatar (hidden until Option 3 selected) ── */}
            {avatarMounted && (
              <View style={{ height: bankCommMode === 'text_to_sign' ? undefined : 0, overflow: 'hidden' }}>
                <View style={styles.avatarCard}>
                  <View style={styles.avatarHeader}>
                    <Text style={styles.avatarTitle}>🤟 {isTamil ? 'குறியீட்டு மொழி அவதார்' : 'Sign Language Avatar'}</Text>
                    {avatarReady && <Text style={styles.avatarReadyBadge}>● {isTamil ? 'தயார்' : 'Ready'}</Text>}
                  </View>
                  <SignLanguageAvatar
                    ref={avatarRef}
                    initialAvatar="anna"
                    preload
                    onReady={() => setAvatarReady(true)}
                    onError={(msg) => console.warn('[Bank Avatar]', msg)}
                  />
                </View>
              </View>
            )}

            {/* ── Bank Service Report Card ── */}
            <View style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportHeaderIcon}>🏦</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportTitle}>{isTamil ? 'வங்கி சேவை அறிக்கை' : 'Bank Service Report'}</Text>
                  <Text style={styles.reportDate}>{new Date().toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.reportDivider} />
              {buildBankReportRows().map((row, i) => (
                <View key={i}>
                  <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>{row.label}</Text>
                    <Text style={[styles.reportValue, row.highlight && styles.reportValueHighlight]}>
                      {row.value}
                    </Text>
                  </View>
                  {i < buildBankReportRows().length - 1 && <View style={styles.reportRowDivider} />}
                </View>
              ))}
              <View style={styles.reportSecurityNote}>
                <Text style={styles.reportSecurityText}>
                  🔒 {isTamil ? 'முக்கிய தரவு மறைக்கப்பட்டுள்ளது. ரகசிய எண்கள் காட்டப்படாது.' : 'Sensitive data is masked. Secrets are never displayed or spoken.'}
                </Text>
              </View>
            </View>

            {/* ── 3 Communication Option Selector ── */}
            <CommunicationModeSelector
              currentMode={bankCommMode}
              onSelectMode={(mode) => {
                setBankCommMode(mode);
                if (mode === 'text_to_sign' && !avatarMounted) {
                  setAvatarMounted(true);
                }
              }}
              domain="bank"
            />

            {/* ── Option 1: Speak Out Report Panel ── */}
            {bankCommMode === 'speak' && (
              <SpeakReportPanel reportSpeechText={buildBankReportSpeech()} />
            )}

            {/* ── Option 2: Sign Language → Text / Voice Panel ── */}
            {bankCommMode === 'sign_to_text' && (
              <SignToTextVoicePanel staffType="staff" />
            )}

            {/* ── Option 3: Text / Voice → Sign Language Panel ── */}
            {bankCommMode === 'text_to_sign' && (
              <TextVoiceToSignPanel
                avatarRef={avatarRef}
                avatarReady={avatarReady}
                staffType="staff"
                onSendTextMessage={(msg) => {
                  if (sessionId) {
                    sendBankMessage({
                      user_id: user?.id || 'guest_user',
                      session_id: sessionId,
                      message: msg,
                      language,
                    }).catch(() => {});
                  }
                }}
              />
            )}

            {/* ── Complete Banking Service Button ── */}
            <TouchableOpacity
              style={[styles.primaryButton, styles.completeBtn]}
              onPress={handleCompleteSession}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                ✅ {isTamil ? 'வங்கி சேவையை முடிக்கவும்' : 'Complete Banking Service'}
              </Text>
            </TouchableOpacity>
          </View>
        )}




        {/* STEP 5: Success Completed Screen */}
        {step === 5 && (
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.successTitle}>{isTamil ? t('bank_success_title') : 'Service Completed Successfully'}</Text>
            <Text style={styles.successSubtitle}>
              {isTamil ? t('bank_success_subtitle') : 'Your banking session records have been successfully submitted and stored inside MongoDB.'}
            </Text>
            <ActivityIndicator style={styles.redirectSpinner} size="small" color={C.primary} />
            <Text style={styles.redirectText}>{isTamil ? t('bank_redirecting') : 'Redirecting back to dashboard...'}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 44 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  backBtn: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    color: C.accent,
    marginTop: 2,
  },
  scrollContainer: {
    paddingBottom: 60,
  },
  card: {
    backgroundColor: C.cardBg,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  gridCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#0F172A',
    borderColor: C.border,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gridCardActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(32, 138, 239, 0.12)',
  },
  gridCardIcon: {
    fontSize: 32,
  },
  gridCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#0B0F19',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 14,
    color: C.muted,
    fontWeight: '600',
    width: '40%',
  },
  summaryValue: {
    fontSize: 14,
    color: C.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  statusValue: {
    color: '#E5C158',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: C.border,
  },
  formContainer: {
    gap: 12,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    color: C.text,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderColor: C.border,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
  },
  primaryButton: {
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.4,
  },
  chatSection: {
    flex: 1,
  },
  avatarCard: {
    backgroundColor: C.cardBg,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  avatarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  avatarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  closeBtn: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chatButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#0F172A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  toggleBtnText: {
    color: C.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  chatList: {
    minHeight: 200,
    backgroundColor: '#0B0F19',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  chatBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 10,
  },
  chatBubbleUser: {
    backgroundColor: C.primary,
    alignSelf: 'flex-end',
  },
  chatBubbleAssistant: {
    backgroundColor: '#1E293B',
    alignSelf: 'flex-start',
  },
  chatBubbleText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 19,
  },
  chatBubbleTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  loadingBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0B0F19',
    borderColor: C.border,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
  },
  iconBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  listeningBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: C.danger,
  },
  btnIconText: {
    fontSize: 20,
  },
  sendBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },
  completeBtn: {
    backgroundColor: C.success,
    marginTop: 8,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 60,
    gap: 16,
  },
  successIcon: {
    fontSize: 64,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  redirectSpinner: {
    marginTop: 20,
  },
  redirectText: {
    fontSize: 12,
    color: C.muted,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: C.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  cameraBox: {
    height: 240,
    width: '100%',
    backgroundColor: '#000',
  },
  cameraRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    borderBottomWidth: 2,
    borderColor: C.accent,
  },
  modeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  trackingStatus: {
    backgroundColor: '#0F172A',
    padding: 14,
    gap: 8,
  },
  trackingTitle: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  trackingWord: {
    fontSize: 16,
    fontWeight: '700',
    color: C.accent,
  },
  supportedHint: {
    fontSize: 10,
    color: C.muted,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionMinBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMinBtnSubmit: {
    backgroundColor: C.accent,
  },
  actionMinBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // ── Bank Service Report Card Styles ──────────────────────────────────────
  avatarReadyBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  reportCard: {
    backgroundColor: '#151D30',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  reportHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 12,
  },
  reportHeaderIcon: {
    fontSize: 28,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  reportDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  reportDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginBottom: 12,
  },
  reportRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: 8,
  },
  reportLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    flex: 0.4,
  },
  reportValue: {
    fontSize: 14,
    color: '#F1F5F9',
    fontWeight: '600',
    flex: 0.6,
    textAlign: 'right' as const,
  },
  reportValueHighlight: {
    color: '#10B981',
  },
  reportRowDivider: {
    height: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
  },
  reportSecurityNote: {
    marginTop: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  reportSecurityText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
    lineHeight: 16,
  },
});
