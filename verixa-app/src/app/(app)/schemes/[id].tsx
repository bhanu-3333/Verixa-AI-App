/**
 * Verixa AI — Scheme Detail Screen
 * Displays full verified scheme info, eligibility, required documents, step-by-step process,
 * official government application link with HTTPS validation, bookmarking, and sharing.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
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

export default function SchemeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language, setLanguage: setContextLang, t } = useLanguage();

  // Data state
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bookmark state
  const [isSaved, setIsSaved] = useState(false);

  // Safe back navigation — falls back to schemes list when there is no history
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/schemes');
    }
  };

  const fetchSchemeDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await SchemeService.getSchemeById(id, language);
      setScheme(data);

      const savedStatus = await SchemeService.isSchemeSaved(id);
      setIsSaved(savedStatus);
    } catch (err: any) {
      console.warn('[SchemeDetail] Failed to load scheme details:', err);
      setErrorMsg(err.message || 'Unable to load scheme details.');
    } finally {
      setLoading(false);
    }
  }, [id, language]);

  useEffect(() => {
    fetchSchemeDetails();
  }, [fetchSchemeDetails]);

  const handleLanguageToggle = async (newLang: SupportedLanguage) => {
    await setContextLang(newLang);
  };

  const handleToggleBookmark = async () => {
    if (!id) return;
    try {
      const newStatus = await SchemeService.toggleSaveScheme(id);
      setIsSaved(newStatus);
    } catch (err: any) {
      console.warn('[SchemeDetail] Bookmark error:', err);
    }
  };

  const handleShare = async () => {
    if (!scheme) return;
    const name = getLoc(scheme.name);
    const desc = getLoc(scheme.shortDescription);
    const url = scheme.officialApplyUrl || scheme.officialInfoUrl;

    const message = `${name}\n\n${desc}\n\n${t('schemes_official_portal')} ${url}`;
    try {
      await Share.share({
        title: name,
        message: message,
        url: url,
      });
    } catch (err: any) {
      console.warn('[SchemeDetail] Share error:', err);
    }
  };

  const openGovernmentUrl = async (targetUrl?: string) => {
    if (!targetUrl) {
      alert(t('schemes_link_unavailable'));
      return;
    }

    const trimmedUrl = targetUrl.trim();
    // Validate HTTPS protocol
    if (!trimmedUrl.toLowerCase().startsWith('https://')) {
      alert(t('schemes_security_warning'));
      return;
    }

    try {
      const supported = await Linking.canOpenURL(trimmedUrl);
      if (supported) {
        await Linking.openURL(trimmedUrl);
      } else {
        alert(t('schemes_url_error'));
      }
    } catch (err: any) {
      console.warn('[SchemeDetail] openURL error:', err);
      alert(t('schemes_url_error'));
    }
  };

  const alert = (msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Notice', msg);
    }
  };

  // Helper for localized text fields
  const getLoc = (locObj?: { en: string; ta: string }): string => {
    if (!locObj) return '';
    return language === SupportedLanguage.TA ? locObj.ta || locObj.en : locObj.en;
  };

  const getLocList = (locList?: { en: string[]; ta: string[] }): string[] => {
    if (!locList) return [];
    return language === SupportedLanguage.TA ? locList.ta || locList.en : locList.en;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00FFCC" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg || !scheme) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>⚠️ {errorMsg || t('schemes_not_found')}</Text>
          <TouchableOpacity style={styles.backBtnError} onPress={goBack}>
            <Text style={styles.backBtnErrorText}>‹ {t('bank_back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isCentral = scheme.governmentLevel === 'central';
  const applyUrl = scheme.officialApplyUrl;
  const infoUrl = scheme.officialInfoUrl;
  const hasApplyUrl = !!applyUrl && applyUrl.toLowerCase().startsWith('https://');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Text style={styles.backBtnText}>‹ {t('bank_back')}</Text>
          </TouchableOpacity>

          {/* Actions: Save & Share */}
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.iconActionBtn} onPress={handleToggleBookmark}>
              <Text style={[styles.iconActionText, isSaved && styles.savedHeart]}>
                {isSaved ? '♥ ' + t('schemes_saved') : '♡ ' + t('schemes_save')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconActionBtn} onPress={handleShare}>
              <Text style={styles.iconActionText}>🔗 {t('schemes_share')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>

          {/* Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.badgesRow}>
              <View style={[styles.badgeLevel, isCentral ? styles.badgeCentral : styles.badgeTN]}>
                <Text style={styles.badgeLevelText}>
                  {isCentral ? t('schemes_badge_central') : t('schemes_badge_state_tn')}
                </Text>
              </View>

              <View style={styles.badgeStatus}>
                <Text style={styles.badgeStatusText}>
                  {scheme.status === 'Active' ? t('home_active') : scheme.status}
                </Text>
              </View>
            </View>

            <Text style={styles.schemeTitle}>{getLoc(scheme.name)}</Text>
            <Text style={styles.schemeShortDesc}>{getLoc(scheme.shortDescription)}</Text>

            <View style={styles.sourceMetaRow}>
              <Text style={styles.sourceMetaText}>{t('schemes_verified_source')} {scheme.sourceName}</Text>
              <Text style={styles.sourceMetaText}>{t('schemes_last_verified')} {scheme.lastVerifiedAt}</Text>
            </View>
          </View>

          {/* Department Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('schemes_provided_by')}</Text>
            <Text style={styles.sectionBody}>{getLoc(scheme.department)}</Text>
          </View>

          {/* Applicable Disability Categories */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('schemes_applicable_disabilities')}</Text>
            <View style={styles.chipsContainer}>
              {getLocList(scheme.applicableDisabilities).map((item, idx) => (
                <View key={idx} style={styles.disabilityChip}>
                  <Text style={styles.disabilityChipText}>♿ {item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Who Can Apply (Eligibility) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('schemes_who_can_apply')}</Text>
            {getLocList(scheme.eligibility).map((item, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Benefits Provided */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('schemes_benefits')}</Text>
            {getLocList(scheme.benefits).map((item, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.bulletSymbol}>✓</Text>
                <Text style={[styles.bulletText, { color: '#00E676' }]}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Documents Required */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('schemes_documents')}</Text>
            {getLocList(scheme.documents).map((item, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.bulletSymbol}>📄</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* How to Apply */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('schemes_how_to_apply')}</Text>
            {getLocList(scheme.applicationSteps).map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>{idx + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* Important Dates */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('schemes_dates')}</Text>
            <Text style={styles.sectionBody}>
              {scheme.importantDates
                ? getLoc(scheme.importantDates)
                : t('schemes_check_dates_hint')}
            </Text>
          </View>

          {/* Disclaimer Box */}
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerTitle}>⚠️ {t('schemes_disclaimer_title')}</Text>
            <Text style={styles.disclaimerBody}>{t('schemes_disclaimer')}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.applyButton, !hasApplyUrl && styles.applyButtonDisabled]}
              onPress={() => openGovernmentUrl(applyUrl || infoUrl)}
              disabled={!hasApplyUrl && !infoUrl}
            >
              <Text style={[styles.applyButtonText, !hasApplyUrl && styles.applyButtonTextDisabled]}>
                {hasApplyUrl ? t('schemes_apply_button') : t('schemes_link_unavailable')}
              </Text>
            </TouchableOpacity>

            {infoUrl && infoUrl !== applyUrl && (
              <TouchableOpacity
                style={styles.learnMoreButton}
                onPress={() => openGovernmentUrl(infoUrl)}
              >
                <Text style={styles.learnMoreButtonText}>ℹ️ {t('schemes_learn_more_button')} ↗</Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a16',
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#a0aec0',
    marginTop: 10,
    fontSize: 13,
  },
  errorText: {
    color: '#FF3366',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  backBtnError: {
    backgroundColor: '#1f1f3a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backBtnErrorText: {
    color: '#00FFCC',
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    backgroundColor: '#1f1f3a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#00FFCC',
    fontSize: 13,
    fontWeight: '600',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  iconActionText: {
    color: '#a0aec0',
    fontSize: 11,
    fontWeight: '600',
  },
  savedHeart: {
    color: '#FF3366',
  },
  langToggle: {
    flexDirection: 'row',
    backgroundColor: '#13132b',
    borderRadius: 6,
    padding: 2,
    borderWidth: 1,
    borderColor: '#1f1f3a',
  },
  langBtn: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  langBtnActive: {
    backgroundColor: '#00FFCC',
  },
  langBtnText: {
    fontSize: 10,
    color: '#a0aec0',
    fontWeight: '700',
  },
  langBtnTextActive: {
    color: '#0a0a16',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  headerCard: {
    backgroundColor: '#121226',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  badgeLevel: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  badgeCentral: {
    backgroundColor: 'rgba(32, 138, 239, 0.15)',
  },
  badgeTN: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
  },
  badgeLevelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  badgeStatus: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00E676',
  },
  schemeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 26,
  },
  schemeShortDesc: {
    fontSize: 13,
    color: '#a0aec0',
    lineHeight: 19,
    marginBottom: 12,
  },
  sourceMetaRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
    gap: 2,
  },
  sourceMetaText: {
    fontSize: 10,
    color: '#718096',
  },
  sectionCard: {
    backgroundColor: '#121226',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00FFCC',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  sectionBody: {
    fontSize: 13,
    color: '#ffffff',
    lineHeight: 19,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  disabilityChip: {
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.3)',
  },
  disabilityChipText: {
    fontSize: 11,
    color: '#00FFCC',
    fontWeight: '600',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  bulletSymbol: {
    fontSize: 12,
    color: '#00FFCC',
    marginTop: 2,
  },
  bulletText: {
    fontSize: 13,
    color: '#ffffff',
    flex: 1,
    lineHeight: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00FFCC',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0a0a16',
  },
  stepText: {
    fontSize: 13,
    color: '#ffffff',
    flex: 1,
    lineHeight: 19,
  },
  disclaimerBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.25)',
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFC107',
    marginBottom: 4,
  },
  disclaimerBody: {
    fontSize: 11,
    color: '#a0aec0',
    lineHeight: 16,
  },
  actionButtonsContainer: {
    gap: 10,
    marginTop: 6,
    marginBottom: 20,
  },
  applyButton: {
    backgroundColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  applyButtonText: {
    color: '#0a0a16',
    fontSize: 15,
    fontWeight: '800',
  },
  applyButtonTextDisabled: {
    color: '#718096',
  },
  learnMoreButton: {
    backgroundColor: '#1f1f3a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  learnMoreButtonText: {
    color: '#00FFCC',
    fontSize: 13,
    fontWeight: '700',
  },
});
