/**
 * Google Maps URL helpers.
 * Kept separate from services so UI and services can share URL building logic.
 */

/**
 * @param {number} latitude
 * @param {number} longitude
 * @returns {string}
 */
export function formatCoordinatePair(latitude, longitude) {
  return `${latitude},${longitude}`;
}

/**
 * Builds a Google Maps directions URL for an ordered list of waypoints.
 *
 * @param {Array<{ latitude: number, longitude: number }>} places
 * @returns {string}
 */
export function buildGoogleMapsDirectionsUrl(places) {
  if (!Array.isArray(places) || places.length === 0) {
    throw new Error('At least one place is required to build a Maps route.');
  }

  const path = places
    .map((place) => formatCoordinatePair(place.latitude, place.longitude))
    .join('/');

  return `https://www.google.com/maps/dir/${path}`;
}

/**
 * @param {number} value
 * @param {number} [digits=4]
 * @returns {string}
 */
export function formatCoordinate(value, digits = 4) {
  return Number(value).toFixed(digits);
}
