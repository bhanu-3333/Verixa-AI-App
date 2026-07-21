// src/services/SchemeService.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from './authService';
import { getToken, clearAuth } from '../utils/storage';

const API = axios.create({
  baseURL: `${BACKEND_URL}/api/v1/schemes`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

async function getHeaders() {
  const token = await getToken();
  if (!token) {
    throw new Error('Authentication token required.');
  }
  return { Authorization: `Bearer ${token}` };
}

async function handleAxiosError(error: any): Promise<never> {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      await clearAuth();
      throw new Error('Session expired. Please log in again.');
    }
    const msg = error.response?.data?.message || error.response?.data?.detail || error.message;
    throw new Error(msg);
  }
  throw error;
}

export interface LocalizedText {
  en: string;
  ta: string;
}

export interface LocalizedList {
  en: string[];
  ta: string[];
}

export interface Scheme {
  id: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  category: 'financial' | 'education' | 'employment' | 'assistive_devices' | 'healthcare' | 'travel' | 'social_welfare' | 'certification' | string;
  governmentLevel: 'central' | 'state_tn' | string;
  department: LocalizedText;
  eligibility: LocalizedList;
  benefits: LocalizedList;
  documents: LocalizedList;
  applicationSteps: LocalizedList;
  applicableDisabilities: LocalizedList;
  officialInfoUrl: string;
  officialApplyUrl?: string;
  sourceName: string;
  lastVerifiedAt: string;
  status: string;
  importantDates?: LocalizedText;
}

const SAVED_SCHEMES_KEY = 'verixa_saved_schemes_ids';

export const SchemeService = {
  /** Fetch list of schemes with optional filters */
  async getSchemes(params?: {
    category?: string;
    government_level?: string;
    disability_type?: string;
    search?: string;
    language?: string;
  }): Promise<Scheme[]> {
    try {
      const headers = await getHeaders();
      const res = await API.get('', { headers, params });
      if (res.data && res.data.status === 'success') {
        return res.data.data as Scheme[];
      }
      throw new Error(res.data?.message || 'Failed to fetch schemes.');
    } catch (error) {
      return handleAxiosError(error);
    }
  },

  /** Fetch details of a single scheme by ID */
  async getSchemeById(schemeId: string, language: string = 'en'): Promise<Scheme> {
    try {
      const headers = await getHeaders();
      const res = await API.get(`/${schemeId}`, { headers, params: { language } });
      if (res.data && res.data.status === 'success') {
        return res.data.data as Scheme;
      }
      throw new Error(res.data?.message || 'Failed to fetch scheme details.');
    } catch (error) {
      return handleAxiosError(error);
    }
  },

  /** Get array of saved scheme IDs from local storage */
  async getSavedSchemeIds(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(SAVED_SCHEMES_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (e) {
      console.warn('[SchemeService] Error loading saved scheme IDs:', e);
      return [];
    }
  },

  /** Check if a scheme ID is saved */
  async isSchemeSaved(schemeId: string): Promise<boolean> {
    const saved = await this.getSavedSchemeIds();
    return saved.includes(schemeId);
  },

  /** Toggle save/unsave state of a scheme */
  async toggleSaveScheme(schemeId: string): Promise<boolean> {
    try {
      const saved = await this.getSavedSchemeIds();
      let updated: string[];
      let isNowSaved = false;

      if (saved.includes(schemeId)) {
        updated = saved.filter(id => id !== schemeId);
        isNowSaved = false;
      } else {
        updated = [...saved, schemeId];
        isNowSaved = true;
      }

      await AsyncStorage.setItem(SAVED_SCHEMES_KEY, JSON.stringify(updated));
      return isNowSaved;
    } catch (e) {
      console.warn('[SchemeService] Error toggling saved scheme:', e);
      throw new Error('Failed to update saved schemes.');
    }
  }
};
