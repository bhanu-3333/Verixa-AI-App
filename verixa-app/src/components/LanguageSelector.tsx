// src/components/LanguageSelector.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from './LanguageProvider';
import { SupportedLanguage } from '../services/LanguageService';

const NAVY = '#0C1E3C';
const PRIMARY = '#1A56DB';
const TEXT_MID = '#6B7A8D';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const langLabel = language === SupportedLanguage.EN ? 'English' : 'தமிழ்';

  async function handleSelect(l: SupportedLanguage) {
    await setLanguage(l);
    setOpen(false);
  }

  return (
    <View style={S.wrapper}>
      <TouchableOpacity
        style={S.pill}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.85}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <MaterialCommunityIcons name="web" size={15} color={NAVY} style={{ marginRight: 5 }} />
        <Text style={S.pillText}>{langLabel}</Text>
        <Feather name="chevron-down" size={14} color={NAVY} style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={S.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={S.dropdownCard}>
                {([SupportedLanguage.EN, SupportedLanguage.TA] as SupportedLanguage[]).map((l) => {
                  const isActive = language === l;
                  const label = l === SupportedLanguage.EN ? 'English' : 'தமிழ்';
                  return (
                    <TouchableOpacity
                      key={l}
                      style={[S.dropItem, isActive && S.dropItemActive]}
                      onPress={() => handleSelect(l)}
                      activeOpacity={0.7}
                    >
                      <Text style={[S.dropItemText, isActive && S.dropItemTextActive]}>
                        {label}
                      </Text>
                      {isActive && (
                        <Feather name="check" size={14} color={PRIMARY} style={{ marginLeft: 8 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const S = StyleSheet.create({
  wrapper: {
    zIndex: 500,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCE8F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: NAVY,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 30, 60, 0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingRight: 20,
  },
  dropdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    minWidth: 135,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  dropItemActive: {
    backgroundColor: '#F0F6FF',
  },
  dropItemText: {
    fontSize: 14,
    color: TEXT_MID,
    fontWeight: '500',
  },
  dropItemTextActive: {
    color: PRIMARY,
    fontWeight: '700',
  },
});
