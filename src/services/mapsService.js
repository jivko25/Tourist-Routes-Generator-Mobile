import { Linking } from 'react-native';
import { buildGoogleMapsDirectionsUrl } from '../utils/googleMaps';

/**
 * Builds a Google Maps directions URL from selected attractions.
 *
 * @param {Array<{ name?: string, latitude: number, longitude: number }>} attractions
 * @returns {string}
 */
export function generateGoogleMapsRoute(attractions) {
  if (!Array.isArray(attractions) || attractions.length === 0) {
    throw new Error('Select at least one attraction to generate a route.');
  }

  return buildGoogleMapsDirectionsUrl(attractions);
}

/**
 * Opens the generated Google Maps route in the device browser / Maps app.
 *
 * @param {Array<{ latitude: number, longitude: number }>} attractions
 * @returns {Promise<string>} The opened URL
 */
export async function openGoogleMapsRoute(attractions) {
  const url = generateGoogleMapsRoute(attractions);
  const canOpen = await Linking.canOpenURL(url);

  if (!canOpen) {
    throw new Error('Unable to open Google Maps on this device.');
  }

  await Linking.openURL(url);
  return url;
}
