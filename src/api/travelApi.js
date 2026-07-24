import axios from 'axios';
import { getTravelApiBaseUrl } from '../utils/config';

/**
 * @param {unknown} error
 * @returns {Error}
 */
function toTravelApiError(error) {
  const status = error?.response?.status;
  const body = error?.response?.data;
  const message =
    (typeof body?.message === 'string' && body.message) ||
    error?.message ||
    'Something went wrong talking to the travel assistant.';

  const err = new Error(message);
  err.statusCode = body?.statusCode || status || 0;
  err.isTravelApiError = true;
  return err;
}

/**
 * POST /api/travel/parse — natural language → structured intent.
 *
 * @param {string} text
 * @returns {Promise<import('../types/travelRequest').TravelParseResult>}
 */
export async function parseTravelRequest(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    const err = new Error('Please type a travel request first.');
    err.statusCode = 400;
    err.isTravelApiError = true;
    throw err;
  }

  const baseUrl = getTravelApiBaseUrl();

  try {
    const response = await axios.post(
      `${baseUrl}/api/travel/parse`,
      { text: trimmed },
      {
        timeout: 45000,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data || {};
    return {
      destination: data.destination ?? null,
      duration: data.duration ?? null,
      travelers: typeof data.travelers === 'number' ? data.travelers : null,
      budget: data.budget ?? null,
      travelDates: data.travelDates ?? null,
      services: Array.isArray(data.services) ? data.services : [],
    };
  } catch (error) {
    throw toTravelApiError(error);
  }
}
