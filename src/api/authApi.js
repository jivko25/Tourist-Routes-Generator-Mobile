import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getTravelApiBaseUrl } from '../utils/config';

function getExtra() {
  return Constants.expoConfig?.extra || {};
}

/** Google OAuth client IDs — used only for Drive upload, not app login. */
export function getGoogleAuthConfig() {
  const extra = getExtra();
  const webClientId = String(
    extra.googleWebClientId ||
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      ''
  ).trim();
  const androidClientId = String(
    extra.googleAndroidClientId ||
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
      ''
  ).trim();
  const iosClientId = String(
    extra.googleIosClientId ||
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
      ''
  ).trim();

  return {
    webClientId,
    androidClientId: androidClientId || undefined,
    iosClientId: iosClientId || undefined,
  };
}

/** True when Drive OAuth clients are present for this platform. */
export function isDriveOAuthConfigured() {
  const { webClientId, androidClientId } = getGoogleAuthConfig();
  if (Platform.OS === 'android') {
    return Boolean(androidClientId);
  }
  if (Platform.OS === 'ios') {
    return Boolean(getGoogleAuthConfig().iosClientId || webClientId);
  }
  return Boolean(webClientId);
}

function toApiError(error) {
  const status = error?.response?.status;
  const body = error?.response?.data;
  const message =
    (typeof body?.message === 'string' && body.message) ||
    error?.message ||
    'Auth request failed.';
  const err = new Error(message);
  err.statusCode = body?.statusCode || status || 0;
  err.isAuthApiError = true;
  return err;
}

/**
 * @typedef {Object} AuthUser
 * @property {string} id
 * @property {string|null} email
 * @property {string|null} [full_name]
 * @property {string|null} [avatar_url]
 *
 * @typedef {Object} AuthSessionResponse
 * @property {string} access_token
 * @property {string} refresh_token
 * @property {number} expires_in
 * @property {string} [token_type]
 * @property {AuthUser} user
 */

/**
 * @param {string} email
 * @param {string} password
 * @param {{ full_name?: string }} [options]
 * @returns {Promise<AuthSessionResponse>}
 */
export async function registerWithEmail(email, password, options = {}) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) {
    const err = new Error('Email and password are required.');
    err.statusCode = 400;
    throw err;
  }
  if (String(password).length < 6) {
    const err = new Error('Password must be at least 6 characters.');
    err.statusCode = 400;
    throw err;
  }

  try {
    const response = await axios.post(
      `${getTravelApiBaseUrl()}/api/auth/register`,
      {
        email: normalizedEmail,
        password,
        full_name: options.full_name?.trim() || null,
      },
      {
        timeout: 30000,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        validateStatus: (status) => status === 201 || status === 200,
      }
    );
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<AuthSessionResponse>}
 */
export async function loginWithEmail(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) {
    const err = new Error('Email and password are required.');
    err.statusCode = 400;
    throw err;
  }

  try {
    const response = await axios.post(
      `${getTravelApiBaseUrl()}/api/auth/login`,
      {
        email: normalizedEmail,
        password,
      },
      {
        timeout: 30000,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * @param {string} refreshToken
 * @returns {Promise<AuthSessionResponse>}
 */
export async function refreshApiSession(refreshToken) {
  if (!refreshToken) {
    const err = new Error('Missing refresh token.');
    err.statusCode = 401;
    throw err;
  }

  try {
    const response = await axios.post(
      `${getTravelApiBaseUrl()}/api/auth/refresh`,
      { refresh_token: refreshToken },
      {
        timeout: 30000,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * @param {{ accessToken?: string|null, refreshToken?: string|null }} params
 */
export async function logoutApiSession({
  accessToken = null,
  refreshToken = null,
} = {}) {
  try {
    if (accessToken) {
      await axios.post(
        `${getTravelApiBaseUrl()}/api/auth/logout`,
        {},
        {
          timeout: 15000,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          validateStatus: (status) =>
            status === 204 || status === 200 || status === 401,
        }
      );
      return;
    }

    if (refreshToken) {
      await axios.post(
        `${getTravelApiBaseUrl()}/api/auth/logout`,
        { refresh_token: refreshToken },
        {
          timeout: 15000,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          validateStatus: (status) =>
            status === 204 || status === 200 || status === 401,
        }
      );
    }
  } catch {
    // Ignore — caller still clears local session.
  }
}
