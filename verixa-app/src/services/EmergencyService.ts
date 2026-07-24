// src/services/EmergencyService.ts

import axios from 'axios';
import { BACKEND_URL } from './authService';
import { getToken, clearAuth } from '../utils/storage';

/**
 * Axios instance configured with the backend base URL.
 * All requests use relative paths and share the same timeout / headers.
 */
const API = axios.create({
  baseURL: `${BACKEND_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

/** Helper to attach the Bearer token to request headers. */
async function getHeaders(): Promise<{ Authorization: string }> {
  const token = await getToken();
  if (!token) {
    throw new Error('Authentication token required.');
  }
  return { Authorization: `Bearer ${token}` };
}

/** Centralised error handling – mirrors other services (hospital, bank). */
async function handleAxiosError(error: any): Promise<never> {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      console.warn('[EmergencyService] 401 — Unauthorized. Clearing storage.');
      await clearAuth();
      throw new Error('Session expired. Please log in again.');
    }
    const msg =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message;
    throw new Error(msg);
  }
  throw error;
}

/** Payload for sending an SOS request */
export interface EmergencyPayload {
  user_id: string;
  /** One of the allowed emergency types */
  type: 'Medical' | 'Police' | 'Fire' | 'General';
  /** Optional GPS coordinates */
  latitude?: number;
  longitude?: number;
}

/** Response shape for a successful SOS submission */
export interface EmergencySendResponse {
  alert_id?: string;
  status: string;
  message: string;
  data?: any;
}

/** History entry returned by GET /emergency/history */
export interface EmergencyHistoryEntry {
  /** MongoDB _id serialised as `id` by serialize_doc() */
  id: string;
  emergency_type: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
  maps_link?: string;
  status: string;
  whatsapp_status?: string;
}

/** POST /emergency/send */
export async function sendSOS(
  payload: EmergencyPayload
): Promise<EmergencySendResponse> {
  try {
    const headers = await getHeaders();
    const lat = payload.latitude ?? 0.0;
    const lng = payload.longitude ?? 0.0;
    const backendPayload = {
      latitude: lat,
      longitude: lng,
      maps_link: lat && lng
        ? `https://www.google.com/maps?q=${lat},${lng}&ll=${lat},${lng}&z=17`
        : '',
      emergency_type: payload.type || 'General'
    };
    const res = await API.post('/emergency/send', backendPayload, { headers });
    const resData = res.data?.data || {};
    // The outer envelope `res.data.status` is always "success" for both real WhatsApp success
    // and mocked mode. We must read the INNER status from `res.data.data.status` to distinguish.
    const innerStatus: string = resData.status || 'failed';
    return {
      status: innerStatus,
      message: res.data?.message || 'Emergency SOS processed.',
      alert_id: resData.alert_id,
      data: resData,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        console.warn('[EmergencyService] 401 — Unauthorized. Clearing storage.');
        await clearAuth();
        throw new Error('Session expired. Please log in again.');
      }

      // For 502 failed responses, error_response puts extra info in `detail` (not `data`)
      const resDetail = error.response?.data?.detail || {};
      let msg =
        resDetail.error_message ||
        error.response?.data?.message ||
        (typeof error.response?.data?.detail === 'string' ? error.response.data.detail : null) ||
        error.message;
      if (error.response?.data?.error?.message) {
        msg = error.response.data.error.message;
      }
      return {
        status: resDetail.status || error.response?.data?.status || 'failed',
        message: msg,
        alert_id: resDetail.alert_id,
        data: {
          whatsapp_status: 'failed',
          delivery_status: 'failed',
          ...resDetail,
          error_message: msg,
        },
      };
    }
    throw error;
  }
}

/** GET /emergency/history */
export async function getSOSHistory(): Promise<EmergencyHistoryEntry[]> {
  try {
    const headers = await getHeaders();
    const res = await API.get('/emergency/history', { headers });
    if (res.data && res.data.status === 'success' && res.data.data) {
      const list = res.data.data.alerts || res.data.data.history;
      if (list) {
        return list as EmergencyHistoryEntry[];
      }
    }
    throw new Error(res.data?.message || 'Failed to fetch SOS history.');
  } catch (error) {
    return handleAxiosError(error);
  }
}

/** DELETE /emergency/history/{alert_id} */
export async function deleteSOSHistory(alertId: string): Promise<void> {
  try {
    const headers = await getHeaders();
    await API.delete(`/emergency/history/${alertId}`, { headers });
  } catch (error) {
    return handleAxiosError(error);
  }
}
