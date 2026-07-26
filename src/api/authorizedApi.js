import axios from 'axios';
import { getTravelApiBaseUrl } from '../utils/config';

/**
 * Shared handlers registered by AuthProvider.
 * @type {{
 *   getAccessToken: () => Promise<string|null>,
 *   forceRefreshAccessToken: () => Promise<string|null>,
 *   onAuthFailure: () => Promise<void>|void,
 * } | null}
 */
let handlers = null;

export function setAuthorizedApiHandlers(next) {
  handlers = next;
}

function toApiError(error, fallbackMessage) {
  const status = error?.response?.status;
  const body = error?.response?.data;
  const message =
    (typeof body?.message === 'string' && body.message) ||
    error?.message ||
    fallbackMessage;
  const err = new Error(message);
  err.statusCode = body?.statusCode || status || 0;
  err.response = error?.response;
  return err;
}

/**
 * Run an axios request with Bearer token.
 * On 401: refresh once, retry once, then force logout.
 *
 * @param {(accessToken: string) => Promise<import('axios').AxiosResponse>} requestFn
 * @param {string} [fallbackMessage]
 */
export async function withAuthRetry(requestFn, fallbackMessage = 'Request failed.') {
  if (!handlers?.getAccessToken) {
    const err = new Error('Not signed in.');
    err.statusCode = 401;
    throw err;
  }

  let accessToken = await handlers.getAccessToken();
  if (!accessToken) {
    await handlers.onAuthFailure?.();
    const err = new Error('Not signed in.');
    err.statusCode = 401;
    throw err;
  }

  try {
    return await requestFn(accessToken);
  } catch (error) {
    if (error?.response?.status !== 401) {
      throw toApiError(error, fallbackMessage);
    }

    const refreshed = await handlers.forceRefreshAccessToken?.();
    if (!refreshed) {
      await handlers.onAuthFailure?.();
      throw toApiError(error, fallbackMessage);
    }

    try {
      return await requestFn(refreshed);
    } catch (retryError) {
      if (retryError?.response?.status === 401) {
        await handlers.onAuthFailure?.();
      }
      throw toApiError(retryError, fallbackMessage);
    }
  }
}

export function getApiBaseUrl() {
  return getTravelApiBaseUrl();
}

export { axios };
