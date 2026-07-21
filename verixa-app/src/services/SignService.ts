// src/services/SignService.ts
import axios from 'axios';
import { BACKEND_URL } from './authService';
import { getToken, clearAuth } from '../utils/storage';

const API = axios.create({
  baseURL: `${BACKEND_URL}/api/v1/sign`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

/** Helper to attach Bearer token to requests */
async function getHeaders() {
  const token = await getToken();
  if (!token) {
    throw new Error('Authentication token required.');
  }
  return { Authorization: `Bearer ${token}` };
}

/** Axios error handler */
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

export interface LandmarkItem {
  x: number;
  y: number;
  z: number;
}

export interface FrameHands {
  leftHand: LandmarkItem[] | null;
  rightHand: LandmarkItem[] | null;
}

export interface RecordResponse {
  phrase: string;
  filename: string;
  total_samples: number;
}

export interface PredictResponse {
  phrase: string | null;
  confidence: number;
  accepted: boolean;
  message?: string;
}

export interface StatsResponse {
  total_samples: number;
  phrase_stats: Record<string, number>;
  model_trained: boolean;
}

export const SignService = {
  /** Record a dynamic hand landmark sequence sample */
  async recordSample(phrase: string, sequence: FrameHands[]): Promise<RecordResponse> {
    try {
      const headers = await getHeaders();
      const res = await API.post('/record', { phrase, sequence }, { headers });
      if (res.data && res.data.status === 'success') {
        return res.data.data as RecordResponse;
      }
      throw new Error(res.data?.message || 'Failed to save recording.');
    } catch (error) {
      return handleAxiosError(error);
    }
  },

  /** Delete the last recorded sample for a phrase */
  async deleteLatestSample(phrase: string): Promise<RecordResponse> {
    try {
      const headers = await getHeaders();
      const res = await API.delete(`/record?phrase=${encodeURIComponent(phrase)}`, { headers });
      if (res.data && res.data.status === 'success') {
        return res.data.data as RecordResponse;
      }
      throw new Error(res.data?.message || 'Failed to delete sample.');
    } catch (error) {
      return handleAxiosError(error);
    }
  },

  /** Predict a phrase from a sequence of hand landmarks */
  async predictPhrase(sequence: FrameHands[]): Promise<PredictResponse> {
    try {
      const headers = await getHeaders();
      const res = await API.post('/predict', { sequence }, { headers });
      if (res.data && res.data.status === 'success') {
        return res.data.data as PredictResponse;
      }
      throw new Error(res.data?.message || 'Prediction failed.');
    } catch (error) {
      return handleAxiosError(error);
    }
  },

  /** Retrieve the recorded samples stats */
  async getStats(): Promise<StatsResponse> {
    try {
      const headers = await getHeaders();
      const res = await API.get('/stats', { headers });
      if (res.data && res.data.status === 'success') {
        return res.data.data as StatsResponse;
      }
      throw new Error(res.data?.message || 'Failed to fetch statistics.');
    } catch (error) {
      return handleAxiosError(error);
    }
  }
};
