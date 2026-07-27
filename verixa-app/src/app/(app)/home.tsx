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
import { LanguageSelector } from '../../components/LanguageSelector';

// ─── Design tokens (color only — sizes are computed per screen) ───────────────
const PRIMARY = '#1A56DB';
const NAVY = '#0C1E3C';
const PAGE_BG = '#E8F2FF';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0C1E3C';
const TEXT_MID = '#6B7A8D';
const TEXT_LIGHT = '#A0AEC0';
const TAB_BG = '#FFFFFF';

// ─── Reference screen width used to scale typography ─────────────────────────
const BASE_W = 390;

// ─── Platform font ────────────────────────────────────────────────────────────
const BOLD_FONT: any = Platform.select({
  ios: { fontFamily: 'Helvetica Neue', fontWeight: '700' },
  android: { fontFamily: 'sans-serif', fontWeight: '700' },
  default: { fontFamily: 'Arial, sans-serif', fontWeight: '700' },
});

// ─── Responsive scale helper ──────────────────────────────────────────────────
function scale(size: number, w: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, (w / BASE_W) * size));
}

export default function HomeScreen() {
  const { t } = useLanguage();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-320)).current;

  function openDrawer() {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function closeDrawer() {
    Animated.timing(drawerAnim, {
      toValue: -320,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  }

  useEffect(() => {
    getUser<User>().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // ── Features list (localized) ────────────────────────────────────────────────
  const FEATURES = useMemo(
    () => [
      {
        id: 'sign',
        iconLib: 'MaterialCommunityIcons' as const,
        iconName: 'hand-wave',
        title: t('home_sign_translator_title'),
        desc: t('home_sign_translator_desc'),
        route: '/(app)/sign-to-text',
      },
      {
        id: 'tts',
        iconLib: 'MaterialIcons' as const,
        iconName: 'translate',
        title: t('home_text_to_sign_title'),
        desc: t('home_text_to_sign_desc'),
        route: '/(app)/communication',
      },
      {
        id: 'schemes',
        iconLib: 'MaterialCommunityIcons' as const,
        iconName: 'bank',
        title: t('home_schemes_title_short'),
        desc: t('home_schemes_desc_short'),
        route: '/(app)/schemes',
      },
      {
        id: 'sos',
        iconLib: 'MaterialCommunityIcons' as const,
        iconName: 'bell-alert',
        title: t('home_emergency_title_short'),
        desc: t('home_emergency_desc_short'),
        route: '/(app)/emergency',
      },
    ],
    [t]
  );

  // ── Drawer Menu Items (localized) ──────────────────────────────────────────
  const DRAWER_ITEMS = useMemo(
    () => [
      { label: t('drawer_sign_to_text'), icon: 'hand-wave', route: '/(app)/sign-to-text' },
      { label: t('drawer_text_to_sign'), icon: 'translate', route: '/(app)/communication' },
      { label: t('drawer_schemes'), icon: 'bank', route: '/(app)/schemes' },
      { label: t('drawer_bank_mode'), icon: 'bank-transfer', route: '/(app)/bank' },
      { label: t('drawer_hospital_mode'), icon: 'hospital-building', route: '/(app)/hospital' },
      { label: t('drawer_profile'), icon: 'account-circle-outline', route: '/(app)/profile' },
    ],
    [t]
  );

  // ── All responsive dimensions — recomputed on size change ──────────────────
  const R = useMemo(() => {
    const hp = (pct: number) => height * pct;
    const wp = (pct: number) => width * pct;

    const GRID_PAD = wp(0.036);
    const GRID_GAP = wp(0.036);
    const CARD_W = (width - GRID_PAD * 2 - GRID_GAP) / 2;
    const HERO_H = hp(0.42);

    // Lady Image Sizing — Increased size by ~20% and right-aligned cleanly
    const LADY_W = width * 0.85;
    const LADY_LEFT = width - LADY_W;

    // Icon circle scales between 44px and 60px
    const ICON_D = scale(52, width, 44, 60);
    const ICON_SZ = scale(26, width, 22, 30);

    // Arrow circle
    const ARROW_D = scale(30, width, 26, 36);
    const ARROW_SZ = scale(16, width, 13, 19);

    // Typography
    const fGreet = scale(26, width, 20, 32);
    const fGreetSub = scale(13, width, 11, 15);
    const fCardTitle = scale(14, width, 12, 17);
    const fCardDesc = scale(11, width, 10, 13);
    const fModeTitle = scale(17, width, 14, 20);
    const fModeDesc = scale(13, width, 11, 15);
    const fModeBtn = scale(14, width, 12, 16);
    const fTabLbl = scale(11, width, 10, 13);

    // Card sizing
    const CARD_PAD = scale(14, width, 11, 18);
    const CARD_MIN_H = scale(170, width, 150, 210);
    const CARD_GAP = scale(10, width, 8, 13);

    // Communication card
    const MODE_H = Math.max(hp(0.21), 140);
    const MODE_IMG_W = wp(0.48);
    const MODE_IMG_H = MODE_IMG_W * 0.99;
    const CIRCLE_D = wp(0.38);

    // Tab bar
    const TAB_H = scale(74, width, 64, 84);
    const FAB_D = scale(60, width, 52, 68);
    const FAB_SZ = scale(28, width, 24, 33);
    const TAB_ICON_SZ = scale(24, width, 20, 28);
    const FAB_LIFT = FAB_D * 0.47;

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
      hPad: wp(0.062),
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

  const firstName = user?.name?.split(' ')[0] ?? '';
  const greetingText = `${t('home_hi')} ${firstName}`.trim();

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
          <View
            style={[
              S.header,
              {
                paddingTop: insets.top + scale(12, width, 8, 16),
                paddingHorizontal: R.hPad,
              },
            ]}
          >
            <View style={S.headerLeft}>
              <TouchableOpacity
                style={S.hamburgerBtn}
                onPress={openDrawer}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="menu" size={scale(24, width, 20, 28)} color={NAVY} />
              </TouchableOpacity>
              <Text style={[S.brandTitle, { fontSize: scale(19, width, 16, 22) }]}>Verixa AI</Text>
            </View>

            <View style={S.headerRight}>
              <LanguageSelector />
            </View>
          </View>

          {/* ── Lady — Right aligned, moved downward to align naturally inside hero ── */}
          <Image
            source={require('../../../assets/images/splash/lady.png')}
            style={{
              position: 'absolute',
              right: 0,
              top: 44,
              bottom: -10,
              width: R.LADY_W,
              height: R.HERO_H - 20,
              zIndex: 2,
            }}
            resizeMode="contain"
          />

          {/* ── Hero text ── */}
          <View
            style={[
              S.heroTxt,
              {
                maxWidth: width * 0.44,
                paddingLeft: R.hPad,
                zIndex: 6,
              },
            ]}
          >
            <Text style={[S.greeting, { fontSize: R.fGreet }]} numberOfLines={2}>
              {greetingText}
            </Text>
            <Text style={[S.greetSub, { fontSize: R.fGreetSub, lineHeight: R.fGreetSub * 1.45 }]}>
              {t('home_greeting_sub')}
            </Text>
            <View style={[S.accentBar, { marginTop: scale(10, width, 6, 14) }]} />
          </View>
        </ImageBackground>

        {/* ══════════════════════════════════════════════════════
            FEATURE GRID — 2 × 2
            ══════════════════════════════════════════════════════ */}
        <View
          style={[
            S.gridWrap,
            {
              paddingHorizontal: R.GRID_PAD,
              paddingTop: scale(20, width, 14, 26),
            },
          ]}
        >
          <View style={[S.grid, { gap: R.GRID_GAP }]}>
            {FEATURES.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  S.card,
                  {
                    width: R.CARD_W,
                    padding: R.CARD_PAD,
                    minHeight: R.CARD_MIN_H,
                  },
                ]}
                onPress={() => router.push(f.route as any)}
                activeOpacity={0.82}
              >
                {/* Icon circle + title */}
                <View style={[S.cardTop, { gap: R.CARD_GAP, marginBottom: R.CARD_GAP }]}>
                  <View
                    style={[
                      S.iconCircle,
                      {
                        width: R.ICON_D,
                        height: R.ICON_D,
                        borderRadius: R.ICON_D / 2,
                      },
                    ]}
                  >
                    {f.iconLib === 'MaterialCommunityIcons' ? (
                      <MaterialCommunityIcons name={f.iconName as any} size={R.ICON_SZ} color={PRIMARY} />
                    ) : (
                      <MaterialIcons name={f.iconName as any} size={R.ICON_SZ} color={PRIMARY} />
                    )}
                  </View>
                  <Text style={[S.cardTitle, { fontSize: R.fCardTitle, lineHeight: R.fCardTitle * 1.4 }]}>
                    {f.title}
                  </Text>
                </View>

                {/* Description */}
                <Text style={[S.cardDesc, { fontSize: R.fCardDesc, lineHeight: R.fCardDesc * 1.45 }]}>
                  {f.desc}
                </Text>

                {/* Arrow */}
                <View
                  style={[
                    S.arrowCircle,
                    {
                      width: R.ARROW_D,
                      height: R.ARROW_D,
                      borderRadius: R.ARROW_D / 2,
                      marginTop: scale(8, width, 6, 12),
                    },
                  ]}
                >
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
            <View
              style={[
                S.modeBgCircle,
                {
                  width: R.CIRCLE_D,
                  height: R.CIRCLE_D,
                  borderRadius: R.CIRCLE_D / 2,
                  right: -R.CIRCLE_D * 0.16,
                  top: -R.CIRCLE_D * 0.19,
                },
              ]}
            />

            {/* Left text */}
            <View style={[S.modeLeft, { paddingLeft: scale(20, width, 14, 26) }]}>
              <Text style={[S.modeTitle, { fontSize: R.fModeTitle, lineHeight: R.fModeTitle * 1.35 }]}>
                {t('home_comm_modes_title')}
              </Text>
              <Text style={[S.modeDesc, { fontSize: R.fModeDesc, lineHeight: R.fModeDesc * 1.45 }]}>
                {t('home_comm_modes_desc')}
              </Text>
              <TouchableOpacity
                style={[
                  S.modeBtn,
                  {
                    paddingVertical: scale(10, width, 8, 12),
                    paddingHorizontal: scale(18, width, 14, 22),
                  },
                ]}
                onPress={() => router.push('/(app)/mode')}
                activeOpacity={0.85}
              >
                <Text style={[S.modeBtnTxt, { fontSize: R.fModeBtn }]}>
                  {t('home_select_mode_btn')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Illustration */}
            <Image
              source={require('../../../assets/images/splash/communication-illustration.png')}
              style={[
                S.modeImg,
                {
                  width: R.MODE_IMG_W,
                  height: R.MODE_IMG_H,
                  marginRight: -R.MODE_IMG_W * 0.08,
                },
              ]}
              resizeMode="contain"
            />
          </View>
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          BOTTOM TAB BAR
          ══════════════════════════════════════════════════════ */}
      <View
        style={[
          S.tabBar,
          {
            height: R.TAB_H,
            paddingBottom: Math.max(insets.bottom, 6),
          },
        ]}
      >
        {/* Home — active */}
        <TouchableOpacity style={S.tabItem} activeOpacity={0.7}>
          <Ionicons name="home" size={R.TAB_ICON_SZ} color={PRIMARY} />
          <Text style={[S.tabLbl, { fontSize: R.fTabLbl, color: PRIMARY, fontWeight: '700' }]}>
            {t('nav_home')}
          </Text>
        </TouchableOpacity>

        {/* Schemes */}
        <TouchableOpacity
          style={S.tabItem}
          onPress={() => router.push('/(app)/schemes')}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={R.TAB_ICON_SZ} color={TEXT_LIGHT} />
          <Text style={[S.tabLbl, { fontSize: R.fTabLbl }]}>{t('nav_schemes')}</Text>
        </TouchableOpacity>

        {/* FAB — lifted above bar */}
        <View style={[S.fabWrap, { marginTop: -R.FAB_LIFT }]}>
          <TouchableOpacity
            style={[
              S.fab,
              {
                width: R.FAB_D,
                height: R.FAB_D,
                borderRadius: R.FAB_D / 2,
              },
            ]}
            onPress={() => router.push('/(app)/sign-to-text')}
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
          <Text style={[S.tabLbl, { fontSize: R.fTabLbl }]}>{t('nav_mode')}</Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity
          style={S.tabItem}
          onPress={() => router.push('/(app)/profile')}
          activeOpacity={0.7}
        >
          <Feather name="user" size={R.TAB_ICON_SZ} color={TEXT_LIGHT} />
          <Text style={[S.tabLbl, { fontSize: R.fTabLbl }]}>{t('nav_profile')}</Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════════════
          SIDE DRAWER (Polished UI)
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
            <View style={[S.drawerHeader, { paddingTop: insets.top + 14 }]}>
              <View>
                <Text style={S.drawerTitle}>{t('drawer_title')}</Text>
                <Text style={S.drawerSubtitle}>{t('drawer_subtitle')}</Text>
              </View>
              <TouchableOpacity onPress={closeDrawer} style={S.drawerCloseBtn} activeOpacity={0.7}>
                <Feather name="x" size={18} color={NAVY} />
              </TouchableOpacity>
            </View>

            <View style={S.drawerDivider} />

            <ScrollView style={S.drawerScroll} showsVerticalScrollIndicator={false}>
              {DRAWER_ITEMS.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={S.drawerItem}
                  activeOpacity={0.8}
                  onPress={() => {
                    closeDrawer();
                    setTimeout(() => router.push(item.route as any), 240);
                  }}
                >
                  <View style={S.drawerItemIcon}>
                    <MaterialCommunityIcons name={item.icon as any} size={18} color={PRIMARY} />
                  </View>
                  <Text style={S.drawerItemLabel}>{item.label}</Text>
                  <Feather name="chevron-right" size={15} color={TEXT_LIGHT} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </>
      )}
    </View>
  );
}

// ─── Static StyleSheet ────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PAGE_BG },

  // Hero
  hero: {
    overflow: 'visible',
    justifyContent: 'flex-end',
    paddingBottom: 28,
  },

  // Header
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  hamburgerBtn: { paddingVertical: 4, paddingRight: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  brandTitle: { color: NAVY, fontWeight: '700', letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  // Hero text
  heroTxt: { paddingRight: 8 },
  greeting: {
    color: TEXT_DARK,
    letterSpacing: -0.3,
    ...BOLD_FONT,
  },
  greetSub: {
    color: '#3D4A5C',
    marginTop: 4,
    fontWeight: '400',
  },
  accentBar: {
    width: 36,
    height: 3,
    backgroundColor: PRIMARY,
    borderRadius: 2,
  },

  // Feature grid
  gridWrap: {},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    backgroundColor: '#DCE8F8',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    color: TEXT_DARK,
    flex: 1,
    flexWrap: 'wrap',
    ...BOLD_FONT,
  },
  cardDesc: {
    color: '#2E4A6B',
    flexShrink: 1,
    flexWrap: 'wrap',
    paddingRight: 4,
  },
  arrowCircle: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCE8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Communication modes card
  modeSect: {
    paddingTop: 14,
    paddingBottom: 10,
  },
  modeCard: {
    borderRadius: 20,
    backgroundColor: '#D6E8F8',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  modeBgCircle: {
    position: 'absolute',
    backgroundColor: '#C2D8EE',
    zIndex: 0,
  },
  modeLeft: {
    flex: 1,
    paddingTop: 22,
    paddingBottom: 22,
    paddingRight: 8,
    zIndex: 2,
  },
  modeTitle: {
    color: TEXT_DARK,
    marginBottom: 6,
    ...BOLD_FONT,
  },
  modeDesc: {
    color: TEXT_MID,
  },
  modeBtn: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  modeBtnTxt: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modeImg: {
    zIndex: 1,
  },

  // Bottom tab bar
  tabBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: TAB_BG,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5EDF8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLbl: {
    color: TEXT_LIGHT,
    fontWeight: '500',
  },
  fabWrap: {
    flex: 1,
    alignItems: 'center',
  },
  fab: {
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#fff',
  },

  // ── Side Drawer — Polished ──────────────────────────────────────────────────
  drawerBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(12, 30, 60, 0.40)',
    zIndex: 200,
  },
  drawerPanel: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: '78%',
    maxWidth: 310,
    backgroundColor: '#FFFFFF',
    zIndex: 300,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: '#F0F6FF',
  },
  drawerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0C1E3C',
    ...BOLD_FONT,
  },
  drawerSubtitle: {
    fontSize: 12,
    color: '#6B7A8D',
    marginTop: 2,
  },
  drawerCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DCE8F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#E8EEF8',
  },
  drawerScroll: {
    flex: 1,
    paddingTop: 6,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F7FC',
  },
  drawerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCE8F8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  drawerItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0C1E3C',
  },
});
