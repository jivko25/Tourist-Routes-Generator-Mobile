import Constants from 'expo-constants';

/**
 * Centralized access to environment / Expo config values.
 * API keys are never hardcoded — they come from .env via app.config.js.
 */
export function getGooglePlacesApiKey() {
  const key = Constants.expoConfig?.extra?.googlePlacesApiKey;

  if (!key) {
    throw new Error(
      'GOOGLE_PLACES_API_KEY is missing. Add it to your .env file and restart Expo.'
    );
  }

  return key;
}

export const PLACES_API_BASE_URL = 'https://places.googleapis.com/v1';
export const GEOCODING_API_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
export const DEFAULT_SEARCH_RADIUS_METERS = 10000;
export const DEFAULT_MAX_RESULTS = 20;
