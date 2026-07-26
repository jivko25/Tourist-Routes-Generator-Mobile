import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'travelgo_auth_session_v1';

/**
 * @typedef {Object} StoredAuthSession
 * @property {string} accessToken API JWT for Travel Go backend
 * @property {string|null} refreshToken
 * @property {number|null} expiresAt epoch ms
 * @property {{ id: string, email?: string|null, full_name?: string|null, avatar_url?: string|null }|null} user
 * @property {string|null} googleAccessToken for Drive uploads
 * @property {number|null} googleExpiresAt epoch ms
 */

/**
 * @returns {Promise<StoredAuthSession|null>}
 */
export async function loadAuthSession() {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken) return null;
    return {
      accessToken: String(parsed.accessToken),
      refreshToken: parsed.refreshToken ? String(parsed.refreshToken) : null,
      expiresAt:
        typeof parsed.expiresAt === 'number' ? parsed.expiresAt : null,
      user: parsed.user || null,
      googleAccessToken: parsed.googleAccessToken
        ? String(parsed.googleAccessToken)
        : null,
      googleExpiresAt:
        typeof parsed.googleExpiresAt === 'number'
          ? parsed.googleExpiresAt
          : null,
    };
  } catch {
    return null;
  }
}

/**
 * @param {StoredAuthSession} session
 */
export async function saveAuthSession(session) {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session));
}

export async function clearAuthSession() {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

/**
 * @param {object} params
 * @param {import('../api/authApi').AuthSessionResponse} [params.apiSession]
 * @param {string|null} [params.googleAccessToken]
 * @param {number|null} [params.googleExpiresInSec]
 * @returns {StoredAuthSession}
 */
export function buildStoredSession({
  apiSession,
  googleAccessToken = null,
  googleExpiresInSec = null,
}) {
  const now = Date.now();
  const expiresInSec =
    typeof apiSession.expires_in === 'number' ? apiSession.expires_in : 3600;

  return {
    accessToken: apiSession.access_token,
    refreshToken: apiSession.refresh_token || null,
    expiresAt: now + expiresInSec * 1000,
    user: apiSession.user
      ? {
          id: String(apiSession.user.id),
          email: apiSession.user.email ?? null,
          full_name: apiSession.user.full_name ?? null,
          avatar_url: apiSession.user.avatar_url ?? null,
        }
      : null,
    googleAccessToken: googleAccessToken || null,
    googleExpiresAt:
      googleAccessToken && typeof googleExpiresInSec === 'number'
        ? now + googleExpiresInSec * 1000
        : googleAccessToken
          ? now + 55 * 60 * 1000
          : null,
  };
}

export function isApiTokenExpired(session, skewMs = 60_000) {
  if (!session?.accessToken) return true;
  if (session.expiresAt == null) return false;
  return Date.now() >= session.expiresAt - skewMs;
}

export function isGoogleTokenExpired(session, skewMs = 60_000) {
  if (!session?.googleAccessToken) return true;
  if (session.googleExpiresAt == null) return false;
  return Date.now() >= session.googleExpiresAt - skewMs;
}
