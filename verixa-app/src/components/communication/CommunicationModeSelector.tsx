import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useLanguage } from '../LanguageProvider';
import { SupportedLanguage } from '../../services/LanguageService';

export type CommunicationMode = null | 'speak' | 'sign_to_text' | 'text_to_sign';

interface CommunicationModeSelectorProps {
  currentMode: CommunicationMode;
  onSelectMode: (mode: CommunicationMode) => void;
  domain?: 'bank' | 'hospital';
}

const C = {
  primary: '#208AEF',
  accent: '#00D2FF',
  cardBg: '#151D30',
  text: '#F1F5F9',
  muted: '#94A3B8',
  border: '#1E293B',
};

export const CommunicationModeSelector: React.FC<CommunicationModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  domain = 'bank',
}) => {
  const { language } = useLanguage();
  const isTamil = language === SupportedLanguage.TA;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const isHospital = domain === 'hospital';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        {isTamil
          ? 'தொடர்பு முறையை தேர்வு செய்யுங்கள்'
          : 'Choose how you want to communicate this information'}
      </Text>

      <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
        {/* Option 1: Speak Out Report */}
        <TouchableOpacity
          style={[styles.card, currentMode === 'speak' && styles.cardActive]}
          onPress={() => onSelectMode(currentMode === 'speak' ? null : 'speak')}
          activeOpacity={0.8}
        >
          <Text style={styles.cardIcon}>🔊</Text>
          <Text style={styles.cardTitle}>
            {isTamil ? 'அறிக்கை படிக்கவும்' : 'Speak Out Report'}
          </Text>
          <Text style={styles.cardDesc}>
            {isTamil
              ? isHospital
                ? 'மருத்துவ அறிக்கையை குரல் வழியே மருத்துவருக்கு படிக்கவும்'
                : 'வங்கி சேவை அறிக்கையை குரலில் படிக்கவும்'
              : isHospital
                ? 'Convert the medical consultation report into natural speech for the doctor'
                : 'Convert the generated Bank Service Report into natural speech for the bank staff'}
          </Text>
        </TouchableOpacity>

        {/* Option 2: Sign Language -> Text / Voice */}
        <TouchableOpacity
          style={[styles.card, currentMode === 'sign_to_text' && styles.cardActive]}
          onPress={() => onSelectMode(currentMode === 'sign_to_text' ? null : 'sign_to_text')}
          activeOpacity={0.8}
        >
          <Text style={styles.cardIcon}>🤟</Text>
          <Text style={styles.cardTitle}>
            {isTamil ? 'குறியீடு → உரை / குரல்' : 'Sign Language → Text / Voice'}
          </Text>
          <Text style={styles.cardDesc}>
            {isTamil
              ? isHospital
                ? 'நோயாளி சைகை மொழி மூலம் மருத்துவரிடம் பேசலாம்'
                : 'வாடிக்கையாளர் கேமரா சைகை மூலம் வங்கி ஊழியரிடம் பேசலாம்'
              : isHospital
                ? 'Deaf patient signs using camera → Text → Voice → Doctor'
                : 'Deaf user signs using camera → Text → Voice → Bank Staff'}
          </Text>
        </TouchableOpacity>

        {/* Option 3: Text / Voice -> Sign Language */}
        <TouchableOpacity
          style={[styles.card, currentMode === 'text_to_sign' && styles.cardActive]}
          onPress={() => onSelectMode(currentMode === 'text_to_sign' ? null : 'text_to_sign')}
          activeOpacity={0.8}
        >
          <Text style={styles.cardIcon}>{isHospital ? '🧑‍⚕️' : '🧑‍💼'}</Text>
          <Text style={styles.cardTitle}>
            {isTamil ? 'உரை / குரல் → குறியீடு' : 'Text / Voice → Sign Language'}
          </Text>
          <Text style={styles.cardDesc}>
            {isTamil
              ? isHospital
                ? 'மருத்துவர் தட்டச்சு செய்வது அல்லது பேசுவது அவதார் சைகையாக மாறும்'
                : 'வங்கி ஊழியர் தட்டச்சு செய்வது அல்லது பேசுவது அவதார் சைகையாக மாறும்'
              : isHospital
                ? 'Doctor types or speaks → Text → Sign Language Avatar → Deaf Patient'
                : 'Bank staff types or speaks → Text → Sign Language Avatar → Deaf User'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'column',
    gap: 12,
  },
  gridDesktop: {
    flexDirection: 'row',
  },
  card: {
    flex: 1,
    backgroundColor: C.cardBg,
    borderColor: C.border,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  cardActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(32, 138, 239, 0.12)',
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  cardDesc: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 17,
  },
});
