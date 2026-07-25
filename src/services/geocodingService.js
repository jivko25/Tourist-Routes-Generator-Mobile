import axios from 'axios';
import { createCity } from '../types/attraction';
import {
  GEOCODING_API_BASE_URL,
  getGooglePlacesApiKey,
} from '../utils/config';
import { getGoogleLanguageCode } from '../i18n/language';
import i18n from '../i18n';

/**
 * Converts a city name into geographic coordinates via Google Geocoding API.
 *
 * @param {string} cityName
 * @param {{ language?: string }} [options]
 * @returns {Promise<import('../types/attraction').City>}
 */
export async function geocodeCity(cityName, options = {}) {
  const trimmed = cityName?.trim();

  if (!trimmed) {
    throw new Error(i18n.t('errors.enterCity'));
  }

  const apiKey = getGooglePlacesApiKey();
  const language = options.language || getGoogleLanguageCode();

  const response = await axios.get(GEOCODING_API_BASE_URL, {
    params: {
      address: trimmed,
      key: apiKey,
      language,
    },
    timeout: 15000,
  });

  if (response.data.status === 'ZERO_RESULTS') {
    throw new Error(i18n.t('errors.noLocation', { name: trimmed }));
  }

  if (response.data.status !== 'OK' || !response.data.results?.length) {
    const message =
      response.data.error_message ||
      i18n.t('errors.geocodingFailed', {
        status: response.data.status || 'UNKNOWN',
      });
    throw new Error(message);
  }

  const result = response.data.results[0];
  const { lat, lng } = result.geometry.location;

  return createCity({
    id: result.place_id,
    name: result.formatted_address || trimmed,
    latitude: lat,
    longitude: lng,
  });
}
