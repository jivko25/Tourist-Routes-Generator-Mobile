/**
 * Google OAuth via expo-auth-session core APIs
 * (avoids broken Metro resolve of expo-auth-session/providers/google on Windows).
 *
 * Used ONLY for Drive upload (drive.file) — not for Travel Go app login.
 * Android requires EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID and redirect:
 * com.googleusercontent.apps.<client-hash>:/oauthredirect
 */

import { useMemo } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';

export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
};

const MINIMUM_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

export function isExpoGo() {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

/**
 * Google Android clients only accept reverse-client-id redirects.
 * Example client: 123-abc.apps.googleusercontent.com
 * → com.googleusercontent.apps.123-abc:/oauthredirect
 *
 * Use the literal URI (do not let Expo rewrite it to travelgo://…).
 */
export function getGoogleAndroidRedirectUri(androidClientId) {
  const id = String(androidClientId || '').trim();
  const hash = id.replace(/\.apps\.googleusercontent\.com$/i, '');
  if (!hash || hash === id) {
    throw new Error(
      'Invalid EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (expected *.apps.googleusercontent.com).'
    );
  }
  return `com.googleusercontent.apps.${hash}:/oauthredirect`;
}

export function resolveGoogleOAuthClient({
  webClientId,
  androidClientId,
  iosClientId,
} = {}) {
  if (Platform.OS === 'android') {
    const androidId = String(androidClientId || '').trim();
    if (!androidId) {
      const err = new Error(
        'Missing EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID. Create an Android OAuth client in Google Cloud (package com.travelgo.app + SHA-1) and add it to .env.'
      );
      err.code = 'MISSING_ANDROID_CLIENT_ID';
      throw err;
    }
    return {
      clientId: androidId,
      redirectUri: getGoogleAndroidRedirectUri(androidId),
      audienceHint: androidId,
    };
  }

  if (Platform.OS === 'ios') {
    const iosId = String(iosClientId || webClientId || '').trim();
    if (!iosId) {
      throw new Error('Missing Google iOS/Web client ID.');
    }
    return {
      clientId: iosId,
      redirectUri: makeRedirectUri({
        scheme: 'travelgo',
        path: 'auth/callback',
      }),
      audienceHint: iosId,
    };
  }

  const webId = String(webClientId || '').trim();
  if (!webId) {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
  }
  return {
    clientId: webId,
    redirectUri: makeRedirectUri({
      scheme: 'travelgo',
      path: 'auth/callback',
    }),
    audienceHint: webId,
  };
}

/**
 * @param {object} config
 * @param {string} [config.webClientId]
 * @param {string} [config.androidClientId]
 * @param {string} [config.iosClientId]
 * @param {string[]} [config.scopes]
 */
export function useGoogleAuthRequest(config = {}) {
  const oauth = useMemo(() => {
    try {
      return resolveGoogleOAuthClient(config);
    } catch {
      // Hook must not throw during render — validate again in prompt.
      return {
        clientId: 'missing.apps.googleusercontent.com',
        redirectUri: makeRedirectUri({ scheme: 'travelgo', path: 'auth/callback' }),
      };
    }
  }, [config.androidClientId, config.iosClientId, config.webClientId]);

  const scopes = useMemo(() => {
    const extra = Array.isArray(config.scopes) ? config.scopes : [];
    return [...new Set([...MINIMUM_SCOPES, ...extra])];
  }, [config.scopes]);

  return AuthSession.useAuthRequest(
    {
      clientId: oauth.clientId,
      redirectUri: oauth.redirectUri,
      scopes,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
    GOOGLE_DISCOVERY
  );
}

/**
 * @param {import('expo-auth-session').AuthRequest | null} request
 * @param {import('expo-auth-session').AuthSessionResult} result
 * @param {string} clientId
 */
export async function exchangeGoogleCodeAsync(request, result, clientId) {
  if (result?.type !== 'success') {
    return { idToken: null, accessToken: null, expiresIn: null };
  }

  const params = result.params || {};
  if (params.id_token || params.access_token) {
    return {
      idToken: params.id_token || null,
      accessToken: params.access_token || null,
      expiresIn: params.expires_in ? Number(params.expires_in) : null,
    };
  }

  const code = params.code;
  if (!code) {
    return { idToken: null, accessToken: null, expiresIn: null };
  }

  const tokenResult = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code,
      redirectUri: request?.redirectUri,
      extraParams: {
        code_verifier: request?.codeVerifier || '',
      },
    },
    GOOGLE_DISCOVERY
  );

  return {
    idToken: tokenResult.idToken || tokenResult.params?.id_token || null,
    accessToken:
      tokenResult.accessToken || tokenResult.params?.access_token || null,
    expiresIn:
      typeof tokenResult.expiresIn === 'number'
        ? tokenResult.expiresIn
        : tokenResult.params?.expires_in
          ? Number(tokenResult.params.expires_in)
          : null,
  };
}
