/**
 * Verixa AI — Mode Selector Screen
 * Shown when user taps "Mode" in the bottom tab bar.
 * Displays Hospital Mode and Bank Mode as selectable cards.
 * Home screen theme. No emojis. No backend changes.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../components/LanguageProvider';

// ─── Design tokens — mirrors home.tsx ────────────────────────────────────────
const PRIMARY    = '#1A56DB';
const PAGE_BG    = '#E8F2FF';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#0C1E3C';
const TEXT_MID   = '#6B7A8D';
const ICON_BG    = '#DCE8F8';
const BASE_W     = 390;

const BOLD_FONT: any = Platform.select({
  ios:     { fontFamily: 'Helvetica Neue', fontWeight: '700' },
  android: { fontFamily: 'sans-serif', fontWeight: '700' },
  default: { fontFamily: 'Arial, sans-serif', fontWeight: '700' },
});

function scale(size: number, w: number, min: number, max: number) {
  return Math.max(min, Math.min(max, (w / BASE_W) * size));
}

const MODES = [
  {
    id: 'hospital',
    route: '/(app)/hospital',
    icon:  'hospital-building',
    title: 'Hospital Mode',
    desc:  'Communicate with doctors and nurses using sign language, voice, and symptom selection.',
    accentColor: '#0EA5E9',
    accentBg:    '#E0F2FE',
  },
  {
    id: 'bank',
    route: '/(app)/bank',
    icon:  'bank',
    title: 'Bank Mode',
    desc:  'Complete banking services like account creation, fund transfer, and card blocking.',
    accentColor: '#6366F1',
    accentBg:    '#EEF2FF',
  },
] as const;

export default function ModeScreen() {
  const { width }  = useWindowDimensions();
  const insets     = useSafeAreaInsets();
  const { t }      = useLanguage();
  const hPad       = scale(20, width, 14, 28);

  return (
    <SafeAreaView style={S.safeArea}>

      {/* Header */}
      <View style={[S.header, { paddingTop: insets.top + 4, paddingHorizontal: hPad }]}>
        <TouchableOpacity
          style={S.backBtn}
          onPress={() => router.replace('/(app)/home')}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={scale(20, width, 18, 24)} color={PRIMARY} />
        </TouchableOpacity>
        <View style={S.headerText}>
          <Text style={[S.headerTitle, { fontSize: scale(20, width, 17, 24) }]}>
            Communication Modes
          </Text>
          <Text style={[S.headerSub, { fontSize: scale(12, width, 10, 14) }]}>
            Choose a mode for smooth communication
          </Text>
        </View>
      </View>

      {/* Mode Cards */}
      <View style={[S.body, { paddingHorizontal: hPad }]}>
        <Text style={[S.bodyLabel, { fontSize: scale(12, width, 11, 14) }]}>
          SELECT YOUR MODE
        </Text>

        {MODES.map((mode) => (
          <TouchableOpacity
            key={mode.id}
            style={S.modeCard}
            onPress={() => router.push(mode.route as any)}
            activeOpacity={0.88}
          >
            {/* Left: icon circle */}
            <View style={[S.modeIconCircle, { backgroundColor: mode.accentBg }]}>
              <MaterialCommunityIcons
                name={mode.icon as any}
                size={scale(32, width, 26, 40)}
                color={mode.accentColor}
              />
            </View>

            {/* Middle: title + desc */}
            <View style={S.modeTextBlock}>
              <Text style={[S.modeTitle, { fontSize: scale(17, width, 14, 21) }]}>
                {mode.title}
              </Text>
              <Text style={[S.modeDesc, { fontSize: scale(12, width, 11, 14) }]}>
                {mode.desc}
              </Text>
            </View>

            {/* Right: arrow */}
            <View style={[S.arrowCircle, { backgroundColor: mode.accentBg }]}>
              <Feather name="arrow-right" size={scale(16, width, 14, 19)} color={mode.accentColor} />
            </View>
          </TouchableOpacity>
        ))}

        {/* Info note */}
        <View style={S.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={15} color={PRIMARY} style={{ marginRight: 8, flexShrink: 0, marginTop: 1 }} />
          <Text style={[S.infoText, { fontSize: scale(12, width, 11, 14) }]}>
            Each mode provides sign language, voice, and text communication tools tailored for that environment.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },

  // Header
  header: {
    backgroundColor:   CARD_BG,
    flexDirection:     'row',
    alignItems:        'center',
    paddingBottom:     14,
    borderBottomWidth: 1,
    borderBottomColor: '#E0ECF8',
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.06,
    shadowRadius:      6,
    elevation:         4,
  },
  backBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: ICON_BG,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     12,
    flexShrink:      0,
  },
  headerText:  { flex: 1 },
  headerTitle: { color: TEXT_DARK, ...BOLD_FONT },
  headerSub:   { color: TEXT_MID, marginTop: 2 },

  // Body
  body:      { paddingTop: 24, flex: 1, gap: 16 },
  bodyLabel: {
    color:         TEXT_MID,
    fontWeight:    '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom:  4,
  },

  // Mode card
  modeCard: {
    backgroundColor: CARD_BG,
    borderRadius:    22,
    padding:         18,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             14,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       3,
  },
  modeIconCircle: {
    width:          68,
    height:         68,
    borderRadius:   34,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  modeTextBlock: { flex: 1 },
  modeTitle: { color: TEXT_DARK, ...BOLD_FONT, marginBottom: 5 },
  modeDesc:  { color: TEXT_MID, lineHeight: 18 },
  arrowCircle: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },

  // Info box
  infoBox: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: CARD_BG,
    borderRadius:    16,
    padding:         14,
    borderWidth:     1.5,
    borderColor:     '#C5D8F0',
  },
  infoText: { color: TEXT_MID, flex: 1, lineHeight: 19 },
});
