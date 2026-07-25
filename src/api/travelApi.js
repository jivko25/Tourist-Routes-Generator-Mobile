import axios from 'axios';
import { getTravelApiBaseUrl } from '../utils/config';
import { normalizeCountryDetailsResponse } from '../types/country';

/**
 * @param {unknown} error
 * @returns {Error}
 */
function toTravelApiError(error) {
  const status = error?.response?.status;
  const body = error?.response?.data;
  const message =
    (typeof body?.message === 'string' && body.message) ||
    (typeof body === 'string' && body) ||
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

/**
 * GET /api/countries/:countryCode — country details + top tourist cities.
 *
 * @param {string} countryCode ISO alpha-2
 * @param {number} [limit]
 * @returns {Promise<import('../types/country').CountryDetailsResponse>}
 */
export async function getCountryDetails(countryCode, limit) {
  const code = String(countryCode || '')
    .trim()
    .toUpperCase();

  if (!/^[A-Z]{2}$/.test(code)) {
    const err = new Error(
      'Invalid countryCode. Use ISO alpha-2, e.g. FR.'
    );
    err.statusCode = 400;
    err.isTravelApiError = true;
    throw err;
  }

  const baseUrl = getTravelApiBaseUrl();
  const params = {};
  if (limit != null && Number.isFinite(Number(limit))) {
    params.limit = Math.min(50, Math.max(1, Math.round(Number(limit))));
  }

  try {
    const response = await axios.get(`${baseUrl}/api/countries/${code}`, {
      params,
      timeout: 20000,
      headers: {
        Accept: 'application/json',
      },
    });

    return normalizeCountryDetailsResponse(response.data);
  } catch (error) {
    throw toTravelApiError(error);
  }
}
