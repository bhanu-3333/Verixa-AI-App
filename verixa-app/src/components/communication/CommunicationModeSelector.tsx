import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useLanguage } from '../LanguageProvider';
import { SupportedLanguage } from '../../services/LanguageService';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

export type CommunicationMode = null | 'speak' | 'sign_to_text' | 'text_to_sign';

interface CommunicationModeSelectorProps {
  currentMode: CommunicationMode;
  onSelectMode: (mode: CommunicationMode) => void;
  domain?: 'bank' | 'hospital';
}

// ─── Design tokens — mirrors home.tsx ────────────────────────────────────────
const PRIMARY  = '#1A56DB';
const PAGE_BG  = '#E8F2FF';
const CARD_BG  = '#FFFFFF';
const TEXT_DARK = '#0C1E3C';
const TEXT_MID  = '#6B7A8D';
const ICON_BG   = '#DCE8F8';

// Mode definitions — icon, title, description
const MODES = (isHospital: boolean, isTamil: boolean) => [
  {
    key: 'speak' as CommunicationMode,
    icon: 'volume-high' as const,
    lib:  'mci' as const,
    title:   isTamil ? 'அறிக்கை படிக்கவும்' : 'Speak Out Report',
    desc: isTamil
      ? (isHospital ? 'மருத்துவ அறிக்கையை குரல் வழியே மருத்துவருக்கு படிக்கவும்' : 'வங்கி சேவை அறிக்கையை குரலில் படிக்கவும்')
      : (isHospital ? 'Convert the medical consultation report into natural speech for the doctor' : 'Convert the Bank Service Report into natural speech for the bank staff'),
  },
  {
    key: 'sign_to_text' as CommunicationMode,
    icon: 'hand-wave' as const,
    lib:  'mci' as const,
    title:   isTamil ? 'குறியீடு → உரை / குரல்' : 'Sign Language → Text / Voice',
    desc: isTamil
      ? (isHospital ? 'நோயாளி சைகை மொழி மூலம் மருத்துவரிடம் பேசலாம்' : 'வாடிக்கையாளர் கேமரா சைகை மூலம் வங்கி ஊழியரிடம் பேசலாம்')
      : (isHospital ? 'Deaf patient signs using camera → Text → Voice → Doctor' : 'Deaf user signs using camera → Text → Voice → Bank Staff'),
  },
  {
    key: 'text_to_sign' as CommunicationMode,
    icon: isHospital ? 'doctor' : 'account-tie' as const,
    lib:  'mci' as const,
    title:   isTamil ? 'உரை / குரல் → குறியீடு' : 'Text / Voice → Sign Language',
    desc: isTamil
      ? (isHospital ? 'மருத்துவர் தட்டச்சு செய்வது அல்லது பேசுவது அவதார் சைகையாக மாறும்' : 'வங்கி ஊழியர் தட்டச்சு செய்வது அல்லது பேசுவது அவதார் சைகையாக மாறும்')
      : (isHospital ? 'Doctor types or speaks → Text → Sign Language Avatar → Deaf Patient' : 'Bank staff types or speaks → Text → Sign Language Avatar → Deaf User'),
  },
];

export const CommunicationModeSelector: React.FC<CommunicationModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  domain = 'bank',
}) => {
  const { language } = useLanguage();
  const isTamil    = language === SupportedLanguage.TA;
  const { width }  = useWindowDimensions();
  const isDesktop  = width >= 768;
  const isHospital = domain === 'hospital';
  const modes      = MODES(isHospital, isTamil);

  return (
    <View style={S.container}>
      <Text style={S.sectionLabel}>
        {isTamil ? 'தொடர்பு முறையை தேர்வு செய்யுங்கள்' : 'CHOOSE HOW YOU WANT TO COMMUNICATE'}
      </Text>

      <View style={[S.grid, isDesktop && S.gridDesktop]}>
        {modes.map((m) => {
          const active = currentMode === m.key;
          return (
            <TouchableOpacity
              key={m.key as string}
              style={[S.card, active && S.cardActive]}
              onPress={() => onSelectMode(active ? null : m.key)}
              activeOpacity={0.82}
            >
              {/* Icon circle */}
              <View style={[S.iconCircle, active && S.iconCircleActive]}>
                <MaterialCommunityIcons
                  name={m.icon as any}
                  size={24}
                  color={active ? '#fff' : PRIMARY}
                />
              </View>

              {/* Text */}
              <View style={S.cardText}>
                <Text style={[S.cardTitle, active && S.cardTitleActive]}>{m.title}</Text>
                <Text style={S.cardDesc}>{m.desc}</Text>
              </View>

              {/* Arrow */}
              <Feather
                name={active ? 'chevron-up' : 'chevron-right'}
                size={16}
                color={active ? PRIMARY : TEXT_MID}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const S = StyleSheet.create({
  container: { marginVertical: 16, paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_MID,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  grid:        { flexDirection: 'column', gap: 10 },
  gridDesktop: { flexDirection: 'row' },

  card: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    backgroundColor: CARD_BG,
    borderColor:     '#C5D8F0',
    borderWidth:     1.5,
    borderRadius:    18,
    padding:         14,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.04,
    shadowRadius:    4,
    elevation:       1,
  },
  cardActive: {
    borderColor:     PRIMARY,
    backgroundColor: ICON_BG,
  },
  iconCircle: {
    width:           46,
    height:          46,
    borderRadius:    23,
    backgroundColor: ICON_BG,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  iconCircleActive: {
    backgroundColor: PRIMARY,
  },
  cardText:       { flex: 1 },
  cardTitle:      { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 3 },
  cardTitleActive:{ color: PRIMARY },
  cardDesc:       { fontSize: 12, color: TEXT_MID, lineHeight: 17 },
});
