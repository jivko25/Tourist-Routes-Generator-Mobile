import axios from 'axios';
import {
  getGooglePlacesApiKey,
  normalizeTravelMode,
  ROUTES_API_BASE_URL,
} from '../utils/config';

const MODE_MAP = {
  walking: 'WALK',
  driving: 'DRIVE',
  bicycling: 'BICYCLE',
  transit: 'TRANSIT',
};

/**
 * @param {{ latitude: number, longitude: number }} point
 */
function toWaypoint(point) {
  return {
    location: {
      latLng: {
        latitude: point.latitude,
        longitude: point.longitude,
      },
    },
  };
}

/**
 * @param {string} duration - e.g. "3240s" or "3240.5s"
 * @returns {number} minutes (rounded)
 */
export function parseDurationToMinutes(duration) {
  if (typeof duration !== 'string') return 0;
  const match = duration.match(/^([\d.]+)s$/);
  if (!match) return 0;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}

/**
 * Fetches real travel duration/distance via Google Routes API (computeRoutes).
 * Matches Google Maps much more closely than haversine heuristics.
 *
 * @param {{
 *   points: Array<{ latitude: number, longitude: number }>,
 *   travelMode?: string,
 * }} options
 * @returns {Promise<{ travelMinutes: number, distanceMeters: number, durationSeconds: number, source: 'routes_api' }>}
 */
export async function fetchRouteTravelEstimate({
  points = [],
  travelMode = 'walking',
} = {}) {
  if (!Array.isArray(points) || points.length < 2) {
    return {
      travelMinutes: 0,
      distanceMeters: 0,
      durationSeconds: 0,
      source: 'routes_api',
    };
  }

  const mode = normalizeTravelMode(travelMode);
  const apiMode = MODE_MAP[mode] || 'WALK';
  const origin = toWaypoint(points[0]);
  const destination = toWaypoint(points[points.length - 1]);
  const intermediates = points.slice(1, -1).map(toWaypoint);

  const body = {
    origin,
    destination,
    travelMode: apiMode,
    computeAlternativeRoutes: false,
    languageCode: 'en',
    units: 'METRIC',
  };

  if (intermediates.length > 0) {
    // Routes API allows a limited number of intermediates.
    body.intermediates = intermediates.slice(0, 25);
  }

  // Traffic-aware routing is only valid for DRIVE.
  if (apiMode === 'DRIVE') {
    body.routingPreference = 'TRAFFIC_AWARE';
  }

  const response = await axios.post(
    `${ROUTES_API_BASE_URL}/directions/v2:computeRoutes`,
    body,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': getGooglePlacesApiKey(),
        'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters',
      },
      timeout: 20000,
    }
  );

  const route = response.data?.routes?.[0];
  if (!route) {
    throw new Error('No route returned from Google Routes API.');
  }

  const durationRaw = route.duration || route.staticDuration || '0s';
  const durationSeconds = Number(String(durationRaw).replace(/s$/, '')) || 0;
  const travelMinutes = parseDurationToMinutes(durationRaw);
  const distanceMeters =
    typeof route.distanceMeters === 'number' ? route.distanceMeters : 0;

  return {
    travelMinutes,
    distanceMeters,
    durationSeconds,
    source: 'routes_api',
  };
}
