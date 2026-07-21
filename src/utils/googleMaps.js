/**
 * Google Maps URL helpers.
 * Kept separate from services so UI and services can share URL building logic.
 */

import { DEFAULT_TRAVEL_MODE, normalizeTravelMode } from './config';

/**
 * @param {number} latitude
 * @param {number} longitude
 * @returns {string}
 */
export function formatCoordinatePair(latitude, longitude) {
  return `${latitude},${longitude}`;
}

/**
 * Builds a Google Maps directions URL.
 * Supports optional address-based origin/destination and attraction waypoints.
 *
 * @param {Array<{ latitude: number, longitude: number }>} places
 * @param {{ origin?: string, destination?: string, travelMode?: string }} [options]
 * @returns {string}
 */
export function buildGoogleMapsDirectionsUrl(places, options = {}) {
  const origin = options.origin?.trim() || '';
  const destination = options.destination?.trim() || '';
  const waypoints = Array.isArray(places) ? places : [];
  const travelMode = normalizeTravelMode(
    options.travelMode || DEFAULT_TRAVEL_MODE
  );
  const hasOrigin = Boolean(origin);
  const hasDestination = Boolean(destination);

  if (!hasOrigin && !hasDestination && waypoints.length === 0) {
    throw new Error(
      'At least one place or address is required to build a Maps route.'
    );
  }

  const params = new URLSearchParams({
    api: '1',
    travelmode: travelMode,
  });

  if (hasOrigin) {
    params.set('origin', origin);
  } else if (waypoints.length > 0) {
    params.set(
      'origin',
      formatCoordinatePair(waypoints[0].latitude, waypoints[0].longitude)
    );
  }

  if (hasDestination) {
    params.set('destination', destination);
  } else if (waypoints.length > 0) {
    const last = waypoints[waypoints.length - 1];
    params.set(
      'destination',
      formatCoordinatePair(last.latitude, last.longitude)
    );
  }

  let middle = waypoints;

  if (!hasOrigin && !hasDestination && waypoints.length > 0) {
    middle = waypoints.slice(1, -1);
  } else if (!hasOrigin && hasDestination && waypoints.length > 0) {
    middle = waypoints.slice(1);
  } else if (hasOrigin && !hasDestination && waypoints.length > 0) {
    middle = waypoints.slice(0, -1);
  }

  if (middle.length > 0) {
    params.set(
      'waypoints',
      middle
        .map((place) => formatCoordinatePair(place.latitude, place.longitude))
        .join('|')
    );
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * @param {number} value
 * @param {number} [digits=4]
 * @returns {string}
 */
export function formatCoordinate(value, digits = 4) {
  return Number(value).toFixed(digits);
}

/**
 * @param {number} meters
 * @returns {string}
 */
export function formatRadiusLabel(meters) {
  if (meters >= 1000) {
    const km = meters / 1000;
    return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`;
  }
  return `${meters} m`;
}
