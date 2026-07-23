/**
 * Verixa AI — Schemes & Benefits Screen
 * Centralized accessibility module for PwDs to discover verified government schemes.
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
} from 'react-native';
import { router } from 'expo-router';
import { SchemeService, Scheme } from '../../services/SchemeService';
import { SupportedLanguage } from '../../services/LanguageService';
import { useLanguage } from '../../components/LanguageProvider';

export default function SchemesHomeScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { language, setLanguage: setContextLang, t } = useLanguage();

  // Data state
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  // Bookmarks
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Load schemes from backend
  const fetchSchemes = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await SchemeService.getSchemes({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        government_level: selectedLevel !== 'all' ? selectedLevel : undefined,
        search: searchQuery.trim() || undefined,
        language,
      });
      setSchemes(data);
    } catch (err: any) {
      console.warn('[SchemesScreen] Failed to load schemes:', err);
      setErrorMsg(t('schemes_url_error') || err.message || 'Unable to load schemes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedLevel, searchQuery, language, t]);

  // Load saved bookmark IDs
  const fetchSavedIds = useCallback(async () => {
    const ids = await SchemeService.getSavedSchemeIds();
    setSavedIds(ids);
  }, []);

  useEffect(() => {
    fetchSchemes();
    fetchSavedIds();
  }, [fetchSchemes, fetchSavedIds]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSchemes();
    fetchSavedIds();
  };

  const handleLanguageToggle = async (newLang: SupportedLanguage) => {
    await setContextLang(newLang);
  };

  const handleToggleBookmark = async (schemeId: string, e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      const isSaved = await SchemeService.toggleSaveScheme(schemeId);
      if (isSaved) {
        setSavedIds((prev) => [...prev, schemeId]);
      } else {
        setSavedIds((prev) => prev.filter((id) => id !== schemeId));
      }
    } catch (err: any) {
      console.warn('[SchemesScreen] Bookmark toggle failed:', err);
    }
  };

  // Categories definition
  const categories = useMemo(() => [
    { key: 'all', label: t('schemes_cat_all') },
    { key: 'certification', label: t('schemes_cat_certification') },
    { key: 'assistive_devices', label: t('schemes_cat_assistive_devices') },
    { key: 'financial', label: t('schemes_cat_financial') },
    { key: 'education', label: t('schemes_cat_education') },
    { key: 'employment', label: t('schemes_cat_employment') },
    { key: 'social_welfare', label: t('schemes_cat_social_welfare') },
    { key: 'travel', label: t('schemes_cat_travel') },
  ], [t]);

  // Helper for localized text fields
  const getLoc = (locObj?: { en: string; ta: string }): string => {
    if (!locObj) return '';
    return language === SupportedLanguage.TA ? locObj.ta || locObj.en : locObj.en;
  };

  const getLocList = (locList?: { en: string[]; ta: string[] }): string[] => {
    if (!locList) return [];
    return language === SupportedLanguage.TA ? locList.ta || locList.en : locList.en;
  };

  // Compute filtered schemes for display
  const getDisplayedSchemes = (): Scheme[] => {
    let list = schemes;

    if (activeTab === 'saved') {
      list = list.filter((s) => savedIds.includes(s.id));
    }

    return list;
  };

  const displayedSchemes = getDisplayedSchemes();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(app)/home')}>
            <Text style={styles.backButtonText}>‹ {t('bank_back')}</Text>
          </TouchableOpacity>

          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>{t('schemes_title')}</Text>
            <Text style={styles.headerSub}>{t('schemes_subtitle')}</Text>
          </View>

          {/* Language Switcher */}
          <View style={styles.langToggle}>
            <TouchableOpacity
              style={[styles.langBtn, language === SupportedLanguage.EN && styles.langBtnActive]}
              onPress={() => handleLanguageToggle(SupportedLanguage.EN)}
            >
              <Text style={[styles.langBtnText, language === SupportedLanguage.EN && styles.langBtnTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, language === SupportedLanguage.TA && styles.langBtnActive]}
              onPress={() => handleLanguageToggle(SupportedLanguage.TA)}
            >
              <Text style={[styles.langBtnText, language === SupportedLanguage.TA && styles.langBtnTextActive]}>தமிழ்</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search Input ── */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('schemes_search_placeholder')}
            placeholderTextColor="#718096"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Tabs (All / Saved) ── */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'all' && styles.tabBtnTextActive]}>
              {t('schemes_tab_all')} ({schemes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'saved' && styles.tabBtnActive]}
            onPress={() => setActiveTab('saved')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'saved' && styles.tabBtnTextActive]}>
              ♥ {t('schemes_tab_saved')} ({savedIds.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Category Filters (Only on All tab) ── */}
        {activeTab === 'all' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContent}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.catChip, isSelected && styles.catChipActive]}
                  onPress={() => setSelectedCategory(cat.key)}
                >
                  <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Level Filter (Central vs TN) ── */}
        {activeTab === 'all' && (
          <View style={styles.levelRow}>
            <TouchableOpacity
              style={[styles.levelBtn, selectedLevel === 'all' && styles.levelBtnActive]}
              onPress={() => setSelectedLevel('all')}
            >
              <Text style={[styles.levelBtnText, selectedLevel === 'all' && styles.levelBtnTextActive]}>
                {t('schemes_level_all')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.levelBtn, selectedLevel === 'central' && styles.levelBtnActive]}
              onPress={() => setSelectedLevel('central')}
            >
              <Text style={[styles.levelBtnText, selectedLevel === 'central' && styles.levelBtnTextActive]}>
                🏛️ {t('schemes_level_central')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.levelBtn, selectedLevel === 'state_tn' && styles.levelBtnActive]}
              onPress={() => setSelectedLevel('state_tn')}
            >
              <Text style={[styles.levelBtnText, selectedLevel === 'state_tn' && styles.levelBtnTextActive]}>
                🌾 {t('schemes_level_state_tn')}
              </Text>
            </TouchableOpacity>
          </View>
        )}



        {/* ── Content List ── */}
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#00FFCC" />
            <Text style={styles.loadingText}>{t('loading')}</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchSchemes}>
              <Text style={styles.retryBtnText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : displayedSchemes.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'saved' ? t('schemes_no_saved') : t('schemes_no_matches')}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.schemesScroll}
            contentContainerStyle={styles.schemesContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00FFCC" />}
          >
            {displayedSchemes.map((item) => {
              const isSaved = savedIds.includes(item.id);
              const isCentral = item.governmentLevel === 'central';

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.schemeCard}
                  onPress={() => router.push(`/schemes/${item.id}` as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.badgeLevel, isCentral ? styles.badgeCentral : styles.badgeTN]}>
                      <Text style={styles.badgeLevelText}>
                        {isCentral ? '🏛️ Central Govt' : '🌾 Tamil Nadu Govt'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.bookmarkBtn}
                      onPress={(e) => handleToggleBookmark(item.id, e)}
                    >
                      <Text style={[styles.bookmarkIcon, isSaved && styles.bookmarkIconActive]}>
                        {isSaved ? '♥' : '♡'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.schemeName}>{getLoc(item.name)}</Text>
                  <Text style={styles.schemeDesc} numberOfLines={3}>
                    {getLoc(item.shortDescription)}
                  </Text>

                  <View style={styles.schemeFooter}>
                    <Text style={styles.departmentText} numberOfLines={1}>
                      {getLoc(item.department)}
                    </Text>
                    <Text style={styles.viewDetailsText}>View Details →</Text>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a16',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  backButton: {
    backgroundColor: '#1f1f3a',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#00FFCC',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 11,
    color: '#a0aec0',
    marginTop: 2,
  },
  langToggle: {
    flexDirection: 'row',
    backgroundColor: '#13132b',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1f1f3a',
  },
  langBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  langBtnActive: {
    backgroundColor: '#00FFCC',
  },
  langBtnText: {
    fontSize: 11,
    color: '#a0aec0',
    fontWeight: '700',
  },
  langBtnTextActive: {
    color: '#0a0a16',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#121226',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 14,
    top: 10,
  },
  clearSearchText: {
    color: '#a0aec0',
    fontSize: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#13132b',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#00E676',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a0aec0',
  },
  tabBtnTextActive: {
    color: '#0a0a16',
    fontWeight: '700',
  },
  categoryScroll: {
    maxHeight: 40,
    marginBottom: 10,
  },
  categoryContent: {
    gap: 8,
    paddingRight: 16,
  },
  catChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catChipActive: {
    backgroundColor: 'rgba(0, 255, 204, 0.15)',
    borderColor: '#00FFCC',
  },
  catChipText: {
    fontSize: 12,
    color: '#a0aec0',
    fontWeight: '500',
  },
  catChipTextActive: {
    color: '#00FFCC',
    fontWeight: '700',
  },
  levelRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  levelBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  levelBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: '#00FFCC',
  },
  levelBtnText: {
    fontSize: 11,
    color: '#a0aec0',
    fontWeight: '600',
  },
  levelBtnTextActive: {
    color: '#ffffff',
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
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 14,
  },
  retryBtn: {
    backgroundColor: '#00FFCC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#0a0a16',
    fontWeight: '700',
  },
  emptyText: {
    color: '#718096',
    fontSize: 14,
    textAlign: 'center',
  },
  schemesScroll: {
    flex: 1,
  },
  schemesContent: {
    paddingBottom: 24,
    gap: 12,
  },
  schemeCard: {
    backgroundColor: '#121226',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeLevel: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeCentral: {
    backgroundColor: 'rgba(32, 138, 239, 0.15)',
  },
  badgeTN: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
  },
  badgeLevelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  bookmarkBtn: {
    padding: 4,
  },
  bookmarkIcon: {
    fontSize: 20,
    color: '#a0aec0',
  },
  bookmarkIconActive: {
    color: '#FF3366',
  },
  schemeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  schemeDesc: {
    fontSize: 13,
    color: '#a0aec0',
    lineHeight: 18,
    marginBottom: 12,
  },
  schemeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 10,
  },
  departmentText: {
    fontSize: 11,
    color: '#718096',
    flex: 1,
    marginRight: 8,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00FFCC',
  },
});
