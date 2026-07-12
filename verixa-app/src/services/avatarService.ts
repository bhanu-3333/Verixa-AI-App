/**
 * Verixa AI — Avatar Service
 * Handles fetching SiGML translation data from the FastAPI backend.
 */

import axios from 'axios';
import { BACKEND_URL } from './authService';
import { getToken } from '../utils/storage';
import { clearAuth } from '../utils/storage';

// Axios instance configured for API v1 base URL
const API = axios.create({
  baseURL: `${BACKEND_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

/**
 * Sends a text translation query to the backend '/avatar/translate' endpoint.
 * Retrieves and returns the resulting SiGML XML payload.
 * 
 * @param text The text query to translate into sign language.
 * @param tokenOverride Optional override token to bypass local storage retrieval.
 * @returns The raw SiGML XML string returned from the backend.
 */
export async function translateTextToSigml(text: string, tokenOverride?: string): Promise<string> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error('Please enter text.');
  }

  const token = tokenOverride || (await getToken());

  // Debug: log the token being sent (first/last 8 chars only for security)
  if (token) {
    const preview = token.length > 16
      ? `${token.slice(0, 8)}...${token.slice(-8)}`
      : token;
    console.log('[avatarService] Authorization header:', `Bearer ${preview}`);
    console.log('[avatarService] Token length:', token.length);
  } else {
    console.warn('[avatarService] No token found in storage!');
  }

  if (!token) {
    throw new Error('Authentication token required for translation.');
  }

  try {
    const res = await API.post(
      '/avatar/translate',
      { text: trimmedText },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Parse structured FastAPI response
    if (res.data && res.data.status === 'success' && res.data.data) {
      return res.data.data.sigml as string;
    }
    
    throw new Error(res.data?.message || 'Failed to translate text to SiGML.');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle expired/invalid token specifically
      if (error.response?.status === 401) {
        console.warn('[avatarService] 401 — token expired or invalid. Clearing stored auth.');
        await clearAuth();
        throw new Error('Session expired. Please log in again.');
      }

      const serverMessage = 
        error.response?.data?.detail || 
        error.response?.data?.message || 
        error.message;
      throw new Error(serverMessage);
    }
    throw error;
  }
}
