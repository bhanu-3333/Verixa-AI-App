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

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showAvatar, setShowAvatar] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Hand tracking state (from SignToTextDetector)
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

  // Step 4 Initialization: Greeting and Starting Session
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

      const initialText = getGreetingMessage(selectedService);
      const firstMsg: ChatMessage = {
        role: 'assistant',
        content: initialText,
        timestamp: new Date().toISOString(),
      };
      setChatMessages([firstMsg]);

      // Proceed to communication view
      setStep(4);

      // Play & speak initial greeting immediately
      setTimeout(async () => {
        await SpeechService.speak(initialText, isTamil ? 'ta-IN' : 'en-US');
        try {
          const sigml = await translateTextToSigml(initialText.toLowerCase());
          avatarRef.current?.play(sigml);
        } catch (err) {
          console.warn('[Avatar] Failed to play greeting SiGML:', err);
        }
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start banking session.');
    } finally {
      setLoading(false);
    }
  };

  // Chat message sender
  const handleSendChatMessage = async (msgContent = chatInput) => {
    if (!msgContent.trim() || !sessionId) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: msgContent.trim(),
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        user_id: user?.id || 'guest_user',
        session_id: sessionId,
        message: userMsg.content,
        language: language,
      };
      const res = await sendBankMessage(payload);

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.response_text,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);

      // Speak assistant response
      await SpeechService.speak(res.response_text, isTamil ? 'ta-IN' : 'en-US');

      // Avatar interpret animation
      try {
        const sigml = await translateTextToSigml(res.response_text.toLowerCase());
        avatarRef.current?.play(sigml);
      } catch (_) {}
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send chat message.');
    } finally {
      setChatLoading(false);
    }
  };

  // Browser Speech-to-Text handler (Voice input)
  const handleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    if (Platform.OS === 'web' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechReg = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechReg();
      rec.lang = isTamil ? 'ta-IN' : 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = (e: any) => {
        console.error('[SpeechRecognition] Error:', e);
        setIsListening(false);
      };
      rec.onresult = (event: any) => {
        const spokenText = event.results[0][0].transcript;
        if (spokenText) {
          handleSendChatMessage(spokenText);
        }
      };
      rec.start();
    } else {
      // Direct Native mock / alert
      setErrorMsg('Voice transcription is supported on Web browsers. Simulating voice input...');
      setTimeout(() => {
        setErrorMsg(null);
        handleSendChatMessage(isTamil ? 'வங்கி சேவை நிலவரம் என்ன?' : 'How is the transaction status?');
      }, 1500);
    }
  };

  // Hand gesture camera callbacks (Sign to Text)
  const handleHandDetected = useCallback((landmarks: any[]) => {
    setDetected(true);
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
              setChatInput((prev) => (prev ? prev + ' ' + candidate : candidate));
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
    setCurrentGesture(null);
    setCurrentLetter(null);
    setCurrentLetterConfidence(0);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    lastCandidateRef.current = null;
    lastConfirmedRef.current = null;
  }, []);

  const handleAlphabetConfirmWord = () => {
    if (currentWord.trim()) {
      setChatInput((prev) => (prev ? prev + ' ' + currentWord.trim() : currentWord.trim()));
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

        {/* STEP 4: AI Communication Panel */}
        {step === 4 && (
          <View style={styles.chatSection}>
            {/* SiGML Interpreter Avatar */}
            {showAvatar && (
              <View style={styles.avatarCard}>
                <View style={styles.avatarHeader}>
                  <Text style={styles.avatarTitle}>🤟 {isTamil ? t('bank_chat_avatar_title') : 'Sign Language Interpreter'}</Text>
                  <TouchableOpacity onPress={() => setShowAvatar(false)}>
                    <Text style={styles.closeBtn}>{isTamil ? t('bank_chat_close') : 'Close ×'}</Text>
                  </TouchableOpacity>
                </View>
                <SignLanguageAvatar ref={avatarRef} initialAvatar="anna" />
              </View>
            )}

            {/* Gesture Input Camera */}
            {showCamera && (
              <View style={styles.avatarCard}>
                <View style={styles.avatarHeader}>
                  <Text style={styles.avatarTitle}>📷 Sign Translation Camera</Text>
                  <TouchableOpacity onPress={() => setShowCamera(false)}>
                    <Text style={styles.closeBtn}>{isTamil ? t('bank_chat_close') : 'Close ×'}</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.cameraRow}>
                  <TouchableOpacity 
                    style={[styles.modeBtn, recognitionMode === 'phrase' && styles.modeBtnActive]}
                    onPress={() => setRecognitionMode('phrase')}
                  >
                    <Text style={styles.modeBtnText}>Phrase Mode</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modeBtn, recognitionMode === 'alphabet' && styles.modeBtnActive]}
                    onPress={() => setRecognitionMode('alphabet')}
                  >
                    <Text style={styles.modeBtnText}>Alphabet Mode</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cameraBox}>
                  <SignToTextDetector 
                    onHandDetected={handleHandDetected}
                    onHandNotDetected={handleHandNotDetected}
                  />
                </View>

                {/* Tracking status details */}
                <View style={styles.trackingStatus}>
                  {recognitionMode === 'phrase' ? (
                    <>
                      <Text style={styles.trackingTitle}>Detected Gesture:</Text>
                      <Text style={styles.trackingWord}>
                        {detected && currentGesture?.word ? currentGesture.word : 'No gesture detected'}
                      </Text>
                      <Text style={styles.supportedHint}>
                        Supported: Hello, Thank You, Please, Stop, Yes, No, Okay, Help...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.trackingTitle}>Letter / Word Building:</Text>
                      <Text style={styles.trackingWord}>
                        {currentWord || 'Type letters...'} {detected && currentLetter ? `[${currentLetter}]` : ''}
                      </Text>
                      <View style={styles.btnRow}>
                        <TouchableOpacity style={styles.actionMinBtn} onPress={() => setCurrentWord(prev => prev.slice(0, -1))}>
                          <Text style={styles.actionMinBtnText}>Del</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionMinBtn} onPress={() => setCurrentWord('')}>
                          <Text style={styles.actionMinBtnText}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionMinBtn, styles.actionMinBtnSubmit]} onPress={handleAlphabetConfirmWord}>
                          <Text style={styles.actionMinBtnText}>Confirm</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </View>
            )}

            {/* Chat Thread */}
            <View style={styles.card}>
              <View style={styles.chatHeader}>
                <Text style={styles.sectionTitle}>💬 {isTamil ? t('bank_chat_title') : 'AI Assistant Chat'}</Text>
                <View style={styles.chatButtons}>
                  {!showAvatar && (
                    <TouchableOpacity onPress={() => setShowAvatar(true)} style={styles.toggleBtn}>
                      <Text style={styles.toggleBtnText}>Show Avatar</Text>
                    </TouchableOpacity>
                  )}
                  {!showCamera && (
                    <TouchableOpacity onPress={() => setShowCamera(true)} style={styles.toggleBtn}>
                      <Text style={styles.toggleBtnText}>Show Camera</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.chatList}>
                {chatMessages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.chatBubble,
                        isUser ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                      ]}
                    >
                      <Text style={styles.chatBubbleText}>{msg.content}</Text>
                      {msg.timestamp && (
                        <Text style={styles.chatBubbleTime}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      )}
                    </View>
                  );
                })}
                {chatLoading && (
                  <View style={[styles.chatBubble, styles.chatBubbleAssistant, styles.loadingBubble]}>
                    <ActivityIndicator size="small" color={C.primary} />
                  </View>
                )}
              </View>

              {/* Message Composer */}
              <View style={styles.composer}>
                <TextInput
                  style={styles.chatInput}
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder={isTamil ? t('bank_chat_placeholder') : 'Type your message...'}
                  placeholderTextColor="#64748b"
                />
                
                {/* Voice capture mic button */}
                <TouchableOpacity
                  style={[styles.iconBtn, isListening && styles.listeningBtn]}
                  onPress={handleVoiceInput}
                >
                  <Text style={styles.btnIconText}>{isListening ? '🎙' : '🎤'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sendBtn, (!chatInput.trim() || chatLoading) && styles.sendBtnDisabled]}
                  disabled={!chatInput.trim() || chatLoading}
                  onPress={() => handleSendChatMessage()}
                >
                  <Text style={styles.sendBtnText}>{isTamil ? t('bank_chat_send') : 'Send'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, styles.completeBtn]}
                onPress={handleCompleteSession}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>{isTamil ? t('bank_complete_session') : 'Complete Session'}</Text>
              </TouchableOpacity>
            </View>
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
});
