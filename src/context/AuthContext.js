import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  exchangeGoogleCodeAsync,
  isExpoGo,
  resolveGoogleOAuthClient,
  useGoogleAuthRequest,
} from '../auth/googleAuthSession';
import {
  getGoogleAuthConfig,
  isDriveOAuthConfigured,
  loginWithEmail,
  logoutApiSession,
  refreshApiSession,
  registerWithEmail,
} from '../api/authApi';
import { setAuthorizedApiHandlers } from '../api/authorizedApi';
import {
  buildStoredSession,
  clearAuthSession,
  isApiTokenExpired,
  isGoogleTokenExpired,
  loadAuthSession,
  saveAuthSession,
} from '../services/authSessionStorage';

WebBrowser.maybeCompleteAuthSession();

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const sessionRef = useRef(null);
  const refreshPromiseRef = useRef(null);

  const googleConfig = getGoogleAuthConfig();
  const driveConfigured = isDriveOAuthConfigured();

  // Drive-only Google OAuth (not app login).
  const [request, , promptAsync] = useGoogleAuthRequest({
    webClientId: googleConfig.webClientId,
    androidClientId: googleConfig.androidClientId,
    iosClientId: googleConfig.iosClientId,
    scopes: [DRIVE_SCOPE],
  });

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await loadAuthSession();
      if (!mounted) return;
      setSession(stored);
      setIsReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(async (next) => {
    sessionRef.current = next;
    setSession(next);
    if (next) await saveAuthSession(next);
    else await clearAuthSession();
  }, []);

  const applyApiSession = useCallback(
    async (apiSession, googleBits = {}) => {
      const current = sessionRef.current;
      const next = buildStoredSession({
        apiSession,
        googleAccessToken:
          googleBits.googleAccessToken ?? current?.googleAccessToken ?? null,
        googleExpiresInSec: googleBits.googleExpiresInSec ?? null,
      });

      if (
        googleBits.googleAccessToken == null &&
        current?.googleAccessToken
      ) {
        next.googleAccessToken = current.googleAccessToken;
        next.googleExpiresAt = current.googleExpiresAt;
      }
      if (!next.user && current?.user) next.user = current.user;

      await persist(next);
      return next;
    },
    [persist]
  );

  const forceRefreshAccessToken = useCallback(async () => {
    const current = sessionRef.current;
    if (!current?.refreshToken) {
      await persist(null);
      return null;
    }

    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = (async () => {
        try {
          const refreshed = await refreshApiSession(current.refreshToken);
          const next = await applyApiSession(refreshed);
          return next.accessToken;
        } catch {
          await persist(null);
          return null;
        } finally {
          refreshPromiseRef.current = null;
        }
      })();
    }

    return refreshPromiseRef.current;
  }, [applyApiSession, persist]);

  const ensureApiAccessToken = useCallback(async () => {
    const current = sessionRef.current;
    if (!current?.accessToken) return null;
    if (!isApiTokenExpired(current)) return current.accessToken;
    return forceRefreshAccessToken();
  }, [forceRefreshAccessToken]);

  useEffect(() => {
    setAuthorizedApiHandlers({
      getAccessToken: ensureApiAccessToken,
      forceRefreshAccessToken,
      onAuthFailure: async () => {
        await persist(null);
      },
    });
    return () => setAuthorizedApiHandlers(null);
  }, [ensureApiAccessToken, forceRefreshAccessToken, persist]);

  const signIn = useCallback(
    async (email, password) => {
      setAuthError(null);
      const apiSession = await loginWithEmail(email, password);
      if (!apiSession?.access_token) {
        const err = new Error('Backend did not return an access token.');
        setAuthError(err.message);
        throw err;
      }
      return applyApiSession(apiSession);
    },
    [applyApiSession]
  );

  const signUp = useCallback(
    async (email, password, fullName) => {
      setAuthError(null);
      const apiSession = await registerWithEmail(email, password, {
        full_name: fullName,
      });
      if (!apiSession?.access_token) {
        const err = new Error('Backend did not return an access token.');
        setAuthError(err.message);
        throw err;
      }
      return applyApiSession(apiSession);
    },
    [applyApiSession]
  );

  const connectGoogleDrive = useCallback(async () => {
    setAuthError(null);

    if (!driveConfigured) {
      const err = new Error(
        'Google Drive is not configured. Add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (and Web client ID).'
      );
      setAuthError(err.message);
      throw err;
    }

    if (isExpoGo()) {
      const err = new Error(
        'Google Drive connect does not work reliably in Expo Go. Use the preview APK.'
      );
      setAuthError(err.message);
      throw err;
    }

    const oauth = resolveGoogleOAuthClient(googleConfig);
    if (!request) {
      const err = new Error('Google Drive connect is not ready yet.');
      setAuthError(err.message);
      throw err;
    }

    const result = await promptAsync();
    if (result.type !== 'success') {
      const err = new Error('Google Drive connect was cancelled.');
      setAuthError(err.message);
      throw err;
    }

    const exchanged = await exchangeGoogleCodeAsync(
      request,
      result,
      oauth.clientId
    );

    if (!exchanged.accessToken) {
      throw new Error('Google did not return a Drive access token.');
    }

    const current = sessionRef.current;
    if (!current?.accessToken) {
      throw new Error('Sign in to Travel Go before connecting Drive.');
    }

    const next = {
      ...current,
      googleAccessToken: exchanged.accessToken,
      googleExpiresAt:
        typeof exchanged.expiresIn === 'number'
          ? Date.now() + exchanged.expiresIn * 1000
          : Date.now() + 55 * 60 * 1000,
    };
    await persist(next);
    return exchanged.accessToken;
  }, [driveConfigured, googleConfig, persist, promptAsync, request]);

  const ensureGoogleDriveAccess = useCallback(async () => {
    const current = sessionRef.current;
    if (current?.googleAccessToken && !isGoogleTokenExpired(current)) {
      return current.googleAccessToken;
    }
    return connectGoogleDrive();
  }, [connectGoogleDrive]);

  const signOut = useCallback(async () => {
    setAuthError(null);
    const current = sessionRef.current;
    await logoutApiSession({
      accessToken: current?.accessToken || null,
      refreshToken: current?.refreshToken || null,
    });
    await persist(null);
  }, [persist]);

  const getAccessToken = useCallback(async () => {
    return ensureApiAccessToken();
  }, [ensureApiAccessToken]);

  const value = useMemo(
    () => ({
      isReady,
      isDriveConfigured: driveConfigured,
      session,
      user: session?.user || null,
      isSignedIn: Boolean(session?.accessToken),
      hasDriveAccess: Boolean(
        session?.googleAccessToken && !isGoogleTokenExpired(session)
      ),
      authError,
      signIn,
      signUp,
      signOut,
      getAccessToken,
      connectGoogleDrive,
      ensureGoogleDriveAccess,
      getGoogleProviderToken: ensureGoogleDriveAccess,
    }),
    [
      isReady,
      driveConfigured,
      session,
      authError,
      signIn,
      signUp,
      signOut,
      getAccessToken,
      connectGoogleDrive,
      ensureGoogleDriveAccess,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
