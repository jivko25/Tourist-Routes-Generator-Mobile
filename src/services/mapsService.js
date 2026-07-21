import { Linking } from 'react-native';
import { buildGoogleMapsDirectionsUrl } from '../utils/googleMaps';

/**
 * Builds a Google Maps directions URL from selected attractions
 * and optional start/end addresses from settings.
 *
 * @param {Array<{ name?: string, latitude: number, longitude: number }>} attractions
 * @param {{ origin?: string, destination?: string }} [options]
 * @returns {string}
 */
export function generateGoogleMapsRoute(attractions, options = {}) {
  const hasAddresses = Boolean(options.origin?.trim() || options.destination?.trim());

  if ((!Array.isArray(attractions) || attractions.length === 0) && !hasAddresses) {
    throw new Error('Select at least one attraction or set start/end addresses.');
  }

  return buildGoogleMapsDirectionsUrl(attractions || [], {
    origin: options.origin,
    destination: options.destination,
  });
}

/**
 * Opens the generated Google Maps route in the device browser / Maps app.
 *
 * @param {Array<{ latitude: number, longitude: number }>} attractions
 * @param {{ origin?: string, destination?: string }} [options]
 * @returns {Promise<string>} The opened URL
 */
export async function openGoogleMapsRoute(attractions, options = {}) {
  const url = generateGoogleMapsRoute(attractions, options);
  const canOpen = await Linking.canOpenURL(url);

  if (!canOpen) {
    throw new Error('Unable to open Google Maps on this device.');
  }

  await Linking.openURL(url);
  return url;
}
