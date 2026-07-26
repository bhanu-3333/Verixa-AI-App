/**
 * Verixa AI — Home Screen
 * Fully responsive — all sizing derived from useWindowDimensions.
 * Business logic unchanged.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Platform,
  useWindowDimensions, Image, ImageBackground, StatusBar,
  Animated, Easing, TouchableWithoutFeedback,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { getUser, clearAuth } from '../../utils/storage';
import type { User } from '../../services/authService';
import { useLanguage } from '../../components/LanguageProvider';
import { SupportedLanguage } from '../../services/LanguageService';

// ─── Design tokens (color only — sizes are computed per screen) ───────────────
const PRIMARY    = '#1A56DB';
const NAVY       = '#0C1E3C';
const PAGE_BG    = '#E8F2FF';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#0C1E3C';
const TEXT_MID   = '#6B7A8D';
const TEXT_LIGHT = '#A0AEC0';
const TAB_BG     = '#FFFFFF';

// ─── Reference screen width used to scale typography ─────────────────────────
// All font sizes are designed for a 390px wide screen (iPhone 14 Pro).
// On narrower/wider screens they scale proportionally within safe bounds.
const BASE_W = 390;

// ─── Feature cards ───────────────────────────────────────────────────────────
const FEATURES = [
  {
    id: 'sign',
    iconLib: 'MaterialCommunityIcons' as const,
    iconName: 'hand-wave',
    title: 'Sign\nTranslator',
    desc: 'Convert sign to text & voice',
    route: '/(app)/communication',
  },
  {
    id: 'tts',
    iconLib: 'MaterialIcons' as const,
    iconName: 'translate',
    title: 'Text to\nSign',
    desc: 'Convert text to sign',
    route: '/(app)/sign-training',
  },
  {
    id: 'schemes',
    iconLib: 'MaterialCommunityIcons' as const,
    iconName: 'bank',
    title: 'Government\nSchemes',
    desc: 'Explore schemes & support',
    route: '/(app)/schemes',
  },
  {
    id: 'sos',
    iconLib: 'MaterialCommunityIcons' as const,
    iconName: 'bell-alert',
    title: 'Emergency\nSOS',
    desc: 'Quick help & alerts',
    route: '/(app)/emergency',
  },
];

// ─── Platform font ────────────────────────────────────────────────────────────
const BOLD_FONT: any = Platform.select({
  ios:     { fontFamily: 'Helvetica Neue', fontWeight: '700' },
  android: { fontFamily: 'sans-serif', fontWeight: '700' },
  default: { fontFamily: 'Arial, sans-serif', fontWeight: '700' },
});

// ─── Responsive scale helper ──────────────────────────────────────────────────
// Clamps font/size values between a min and max so they never break on extremes.
function scale(size: number, w: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, (w / BASE_W) * size));
}

export default function HomeScreen() {
  const { language, setLanguage } = useLanguage();
  const { width, height }         = useWindowDimensions();
  const insets                    = useSafeAreaInsets();

  const [user,     setUser]     = useState<User | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-300)).current;

  function openDrawer() {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 0, duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function closeDrawer() {
    Animated.timing(drawerAnim, {
      toValue: -300, duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  }

  useEffect(() => {
    getUser<User>().then(u => { setUser(u); setLoading(false); });
  }, []);

  async function handleLogout() {
    const ok = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to logout?') : true;
    if (ok) { await clearAuth(); router.replace('/(auth)/login'); }
  }

  async function pickLang(l: SupportedLanguage) {
    await setLanguage(l); setLangOpen(false);
  }

  // ── All responsive dimensions — recomputed when width/height changes ────────
  const R = useMemo(() => {
    const hp = (pct: number) => height * pct;   // % of screen height
    const wp = (pct: number) => width  * pct;   // % of screen width

    const GRID_PAD   = wp(0.036);               // ~14px @ 390
    const GRID_GAP   = wp(0.036);
    const CARD_W     = (width - GRID_PAD * 2 - GRID_GAP) / 2;
    const HERO_H     = hp(0.43);
    const LADY_LEFT  = wp(0.32);
    const LADY_W     = width - LADY_LEFT + wp(0.04);

    // Icon circle scales between 44px (small) and 60px (large)
    const ICON_D     = scale(52, width, 44, 60);
    const ICON_SZ    = scale(26, width, 22, 30);

    // Arrow circle
    const ARROW_D    = scale(30, width, 26, 36);
    const ARROW_SZ   = scale(16, width, 13, 19);

    // Typography
    const fGreet     = scale(28, width, 22, 34);
    const fGreetSub  = scale(13, width, 11, 15);
    const fCardTitle = scale(14, width, 12, 17);
    const fCardDesc  = scale(11, width, 10, 13);
    const fModeTitle = scale(17, width, 14, 20);
    const fModeDesc  = scale(13, width, 11, 15);
    const fModeBtn   = scale(14, width, 12, 16);
    const fTabLbl    = scale(11, width, 10, 13);

    // Card sizing
    const CARD_PAD   = scale(14, width, 11, 18);
    const CARD_MIN_H = scale(170, width, 150, 210);
    const CARD_GAP   = scale(10, width, 8, 13);

    // Communication card
    const MODE_H     = Math.max(hp(0.21), 140);
    const MODE_IMG_W = wp(0.49);
    const MODE_IMG_H = MODE_IMG_W * 0.99;        // aspect ratio ≈1:1 for the illustration
    const CIRCLE_D   = wp(0.38);

    // Tab bar
    const TAB_H      = scale(74, width, 64, 84);
    const FAB_D      = scale(60, width, 52, 68);
    const FAB_SZ     = scale(28, width, 24, 33);
    const TAB_ICON_SZ = scale(24, width, 20, 28);
    const FAB_LIFT   = FAB_D * 0.47;             // lifts half its height above bar

    return {
      GRID_PAD, GRID_GAP, CARD_W,
      HERO_H, LADY_LEFT, LADY_W,
      ICON_D, ICON_SZ,
      ARROW_D, ARROW_SZ,
      fGreet, fGreetSub,
      fCardTitle, fCardDesc,
      fModeTitle, fModeDesc, fModeBtn,
      fTabLbl,
      CARD_PAD, CARD_MIN_H, CARD_GAP,
      MODE_H, MODE_IMG_W, MODE_IMG_H, CIRCLE_D,
      TAB_H, FAB_D, FAB_SZ, TAB_ICON_SZ, FAB_LIFT,
      hPad: wp(0.062),   // horizontal page padding ~24px @ 390
    };
  }, [width, height]);

  if (loading) {
    return (
      <View style={S.center}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const langLabel = language === SupportedLanguage.EN ? 'English' : 'தமிழ்';

  return (
    <View style={S.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: R.TAB_H + 16 }}
      >
        {/* ══════════════════════════════════════════════════════
            HERO
            ══════════════════════════════════════════════════════ */}
        <ImageBackground
          source={require('../../../assets/images/splash/sky.jpeg')}
          style={[S.hero, { height: R.HERO_H }]}
          resizeMode="cover"
          imageStyle={{ width: '100%', height: '100%' }}
        >
          {/* ── Header ── */}
          <View style={[S.header, {
            paddingTop: insets.top + scale(12, width, 8, 16),
            paddingHorizontal: R.hPad,
          }]}>
            <TouchableOpacity
              style={S.hamburgerBtn}
              onPress={openDrawer}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="menu" size={scale(24, width, 20, 28)} color={NAVY} />
            </TouchableOpacity>

            <View style={S.headerRight}>
              <View style={{ zIndex: 200 }}>
                <TouchableOpacity
                  style={[S.langPill, {
                    paddingHorizontal: scale(12, width, 10, 15),
                    paddingVertical:   scale(8,  width, 6,  10),
                  }]}
                  onPress={() => setLangOpen(v => !v)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons
                    name="web"
                    size={scale(15, width, 13, 17)}
                    color={NAVY}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[S.langPillTxt, { fontSize: scale(13, width, 11, 15) }]}>
                    {langLabel}
                  </Text>
                  <Feather
                    name="chevron-down"
                    size={scale(13, width, 11, 15)}
                    color={NAVY}
                    style={{ marginLeft: 3 }}
                  />
                </TouchableOpacity>

                {langOpen && (
                  <View style={S.langDrop}>
                    {([SupportedLanguage.EN, SupportedLanguage.TA] as SupportedLanguage[]).map(l => (
                      <TouchableOpacity key={l} style={S.langItem} onPress={() => pickLang(l)}>
                        <Text style={[S.langItemTxt, language === l && S.langItemActive]}>
                          {l === SupportedLanguage.EN ? 'English' : 'தமிழ்'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={S.bellBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="notifications-outline"
                  size={scale(24, width, 20, 28)}
                  color={NAVY}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Lady ── */}
          <Image
            source={require('../../../assets/images/splash/lady.png')}
            style={{
              position: 'absolute',
              left:   R.LADY_LEFT,
              top:    0,
              width:  R.LADY_W,
              height: R.HERO_H,
              zIndex: 2,
            }}
            resizeMode="cover"
          />

          {/* ── Hero text ── */}
          <View style={[S.heroTxt, {
            maxWidth:    width * 0.50,
            paddingLeft: R.hPad,
            zIndex:      6,
          }]}>
            <Text style={[S.greeting, { fontSize: R.fGreet }]}>
              Hi, {firstName}!
            </Text>
            <Text style={[S.greetSub, { fontSize: R.fGreetSub, lineHeight: R.fGreetSub * 1.5 }]}>
              How can we help you today?
            </Text>
            <View style={[S.accentBar, { marginTop: scale(12, width, 8, 16) }]} />
          </View>
        </ImageBackground>

        {/* ══════════════════════════════════════════════════════
            FEATURE GRID — 2 × 2
            ══════════════════════════════════════════════════════ */}
        <View style={[S.gridWrap, {
          paddingHorizontal: R.GRID_PAD,
          paddingTop:        scale(20, width, 14, 26),
        }]}>
          <View style={[S.grid, { gap: R.GRID_GAP }]}>
            {FEATURES.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[S.card, {
                  width:     R.CARD_W,
                  padding:   R.CARD_PAD,
                  minHeight: R.CARD_MIN_H,
                }]}
                onPress={() => router.push(f.route as any)}
                activeOpacity={0.82}
              >
                {/* Icon circle + title */}
                <View style={[S.cardTop, { gap: R.CARD_GAP, marginBottom: R.CARD_GAP }]}>
                  <View style={[S.iconCircle, {
                    width:        R.ICON_D,
                    height:       R.ICON_D,
                    borderRadius: R.ICON_D / 2,
                  }]}>
                    {f.iconLib === 'MaterialCommunityIcons'
                      ? <MaterialCommunityIcons name={f.iconName as any} size={R.ICON_SZ} color={PRIMARY} />
                      : <MaterialIcons          name={f.iconName as any} size={R.ICON_SZ} color={PRIMARY} />
                    }
                  </View>
                  <Text style={[S.cardTitle, { fontSize: R.fCardTitle, lineHeight: R.fCardTitle * 1.45 }]}>
                    {f.title}
                  </Text>
                </View>

                {/* Description */}
                <Text style={[S.cardDesc, { fontSize: R.fCardDesc, lineHeight: R.fCardDesc * 1.5 }]}>
                  {f.desc}
                </Text>

                {/* Arrow */}
                <View style={[S.arrowCircle, {
                  width:        R.ARROW_D,
                  height:       R.ARROW_D,
                  borderRadius: R.ARROW_D / 2,
                  marginTop:    scale(8, width, 6, 12),
                }]}>
                  <Feather name="arrow-right" size={R.ARROW_SZ} color={PRIMARY} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            COMMUNICATION MODES CARD
            ══════════════════════════════════════════════════════ */}
        <View style={[S.modeSect, { paddingHorizontal: R.GRID_PAD }]}>
          <View style={[S.modeCard, { minHeight: R.MODE_H }]}>

            {/* Decorative circle */}
            <View style={[S.modeBgCircle, {
              width:        R.CIRCLE_D,
              height:       R.CIRCLE_D,
              borderRadius: R.CIRCLE_D / 2,
              right:        -R.CIRCLE_D * 0.16,
              top:          -R.CIRCLE_D * 0.19,
            }]} />

            {/* Left text */}
            <View style={[S.modeLeft, { paddingLeft: scale(20, width, 14, 26) }]}>
              <Text style={[S.modeTitle, { fontSize: R.fModeTitle, lineHeight: R.fModeTitle * 1.35 }]}>
                Communication Modes
              </Text>
              <Text style={[S.modeDesc, { fontSize: R.fModeDesc, lineHeight: R.fModeDesc * 1.5 }]}>
                {'Choose a mode for\nsmooth communication'}
              </Text>
              <TouchableOpacity
                style={[S.modeBtn, {
                  paddingVertical:   scale(11, width, 8, 13),
                  paddingHorizontal: scale(20, width, 14, 24),
                }]}
                onPress={() => router.push('/(app)/communication')}
                activeOpacity={0.85}
              >
                <Text style={[S.modeBtnTxt, { fontSize: R.fModeBtn }]}>
                  Select Mode  →
                </Text>
              </TouchableOpacity>
            </View>

            {/* Illustration */}
            <Image
              source={require('../../../assets/images/splash/communication-illustration.png')}
              style={[S.modeImg, {
                width:       R.MODE_IMG_W,
                height:      R.MODE_IMG_H,
                marginRight: -R.MODE_IMG_W * 0.08,
              }]}
              resizeMode="contain"
            />
          </View>
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          BOTTOM TAB BAR
          ══════════════════════════════════════════════════════ */}
      <View style={[S.tabBar, {
        height:        R.TAB_H,
        paddingBottom: Math.max(insets.bottom, 8),
      }]}>

        {/* Home — active */}
        <TouchableOpacity style={S.tabItem} activeOpacity={0.7}>
          <Ionicons name="home" size={R.TAB_ICON_SZ} color={PRIMARY} />
          <Text style={[S.tabLbl, { fontSize: R.fTabLbl, color: PRIMARY, fontWeight: '700' }]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Schemes */}
        <TouchableOpacity
          style={S.tabItem}
          onPress={() => router.push('/(app)/schemes')}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={R.TAB_ICON_SZ} color={TEXT_LIGHT} />
          <Text style={[S.tabLbl, { fontSize: R.fTabLbl }]}>Schemes</Text>
        </TouchableOpacity>

        {/* FAB — lifted above bar */}
        <View style={[S.fabWrap, { marginTop: -R.FAB_LIFT }]}>
          <TouchableOpacity
            style={[S.fab, {
              width:        R.FAB_D,
              height:       R.FAB_D,
              borderRadius: R.FAB_D / 2,
            }]}
            onPress={() => router.push('/(app)/communication')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="hand-peace" size={R.FAB_SZ} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Mode */}
        <TouchableOpacity
          style={S.tabItem}
          onPress={() => router.push('/(app)/mode')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="tune-variant" size={R.TAB_ICON_SZ} color={TEXT_LIGHT} />
          <Text style={[S.tabLbl, { fontSize: R.fTabLbl }]}>Mode</Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity style={S.tabItem} onPress={() => router.push('/(app)/profile')} activeOpacity={0.7}>
          <Feather name="user" size={R.TAB_ICON_SZ} color={TEXT_LIGHT} />
          <Text style={[S.tabLbl, { fontSize: R.fTabLbl }]}>Profile</Text>
        </TouchableOpacity>

      </View>

      {/* ══════════════════════════════════════════════════════
          SIDE DRAWER
          ══════════════════════════════════════════════════════ */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <View style={S.drawerBackdrop} />
          </TouchableWithoutFeedback>

          {/* Panel */}
          <Animated.View style={[S.drawerPanel, { transform: [{ translateX: drawerAnim }] }]}>
            {/* Drawer header */}
            <View style={[S.drawerHeader, { paddingTop: insets.top + 16 }]}>
              <View>
                <Text style={S.drawerTitle}>Verixa AI</Text>
                <Text style={S.drawerSubtitle}>Navigation Menu</Text>
              </View>
              <TouchableOpacity onPress={closeDrawer} style={S.drawerCloseBtn} activeOpacity={0.7}>
                <Feather name="x" size={20} color={TEXT_DARK} />
              </TouchableOpacity>
            </View>

            <View style={S.drawerDivider} />

            <ScrollView style={S.drawerScroll} showsVerticalScrollIndicator={false}>
              {[
                { label: 'Sign to Text',      icon: 'hand-wave',        route: '/(app)/sign-to-text'   },
                { label: 'Text to Sign',       icon: 'translate',        route: '/(app)/communication'  },
                { label: 'Schemes',            icon: 'bank',             route: '/(app)/schemes'        },
                { label: 'Bank Mode',          icon: 'bank-transfer',    route: '/(app)/bank'           },
                { label: 'Hospital Mode',      icon: 'hospital-building', route: '/(app)/hospital'      },
                { label: 'Profile',            icon: 'account-circle-outline', route: '/(app)/profile'  },
              ].map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={S.drawerItem}
                  activeOpacity={0.8}
                  onPress={() => { closeDrawer(); setTimeout(() => router.push(item.route as any), 240); }}
                >
                  <View style={S.drawerItemIcon}>
                    <MaterialCommunityIcons name={item.icon as any} size={20} color={PRIMARY} />
                  </View>
                  <Text style={S.drawerItemLabel}>{item.label}</Text>
                  <Feather name="chevron-right" size={16} color={TEXT_LIGHT} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </>
      )}
    </View>
  );
}

// ─── Static StyleSheet — colors, flex, shadow, non-size styles only ───────────
const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: PAGE_BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PAGE_BG },

  // Hero
  hero: {
    overflow:       'visible',
    justifyContent: 'flex-end',
    paddingBottom:  28,
  },

  // Header
  header: {
    position:        'absolute',
    top: 0, left: 0, right: 0,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    zIndex:          100,
  },
  hamburgerBtn: { paddingVertical: 4, paddingRight: 4 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Language pill
  langPill: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#FFFFFF',
    borderRadius:    20,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.10,
    shadowRadius:    4,
    elevation:       3,
  },
  langPillTxt:    { fontWeight: '600', color: NAVY },
  langDrop: {
    position:        'absolute',
    top:             44,
    right:           0,
    backgroundColor: '#fff',
    borderRadius:    12,
    paddingVertical: 4,
    minWidth:        130,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.14,
    shadowRadius:    8,
    elevation:       8,
    zIndex:          400,
  },
  langItem:       { paddingHorizontal: 16, paddingVertical: 11 },
  langItemTxt:    { fontSize: 14, color: TEXT_MID },
  langItemActive: { color: PRIMARY, fontWeight: '700' },

  // Bell
  bellBtn: { position: 'relative', padding: 4 },
  bellDot: {
    position:        'absolute',
    top: 4, right: 4,
    width:           9,
    height:          9,
    borderRadius:    5,
    backgroundColor: PRIMARY,
    borderWidth:     1.5,
    borderColor:     '#fff',
  },

  // Hero text
  heroTxt: { paddingRight: 8 },
  greeting: {
    color:         TEXT_DARK,
    letterSpacing: -0.3,
    ...BOLD_FONT,
  },
  greetSub: {
    color:      '#3D4A5C',
    marginTop:  4,
    fontWeight: '400',
  },
  accentBar: {
    width:           36,
    height:          3,
    backgroundColor: PRIMARY,
    borderRadius:    2,
  },

  // Feature grid
  gridWrap: {},
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius:    20,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.04,
    shadowRadius:    6,
    elevation:       2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  iconCircle: {
    backgroundColor: '#DCE8F8',
    justifyContent:  'center',
    alignItems:      'center',
    flexShrink:      0,
  },
  cardTitle: {
    color:    TEXT_DARK,
    flex:     1,
    flexWrap: 'wrap',
    ...BOLD_FONT,
  },
  cardDesc: {
    color:      '#2E4A6B',
    flexShrink: 1,
    flexWrap:   'wrap',
    paddingRight: 4,
  },
  arrowCircle: {
    alignSelf:       'flex-end',
    backgroundColor: '#DCE8F8',
    justifyContent:  'center',
    alignItems:      'center',
  },

  // Communication modes card
  modeSect: {
    paddingTop:    14,
    paddingBottom: 10,
  },
  modeCard: {
    borderRadius:    20,
    backgroundColor: '#D6E8F8',
    flexDirection:   'row',
    alignItems:      'center',
    overflow:        'hidden',
  },
  modeBgCircle: {
    position:        'absolute',
    backgroundColor: '#C2D8EE',
    zIndex:          0,
  },
  modeLeft: {
    flex:           1,
    paddingTop:     22,
    paddingBottom:  22,
    paddingRight:   8,
    zIndex:         2,
  },
  modeTitle: {
    color:        TEXT_DARK,
    marginBottom: 6,
    ...BOLD_FONT,
  },
  modeDesc: {
    color: TEXT_MID,
  },
  modeBtn: {
    marginTop:       16,
    backgroundColor: PRIMARY,
    borderRadius:    12,
    alignSelf:       'flex-start',
  },
  modeBtnTxt: {
    color:         '#fff',
    fontWeight:    '700',
    letterSpacing: 0.2,
  },
  modeImg: {
    zIndex: 1,
  },

  // Bottom tab bar
  tabBar: {
    position:        'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: TAB_BG,
    flexDirection:   'row',
    alignItems:      'center',
    borderTopWidth:  1,
    borderTopColor:  '#E5EDF8',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -2 },
    shadowOpacity:   0.07,
    shadowRadius:    8,
    elevation:       12,
  },
  tabItem: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            4,
  },
  tabLbl: {
    color:      TEXT_LIGHT,
    fontWeight: '500',
  },
  fabWrap: {
    flex:       1,
    alignItems: 'center',
  },
  fab: {
    backgroundColor: PRIMARY,
    justifyContent:  'center',
    alignItems:      'center',
    shadowColor:     PRIMARY,
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.38,
    shadowRadius:    10,
    elevation:       10,
    borderWidth:     3,
    borderColor:     '#fff',
  },

  // ── Side Drawer ────────────────────────────────────────────────────────────
  drawerBackdrop: {
    position:        'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(12, 30, 60, 0.45)',
    zIndex:          200,
  },
  drawerPanel: {
    position:        'absolute',
    top: 0, left: 0, bottom: 0,
    width:           '78%',
    maxWidth:        320,
    backgroundColor: '#FFFFFF',
    zIndex:          300,
    shadowColor:     '#000',
    shadowOffset:    { width: 4, height: 0 },
    shadowOpacity:   0.14,
    shadowRadius:    16,
    elevation:       20,
  },
  drawerHeader: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    justifyContent:  'space-between',
    paddingHorizontal: 20,
    paddingBottom:   18,
    backgroundColor: '#F0F6FF',
  },
  drawerTitle: {
    fontSize:    20,
    fontWeight:  '700',
    color:       '#0C1E3C',
    ...BOLD_FONT,
  },
  drawerSubtitle: {
    fontSize:  12,
    color:     '#6B7A8D',
    marginTop: 3,
  },
  drawerCloseBtn: {
    width:           34,
    height:          34,
    borderRadius:    17,
    backgroundColor: '#DCE8F8',
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       4,
  },
  drawerDivider: {
    height:          1,
    backgroundColor: '#E0ECF8',
  },
  drawerScroll: {
    flex:       1,
    paddingTop: 8,
  },
  drawerItem: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F6FF',
  },
  drawerItemIcon: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: '#DCE8F8',
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  drawerItemLabel: {
    flex:       1,
    fontSize:   15,
    fontWeight: '600',
    color:      '#0C1E3C',
  },
});
