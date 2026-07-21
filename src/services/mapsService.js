import { Linking, Platform, Share } from 'react-native';
import { buildGoogleMapsDirectionsUrl } from '../utils/googleMaps';
import { DEFAULT_TRAVEL_MODE } from '../utils/config';

/**
 * Builds a Google Maps directions URL from selected attractions
 * and optional start/end addresses from settings.
 *
 * @param {Array<{ name?: string, latitude: number, longitude: number }>} attractions
 * @param {{ origin?: string, destination?: string, travelMode?: string }} [options]
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
    travelMode: options.travelMode || DEFAULT_TRAVEL_MODE,
  });
}

/**
 * Opens the generated Google Maps route in the device browser / Maps app.
 *
 * @param {Array<{ latitude: number, longitude: number }>} attractions
 * @param {{ origin?: string, destination?: string, travelMode?: string }} [options]
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

/**
 * Opens the system share sheet with a Google Maps directions link
 * (WhatsApp, Messenger, Mail, etc. depending on installed apps).
 *
 * @param {Array<{ name?: string, latitude: number, longitude: number }>} attractions
 * @param {{
 *   origin?: string,
 *   destination?: string,
 *   travelMode?: string,
 *   title?: string,
 *   url?: string,
 * }} [options]
 * @returns {Promise<{ url: string, action: string }>}
 */
export async function shareGoogleMapsRoute(attractions, options = {}) {
  const url =
    options.url ||
    generateGoogleMapsRoute(attractions, {
      origin: options.origin,
      destination: options.destination,
      travelMode: options.travelMode,
    });

  const title = options.title?.trim() || 'Travel Go route';
  const stopNames = (attractions || [])
    .map((place) => place?.name)
    .filter(Boolean)
    .slice(0, 5);
  const stopsLine =
    stopNames.length > 0
      ? stopNames.join(' → ') +
        ((attractions?.length || 0) > stopNames.length
          ? ` +${attractions.length - stopNames.length} more`
          : '')
      : '';

  const messageParts = [title];
  if (stopsLine) messageParts.push(stopsLine);
  messageParts.push('', 'Open in Google Maps:', url);

  const message = messageParts.join('\n');

  const result = await Share.share(
    Platform.OS === 'ios'
      ? { title, message, url }
      : { title, message }
  );

  return {
    url,
    action: result?.action || Share.sharedAction,
  };
}
