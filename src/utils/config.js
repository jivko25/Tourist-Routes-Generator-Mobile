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
export const MIN_SEARCH_RADIUS_METERS = 500;
export const MAX_SEARCH_RADIUS_METERS = 200000;
/** Google Places Nearby Search circle radius hard limit */
export const PLACES_NEARBY_MAX_RADIUS_METERS = 50000;
export const DEFAULT_MAX_RESULTS = 20;

export const RADIUS_PRESETS = [
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '20 km', value: 20000 },
  { label: '50 km', value: 50000 },
  { label: '100 km', value: 100000 },
  { label: '200 km', value: 200000 },
];

/** Google Maps Directions travelmode values */
export const TRAVEL_MODES = [
  { id: 'walking', label: 'Walking', shortLabel: 'Walk' },
  { id: 'driving', label: 'Driving', shortLabel: 'Car' },
  { id: 'bicycling', label: 'Cycling', shortLabel: 'Bike' },
  { id: 'transit', label: 'Transit', shortLabel: 'Transit' },
];

export const DEFAULT_TRAVEL_MODE = 'walking';

/**
 * @param {string} mode
 * @returns {string}
 */
export function normalizeTravelMode(mode) {
  const match = TRAVEL_MODES.find((item) => item.id === mode);
  return match ? match.id : DEFAULT_TRAVEL_MODE;
}

/**
 * @param {string} mode
 * @returns {string}
 */
export function formatTravelModeLabel(mode) {
  const match = TRAVEL_MODES.find((item) => item.id === mode);
  return match ? match.label : TRAVEL_MODES[0].label;
}

