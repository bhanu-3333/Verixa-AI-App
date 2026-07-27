// src/app/(app)/hospital.tsx
// Hospital Mode — Symptom selection, Body Pain Map, Medical Summary & 3-Mode Communication

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../components/LanguageProvider';

import { SignLanguageAvatar, SignLanguageAvatarRef } from '../../components/SignLanguageAvatar';
import SignToTextDetector from '../../components/SignToTextDetector';
import { translateTextToSigml } from '../../services/avatarService';
import { startHospitalSession, sendHospitalMessage, SymptomPayload } from '../../services/hospitalService';
import SpeechService from '../../services/SpeechService';
import { getUser } from '../../utils/storage';
import { CommunicationModeSelector, CommunicationMode } from '../../components/communication/CommunicationModeSelector';
import { SpeakReportPanel } from '../../components/communication/SpeakReportPanel';
import { SignToTextVoicePanel } from '../../components/communication/SignToTextVoicePanel';
import { TextVoiceToSignPanel } from '../../components/communication/TextVoiceToSignPanel';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


// Standard Symptoms list for Screen 1
const SYMPTOMS_LIST = [
  'Fever',
  'Headache',
  'Dizziness',
  'Vomiting',
  'Chest Pain',
  'Stomach Pain',
  'Weakness',
  'Difficulty Breathing',
  'Cough',
  'Nausea',
  'Other',
];

const SYMPTOM_KEYS: Record<string, string> = {
  'Fever': 'symptom_fever',
  'Headache': 'symptom_headache',
  'Dizziness': 'symptom_dizziness',
  'Vomiting': 'symptom_vomiting',
  'Chest Pain': 'symptom_chest_pain',
  'Stomach Pain': 'symptom_stomach_pain',
  'Weakness': 'symptom_weakness',
  'Difficulty Breathing': 'symptom_difficulty_breathing',
  'Cough': 'symptom_cough',
  'Nausea': 'symptom_nausea',
  'Other': 'symptom_other',
};

// Pain Intensity Levels (0-10)
const PAIN_LEVELS = [
  { level: 0, emoji: '😊', label: 'No Pain' },
  { level: 1, emoji: '🙂', label: 'Mild' },
  { level: 2, emoji: '🙂', label: 'Mild' },
  { level: 3, emoji: '🙂', label: 'Mild' },
  { level: 4, emoji: '😐', label: 'Moderate' },
  { level: 5, emoji: '😐', label: 'Moderate' },
  { level: 6, emoji: '😐', label: 'Moderate' },
  { level: 7, emoji: '😣', label: 'Severe' },
  { level: 8, emoji: '😣', label: 'Severe' },
  { level: 9, emoji: '😭', label: 'Worst' },
  { level: 10, emoji: '😭', label: 'Worst' },
];

export interface HotspotPoint {
  id: string;
  labelKey: string;
  defaultName: string;
  x: number;
  y: number;
}

// Normalized FRONT Body Map percentage coordinates (x%, y%)
const FRONT_HOTSPOTS: HotspotPoint[] = [
  // Head / Neck
  { id: 'f_head', labelKey: 'part_head', defaultName: 'Head', x: 50, y: 4 },
  { id: 'f_face', labelKey: 'part_face', defaultName: 'Face', x: 50, y: 8.5 },
  { id: 'f_neck', labelKey: 'part_neck', defaultName: 'Neck', x: 50, y: 13.5 },
  // Upper Body
  { id: 'f_l_shoulder', labelKey: 'part_left_shoulder', defaultName: 'Left Shoulder', x: 31, y: 19 },
  { id: 'f_r_shoulder', labelKey: 'part_right_shoulder', defaultName: 'Right Shoulder', x: 69, y: 19 },
  { id: 'f_chest', labelKey: 'part_chest', defaultName: 'Chest', x: 50, y: 22 },
  { id: 'f_u_abdomen', labelKey: 'part_upper_abdomen', defaultName: 'Upper Abdomen', x: 50, y: 28 },
  { id: 'f_m_abdomen', labelKey: 'part_middle_abdomen', defaultName: 'Middle Abdomen', x: 50, y: 34 },
  { id: 'f_l_abdomen', labelKey: 'part_lower_abdomen', defaultName: 'Lower Abdomen', x: 50, y: 40 },
  // Arms
  { id: 'f_l_u_arm', labelKey: 'part_left_upper_arm', defaultName: 'Left Upper Arm', x: 23, y: 25 },
  { id: 'f_r_u_arm', labelKey: 'part_right_upper_arm', defaultName: 'Right Upper Arm', x: 77, y: 25 },
  { id: 'f_l_elbow', labelKey: 'part_left_elbow', defaultName: 'Left Elbow', x: 20, y: 33 },
  { id: 'f_r_elbow', labelKey: 'part_right_elbow', defaultName: 'Right Elbow', x: 80, y: 33 },
  { id: 'f_l_wrist', labelKey: 'part_left_wrist', defaultName: 'Left Wrist', x: 16, y: 43 },
  { id: 'f_r_wrist', labelKey: 'part_right_wrist', defaultName: 'Right Wrist', x: 84, y: 43 },
  // Lower Body
  { id: 'f_pelvis', labelKey: 'part_pelvis', defaultName: 'Pelvis / Hip', x: 50, y: 46 },
  { id: 'f_l_thigh', labelKey: 'part_left_thigh', defaultName: 'Left Thigh', x: 40, y: 55 },
  { id: 'f_r_thigh', labelKey: 'part_right_thigh', defaultName: 'Right Thigh', x: 60, y: 55 },
  { id: 'f_l_knee', labelKey: 'part_left_knee', defaultName: 'Left Knee', x: 40, y: 69 },
  { id: 'f_r_knee', labelKey: 'part_right_knee', defaultName: 'Right Knee', x: 60, y: 69 },
  { id: 'f_l_ankle', labelKey: 'part_left_ankle', defaultName: 'Left Ankle', x: 38, y: 88 },
  { id: 'f_r_ankle', labelKey: 'part_right_ankle', defaultName: 'Right Ankle', x: 62, y: 88 },
];

// Normalized BACK Body Map percentage coordinates (x%, y%)
const BACK_HOTSPOTS: HotspotPoint[] = [
  // Head / Neck
  { id: 'b_head', labelKey: 'part_back_of_head', defaultName: 'Back of Head', x: 50, y: 4 },
  { id: 'b_neck', labelKey: 'part_neck', defaultName: 'Neck', x: 50, y: 13.5 },
  // Shoulders & Back
  { id: 'b_l_shoulder', labelKey: 'part_left_shoulder', defaultName: 'Left Shoulder', x: 31, y: 19 },
  { id: 'b_r_shoulder', labelKey: 'part_right_shoulder', defaultName: 'Right Shoulder', x: 69, y: 19 },
  { id: 'b_u_back', labelKey: 'part_upper_back', defaultName: 'Upper Back', x: 50, y: 22 },
  { id: 'b_m_back', labelKey: 'part_middle_back', defaultName: 'Middle Back', x: 50, y: 30 },
  { id: 'b_l_back', labelKey: 'part_lower_back', defaultName: 'Lower Back', x: 50, y: 38 },
  // Arms
  { id: 'b_l_u_arm', labelKey: 'part_left_upper_arm', defaultName: 'Left Upper Arm', x: 23, y: 25 },
  { id: 'b_r_u_arm', labelKey: 'part_right_upper_arm', defaultName: 'Right Upper Arm', x: 77, y: 25 },
  { id: 'b_l_elbow', labelKey: 'part_left_elbow', defaultName: 'Left Elbow', x: 20, y: 33 },
  { id: 'b_r_elbow', labelKey: 'part_right_elbow', defaultName: 'Right Elbow', x: 80, y: 33 },
  { id: 'b_l_wrist', labelKey: 'part_left_wrist', defaultName: 'Left Wrist', x: 16, y: 43 },
  { id: 'b_r_wrist', labelKey: 'part_right_wrist', defaultName: 'Right Wrist', x: 84, y: 43 },
  // Hips & Legs
  { id: 'b_l_hip', labelKey: 'part_left_hip', defaultName: 'Left Hip', x: 41, y: 46 },
  { id: 'b_r_hip', labelKey: 'part_right_hip', defaultName: 'Right Hip', x: 59, y: 46 },
  { id: 'b_l_thigh', labelKey: 'part_left_back_thigh', defaultName: 'Left Back Thigh', x: 40, y: 56 },
  { id: 'b_r_thigh', labelKey: 'part_right_back_thigh', defaultName: 'Right Back Thigh', x: 60, y: 56 },
  { id: 'b_l_knee', labelKey: 'part_left_back_knee', defaultName: 'Left Back Knee', x: 40, y: 69 },
  { id: 'b_r_knee', labelKey: 'part_right_back_knee', defaultName: 'Right Back Knee', x: 60, y: 69 },
  { id: 'b_l_calf', labelKey: 'part_left_calf', defaultName: 'Left Calf', x: 39, y: 78 },
  { id: 'b_r_calf', labelKey: 'part_right_calf', defaultName: 'Right Calf', x: 61, y: 78 },
  { id: 'b_l_ankle', labelKey: 'part_left_ankle', defaultName: 'Left Ankle', x: 38, y: 88 },
  { id: 'b_r_ankle', labelKey: 'part_right_ankle', defaultName: 'Right Ankle', x: 62, y: 88 },
];

// ─── Design tokens — mirrors home.tsx ────────────────────────────────────────
const C = {
  primary: '#1A56DB',
  bg:      '#E8F2FF',
  cardBg:  '#FFFFFF',
  text:    '#0C1E3C',
  muted:   '#6B7A8D',
  danger:  '#EF4444',
  border:  '#C5D8F0',
  iconBg:  '#DCE8F8',
  success: '#10B981',
};

// ── Animated Hotspot Component ─────────────────────────────────────────────
function AnimatedHotspot({
  point,
  selected,
  onPress,
  label,
}: {
  point: HotspotPoint;
  selected: boolean;
  onPress: () => void;
  label: string;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (selected) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.6, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulse.setValue(1);
    }
  }, [selected, pulse]);

  return (
    <TouchableOpacity
      style={[
        styles.hotspot,
        { left: `${point.x}%` as any, top: `${point.y}%` as any },
        selected && styles.hotspotSelected,
      ]}
      onPress={() => {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 2000);
        onPress();
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
    >
      {selected && (
        <Animated.View
          style={[
            styles.hotspotPulse,
            { transform: [{ scale: pulse }] },
          ]}
        />
      )}
      {showTooltip && (
        <View style={styles.tooltipBox}>
          <Text style={styles.tooltipText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Step Indicator Component ─────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
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
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#C5D8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  dotActive: {
    borderColor: '#1A56DB',
    backgroundColor: '#DCE8F8',
  },
  dotDone: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  dotText: { fontSize: 11, fontWeight: '700', color: '#A0AEC0' },
  dotTextActive: { color: '#1A56DB' },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#C5D8F0',
    marginHorizontal: 6,
  },
  lineDone: { backgroundColor: '#10B981' },
});

export default function HospitalScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;
  const avatarRef = useRef<SignLanguageAvatarRef>(null);
  const insets = useSafeAreaInsets();

  // Flow step: 1 (Symptoms), 2 (Body Map & Pain Intensity), 3 (Medical Summary & 3-Mode Comm)
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<any>(null);

  // Step 1: Symptoms Selection
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [otherSymptom, setOtherSymptom] = useState('');

  // Step 2: Body Map Selection (stored as HotspotPoint IDs)
  const [bodyView, setBodyView] = useState<'front' | 'back'>('front');
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);

  // Pain scale (0-10) & Optional Notes
  const [painIntensity, setPainIntensity] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Step 3: Session & Communication Mode State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Communication mode: null = choose, 'speak' | 'sign_to_text' | 'text_to_sign'
  type CommMode = null | 'speak' | 'sign_to_text' | 'text_to_sign';
  const [commMode, setCommMode] = useState<CommMode>(null);

  // Mode 1: Speak the Report
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Mode 2: Sign Language -> Text / Voice
  const [recognizedSign, setRecognizedSign] = useState<string | null>(null);
  const [signRecognizing, setSignRecognizing] = useState(false);

  // Mode 3: Text / Voice -> Sign Language
  const [avatarMounted, setAvatarMounted] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [textToSignInput, setTextToSignInput] = useState('');
  const [sendingToSign, setSendingToSign] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  useEffect(() => {
    getUser<any>().then((u) => setUser(u));
  }, []);

  const allHotspots = [...FRONT_HOTSPOTS, ...BACK_HOTSPOTS];

  const getHotspotLabel = useCallback(
    (pointId: string) => {
      const spot = allHotspots.find((s) => s.id === pointId);
      if (!spot) return pointId;
      return t(spot.labelKey) || spot.defaultName;
    },
    [allHotspots, t]
  );

  const getHotspotDefaultName = useCallback(
    (pointId: string) => {
      const spot = allHotspots.find((s) => s.id === pointId);
      return spot ? spot.defaultName : pointId;
    },
    [allHotspots]
  );

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const togglePointId = (pointId: string) => {
    setSelectedPointIds((prev) =>
      prev.includes(pointId)
        ? prev.filter((id) => id !== pointId)
        : [...prev, pointId]
    );
  };

  const handleClearAllPoints = () => {
    setSelectedPointIds([]);
  };

  const getPainLevelDesc = (val: number) => {
    let label = '';
    if (val === 0) label = t('pain_no_pain') || 'No Pain';
    else if (val <= 3) label = t('pain_mild') || 'Mild';
    else if (val <= 6) label = t('pain_moderate') || 'Moderate';
    else if (val <= 8) label = t('pain_severe') || 'Severe';
    else label = t('pain_worst') || 'Worst';
    return `${label} (${val})`;
  };

  const getSymptomsSummary = () => {
    const list = selectedSymptoms.map((s) => {
      if (s === 'Other' && otherSymptom.trim()) {
        return otherSymptom.trim();
      }
      return t(SYMPTOM_KEYS[s] || s) || s;
    });
    return list.length > 0 ? list.join(', ') : (t('hospital_none_selected') || 'None selected');
  };

  const getLocationsSummary = () => {
    if (selectedPointIds.length === 0) {
      return t('hospital_none_selected') || 'None selected';
    }
    const uniqueLabels = Array.from(new Set(selectedPointIds.map((id) => getHotspotLabel(id))));
    return uniqueLabels.join(', ');
  };

  const ensureSessionCreated = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId;
    setErrorMsg(null);
    const symptomsString = selectedSymptoms.map((s) => (s === 'Other' && otherSymptom.trim() ? otherSymptom.trim() : s)).join(', ');
    const locationsString = selectedPointIds.map((id) => getHotspotDefaultName(id)).join(', ');

    const payload: SymptomPayload = {
      user_id: user?.id || 'guest_user',
      hospital_name: 'Verixa General Hospital',
      department: 'Emergency & General Medicine',
      symptom: symptomsString || 'General Consult',
      pain_location: locationsString || 'None',
      pain_intensity: painIntensity,
      language: 'en',
    };

    try {
      const res = await startHospitalSession(payload);
      setSessionId(res.session_id);
      return res.session_id;
    } catch (err: any) {
      console.warn('[HospitalScreen] Session creation warning:', err);
      const fallbackId = 'session_' + Date.now();
      setSessionId(fallbackId);
      return fallbackId;
    }
  }, [sessionId, selectedSymptoms, otherSymptom, selectedPointIds, painIntensity, user, getHotspotDefaultName]);

  const handleProceedToStep3 = async () => {
    setStep(3);
    setCommMode(null);
    setAvatarMounted(true);
    await ensureSessionCreated();
  };

  const buildMedicalSpeechText = useCallback(() => {
    const sympList = selectedSymptoms.map((s) => (s === 'Other' && otherSymptom.trim() ? otherSymptom.trim() : s)).join(', ');
    const locList = selectedPointIds.map((id) => getHotspotLabel(id)).join(', ');
    const intensity = getPainLevelDesc(painIntensity);
    const parts: string[] = [];
    if (sympList) parts.push(`The patient reports ${sympList}.`);
    if (locList) parts.push(`Pain is located in the ${locList}.`);
    parts.push(`Pain intensity is ${intensity}.`);
    if (notes.trim()) parts.push(`Additional notes: ${notes.trim()}.`);
    return parts.join(' ');
  }, [selectedSymptoms, otherSymptom, selectedPointIds, painIntensity, notes, getHotspotLabel]);

  const handleSpeakReport = useCallback(async () => {
    setIsSpeaking(true);
    const text = buildMedicalSpeechText();
    await SpeechService.speak(text);
    setTimeout(() => setIsSpeaking(false), 100);
  }, [buildMedicalSpeechText]);

  const handleStopSpeaking = useCallback(async () => {
    await SpeechService.stop();
    setIsSpeaking(false);
  }, []);

  const handleSignRecognized = useCallback((phrase: string) => {
    setRecognizedSign(phrase);
    setSignRecognizing(false);
  }, []);

  const handleSpeakRecognizedSign = useCallback(async () => {
    if (!recognizedSign) return;
    await SpeechService.speak(recognizedSign);
  }, [recognizedSign]);

  const handleSelectTextToSign = useCallback(() => {
    setCommMode('text_to_sign');
    setAvatarMounted(true);
  }, []);

  const handleSendTextToSign = useCallback(async () => {
    if (!textToSignInput.trim()) return;
    const text = textToSignInput.trim();
    setTextToSignInput('');
    setSendingToSign(true);
    setAvatarLoading(true);
    try {
      const sigml = await translateTextToSigml(text.toLowerCase());
      avatarRef.current?.play(sigml);
      if (sessionId) {
        sendHospitalMessage({
          user_id: user?.id || 'guest_user',
          session_id: sessionId,
          message: text,
          language: 'en',
        }).catch(() => {});
      }
    } catch (err: any) {
      console.warn('[HospitalScreen] SiGML translation error:', err);
    } finally {
      setAvatarLoading(false);
      setSendingToSign(false);
    }
  }, [textToSignInput, sessionId, user]);

  const handleStartVoiceInput = useCallback(() => {
    setVoiceListening(true);
    setTimeout(() => {
      setVoiceText(t('voice_expo_go_notice') || 'Voice input unavailable. Please type your message.');
      setVoiceListening(false);
    }, 800);
  }, [t]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              router.back();
            }
          }}
        >
          <Feather name="arrow-left" size={20} color={C.primary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{t('home_hospital') || 'Hospital Mode'}</Text>
          <Text style={styles.headerSub}>
            {step === 1 && (t('hospital_symptoms_title') || 'Step 1 — Select Symptoms')}
            {step === 2 && (t('hospital_pain_title') || 'Step 2 — Pain Locations & Intensity')}
            {step === 3 && (t('hospital_comm_title') || 'Step 3 — Medical Consultation & Communication')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <StepIndicator current={step} total={3} />

        {errorMsg && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {t('hospital_symptoms_title') || 'What symptoms are you experiencing?'}
            </Text>

            <View style={styles.symptomsGrid}>
              {SYMPTOMS_LIST.map((symptom) => {
                const isSelected = selectedSymptoms.includes(symptom);
                const translatedLabel = t(SYMPTOM_KEYS[symptom] || symptom) || symptom;
                return (
                  <TouchableOpacity
                    key={symptom}
                    style={[styles.symptomChip, isSelected && styles.symptomChipActive]}
                    onPress={() => toggleSymptom(symptom)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.symptomChipText, isSelected && styles.symptomChipTextActive]}>
                      {translatedLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedSymptoms.includes('Other') && (
              <View style={styles.otherInputContainer}>
                <Text style={styles.inputLabel}>
                  {t('hospital_symptoms_other') || 'Other symptoms (Please specify):'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={otherSymptom}
                  onChangeText={setOtherSymptom}
                  placeholder="Specify symptoms..."
                  placeholderTextColor="#64748b"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, selectedSymptoms.length === 0 && styles.disabledButton]}
              disabled={selectedSymptoms.length === 0}
              onPress={() => setStep(2)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{t('next') || 'Next ›'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.step2Container}>
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabBtn, bodyView === 'front' && styles.tabBtnActive]}
                onPress={() => setBodyView('front')}
              >
                <Text style={[styles.tabBtnText, bodyView === 'front' && styles.tabBtnTextActive]}>
                  {t('hospital_front_view') || 'Front View'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, bodyView === 'back' && styles.tabBtnActive]}
                onPress={() => setBodyView('back')}
              >
                <Text style={[styles.tabBtnText, bodyView === 'back' && styles.tabBtnTextActive]}>
                  {t('hospital_back_view') || 'Back View'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bodyMapCard}>
              <Text style={styles.bodyMapHint}>
                {t('hospital_tap_body_hint') || 'Tap body parts where you feel pain (glowing markers appear)'}
              </Text>

              <View style={styles.bodyMapContainer}>
                <Image
                  source={
                    bodyView === 'front'
                      ? require('../../../assets/body/front_body.png')
                      : require('../../../assets/body/back_body.png')
                  }
                  style={styles.bodyImage}
                  resizeMode="contain"
                />

                {(bodyView === 'front' ? FRONT_HOTSPOTS : BACK_HOTSPOTS).map((spot) => {
                  const isSelected = selectedPointIds.includes(spot.id);
                  const label = t(spot.labelKey) || spot.defaultName;
                  return (
                    <AnimatedHotspot
                      key={spot.id}
                      point={spot}
                      selected={isSelected}
                      onPress={() => togglePointId(spot.id)}
                      label={label}
                    />
                  );
                })}
              </View>

              <View style={styles.selectedPartsBox}>
                <View style={styles.selectedHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    {t('hospital_selected_pain_locations') || 'Selected Pain Locations:'}
                  </Text>
                  {selectedPointIds.length > 0 && (
                    <TouchableOpacity onPress={handleClearAllPoints} style={styles.clearAllBtn}>
                      <Text style={styles.clearAllText}>{t('hospital_clear_all') || 'Clear All'}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {selectedPointIds.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {t('hospital_none_selected') || 'No body parts selected yet.'}
                  </Text>
                ) : (
                  <View style={styles.badgeRow}>
                    {selectedPointIds.map((id) => (
                      <TouchableOpacity
                        key={id}
                        style={styles.partBadge}
                        onPress={() => togglePointId(id)}
                      >
                        <Text style={styles.partBadgeText}>
                          {getHotspotLabel(id)} ×
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t('hospital_pain_title') || 'Pain Intensity:'}
              </Text>

              <Text style={styles.painIntensityDisplay}>
                {getPainLevelDesc(painIntensity)}
              </Text>

              <View style={styles.painScaleRow}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                  const isSelected = painIntensity === val;
                  let btnColor = '#10b981';
                  if (val >= 1 && val <= 3) btnColor = '#84cc16';
                  else if (val >= 4 && val <= 6) btnColor = '#f59e0b';
                  else if (val >= 7 && val <= 8) btnColor = '#ea580c';
                  else if (val >= 9) btnColor = '#ef4444';

                  return (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.painScaleBtn,
                        isSelected && { backgroundColor: btnColor, borderColor: btnColor },
                      ]}
                      onPress={() => setPainIntensity(val)}
                    >
                      <Text style={[styles.painScaleText, isSelected && { color: '#fff' }]}>
                        {val}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t('bank_form_description') || 'Optional Notes:'}
              </Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Describe onset, duration, sensation, or notes..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleProceedToStep3} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>
                {t('next') || 'Proceed to Communication ›'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.step3Container}>
            {/* ── Background-preloaded avatar (visible for text_to_sign & sign_to_text) ── */}
            {avatarMounted && (
              <View style={{ height: (commMode === 'text_to_sign' || commMode === 'sign_to_text') ? undefined : 0, overflow: 'hidden' }}>
                <View style={styles.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{t('hospital_text_voice_to_sign') || 'Sign Language Avatar'}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>● {t('ready') || 'Ready'}</Text>
                  </View>
                  <SignLanguageAvatar
                    ref={avatarRef}
                    initialAvatar="anna"
                    preload
                    onError={(msg) => console.warn('[Hospital Avatar]', msg)}
                  />
                </View>
              </View>
            )}

            {/* ── Medical Consultation Summary Card ── */}
            <View style={styles.medicalCard}>
              <View style={styles.medicalHeader}>
                <Text style={styles.medicalCardTitle}>{t('hospital_comm_title') || 'Medical Consultation Summary'}</Text>
                <Text style={styles.medicalDate}>{new Date().toLocaleString()}</Text>
              </View>

              <View style={styles.medicalDivider} />

              <View style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>{t('hospital_symptoms_title') || 'Symptoms'}</Text>
                <Text style={styles.medicalVal}>{getSymptomsSummary()}</Text>
              </View>

              <View style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>{t('hospital_selected_pain_locations') || 'Pain Locations'}</Text>
                <Text style={styles.medicalVal}>{getLocationsSummary()}</Text>
              </View>

              <View style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>{t('hospital_pain_title') || 'Pain Intensity'}</Text>
                <Text style={[styles.medicalVal, styles.boldTeal]}>{getPainLevelDesc(painIntensity)}</Text>
              </View>

              <View style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>{t('hospital_notes_label') || 'Optional Notes'}</Text>
                <Text style={styles.medicalVal}>{notes.trim() || (t('hospital_none_selected') || 'None')}</Text>
              </View>
            </View>

            {/* ── 3 Communication Option Selector ── */}
            <CommunicationModeSelector
              currentMode={commMode}
              onSelectMode={(mode) => {
                setCommMode(mode);
                if ((mode === 'text_to_sign' || mode === 'sign_to_text') && !avatarMounted) {
                  setAvatarMounted(true);
                }
              }}
              domain="hospital"
            />

            {/* ── Option 1: Speak Out Report Panel ── */}
            {commMode === 'speak' && (
              <SpeakReportPanel reportSpeechText={buildMedicalSpeechText()} />
            )}

            {/* ── Option 2: Sign Language → Text / Voice Panel ── */}
            {commMode === 'sign_to_text' && (
              <SignToTextVoicePanel
                staffType="doctor"
                allowedPhrases={['WHEN_SHOULD_I_TAKE_MY_TABLETS']}
                avatarRef={avatarRef}
              />
            )}

            {/* ── Option 3: Text / Voice → Sign Language Panel ── */}
            {commMode === 'text_to_sign' && (
              <TextVoiceToSignPanel
                avatarRef={avatarRef}
                avatarReady={true}
                staffType="doctor"
                onSendTextMessage={(msg) => {
                  if (sessionId) {
                    sendHospitalMessage({
                      user_id: user?.id || 'guest_user',
                      session_id: sessionId,
                      message: msg,
                      language: 'en',
                    }).catch(() => {});
                  }
                }}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.cardBg, flexDirection: 'row', alignItems: 'center',
    paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#E0ECF8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 4,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.iconBg,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0,
  },
  backBtnText: { color: C.primary, fontSize: 16, fontWeight: '600' },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  scrollContainer: { paddingBottom: 50 },
  card: {
    backgroundColor: C.cardBg, marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  symptomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  symptomChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  symptomChipActive: { borderColor: C.primary, backgroundColor: C.iconBg },
  symptomChipText: { fontSize: 13, fontWeight: '600', color: C.muted },
  symptomChipTextActive: { color: C.primary },
  otherInputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 8 },
  textInput: { backgroundColor: C.bg, borderColor: C.border, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.text },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  primaryButton: {
    backgroundColor: C.primary, paddingVertical: 14, marginHorizontal: 16, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.45, shadowOpacity: 0 },
  step2Container: { flex: 1 },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16, borderRadius: 14,
    backgroundColor: C.cardBg, borderWidth: 1.5, borderColor: C.border, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  tabBtnActive: { backgroundColor: C.primary },
  tabBtnText: { color: C.muted, fontSize: 14, fontWeight: '600' },
  tabBtnTextActive: { color: '#fff', fontWeight: '700' },
  bodyMapCard: {
    backgroundColor: C.cardBg, marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    alignItems: 'center',
  },
  bodyMapHint: { fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 16 },
  bodyMapContainer: { width: '100%', maxWidth: 300, aspectRatio: 260 / 560, position: 'relative', alignSelf: 'center' },
  bodyImage: { width: '100%', height: '100%' },
  hotspot: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: C.primary, backgroundColor: C.iconBg, marginLeft: -11, marginTop: -11,
    zIndex: 10, justifyContent: 'center', alignItems: 'center',
  },
  hotspotSelected: {
    borderColor: C.danger, backgroundColor: C.danger,
    shadowColor: C.danger, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6,
  },
  hotspotPulse: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: C.danger, opacity: 0.6 },
  tooltipBox: {
    position: 'absolute', bottom: 26, backgroundColor: C.text, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, zIndex: 99, width: 100, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  tooltipText: { color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  selectedPartsBox: { width: '100%', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderColor: '#EFF5FC' },
  selectedHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clearAllBtn: { backgroundColor: C.danger + '12', borderColor: C.danger + '40', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  clearAllText: { color: C.danger, fontSize: 11, fontWeight: '700' },
  emptyText: { fontSize: 13, color: C.muted, fontStyle: 'italic' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  partBadge: { backgroundColor: C.danger + '12', borderColor: C.danger + '40', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  partBadgeText: { color: C.danger, fontSize: 12, fontWeight: '600' },
  painIntensityDisplay: { fontSize: 17, fontWeight: '700', color: C.primary, marginBottom: 16 },
  painScaleRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 4, flexWrap: 'wrap' },
  painScaleBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  painScaleText: { fontSize: 13, fontWeight: '700', color: C.muted },
  step3Container: { flex: 1 },
  medicalCard: {
    backgroundColor: C.cardBg, marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 20,
    borderLeftWidth: 5, borderLeftColor: C.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  medicalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  medicalCardTitle: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  medicalDate: { fontSize: 11, color: C.muted },
  medicalDivider: { height: 1, backgroundColor: '#EFF5FC', marginBottom: 12 },
  medicalRow: { marginBottom: 12 },
  medicalLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  medicalVal: { fontSize: 14, color: C.text, lineHeight: 20 },
  boldTeal: { fontWeight: '700', color: C.primary },
  avatarNoticeText: { color: C.primary, fontSize: 13, fontWeight: '600', marginBottom: 12 },
  playerContainer: { height: 320, width: '100%', borderRadius: 14, overflow: 'hidden', position: 'relative' },
  playerOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(232,242,255,0.80)', justifyContent: 'center', alignItems: 'center', gap: 8 },
  avatarLoadingText: { color: C.muted, fontSize: 13, fontWeight: '500' },
  threadContainer: { gap: 8 },
  chatBubbleUser: { backgroundColor: C.iconBg, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, width: '100%' },
  chatBubbleText: { color: C.text, fontSize: 14 },
  chatBubbleTime: { fontSize: 10, color: C.muted, marginTop: 4, alignSelf: 'flex-end' },
  chatInputRow: { flexDirection: 'row', gap: 8 },
  chatTextInput: { flex: 1, backgroundColor: C.bg, borderColor: C.border, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.text },
  chatSendBtn: { backgroundColor: C.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  chatSendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  errorBanner: { backgroundColor: '#FEF2F2', borderColor: C.danger + '40', borderWidth: 1, borderRadius: 12, marginHorizontal: 16, marginTop: 16, padding: 12, flexDirection: 'row', alignItems: 'center' },
  errorText: { color: C.danger, fontSize: 13, fontWeight: '500', flex: 1 },
  commSectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginHorizontal: 16, marginTop: 20, marginBottom: 12 },
  commCardsRow: { flexDirection: 'column', marginHorizontal: 16, gap: 12 },
  commCardsRowDesktop: { flexDirection: 'row', alignItems: 'stretch' },
  commCard: {
    flex: 1, backgroundColor: C.cardBg, borderRadius: 18, padding: 18, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  commCardActive: { borderColor: C.primary, backgroundColor: C.iconBg },
  commCardIcon: { fontSize: 32, marginBottom: 4 },
  commCardTitle: { fontSize: 15, fontWeight: '700', color: C.text, textAlign: 'center' },
  commCardDesc: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 17 },
  commPanel: {
    backgroundColor: C.cardBg, marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: C.border, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  commPanelTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  commPanelHint: { fontSize: 13, color: C.muted, lineHeight: 18 },
  speakBtnRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  speakBtn: {
    flex: 1, backgroundColor: C.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', minWidth: 90,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 6, elevation: 3,
  },
  speakBtnStop: { backgroundColor: C.danger, shadowColor: C.danger },
  speakBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  speakBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cameraContainer: { height: 260, borderRadius: 14, overflow: 'hidden', position: 'relative', backgroundColor: '#000' },
  recognizingBadge: { position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', padding: 10, borderRadius: 10 },
  recognizingText: { color: C.primary, fontSize: 13, fontWeight: '600' },
  recognizedBox: { backgroundColor: C.bg, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: C.border, gap: 4 },
  recognizedLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  recognizedText: { fontSize: 15, color: C.text, lineHeight: 22, fontStyle: 'italic' },
  speakToDocBtn: { marginHorizontal: 0, marginTop: 4 },
  signLimitationNote: { fontSize: 11, color: C.muted, fontStyle: 'italic', lineHeight: 16, marginTop: 4 },
  avatarContainer: { height: 320, width: '100%', borderRadius: 14, overflow: 'hidden', position: 'relative' },
  inputModeLabel: { fontSize: 13, fontWeight: '600', color: C.text, marginTop: 4 },
  voiceInputBtn: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  voiceInputBtnActive: { borderColor: C.primary, backgroundColor: C.iconBg },
  voiceInputBtnText: { color: C.text, fontSize: 15, fontWeight: '600' },
  hospital_notes_label: { fontSize: 11, color: C.muted },
});
