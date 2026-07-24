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

const C = {
  primary: '#00FFCC',
  bg: '#0f172a',
  cardBg: '#1e293b',
  text: '#f8fafc',
  muted: '#94a3b8',
  danger: '#ef4444',
  border: '#334155',
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
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(0,255,204,0.15)',
  },
  dotDone: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  dotText: { fontSize: 11, fontWeight: '700', color: C.muted },
  dotTextActive: { color: C.primary },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: C.border,
    marginHorizontal: 4,
  },
  lineDone: { backgroundColor: '#10b981' },
});

export default function HospitalScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;
  const avatarRef = useRef<SignLanguageAvatarRef>(null);

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
    const level = PAIN_LEVELS.find((p) => p.level === val);
    if (!level) return `${val}`;
    let label = level.label;
    if (val === 0) label = t('pain_no_pain') || 'No Pain';
    else if (val <= 3) label = t('pain_mild') || 'Mild';
    else if (val <= 6) label = t('pain_moderate') || 'Moderate';
    else if (val <= 8) label = t('pain_severe') || 'Severe';
    else label = t('pain_worst') || 'Worst';
    return `${level.emoji} ${label} (${val})`;
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
      setVoiceText(t('hospital_voice_not_available') || 'Voice-to-text requires a native build. Please type your message.');
      setVoiceListening(false);
    }, 1500);
  }, [t]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              router.back();
            }
          }}
        >
          <Text style={styles.backBtnText}>‹ {t('emergency_back') || 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>🏥 {t('home_hospital') || 'Hospital Mode'}</Text>
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
            <Text style={styles.errorText}>⚠ {errorMsg}</Text>
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
            {/* ── Background-preloaded avatar (hidden until Option 3 selected) ── */}
            {avatarMounted && (
              <View style={{ height: commMode === 'text_to_sign' ? undefined : 0, overflow: 'hidden' }}>
                <View style={styles.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>🤟 {t('hospital_text_voice_to_sign') || 'Sign Language Avatar'}</Text>
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
                <Text style={styles.medicalCardTitle}>🏥 {t('hospital_comm_title') || 'Medical Consultation Summary'}</Text>
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
              onSelectMode={(mode) => setCommMode(mode)}
              domain="hospital"
            />

            {/* ── Option 1: Speak Out Report Panel ── */}
            {commMode === 'speak' && (
              <SpeakReportPanel reportSpeechText={buildMedicalSpeechText()} />
            )}

            {/* ── Option 2: Sign Language → Text / Voice Panel ── */}
            {commMode === 'sign_to_text' && (
              <SignToTextVoicePanel staffType="doctor" />
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
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    backgroundColor: '#0f172d',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 44 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1.5,
    borderColor: '#334155',
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
    color: C.primary,
    marginTop: 2,
  },
  scrollContainer: {
    paddingBottom: 50,
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  symptomChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: '#0f172a',
  },
  symptomChipActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(0, 255, 204, 0.15)',
  },
  symptomChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
  },
  symptomChipTextActive: {
    color: C.primary,
  },
  otherInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#0f172a',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: C.primary,
    paddingVertical: 14,
    marginHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  step2Container: {
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(0, 255, 204, 0.15)',
  },
  tabBtnText: {
    color: C.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: C.primary,
  },
  bodyMapCard: {
    backgroundColor: C.cardBg,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  bodyMapHint: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  bodyMapContainer: {
    width: '100%',
    maxWidth: 300,
    aspectRatio: 260 / 560,
    position: 'relative',
    alignSelf: 'center',
  },
  bodyImage: {
    width: '100%',
    height: '100%',
  },
  hotspot: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.primary,
    backgroundColor: 'rgba(0, 255, 204, 0.25)',
    marginLeft: -11,
    marginTop: -11,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotspotSelected: {
    borderColor: C.danger,
    backgroundColor: C.danger,
    shadowColor: C.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  hotspotPulse: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.danger,
    opacity: 0.7,
  },
  tooltipBox: {
    position: 'absolute',
    bottom: 26,
    backgroundColor: '#0f172a',
    borderColor: C.primary,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 99,
    width: 100,
    alignItems: 'center',
  },
  tooltipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedPartsBox: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  selectedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearAllBtn: {
    backgroundColor: '#3d1414',
    borderColor: C.danger,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    color: C.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
    fontStyle: 'italic',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partBadge: {
    backgroundColor: '#0f172a',
    borderColor: C.danger,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  partBadgeText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '500',
  },
  painIntensityDisplay: {
    fontSize: 18,
    fontWeight: '700',
    color: C.primary,
    marginBottom: 16,
  },
  painScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 4,
    flexWrap: 'wrap',
  },
  painScaleBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  painScaleText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.muted,
  },
  step3Container: {
    flex: 1,
  },
  medicalCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 20,
    borderLeftWidth: 5,
    borderLeftColor: C.primary,
    borderWidth: 1,
    borderColor: C.border,
  },
  medicalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicalCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  medicalDate: {
    fontSize: 12,
    color: C.muted,
  },
  medicalDivider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 12,
  },
  medicalRow: {
    marginBottom: 12,
  },
  medicalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  medicalVal: {
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
  },
  boldTeal: {
    fontWeight: '700',
    color: C.primary,
  },
  avatarNoticeText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  playerContainer: {
    height: 320,
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  playerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 15, 25, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  avatarLoadingText: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  threadContainer: {
    gap: 8,
  },
  chatBubbleUser: {
    backgroundColor: 'rgba(0, 255, 204, 0.15)',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: 10,
    padding: 10,
    width: '100%',
  },
  chatBubbleText: {
    color: C.text,
    fontSize: 14,
  },
  chatBubbleTime: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
  },
  chatSendBtn: {
    backgroundColor: C.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  chatSendBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: C.danger,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  // ── Step 3 Communication Mode Styles ─────────────────────────
  commSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  commCardsRow: {
    flexDirection: 'column',
    marginHorizontal: 16,
    gap: 12,
  },
  commCardsRowDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  commCard: {
    flex: 1,
    backgroundColor: C.cardBg,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    gap: 8,
  },
  commCardActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(0, 255, 204, 0.08)',
  },
  commCardIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  commCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
  },
  commCardDesc: {
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 17,
  },
  commPanel: {
    backgroundColor: C.cardBg,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  commPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  commPanelHint: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
  },
  speakBtnRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  speakBtn: {
    flex: 1,
    backgroundColor: C.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 90,
  },
  speakBtnStop: {
    backgroundColor: C.danger,
  },
  speakBtnDisabled: {
    opacity: 0.4,
  },
  speakBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  cameraContainer: {
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  recognizingBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 10,
    borderRadius: 10,
  },
  recognizingText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  recognizedBox: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  recognizedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recognizedText: {
    fontSize: 15,
    color: C.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  speakToDocBtn: {
    marginHorizontal: 0,
    marginTop: 4,
  },
  signLimitationNote: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 4,
  },
  avatarContainer: {
    height: 320,
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  inputModeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginTop: 4,
  },
  voiceInputBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  voiceInputBtnActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(0,255,204,0.1)',
  },
  voiceInputBtnText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  hospital_notes_label: {
    fontSize: 11,
    color: C.muted,
  },
});
