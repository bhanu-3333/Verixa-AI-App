/**
 * Verixa AI — Schemes & Benefits Screen
 * UI restyled to match Home screen light blue theme.
 * ALL business logic, backend calls, state, and hooks are UNCHANGED.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SchemeService, Scheme } from '../../services/SchemeService';
import { SupportedLanguage } from '../../services/LanguageService';
import { useLanguage } from '../../components/LanguageProvider';
import { Feather, MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Design tokens — mirrors home.tsx ────────────────────────────────────────
const PRIMARY    = '#1A56DB';
const PAGE_BG    = '#E8F2FF';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#0C1E3C';
const TEXT_MID   = '#6B7A8D';
const TEXT_LIGHT = '#A0AEC0';
const ICON_BG    = '#DCE8F8';
const DANGER     = '#EF4444';
const SUCCESS    = '#10B981';
const CENTRAL_BG = '#EBF2FF';
const CENTRAL_C  = '#1A56DB';
const TN_BG      = '#FFF8E1';
const TN_C       = '#D97706';
const BASE_W     = 390;

const BOLD_FONT: any = Platform.select({
  ios:     { fontFamily: 'Helvetica Neue', fontWeight: '700' },
  android: { fontFamily: 'sans-serif', fontWeight: '700' },
  default: { fontFamily: 'Arial, sans-serif', fontWeight: '700' },
});

function scale(size: number, w: number, min: number, max: number) {
  return Math.max(min, Math.min(max, (w / BASE_W) * size));
}

export default function SchemesHomeScreen() {
  const { width }  = useWindowDimensions();
  const insets     = useSafeAreaInsets();
  const hPad       = scale(16, width, 12, 22);
  const { language, setLanguage: setContextLang, t } = useLanguage();

  // ── All original state — UNTOUCHED ───────────────────────────────────────
  const [schemes,           setSchemes]           = useState<Scheme[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [refreshing,        setRefreshing]        = useState(false);
  const [errorMsg,          setErrorMsg]          = useState<string | null>(null);
  const [activeTab,         setActiveTab]         = useState<'all' | 'saved'>('all');
  const [searchQuery,       setSearchQuery]       = useState('');
  const [selectedCategory,  setSelectedCategory]  = useState<string>('all');
  const [selectedLevel,     setSelectedLevel]     = useState<string>('all');
  const [savedIds,          setSavedIds]          = useState<string[]>([]);

  // ── All original logic — UNTOUCHED ───────────────────────────────────────
  const fetchSchemes = useCallback(async () => {
    try {
      setLoading(true); setErrorMsg(null);
      const data = await SchemeService.getSchemes({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        government_level: selectedLevel !== 'all' ? selectedLevel : undefined,
        search: searchQuery.trim() || undefined,
        language,
      });
      setSchemes(data);
    } catch (err: any) {
      setErrorMsg(t('schemes_url_error') || err.message || 'Unable to load schemes.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [selectedCategory, selectedLevel, searchQuery, language, t]);

  const fetchSavedIds = useCallback(async () => {
    const ids = await SchemeService.getSavedSchemeIds();
    setSavedIds(ids);
  }, []);

  useEffect(() => { fetchSchemes(); fetchSavedIds(); }, [fetchSchemes, fetchSavedIds]);

  const handleRefresh = () => { setRefreshing(true); fetchSchemes(); fetchSavedIds(); };

  const handleLanguageToggle = async (newLang: SupportedLanguage) => { await setContextLang(newLang); };

  const handleToggleBookmark = async (schemeId: string, e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      const isSaved = await SchemeService.toggleSaveScheme(schemeId);
      if (isSaved) setSavedIds((prev) => [...prev, schemeId]);
      else          setSavedIds((prev) => prev.filter((id) => id !== schemeId));
    } catch (err: any) { console.warn('[SchemesScreen] Bookmark toggle failed:', err); }
  };

  const categories = useMemo(() => [
    { key: 'all',             label: t('schemes_cat_all') },
    { key: 'certification',   label: t('schemes_cat_certification') },
    { key: 'assistive_devices', label: t('schemes_cat_assistive_devices') },
    { key: 'financial',       label: t('schemes_cat_financial') },
    { key: 'education',       label: t('schemes_cat_education') },
    { key: 'employment',      label: t('schemes_cat_employment') },
    { key: 'social_welfare',  label: t('schemes_cat_social_welfare') },
    { key: 'travel',          label: t('schemes_cat_travel') },
  ], [t]);

  const getLoc = (locObj?: { en: string; ta: string }): string => {
    if (!locObj) return '';
    return language === SupportedLanguage.TA ? locObj.ta || locObj.en : locObj.en;
  };

  const getLocList = (locList?: { en: string[]; ta: string[] }): string[] => {
    if (!locList) return [];
    return language === SupportedLanguage.TA ? locList.ta || locList.en : locList.en;
  };

  const getDisplayedSchemes = (): Scheme[] => {
    let list = schemes;
    if (activeTab === 'saved') list = list.filter((s) => savedIds.includes(s.id));
    return list;
  };

  const displayedSchemes = getDisplayedSchemes();

  return (
    <SafeAreaView style={S.safeArea}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
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
          <Text style={[S.headerTitle, { fontSize: scale(18, width, 15, 22) }]}>
            {t('schemes_title')}
          </Text>
          <Text style={[S.headerSub, { fontSize: scale(12, width, 10, 14) }]}>
            {t('schemes_subtitle')}
          </Text>
        </View>
      </View>

      <View style={[S.body, { paddingHorizontal: hPad }]}>

        {/* ── Search ───────────────────────────────────────────────────────── */}
        <View style={S.searchWrap}>
          <Feather name="search" size={16} color={TEXT_LIGHT} style={S.searchIcon} />
          <TextInput
            style={[S.searchInput, { fontSize: scale(14, width, 12, 16) }]}
            placeholder={t('schemes_search_placeholder')}
            placeholderTextColor={TEXT_LIGHT}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={S.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={14} color={TEXT_LIGHT} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <View style={S.tabsRow}>
          <TouchableOpacity
            style={[S.tabBtn, activeTab === 'all' && S.tabBtnActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.85}
          >
            <Text style={[S.tabBtnText, { fontSize: scale(13, width, 11, 15) }, activeTab === 'all' && S.tabBtnTextActive]}>
              {t('schemes_tab_all')} ({schemes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[S.tabBtn, activeTab === 'saved' && S.tabBtnActive]}
            onPress={() => setActiveTab('saved')}
            activeOpacity={0.85}
          >
            <Ionicons
              name={activeTab === 'saved' ? 'heart' : 'heart-outline'}
              size={13}
              color={activeTab === 'saved' ? '#fff' : TEXT_MID}
              style={{ marginRight: 5 }}
            />
            <Text style={[S.tabBtnText, { fontSize: scale(13, width, 11, 15) }, activeTab === 'saved' && S.tabBtnTextActive]}>
              {t('schemes_tab_saved')} ({savedIds.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Category Chips ───────────────────────────────────────────────── */}
        {activeTab === 'all' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={S.catScroll}
            contentContainerStyle={S.catContent}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[S.catChip, active && S.catChipActive]}
                  onPress={() => setSelectedCategory(cat.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[S.catChipText, { fontSize: scale(12, width, 11, 14) }, active && S.catChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Level Filter ─────────────────────────────────────────────────── */}
        {activeTab === 'all' && (
          <View style={S.levelRow}>
            {[
              { key: 'all',      label: t('schemes_level_all'),      icon: null,          lib: null },
              { key: 'central',  label: t('schemes_level_central'),  icon: 'bank',        lib: 'mci' },
              { key: 'state_tn', label: t('schemes_level_state_tn'), icon: 'leaf',        lib: 'mci' },
            ].map((lv) => {
              const active = selectedLevel === lv.key;
              return (
                <TouchableOpacity
                  key={lv.key}
                  style={[S.levelBtn, active && S.levelBtnActive]}
                  onPress={() => setSelectedLevel(lv.key)}
                  activeOpacity={0.8}
                >
                  {lv.icon && lv.lib === 'mci' && (
                    <MaterialCommunityIcons
                      name={lv.icon as any}
                      size={13}
                      color={active ? '#fff' : TEXT_MID}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text style={[S.levelBtnText, { fontSize: scale(11, width, 10, 13) }, active && S.levelBtnTextActive]}>
                    {lv.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Content ──────────────────────────────────────────────────────── */}
        {loading && !refreshing ? (
          <View style={S.center}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={[S.loadingText, { fontSize: scale(13, width, 11, 15) }]}>{t('loading')}</Text>
          </View>
        ) : errorMsg ? (
          <View style={S.center}>
            <View style={S.errorIconCircle}>
              <Feather name="alert-circle" size={28} color={DANGER} />
            </View>
            <Text style={[S.errorText, { fontSize: scale(14, width, 12, 16) }]}>{errorMsg}</Text>
            <TouchableOpacity style={S.retryBtn} onPress={fetchSchemes} activeOpacity={0.85}>
              <Feather name="refresh-cw" size={14} color="#fff" style={{ marginRight: 6 }} />
              <Text style={[S.retryBtnText, { fontSize: scale(13, width, 11, 15) }]}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : displayedSchemes.length === 0 ? (
          <View style={S.center}>
            <View style={S.emptyIconCircle}>
              <MaterialCommunityIcons name="file-search-outline" size={32} color={TEXT_LIGHT} />
            </View>
            <Text style={[S.emptyText, { fontSize: scale(14, width, 12, 16) }]}>
              {activeTab === 'saved' ? t('schemes_no_saved') : t('schemes_no_matches')}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={S.listScroll}
            contentContainerStyle={S.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PRIMARY} />
            }
          >
            {displayedSchemes.map((item) => {
              const isSaved   = savedIds.includes(item.id);
              const isCentral = item.governmentLevel === 'central';

              return (
                <TouchableOpacity
                  key={item.id}
                  style={S.schemeCard}
                  onPress={() => router.push(`/schemes/${item.id}` as any)}
                  activeOpacity={0.85}
                >
                  {/* Card header: badge + bookmark */}
                  <View style={S.cardTopRow}>
                    <View style={[S.levelBadge, isCentral ? S.centralBadge : S.tnBadge]}>
                      <MaterialCommunityIcons
                        name={isCentral ? 'bank' : 'leaf'}
                        size={11}
                        color={isCentral ? CENTRAL_C : TN_C}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[S.levelBadgeText, { color: isCentral ? CENTRAL_C : TN_C, fontSize: scale(10, width, 9, 12) }]}>
                        {isCentral ? t('schemes_badge_central') : t('schemes_badge_state_tn')}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={S.bookmarkBtn}
                      onPress={(e) => handleToggleBookmark(item.id, e)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={isSaved ? 'heart' : 'heart-outline'}
                        size={scale(20, width, 18, 24)}
                        color={isSaved ? DANGER : TEXT_LIGHT}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Scheme name */}
                  <Text style={[S.schemeName, { fontSize: scale(15, width, 13, 18) }]}>
                    {getLoc(item.name)}
                  </Text>

                  {/* Short description */}
                  <Text style={[S.schemeDesc, { fontSize: scale(13, width, 11, 15) }]} numberOfLines={3}>
                    {getLoc(item.shortDescription)}
                  </Text>

                  {/* Footer: department + link */}
                  <View style={S.cardFooter}>
                    <Text style={[S.departmentText, { fontSize: scale(11, width, 10, 13) }]} numberOfLines={1}>
                      {getLoc(item.department)}
                    </Text>
                    <View style={S.viewDetailsRow}>
                      <Text style={[S.viewDetailsText, { fontSize: scale(12, width, 11, 14) }]}>
                        {t('schemes_view_details')}
                      </Text>
                      <Feather name="arrow-right" size={12} color={PRIMARY} style={{ marginLeft: 3 }} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  body:     { flex: 1, paddingTop: 14 },

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

  // Search
  searchWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: CARD_BG,
    borderRadius:    14,
    borderWidth:     1.5,
    borderColor:     '#C5D8F0',
    paddingHorizontal: 12,
    marginBottom:    12,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.04,
    shadowRadius:    4,
    elevation:       1,
  },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 11, color: TEXT_DARK },
  clearBtn:    { padding: 4 },

  // Tabs
  tabsRow: {
    flexDirection:   'row',
    backgroundColor: CARD_BG,
    borderRadius:    14,
    padding:         4,
    gap:             4,
    marginBottom:    12,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.04,
    shadowRadius:    4,
    elevation:       1,
  },
  tabBtn: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius:   10,
  },
  tabBtnActive:     { backgroundColor: PRIMARY },
  tabBtnText:       { color: TEXT_MID, fontWeight: '600' },
  tabBtnTextActive: { color: '#fff', fontWeight: '700' },

  // Category chips
  catScroll:  { maxHeight: 40, marginBottom: 10 },
  catContent: { gap: 8, paddingRight: 8 },
  catChip: {
    backgroundColor:   CARD_BG,
    paddingVertical:   7,
    paddingHorizontal: 14,
    borderRadius:      20,
    borderWidth:       1.5,
    borderColor:       '#C5D8F0',
  },
  catChipActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catChipText:       { color: TEXT_MID, fontWeight: '500' },
  catChipTextActive: { color: '#fff', fontWeight: '700' },

  // Level filter
  levelRow: {
    flexDirection: 'row',
    gap:           8,
    marginBottom:  12,
  },
  levelBtn: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 8,
    borderRadius:    10,
    backgroundColor: CARD_BG,
    borderWidth:     1.5,
    borderColor:     '#C5D8F0',
  },
  levelBtnActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  levelBtnText:       { color: TEXT_MID, fontWeight: '600' },
  levelBtnTextActive: { color: '#fff', fontWeight: '700' },

  // Center states
  center: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
    padding:        24,
    gap:            12,
  },
  errorIconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { color: TEXT_MID, marginTop: 4 },
  errorText:   { color: DANGER, textAlign: 'center' },
  retryBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: PRIMARY,
    paddingVertical:   10,
    paddingHorizontal: 20,
    borderRadius:    12,
    shadowColor:     PRIMARY,
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.25,
    shadowRadius:    6,
    elevation:       3,
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  emptyIconCircle: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: { color: TEXT_MID, textAlign: 'center' },

  // Scheme list
  listScroll:  { flex: 1 },
  listContent: { paddingBottom: 28, gap: 12 },

  // Scheme card
  schemeCard: {
    backgroundColor: CARD_BG,
    borderRadius:    20,
    padding:         16,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.05,
    shadowRadius:    6,
    elevation:       2,
  },
  cardTopRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   10,
  },
  levelBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   4,
    paddingHorizontal: 10,
    borderRadius:      10,
  },
  centralBadge:    { backgroundColor: CENTRAL_BG },
  tnBadge:         { backgroundColor: TN_BG },
  levelBadgeText:  { fontWeight: '700' },
  bookmarkBtn:     { padding: 4 },

  schemeName: { color: TEXT_DARK, ...BOLD_FONT, marginBottom: 6 },
  schemeDesc: { color: TEXT_MID, lineHeight: 19, marginBottom: 12 },

  cardFooter: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    borderTopWidth: 1,
    borderTopColor: '#EFF5FC',
    paddingTop:     10,
  },
  departmentText: { color: TEXT_LIGHT, flex: 1, marginRight: 8 },
  viewDetailsRow: { flexDirection: 'row', alignItems: 'center' },
  viewDetailsText: { color: PRIMARY, fontWeight: '700' },
});
