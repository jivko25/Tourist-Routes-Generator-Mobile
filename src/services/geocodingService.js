import axios from 'axios';
import { createCity } from '../types/attraction';
import {
  GEOCODING_API_BASE_URL,
  getGooglePlacesApiKey,
} from '../utils/config';

/**
 * Converts a city name into geographic coordinates via Google Geocoding API.
 *
 * @param {string} cityName
 * @returns {Promise<import('../types/attraction').City>}
 */
export async function geocodeCity(cityName) {
  const trimmed = cityName?.trim();

  if (!trimmed) {
    throw new Error('Please enter a city name.');
  }

  const apiKey = getGooglePlacesApiKey();

  const response = await axios.get(GEOCODING_API_BASE_URL, {
    params: {
      address: trimmed,
      key: apiKey,
    },
    timeout: 15000,
  });

  if (response.data.status === 'ZERO_RESULTS') {
    throw new Error(`No location found for "${trimmed}". Try another city.`);
  }

  if (response.data.status !== 'OK' || !response.data.results?.length) {
    const message =
      response.data.error_message ||
      `Geocoding failed (${response.data.status || 'UNKNOWN'}).`;
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
