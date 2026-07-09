/**
 * Verixa AI — Auth Service
 * All API calls to the FastAPI backend.
 * BACKEND_URL automatically switches between web and device.
 */

import axios from 'axios';
import { Platform } from 'react-native';

// ── Backend URL ────────────────────────────────────────────────────────────
// Web browser (localhost:8081) → backend on same PC → use localhost
// Phone on WiFi → backend on LAN IP → use 192.168.1.10
export const BACKEND_URL =
  Platform.OS === 'web'
    ? 'http://localhost:8000'      // running in browser on same PC
    : 'http://192.168.1.10:8000';  // running on phone via WiFi

// Axios instance — baseURL is set once, all calls use relative paths
const API = axios.create({
  baseURL: `${BACKEND_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Types ──────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  preferred_language: string;
  is_active: boolean;
  created_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ── API Calls ──────────────────────────────────────────────────────────────

/** Register a new user — POST /api/v1/auth/register */
export async function registerUser(payload: RegisterPayload): Promise<User> {
  const res = await API.post('/auth/register', payload);
  return res.data.data.user as User;
}

/** Login — POST /api/v1/auth/login → returns JWT token + user */
export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const res = await API.post('/auth/login', payload);
  return res.data as LoginResponse;
}

/** Get current user — GET /api/v1/auth/me */
export async function getMe(token: string): Promise<User> {
  const res = await API.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data.user as User;
}
