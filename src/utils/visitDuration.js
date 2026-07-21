/**
 * Heuristic visit duration by Google Places primary type / category.
 * These are planning estimates — not live crowd data.
 */

import { totalPathDistanceKm } from './routeOptimization';
import { normalizeTravelMode } from './config';

/** @type {Record<string, number>} minutes */
const TYPE_MINUTES = {
  museum: 120,
  art_gallery: 75,
  aquarium: 120,
  zoo: 150,
  amusement_park: 180,
  tourist_attraction: 45,
  historical_landmark: 40,
  church: 30,
  mosque: 30,
  synagogue: 30,
  hindu_temple: 30,
  park: 60,
  national_park: 180,
  hiking_area: 120,
  performing_arts_theater: 150,
  cultural_center: 75,
  restaurant: 75,
  cafe: 45,
  bar: 60,
  bakery: 25,
  meal_takeaway: 30,
};

const CATEGORY_HINTS = [
  { match: /museum|музей/i, minutes: 120 },
  { match: /aquarium|аквариум/i, minutes: 120 },
  { match: /zoo|зоопарк/i, minutes: 150 },
  { match: /gallery|галери/i, minutes: 75 },
  { match: /park|парк/i, minutes: 60 },
  { match: /church|cathedral|църк|катедрал/i, minutes: 30 },
  { match: /restaurant|ресторант/i, minutes: 75 },
  { match: /cafe|кафене|coffee/i, minutes: 45 },
  { match: /theater|theatre|театър/i, minutes: 150 },
  { match: /landmark|monument|паметник/i, minutes: 40 },
];

const DEFAULT_MINUTES = 45;

/** Average urban speeds (km/h) for rough travel estimates. */
const TRAVEL_SPEED_KMH = {
  walking: 4.5,
  bicycling: 14,
  driving: 28,
  transit: 16,
};

/** Extra minutes per leg (lights, transfers, parking, etc.). */
const TRAVEL_BUFFER_PER_LEG_MIN = {
  walking: 1,
  bicycling: 2,
  driving: 3,
  transit: 6,
};

/**
 * @param {{ primaryType?: string|null, category?: string|null }} place
 * @returns {number} minutes
 */
export function estimateVisitMinutes(place) {
  const type = (place?.primaryType || '').toLowerCase().trim();
  if (type && TYPE_MINUTES[type] != null) {
    return TYPE_MINUTES[type];
  }

  const category = place?.category || '';
  for (const hint of CATEGORY_HINTS) {
    if (hint.match.test(category)) return hint.minutes;
  }

  return DEFAULT_MINUTES;
}

/**
 * @param {number} minutes
 * @returns {string}
 */
export function formatVisitDuration(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0));
  if (value < 60) return `${value} мин`;

  const hours = Math.floor(value / 60);
  const rest = value % 60;
  if (rest === 0) {
    return hours === 1 ? '1 ч' : `${hours} ч`;
  }
  return `${hours} ч ${rest} мин`;
}

/**
 * @param {{ primaryType?: string|null, category?: string|null }} place
 * @returns {string}
 */
export function formatPlaceVisitDuration(place) {
  return formatVisitDuration(estimateVisitMinutes(place));
}

/**
 * @param {Array<{ primaryType?: string|null, category?: string|null }>} places
 * @returns {{ minutes: number, label: string }}
 */
export function sumVisitDurations(places = []) {
  const minutes = places.reduce(
    (total, place) => total + estimateVisitMinutes(place),
    0
  );
  return {
    minutes,
    label: formatVisitDuration(minutes),
  };
}

/**
 * Estimate travel time from straight-line distance + travel mode.
 *
 * @param {number} distanceKm
 * @param {string} [travelMode]
 * @param {number} [legs=1]
 * @returns {number} minutes
 */
export function estimateTravelMinutes(
  distanceKm,
  travelMode = 'walking',
  legs = 1
) {
  const mode = normalizeTravelMode(travelMode);
  const speed = TRAVEL_SPEED_KMH[mode] || TRAVEL_SPEED_KMH.walking;
  const buffer =
    (TRAVEL_BUFFER_PER_LEG_MIN[mode] || 1) * Math.max(0, legs);

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return Math.round(buffer > 0 && legs > 0 ? buffer : 0);
  }

  // Straight-line underestimate vs real roads — bump ~20%.
  const roadKm = distanceKm * 1.2;
  const movingMinutes = (roadKm / speed) * 60;
  return Math.max(1, Math.round(movingMinutes + buffer));
}

/**
 * Full route timing: visits + travel between start/stops/end.
 * Pass `travelMinutesOverride` when live Routes API data is available.
 *
 * @param {{
 *   attractions?: Array<{ latitude: number, longitude: number, primaryType?: string|null, category?: string|null }>,
 *   start?: { latitude: number, longitude: number }|null,
 *   end?: { latitude: number, longitude: number }|null,
 *   travelMode?: string,
 *   travelMinutesOverride?: number|null,
 * }} options
 */
export function estimateRouteTiming({
  attractions = [],
  start = null,
  end = null,
  travelMode = 'walking',
  travelMinutesOverride = null,
} = {}) {
  const visit = sumVisitDurations(attractions);
  const path = [
    ...(start ? [start] : []),
    ...attractions,
    ...(end ? [end] : []),
  ];
  const distanceKm = totalPathDistanceKm(path);
  const legs = Math.max(0, path.length - 1);
  const heuristicTravel = estimateTravelMinutes(distanceKm, travelMode, legs);
  const travelMinutes =
    typeof travelMinutesOverride === 'number' &&
    Number.isFinite(travelMinutesOverride)
      ? Math.max(0, Math.round(travelMinutesOverride))
      : heuristicTravel;
  const totalMinutes = visit.minutes + travelMinutes;

  return {
    distanceKm,
    legs,
    visitMinutes: visit.minutes,
    travelMinutes,
    totalMinutes,
    visitLabel: visit.label,
    travelLabel: formatVisitDuration(travelMinutes),
    totalLabel: formatVisitDuration(totalMinutes),
    travelIsLive: typeof travelMinutesOverride === 'number',
  };
}

/**
 * Build ordered path points for Directions/Routes API.
 */
export function buildRoutePathPoints({
  attractions = [],
  start = null,
  end = null,
} = {}) {
  return [
    ...(start ? [start] : []),
    ...attractions,
    ...(end ? [end] : []),
  ].filter(
    (point) =>
      typeof point?.latitude === 'number' &&
      typeof point?.longitude === 'number'
  );
}
