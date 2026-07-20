/**
 * Verixa AI — Hospital Service
 * Handles API requests for starting hospital sessions, chatting, and fetching history.
 */

import axios from 'axios';
import { BACKEND_URL } from './authService';
import { getToken, clearAuth } from '../utils/storage';

const API = axios.create({
  baseURL: `${BACKEND_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export interface SymptomPayload {
  user_id: string;
  hospital_name: string;
  department?: string;
  symptom: string;
  pain_location?: string;
  pain_intensity?: number;
  language: string;
}

export interface HospitalChatPayload {
  user_id: string;
  session_id: string;
  message: string;
  language: string;
}

export interface SymptomEntry {
  symptom: string;
  pain_location?: string;
  pain_intensity?: number;
  timestamp?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface HospitalSession {
  id: string;
  user_id: string;
  hospital_name: string;
  department?: string;
  symptoms: SymptomEntry[];
  chat_messages?: ChatMessage[];
  language: string;
  created_at?: string;
  updated_at?: string;
}

/** Helper to attach Bearer token and handle 401 logouts */
async function getHeaders(): Promise<{ Authorization: string }> {
  const token = await getToken();
  if (!token) {
    throw new Error('Authentication token required.');
  }
  return { Authorization: `Bearer ${token}` };
}

/** Handles axios errors gracefully */
async function handleAxiosError(error: any): Promise<never> {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      console.warn('[hospitalService] 401 — Unauthorized. Clearing storage.');
      await clearAuth();
      throw new Error('Session expired. Please log in again.');
    }
    const msg = error.response?.data?.detail || error.response?.data?.message || error.message;
    throw new Error(msg);
  }
  throw error;
}

/** Start a new hospital session - POST /hospital/symptoms */
export async function startHospitalSession(payload: SymptomPayload): Promise<{ session_id: string; status: string }> {
  try {
    const headers = await getHeaders();
    const res = await API.post('/hospital/symptoms', payload, { headers });
    if (res.data && res.data.status === 'success' && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Failed to start hospital session.');
  } catch (error) {
    return handleAxiosError(error);
  }
}

/** Send a message inside hospital session - POST /hospital/chat */
export async function sendHospitalMessage(payload: HospitalChatPayload): Promise<{ session_id: string; response_text: string }> {
  try {
    const headers = await getHeaders();
    const res = await API.post('/hospital/chat', payload, { headers });
    if (res.data && res.data.status === 'success' && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Failed to send hospital message.');
  } catch (error) {
    return handleAxiosError(error);
  }
}

/** Get hospital session history for a user - GET /hospital/history/{user_id} */
export async function getHospitalHistory(userId: string): Promise<HospitalSession[]> {
  try {
    const headers = await getHeaders();
    const res = await API.get(`/hospital/history/${userId}`, { headers });
    if (res.data && res.data.status === 'success' && res.data.data) {
      return res.data.data.history as HospitalSession[];
    }
    throw new Error(res.data?.message || 'Failed to fetch hospital history.');
  } catch (error) {
    return handleAxiosError(error);
  }
}
