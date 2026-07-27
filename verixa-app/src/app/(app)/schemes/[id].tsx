/**
 * Verixa AI — Scheme Detail Screen
 * UI restyled to match Home screen light blue theme. No emojis.
 * ALL business logic, backend calls, state, and hooks are UNCHANGED.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SchemeService, Scheme } from '../../../services/SchemeService';
import { SupportedLanguage } from '../../../services/LanguageService';
import { useLanguage } from '../../../components/LanguageProvider';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Design tokens — mirrors home.tsx ────────────────────────────────────────
const PRIMARY    = '#1A56DB';
const PAGE_BG    = '#E8F2FF';
const CARD_BG    = '#FFFFFF';
const TEXT_DARK  = '#0C1E3C';
const TEXT_MID   = '#6B7A8D';
const TEXT_LIGHT = '#A0AEC0';
const ICON_BG    = '#DCE8F8';
const SUCCESS    = '#10B981';
const DANGER     = '#EF4444';
const WARNING    = '#D97706';
const CENTRAL_BG = '#EBF2FF';
const CENTRAL_C  = '#1A56DB';
const TN_BG      = '#FFF8E1';
const TN_C       = '#D97706';

const BOLD_FONT: any = Platform.select({
  ios:     { fontFamily: 'Helvetica Neue', fontWeight: '700' },
  android: { fontFamily: 'sans-serif', fontWeight: '700' },
  default: { fontFamily: 'Arial, sans-serif', fontWeight: '700' },
});

export default function SchemeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language, setLanguage: setContextLang, t } = useLanguage();
  const insets = useSafeAreaInsets();

  // ── All original state — UNTOUCHED ───────────────────────────────────────
  const [scheme,   setScheme]   = useState<Scheme | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaved,  setIsSaved]  = useState(false);

  // ── All original logic — UNTOUCHED ───────────────────────────────────────
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/schemes');
  };

  const fetchSchemeDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true); setErrorMsg(null);
      const data = await SchemeService.getSchemeById(id, language);
      setScheme(data);
      const savedStatus = await SchemeService.isSchemeSaved(id);
      setIsSaved(savedStatus);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load scheme details.');
    } finally {
      setLoading(false);
    }
  }, [id, language]);

  useEffect(() => { fetchSchemeDetails(); }, [fetchSchemeDetails]);

  const handleLanguageToggle = async (newLang: SupportedLanguage) => { await setContextLang(newLang); };

  const handleToggleBookmark = async () => {
    if (!id) return;
    try {
      const newStatus = await SchemeService.toggleSaveScheme(id);
      setIsSaved(newStatus);
    } catch (err: any) { console.warn('[SchemeDetail] Bookmark error:', err); }
  };

  const handleShare = async () => {
    if (!scheme) return;
    const name = getLoc(scheme.name);
    const desc = getLoc(scheme.shortDescription);
    const url  = scheme.officialApplyUrl || scheme.officialInfoUrl;
    try {
      await Share.share({ title: name, message: `${name}\n\n${desc}\n\n${t('schemes_official_portal')} ${url}`, url });
    } catch (err: any) { console.warn('[SchemeDetail] Share error:', err); }
  };

  const openGovernmentUrl = async (targetUrl?: string) => {
    if (!targetUrl) { showAlert(t('schemes_link_unavailable')); return; }
    const trimmedUrl = targetUrl.trim();
    if (!trimmedUrl.toLowerCase().startsWith('https://')) { showAlert(t('schemes_security_warning')); return; }
    try {
      const supported = await Linking.canOpenURL(trimmedUrl);
      if (supported) await Linking.openURL(trimmedUrl);
      else showAlert(t('schemes_url_error'));
    } catch (err: any) { showAlert(t('schemes_url_error')); }
  };

  const showAlert = (msg: string) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Notice', msg);
  };

  const getLoc = (locObj?: { en: string; ta: string }): string => {
    if (!locObj) return '';
    return language === SupportedLanguage.TA ? locObj.ta || locObj.en : locObj.en;
  };

  const getLocList = (locList?: { en: string[]; ta: string[] }): string[] => {
    if (!locList) return [];
    return language === SupportedLanguage.TA ? locList.ta || locList.en : locList.en;
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={S.safeArea}>
        <View style={S.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={S.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (errorMsg || !scheme) {
    return (
      <SafeAreaView style={S.safeArea}>
        <View style={S.center}>
          <View style={S.errorIconCircle}>
            <Feather name="alert-circle" size={30} color={DANGER} />
          </View>
          <Text style={S.errorText}>{errorMsg || t('schemes_not_found')}</Text>
          <TouchableOpacity style={S.retryBtn} onPress={goBack} activeOpacity={0.85}>
            <Feather name="arrow-left" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={S.retryBtnText}>{t('bank_back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isCentral  = scheme.governmentLevel === 'central';
  const applyUrl   = scheme.officialApplyUrl;
  const infoUrl    = scheme.officialInfoUrl;
  const hasApplyUrl = !!applyUrl && applyUrl.toLowerCase().startsWith('https://');

  return (
    <SafeAreaView style={S.safeArea}>

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <View style={[S.topBar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={S.backBtn}
          onPress={goBack}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={20} color={PRIMARY} />
        </TouchableOpacity>

        <View style={S.topActions}>
          <TouchableOpacity style={[S.actionPill, isSaved && S.actionPillSaved]} onPress={handleToggleBookmark} activeOpacity={0.8}>
            <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={14} color={isSaved ? DANGER : TEXT_MID} style={{ marginRight: 5 }} />
            <Text style={[S.actionPillText, isSaved && { color: DANGER }]}>
              {isSaved ? t('schemes_saved') : t('schemes_save')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={S.actionPill} onPress={handleShare} activeOpacity={0.8}>
            <Feather name="share-2" size={13} color={TEXT_MID} style={{ marginRight: 5 }} />
            <Text style={S.actionPillText}>{t('schemes_share')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header Card ──────────────────────────────────────────────── */}
        <View style={S.card}>
          <View style={S.badgesRow}>
            <View style={[S.levelBadge, isCentral ? S.centralBadge : S.tnBadge]}>
              <MaterialCommunityIcons
                name={isCentral ? 'bank' : 'leaf'}
                size={11}
                color={isCentral ? CENTRAL_C : TN_C}
                style={{ marginRight: 4 }}
              />
              <Text style={[S.levelBadgeText, { color: isCentral ? CENTRAL_C : TN_C }]}>
                {isCentral ? t('schemes_badge_central') : t('schemes_badge_state_tn')}
              </Text>
            </View>

            <View style={S.statusBadge}>
              <View style={S.statusDot} />
              <Text style={S.statusBadgeText}>
                {scheme.status === 'Active' ? t('home_active') : scheme.status}
              </Text>
            </View>
          </View>

          <Text style={S.schemeTitle}>{getLoc(scheme.name)}</Text>
          <Text style={S.schemeDesc}>{getLoc(scheme.shortDescription)}</Text>

          <View style={S.sourceMeta}>
            <Feather name="check-circle" size={11} color={SUCCESS} style={{ marginRight: 4 }} />
            <Text style={S.sourceMetaText}>{t('schemes_verified_source')} {scheme.sourceName}</Text>
          </View>
          <View style={[S.sourceMeta, { marginTop: 3 }]}>
            <Feather name="clock" size={11} color={TEXT_LIGHT} style={{ marginRight: 4 }} />
            <Text style={S.sourceMetaText}>{t('schemes_last_verified')} {scheme.lastVerifiedAt}</Text>
          </View>
        </View>

        {/* ── Provided By ──────────────────────────────────────────────── */}
        <View style={S.card}>
          <View style={S.sectionTitleRow}>
            <View style={S.sectionIconCircle}>
              <MaterialCommunityIcons name="office-building" size={15} color={PRIMARY} />
            </View>
            <Text style={S.sectionTitle}>{t('schemes_provided_by')}</Text>
          </View>
          <Text style={S.sectionBody}>{getLoc(scheme.department)}</Text>
        </View>

        {/* ── Applicable Disabilities ──────────────────────────────────── */}
        <View style={S.card}>
          <View style={S.sectionTitleRow}>
            <View style={S.sectionIconCircle}>
              <MaterialCommunityIcons name="wheelchair-accessibility" size={15} color={PRIMARY} />
            </View>
            <Text style={S.sectionTitle}>{t('schemes_applicable_disabilities')}</Text>
          </View>
          <View style={S.chipsWrap}>
            {getLocList(scheme.applicableDisabilities).map((item, idx) => (
              <View key={idx} style={S.disabilityChip}>
                <MaterialCommunityIcons name="check-circle-outline" size={12} color={PRIMARY} style={{ marginRight: 5 }} />
                <Text style={S.disabilityChipText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Who Can Apply ────────────────────────────────────────────── */}
        <View style={S.card}>
          <View style={S.sectionTitleRow}>
            <View style={S.sectionIconCircle}>
              <MaterialCommunityIcons name="account-check" size={15} color={PRIMARY} />
            </View>
            <Text style={S.sectionTitle}>{t('schemes_who_can_apply')}</Text>
          </View>
          {getLocList(scheme.eligibility).map((item, idx) => (
            <View key={idx} style={S.bulletRow}>
              <View style={S.bulletDot} />
              <Text style={S.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* ── Benefits ─────────────────────────────────────────────────── */}
        <View style={S.card}>
          <View style={S.sectionTitleRow}>
            <View style={S.sectionIconCircle}>
              <MaterialCommunityIcons name="gift-outline" size={15} color={PRIMARY} />
            </View>
            <Text style={S.sectionTitle}>{t('schemes_benefits')}</Text>
          </View>
          {getLocList(scheme.benefits).map((item, idx) => (
            <View key={idx} style={S.bulletRow}>
              <View style={[S.bulletDot, { backgroundColor: SUCCESS }]} />
              <Text style={[S.bulletText, { color: SUCCESS }]}>{item}</Text>
            </View>
          ))}
        </View>

        {/* ── Documents Required ───────────────────────────────────────── */}
        <View style={S.card}>
          <View style={S.sectionTitleRow}>
            <View style={S.sectionIconCircle}>
              <MaterialCommunityIcons name="file-document-outline" size={15} color={PRIMARY} />
            </View>
            <Text style={S.sectionTitle}>{t('schemes_documents')}</Text>
          </View>
          {getLocList(scheme.documents).map((item, idx) => (
            <View key={idx} style={S.bulletRow}>
              <Feather name="file-text" size={13} color={PRIMARY} style={{ marginTop: 2, marginRight: 8, flexShrink: 0 }} />
              <Text style={S.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* ── How to Apply ─────────────────────────────────────────────── */}
        <View style={S.card}>
          <View style={S.sectionTitleRow}>
            <View style={S.sectionIconCircle}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={15} color={PRIMARY} />
            </View>
            <Text style={S.sectionTitle}>{t('schemes_how_to_apply')}</Text>
          </View>
          {getLocList(scheme.applicationSteps).map((step, idx) => (
            <View key={idx} style={S.stepRow}>
              <View style={S.stepBubble}>
                <Text style={S.stepNum}>{idx + 1}</Text>
              </View>
              <Text style={S.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* ── Important Dates ──────────────────────────────────────────── */}
        <View style={S.card}>
          <View style={S.sectionTitleRow}>
            <View style={S.sectionIconCircle}>
              <Feather name="calendar" size={15} color={PRIMARY} />
            </View>
            <Text style={S.sectionTitle}>{t('schemes_dates')}</Text>
          </View>
          <Text style={S.sectionBody}>
            {scheme.importantDates ? getLoc(scheme.importantDates) : t('schemes_check_dates_hint')}
          </Text>
        </View>

        {/* ── Disclaimer ───────────────────────────────────────────────── */}
        <View style={S.disclaimerBox}>
          <View style={S.disclaimerTitleRow}>
            <Feather name="alert-triangle" size={14} color={WARNING} style={{ marginRight: 6 }} />
            <Text style={S.disclaimerTitle}>{t('schemes_disclaimer_title')}</Text>
          </View>
          <Text style={S.disclaimerBody}>{t('schemes_disclaimer')}</Text>
        </View>

        {/* ── Action Buttons ───────────────────────────────────────────── */}
        <View style={S.actionsWrap}>
          <TouchableOpacity
            style={[S.applyBtn, !hasApplyUrl && !infoUrl && S.applyBtnDisabled]}
            onPress={() => openGovernmentUrl(applyUrl || infoUrl)}
            disabled={!hasApplyUrl && !infoUrl}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="open-in-new"
              size={18}
              color={hasApplyUrl || infoUrl ? '#fff' : TEXT_LIGHT}
              style={{ marginRight: 8 }}
            />
            <Text style={[S.applyBtnText, !hasApplyUrl && !infoUrl && S.applyBtnTextDisabled]}>
              {hasApplyUrl ? t('schemes_apply_button') : t('schemes_link_unavailable')}
            </Text>
          </TouchableOpacity>

          {infoUrl && infoUrl !== applyUrl && (
            <TouchableOpacity style={S.learnMoreBtn} onPress={() => openGovernmentUrl(infoUrl)} activeOpacity={0.85}>
              <Feather name="external-link" size={14} color={PRIMARY} style={{ marginRight: 6 }} />
              <Text style={S.learnMoreBtnText}>{t('schemes_learn_more_button')}</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },

  // Center (loading / error)
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12,
    backgroundColor: PAGE_BG,
  },
  errorIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { color: TEXT_MID, fontSize: 13, marginTop: 4 },
  errorText:   { color: DANGER, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Top bar
  topBar: {
    backgroundColor: CARD_BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0ECF8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  topActions:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: ICON_BG,
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5, borderColor: '#C5D8F0',
  },
  actionPillSaved: { borderColor: '#FECDD3', backgroundColor: '#FEF2F2' },
  actionPillText:  { color: TEXT_MID, fontSize: 12, fontWeight: '600' },

  // Scroll
  scroll:       { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 32 },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  // Header card
  badgesRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6,
  },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10,
  },
  centralBadge:    { backgroundColor: CENTRAL_BG },
  tnBadge:         { backgroundColor: TN_BG },
  levelBadgeText:  { fontSize: 11, fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SUCCESS + '18',
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10,
    borderWidth: 1, borderColor: SUCCESS + '30',
  },
  statusDot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: SUCCESS, marginRight: 5 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: SUCCESS },
  schemeTitle: {
    fontSize: 20, color: TEXT_DARK, ...BOLD_FONT,
    marginBottom: 8, lineHeight: 27,
  },
  schemeDesc:   { fontSize: 13, color: TEXT_MID, lineHeight: 19, marginBottom: 12 },
  sourceMeta:   { flexDirection: 'row', alignItems: 'center' },
  sourceMetaText: { fontSize: 11, color: TEXT_LIGHT, flex: 1 },

  // Section headers
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIconCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, flexShrink: 0,
  },
  sectionTitle: { fontSize: 14, color: TEXT_DARK, ...BOLD_FONT, flex: 1 },
  sectionBody:  { fontSize: 13, color: TEXT_DARK, lineHeight: 19 },

  // Disability chips
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  disabilityChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: ICON_BG,
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5, borderColor: '#C5D8F0',
  },
  disabilityChipText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  // Bullets
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  bulletDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: PRIMARY, marginTop: 6, flexShrink: 0 },
  bulletText: { fontSize: 13, color: TEXT_DARK, flex: 1, lineHeight: 19 },

  // Steps
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  stepBubble: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  stepNum:  { fontSize: 12, fontWeight: '800', color: '#fff' },
  stepText: { fontSize: 13, color: TEXT_DARK, flex: 1, lineHeight: 19 },

  // Disclaimer
  disclaimerBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  disclaimerTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  disclaimerTitle:    { fontSize: 13, fontWeight: '700', color: WARNING, flex: 1 },
  disclaimerBody:     { fontSize: 12, color: '#92400E', lineHeight: 17 },

  // Action buttons
  actionsWrap: { gap: 10, marginBottom: 8 },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 16, paddingVertical: 15,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30, shadowRadius: 8, elevation: 4,
  },
  applyBtnDisabled: { backgroundColor: ICON_BG, shadowOpacity: 0 },
  applyBtnText:     { color: '#fff', fontSize: 15, fontWeight: '800' },
  applyBtnTextDisabled: { color: TEXT_LIGHT },
  learnMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 16, paddingVertical: 13,
    borderWidth: 1.5, borderColor: '#C5D8F0',
  },
  learnMoreBtnText: { color: PRIMARY, fontSize: 13, fontWeight: '700' },
});
