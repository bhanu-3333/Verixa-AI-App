/**
 * Verixa AI — Bank Service
 * Handles API requests for starting banking sessions, chatting, and fetching history.
 */

import axios from 'axios';
import { BACKEND_URL } from './authService';
import { getToken, clearAuth } from '../utils/storage';

const API = axios.create({
  baseURL: `${BACKEND_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export interface BankServicePayload {
  user_id: string;
  bank_name: string;
  service_type?: string;
  language: string;
}

export interface BankChatPayload {
  user_id: string;
  session_id: string;
  message: string;
  language: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface BankSession {
  id: string;
  user_id: string;
  bank_name: string;
  service_type?: string;
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
      console.warn('[bankService] 401 — Unauthorized. Clearing storage.');
      await clearAuth();
      throw new Error('Session expired. Please log in again.');
    }
    const msg = error.response?.data?.detail || error.response?.data?.message || error.message;
    throw new Error(msg);
  }
  throw error;
}

/** Start a new banking session - POST /bank/service */
export async function startBankSession(payload: BankServicePayload): Promise<{ session_id: string; status: string }> {
  try {
    const headers = await getHeaders();
    const res = await API.post('/bank/service', payload, { headers });
    if (res.data && res.data.status === 'success' && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Failed to start banking session.');
  } catch (error) {
    return handleAxiosError(error);
  }
}

/** Send a message inside banking session - POST /bank/chat */
export async function sendBankMessage(payload: BankChatPayload): Promise<{ session_id: string; response_text: string }> {
  try {
    const headers = await getHeaders();
    const res = await API.post('/bank/chat', payload, { headers });
    if (res.data && res.data.status === 'success' && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Failed to send banking message.');
  } catch (error) {
    return handleAxiosError(error);
  }
}

/** Get banking session history for a user - GET /bank/history/{user_id} */
export async function getBankHistory(userId: string): Promise<BankSession[]> {
  try {
    const headers = await getHeaders();
    const res = await API.get(`/bank/history/${userId}`, { headers });
    if (res.data && res.data.status === 'success' && res.data.data) {
      return res.data.data.history as BankSession[];
    }
    throw new Error(res.data?.message || 'Failed to fetch banking history.');
  } catch (error) {
    return handleAxiosError(error);
  }
}

export interface BankCompletePayload {
  user_id: string;
  session_id: string;
  service_type: string;
  form_data: Record<string, string>;
  chat_history: ChatMessage[];
  language: string;
}

/** Complete and finalize a banking session - POST /bank/complete */
export async function completeBankSession(payload: BankCompletePayload): Promise<{ session_id: string; status: string }> {
  try {
    const headers = await getHeaders();
    const res = await API.post('/bank/complete', payload, { headers });
    if (res.data && res.data.status === 'success' && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Failed to complete banking session.');
  } catch (error) {
    return handleAxiosError(error);
  }
}

