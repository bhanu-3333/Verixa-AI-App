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
} from 'react-native';
import { router } from 'expo-router';
import SpeechService from '../../services/SpeechService';
import { SignLanguageAvatar, SignLanguageAvatarRef } from '../../components/SignLanguageAvatar';
import { translateTextToSigml } from '../../services/avatarService';
import { startHospitalSession, sendHospitalMessage, SymptomPayload } from '../../services/hospitalService';
import { getUser } from '../../utils/storage';
import { getLanguage, SupportedLanguage } from '../../services/LanguageService';

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

// Emojis and descriptions for Pain Intensity
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

// Front Body Hotspots coordinates (in percentages)
const FRONT_HOTSPOTS = [
  { id: 'f_head', name: 'Head', x: '50%', y: '4.5%' },
  { id: 'f_face', name: 'Face', x: '50%', y: '8.5%' },
  { id: 'f_neck', name: 'Neck', x: '50%', y: '14%' },
  { id: 'f_chest', name: 'Chest', x: '50%', y: '22%' },
  { id: 'f_heart', name: 'Heart', x: '44%', y: '22%' },
  { id: 'f_stomach', name: 'Stomach', x: '44%', y: '30%' },
  { id: 'f_abdomen', name: 'Abdomen', x: '50%', y: '34%' },
  { id: 'f_pelvis', name: 'Pelvis', x: '50%', y: '42%' },
  { id: 'f_r_arm', name: 'Right Arm', x: '24%', y: '31%' },
  { id: 'f_l_arm', name: 'Left Arm', x: '76%', y: '31%' },
  { id: 'f_r_hand', name: 'Right Hand', x: '16%', y: '48%' },
  { id: 'f_l_hand', name: 'Left Hand', x: '84%', y: '48%' },
  { id: 'f_r_leg', name: 'Right Leg', x: '39%', y: '68%' },
  { id: 'f_l_leg', name: 'Left Leg', x: '61%', y: '68%' },
  { id: 'f_r_foot', name: 'Right Foot', x: '36%', y: '94%' },
  { id: 'f_l_foot', name: 'Left Foot', x: '64%', y: '94%' },
];

// Back Body Hotspots coordinates (in percentages)
const BACK_HOTSPOTS = [
  { id: 'b_head', name: 'Head', x: '50%', y: '4.5%' },
  { id: 'b_neck', name: 'Neck', x: '50%', y: '14%' },
  { id: 'b_u_back', name: 'Upper Back', x: '50%', y: '21%' },
  { id: 'b_m_back', name: 'Middle Back', x: '50%', y: '30%' },
  { id: 'b_l_back', name: 'Lower Back', x: '50%', y: '40%' },
  { id: 'b_spine', name: 'Spine', x: '50%', y: '31%' },
  { id: 'b_l_shoulder', name: 'Left Shoulder', x: '34%', y: '18%' },
  { id: 'b_r_shoulder', name: 'Right Shoulder', x: '66%', y: '18%' },
  { id: 'b_l_arm', name: 'Left Arm', x: '23%', y: '32%' },
  { id: 'b_r_arm', name: 'Right Arm', x: '77%', y: '32%' },
  { id: 'b_l_leg', name: 'Left Leg', x: '39%', y: '68%' },
  { id: 'b_r_leg', name: 'Right Leg', x: '61%', y: '68%' },
  { id: 'b_l_foot', name: 'Left Foot', x: '36%', y: '94%' },
  { id: 'b_r_foot', name: 'Right Foot', x: '64%', y: '94%' },
];

// Bilingual translations for speech & display
const symptomTranslations: Record<string, string> = {
  'Fever': 'காய்ச்சல் (Fever)',
  'Headache': 'தலைவலி (Headache)',
  'Dizziness': 'தலைச்சுற்றல் (Dizziness)',
  'Vomiting': 'வாந்தி (Vomiting)',
  'Chest Pain': 'நெஞ்சு வலி (Chest Pain)',
  'Stomach Pain': 'வயிற்று வலி (Stomach Pain)',
  'Weakness': 'பலவீனம் (Weakness)',
  'Difficulty Breathing': 'மூச்சுத்திணறல் (Difficulty Breathing)',
  'Cough': 'இருமல் (Cough)',
  'Nausea': 'குமட்டல் (Nausea)',
  'Other': 'பிற (Other)',
};

const partTranslations: Record<string, string> = {
  'Head': 'தலை (Head)',
  'Face': 'முகம் (Face)',
  'Neck': 'கழுத்து (Neck)',
  'Chest': 'நெஞ்சு (Chest)',
  'Heart': 'இதயம் (Heart)',
  'Stomach': 'வயிறு (Stomach)',
  'Abdomen': 'அடிவயிறு (Abdomen)',
  'Pelvis': 'இடுப்பு (Pelvis)',
  'Left Arm': 'இடது கை (Left Arm)',
  'Right Arm': 'வலது கை (Right Arm)',
  'Left Hand': 'இடது கை (Left Hand)',
  'Right Hand': 'வலது கை (Right Hand)',
  'Left Leg': 'இடது கால் (Left Leg)',
  'Right Leg': 'வலது கால் (Right Leg)',
  'Left Foot': 'இடது பாதம் (Left Foot)',
  'Right Foot': 'வலது பாதம் (Right Foot)',
  'Upper Back': 'முதுகு மேல் பகுதி (Upper Back)',
  'Middle Back': 'முதுகு நடு பகுதி (Middle Back)',
  'Lower Back': 'முதுகு கீழ் பகுதி (Lower Back)',
  'Spine': 'முதுகுத்தண்டு (Spine)',
  'Left Shoulder': 'இடது தோள் (Left Shoulder)',
  'Right Shoulder': 'வலது தோள் (Right Shoulder)',
};

const C = {
  primary: '#00FFCC', // Teal accent
  bg: '#0f172a',      // Dark background
  cardBg: '#1e293b',  // Card background
  text: '#f8fafc',    // Text color
  muted: '#94a3b8',   // Muted gray text
  danger: '#ef4444',  // Glowing red marker / error
  border: '#334155',  // Border
};

// ── Animated Hotspot with glowing pulse ring ──────────────────────────────
function AnimatedHotspot({
  selected,
  onPress,
  style,
}: {
  selected: boolean;
  onPress: () => void;
  style: any;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

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
  }, [selected]);

  return (
    <TouchableOpacity
      style={[
        styles.hotspot,
        style,
        selected && styles.hotspotSelected,
      ]}
      onPress={onPress}
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
    </TouchableOpacity>
  );
}

// ── Step progress indicator ───────────────────────────────────────────────
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
  const avatarRef = useRef<SignLanguageAvatarRef>(null);

  // Flow step state: 1 (Symptoms), 2 (Body Map, Pain & Notes), 3 (Report & Comm)
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<any>(null);

  // Symptoms Selection state
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [otherSymptom, setOtherSymptom] = useState('');

  // Body Map Selection state
  const [bodyView, setBodyView] = useState<'front' | 'back'>('front');
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);

  // Pain scale (0-10) and notes
  const [painIntensity, setPainIntensity] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Submission & API communication states
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sign Language Avatar overlay state
  const [showAvatar, setShowAvatar] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Chat with doctor state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    getUser<any>().then((u) => setUser(u));
  }, []);

  const currentLang = getLanguage();
  const isTamil = currentLang === SupportedLanguage.TA;

  // Toggle general symptoms select
  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  // Toggle body parts select
  const toggleBodyPart = (part: string) => {
    setSelectedBodyParts((prev) =>
      prev.includes(part)
        ? prev.filter((p) => p !== part)
        : [...prev, part]
    );
  };

  // Get localized pain descriptor
  const getPainLevelDesc = (val: number) => {
    const level = PAIN_LEVELS.find((p) => p.level === val);
    if (!level) return '';
    if (isTamil) {
      switch (level.label) {
        case 'No Pain': return 'வலியற்றது (0)';
        case 'Mild': return 'லேசான வலி (1–3)';
        case 'Moderate': return 'மிதமான வலி (4–6)';
        case 'Severe': return 'கடுமையான வலி (7–8)';
        case 'Worst': return 'மிக மோசமான வலி (9–10)';
      }
    }
    return `${level.emoji} ${level.label} (${val})`;
  };

  // Formulate textual summaries for report
  const getSymptomsSummary = () => {
    const list = selectedSymptoms.map((s) => {
      if (s === 'Other' && otherSymptom.trim()) {
        return otherSymptom.trim();
      }
      return isTamil ? symptomTranslations[s] || s : s;
    });
    return list.length > 0 ? list.join(', ') : (isTamil ? 'அறிகுறிகள் எதுவும் தேர்ந்தெடுக்கப்படவில்லை' : 'None selected');
  };

  const getLocationsSummary = () => {
    const list = selectedBodyParts.map((p) => (isTamil ? partTranslations[p] || p : p));
    return list.length > 0 ? list.join(', ') : (isTamil ? 'உடல் பாகங்கள் எதுவும் தேர்ந்தெடுக்கப்படவில்லை' : 'None selected');
  };

  // Build full report card text
  const generateReportText = (tamil: boolean = isTamil) => {
    if (tamil) {
      return `நோயாளி அறிக்கை:\nஅறிகுறிகள்: ${getSymptomsSummary()}\nவலி உள்ள இடங்கள்: ${getLocationsSummary()}\nவலியின் அளவு: ${getPainLevelDesc(painIntensity)}\nகுறிப்புகள்: ${notes.trim() || 'குறிப்புகள் எதுவும் இல்லை'}`;
    }
    return `Patient Medical Report:\nSymptoms: ${getSymptomsSummary()}\nPain Locations: ${getLocationsSummary()}\nPain Intensity: ${getPainLevelDesc(painIntensity)}\nNotes: ${notes.trim() || 'No notes added'}`;
  };

  // TTS speech handler
  const handleSpeakReport = async () => {
    setErrorMsg(null);
    const textToSpeak = generateReportText(isTamil);
    await SpeechService.speak(textToSpeak, isTamil ? 'ta-IN' : 'en-US');
  };

  // Translate report text to sign language gestures & play on avatar
  const handleShowAvatar = async () => {
    setErrorMsg(null);
    // Keep avatar translation basic for best fingerspelling / gesture results
    const symptomsString = selectedSymptoms.map(s => s === 'Other' ? otherSymptom : s).join(' ');
    const partsString = selectedBodyParts.join(' ');
    const summaryText = `symptoms ${symptomsString} pain ${partsString} level ${painIntensity} ${notes}`.toLowerCase();

    setShowAvatar(true);
    setAvatarLoading(true);
    try {
      const sigml = await translateTextToSigml(summaryText);
      avatarRef.current?.play(sigml);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to play sign language animation.');
    } finally {
      setAvatarLoading(false);
    }
  };

  // Helper to trigger background session creation when entering Chat or Final Submission
  const ensureSessionCreated = async (): Promise<string> => {
    if (sessionId) return sessionId;
    
    setLoading(true);
    setErrorMsg(null);
    const symptomsString = selectedSymptoms.map(s => s === 'Other' && otherSymptom.trim() ? otherSymptom.trim() : s).join(', ');
    const locationsString = selectedBodyParts.join(', ');

    const payload: SymptomPayload = {
      user_id: user?.id || 'guest_user',
      hospital_name: 'Verixa General Hospital',
      department: 'Emergency & General Medicine',
      symptom: symptomsString || 'General Consult',
      pain_location: locationsString || 'None',
      pain_intensity: painIntensity,
      language: currentLang,
    };

    try {
      const res = await startHospitalSession(payload);
      setSessionId(res.session_id);
      return res.session_id;
    } catch (err: any) {
      const msg = err.message || 'Failed to initialize session in database.';
      setErrorMsg(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Doctor Chat window control
  const handleStartChat = async () => {
    try {
      const sId = await ensureSessionCreated();
      setShowChat(true);
      if (chatMessages.length === 0) {
        // Seed initial message
        setChatMessages([
          {
            role: 'assistant',
            content: isTamil 
              ? 'வணக்கம், நான் உங்கள் மருத்துவ உதவியாளர். உங்கள் மருத்துவ அறிக்கை பெறப்பட்டது. நான் எவ்வாறு உதவ முடியும்?' 
              : 'Hello, I am your medical translation assistant. Your report has been generated. How can I help you communicate with the doctor today?',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (_) {
      // Error handled inside ensureSessionCreated
    }
  };

  // Send message in Doctor Chat
  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const sId = sessionId;
    if (!sId) return;

    const userMsg = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        user_id: user?.id || 'guest_user',
        session_id: sId,
        message: userMsg.content,
        language: currentLang
      };
      const res = await sendHospitalMessage(payload);
      const assistantMsg = {
        role: 'assistant',
        content: res.response_text,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, assistantMsg]);

      // Automatically Speak AI Response for accessibility
      await SpeechService.speak(assistantMsg.content, isTamil ? 'ta-IN' : 'en-US');

      // Auto play sign translation for assistant reply
      try {
        const sigml = await translateTextToSigml(assistantMsg.content.toLowerCase());
        avatarRef.current?.play(sigml);
      } catch (_) {
        // Sigml translate error shouldn't break chat
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send chat message.');
    } finally {
      setChatLoading(false);
    }
  };

  // Final submit report handler
  const handleSubmitReport = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await ensureSessionCreated();
      setSuccess(true);
      // Wait brief delay then route back to dashboard home
      setTimeout(() => {
        router.replace('/(app)/home');
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          if (step > 1) {
            setStep(step - 1);
          } else {
            router.back();
          }
        }}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>🏥 Hospital Mode</Text>
          <Text style={styles.headerSub}>
            {step === 1 && (isTamil ? 'படி 1 — அறிகுறிகளைத் தேர்ந்தெடுக்கவும்' : 'Step 1 — Select Symptoms')}
            {step === 2 && (isTamil ? 'படி 2 — வலியின் இடங்கள் & தீவிரம்' : 'Step 2 — Pain Locations & Intensity')}
            {step === 3 && (isTamil ? 'படி 3 — மருத்துவ அறிக்கை & தொடர்பு' : 'Step 3 — Medical Report & Comm')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {/* Step Progress Indicator */}
        <StepIndicator current={step} total={3} />

        {/* Error message banner */}
        {errorMsg && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {errorMsg}</Text>
          </View>
        )}

        {/* STEP 1: Symptoms Selection */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {isTamil ? 'உங்களுக்கு என்ன அறிகுறிகள் உள்ளன?' : 'What symptoms are you experiencing?'}
            </Text>
            
            <View style={styles.symptomsGrid}>
              {SYMPTOMS_LIST.map((symptom) => {
                const isSelected = selectedSymptoms.includes(symptom);
                return (
                  <TouchableOpacity
                    key={symptom}
                    style={[
                      styles.symptomChip,
                      isSelected && styles.symptomChipActive,
                    ]}
                    onPress={() => toggleSymptom(symptom)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.symptomChipText,
                        isSelected && styles.symptomChipTextActive,
                      ]}
                    >
                      {isTamil ? symptomTranslations[symptom] || symptom : symptom}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedSymptoms.includes('Other') && (
              <View style={styles.otherInputContainer}>
                <Text style={styles.inputLabel}>
                  {isTamil ? 'பிற அறிகுறிகள் (குறிப்பிடவும்):' : 'Other symptoms (Please specify):'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={otherSymptom}
                  onChangeText={setOtherSymptom}
                  placeholder={isTamil ? 'இங்கே எழுதவும்...' : 'Specify symptoms...'}
                  placeholderTextColor="#64748b"
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                selectedSymptoms.length === 0 && styles.disabledButton,
              ]}
              disabled={selectedSymptoms.length === 0}
              onPress={() => setStep(2)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{isTamil ? 'அடுத்து (Next) ›' : 'Next ›'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Body Map + Pain Intensity + Notes */}
        {step === 2 && (
          <View style={styles.step2Container}>
            
            {/* View switcher */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabBtn, bodyView === 'front' && styles.tabBtnActive]}
                onPress={() => setBodyView('front')}
              >
                <Text style={[styles.tabBtnText, bodyView === 'front' && styles.tabBtnTextActive]}>
                  {isTamil ? 'முன்புறம் (Front View)' : 'Front View'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, bodyView === 'back' && styles.tabBtnActive]}
                onPress={() => setBodyView('back')}
              >
                <Text style={[styles.tabBtnText, bodyView === 'back' && styles.tabBtnTextActive]}>
                  {isTamil ? 'பின்புறம் (Back View)' : 'Back View'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Interactive Body Outline Map */}
            <View style={styles.bodyMapCard}>
              <Text style={styles.bodyMapHint}>
                {isTamil 
                  ? 'வலியுள்ள உடல்பாகத்தின் மீது தட்டவும் (சிவப்பு வளையம் ஒளிரும்)' 
                  : 'Tap body parts where you feel pain (glowing red markers appear)'}
              </Text>

              <View style={styles.bodyMapContainer}>
                <Image
                  source={
                    bodyView === 'front'
                      ? require('../../../assets/body/front_body.png')
                      : require('../../../assets/body/back_body.png')
                  }
                  style={styles.bodyImage}
                />
                
                {/* Hotspot overlays */}
                {(bodyView === 'front' ? FRONT_HOTSPOTS : BACK_HOTSPOTS).map((spot) => {
                  const isSelected = selectedBodyParts.includes(spot.name);
                  return (
                    <AnimatedHotspot
                      key={spot.id}
                      selected={isSelected}
                      onPress={() => toggleBodyPart(spot.name)}
                      style={{ left: spot.x as any, top: spot.y as any }}
                    />
                  );
                })}
              </View>

              {/* Selected Body Parts Display */}
              <View style={styles.selectedPartsBox}>
                <Text style={styles.sectionTitle}>
                  {isTamil ? 'தேர்ந்தெடுக்கப்பட்ட உடல்பாகங்கள்:' : 'Selected Pain Locations:'}
                </Text>
                {selectedBodyParts.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {isTamil ? 'உடல்பாகங்கள் ஏதும் தேர்ந்தெடுக்கப்படவில்லை' : 'No body parts selected yet.'}
                  </Text>
                ) : (
                  <View style={styles.badgeRow}>
                    {selectedBodyParts.map((part) => (
                      <TouchableOpacity
                        key={part}
                        style={styles.partBadge}
                        onPress={() => toggleBodyPart(part)}
                      >
                        <Text style={styles.partBadgeText}>
                          {isTamil ? partTranslations[part] || part : part}  ×
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Pain Intensity Scale (0-10) */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {isTamil ? 'வலியின் தீவிரம் (Pain Intensity):' : 'Pain Intensity:'}
              </Text>
              
              <Text style={styles.painIntensityDisplay}>
                {getPainLevelDesc(painIntensity)}
              </Text>

              <View style={styles.painScaleRow}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                  const isSelected = painIntensity === val;
                  // Color scale representation
                  let btnColor = '#10b981'; // Green (0)
                  if (val >= 1 && val <= 3) btnColor = '#84cc16'; // Yellow-Green
                  else if (val >= 4 && val <= 6) btnColor = '#f59e0b'; // Orange
                  else if (val >= 7 && val <= 8) btnColor = '#ea580c'; // Dark Orange
                  else if (val >= 9) btnColor = '#ef4444'; // Red

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

            {/* Optional Notes */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {isTamil ? 'கூடுதல் குறிப்புகள் (விருப்பத்தேர்வு):' : 'Optional Notes:'}
              </Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder={
                  isTamil
                    ? 'வலியின் காலம், உணர்ச்சி போன்றவற்றைப் பற்றி விவரிக்கவும்...'
                    : 'Describe onset, sensation, duration, or any other notes...'
                }
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStep(3)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {isTamil ? 'அறிக்கை உருவாக்கு (Generate Report) ›' : 'Generate Report ›'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: Report Summary & Action Options */}
        {step === 3 && (
          <View style={styles.step3Container}>
            
            {/* Medical Summary Card */}
            <View style={styles.medicalCard}>
              <View style={styles.medicalHeader}>
                <Text style={styles.medicalCardTitle}>🏥 Medical Consultation Summary</Text>
                <Text style={styles.medicalDate}>
                  {new Date().toLocaleString()}
                </Text>
              </View>

              <View style={styles.medicalDivider} />

              <View style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>{isTamil ? 'அறிகுறிகள்' : 'Symptoms'}</Text>
                <Text style={styles.medicalVal}>{getSymptomsSummary()}</Text>
              </View>

              <View style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>{isTamil ? 'வலியின் இடங்கள்' : 'Pain Locations'}</Text>
                <Text style={styles.medicalVal}>{getLocationsSummary()}</Text>
              </View>

              <View style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>{isTamil ? 'வலியின் தீவிரம்' : 'Pain Intensity'}</Text>
                <Text style={[styles.medicalVal, styles.boldTeal]}>
                  {getPainLevelDesc(painIntensity)}
                </Text>
              </View>

              <View style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>{isTamil ? 'கூடுதல் குறிப்புகள்' : 'Optional Notes'}</Text>
                <Text style={styles.medicalVal}>{notes.trim() || (isTamil ? 'ஏதுமில்லை' : 'None')}</Text>
              </View>
            </View>

            {/* Success banner */}
            {success && (
              <View style={styles.successBanner}>
                <Text style={styles.successText}>
                  {isTamil 
                    ? '✓ அறிக்கை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!' 
                    : '✓ Medical Report Submitted Successfully!'}
                </Text>
              </View>
            )}

            {/* Communication Action Panel */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {isTamil ? 'தொடர்பு கொள்ள விருப்பங்கள்:' : 'Communication Options:'}
              </Text>

              <View style={styles.actionGrid}>
                {/* 1. Speak Report */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSpeak]}
                  onPress={handleSpeakReport}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionBtnIcon}>🔊</Text>
                  <Text style={styles.actionBtnLabel}>Speak Report</Text>
                </TouchableOpacity>

                {/* 2. Show Sign Language Avatar */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnAvatar]}
                  onPress={handleShowAvatar}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionBtnIcon}>🤟</Text>
                  <Text style={styles.actionBtnLabel}>Show Avatar</Text>
                </TouchableOpacity>

                {/* 3. Continue Chat with Doctor */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnChat]}
                  onPress={handleStartChat}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionBtnIcon}>💬</Text>
                  <Text style={styles.actionBtnLabel}>Chat with Doctor</Text>
                </TouchableOpacity>

                {/* 4. Submit Report */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSubmit, loading && styles.disabledButton]}
                  onPress={handleSubmitReport}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.actionBtnIcon}>📤</Text>
                      <Text style={styles.actionBtnLabel}>Submit Report</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Language Avatar WebGL Frame */}
            {showAvatar && (
              <View style={styles.card}>
                <View style={styles.avatarHeader}>
                  <Text style={styles.sectionTitle}>Sign Language Interpreter</Text>
                  <TouchableOpacity onPress={() => setShowAvatar(false)}>
                    <Text style={styles.closeBtnText}>Close ×</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.playerContainer}>
                  <SignLanguageAvatar ref={avatarRef} initialAvatar="anna" />
                  {avatarLoading && (
                    <View style={styles.playerOverlay}>
                      <ActivityIndicator size="large" color={C.primary} />
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Doctor Chat Thread Window */}
            {showChat && (
              <View style={styles.card}>
                <View style={styles.avatarHeader}>
                  <Text style={styles.sectionTitle}>💬 Hospital Translator Chat</Text>
                  <TouchableOpacity onPress={() => setShowChat(false)}>
                    <Text style={styles.closeBtnText}>Close ×</Text>
                  </TouchableOpacity>
                </View>

                {/* Chat Scroll Screen */}
                <ScrollView 
                  style={styles.chatScroll}
                  contentContainerStyle={styles.chatContentContainer}
                  nestedScrollEnabled={true}
                >
                  {chatMessages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    return (
                      <View 
                        key={index}
                        style={[
                          styles.chatBubble,
                          isUser ? styles.chatBubbleUser : styles.chatBubbleAssistant
                        ]}
                      >
                        <Text style={styles.chatBubbleText}>{msg.content}</Text>
                        <Text style={styles.chatBubbleTime}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    );
                  })}
                  {chatLoading && (
                    <View style={[styles.chatBubble, styles.chatBubbleAssistant, styles.loadingBubble]}>
                      <ActivityIndicator size="small" color={C.primary} />
                    </View>
                  )}
                </ScrollView>

                {/* Message input controls */}
                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatTextInput}
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder={isTamil ? 'இங்கே எழுதவும்...' : 'Type message...'}
                    placeholderTextColor="#64748b"
                  />
                  <TouchableOpacity 
                    style={styles.chatSendBtn}
                    onPress={handleSendChatMessage}
                    disabled={chatLoading}
                  >
                    <Text style={styles.chatSendBtnText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
    width: 260,
    height: 560,
    position: 'relative',
    alignSelf: 'center',
  },
  bodyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  hotspot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.primary,
    backgroundColor: 'rgba(0, 255, 204, 0.25)',
    marginLeft: -12,
    marginTop: -12,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: C.danger,
    opacity: 0.7,
  },
  selectedPartsBox: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: C.border,
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
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionBtn: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnSpeak: {
    backgroundColor: '#0369a1',
  },
  actionBtnAvatar: {
    backgroundColor: '#581c87',
  },
  actionBtnChat: {
    backgroundColor: '#15803d',
  },
  actionBtnSubmit: {
    backgroundColor: '#b91c1c',
  },
  actionBtnIcon: {
    fontSize: 20,
  },
  actionBtnLabel: {
    color: '#fff',
    fontSize: 13,
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
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
  },
  successText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  avatarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeBtnText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
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
  },
  chatScroll: {
    height: 250,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 12,
  },
  chatContentContainer: {
    paddingBottom: 16,
  },
  chatBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    maxWidth: '80%',
    marginBottom: 8,
  },
  chatBubbleUser: {
    backgroundColor: 'rgba(0, 255, 204, 0.15)',
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: C.primary,
  },
  chatBubbleAssistant: {
    backgroundColor: '#1e293b',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: C.border,
  },
  chatBubbleText: {
    color: C.text,
    fontSize: 14,
  },
  chatBubbleTime: {
    fontSize: 9,
    color: C.muted,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  loadingBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
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
    paddingHorizontal: 18,
  },
  chatSendBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
});
