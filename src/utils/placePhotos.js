import {
  getGooglePlacesApiKey,
  PLACES_API_BASE_URL,
} from './config';

/**
 * Places Photo helpers.
 *
 * IMPORTANT: Calling the Places Photo media endpoint bills the
 * "Places Photo" SKU (~1,000 free/month). Travel Go no longer auto-loads
 * photo media. Use PlaceCover + Google Maps photo links instead.
 */

/**
 * Opt-in only. Prefer PlaceCover in UI.
 *
 * @param {string} photoName
 * @param {{ maxWidthPx?: number, maxHeightPx?: number }} [options]
 * @returns {string}
 */
export function buildPlacePhotoUrl(photoName, options = {}) {
  if (!photoName) {
    return '';
  }

  const maxWidthPx = options.maxWidthPx ?? 800;
  const maxHeightPx = options.maxHeightPx ?? 800;
  const apiKey = getGooglePlacesApiKey();

  return `${PLACES_API_BASE_URL}/${photoName}/media?maxWidthPx=${maxWidthPx}&maxHeightPx=${maxHeightPx}&key=${encodeURIComponent(apiKey)}`;
}

/**
 * Does not build billable media URLs (url stays null).
 *
 * @param {Array<{ name?: string, widthPx?: number, heightPx?: number }>} [photos]
 * @param {number} [limit=0]
 * @returns {import('../types/attraction').AttractionPhoto[]}
 */
export function mapPlacePhotos(photos = [], limit = 0) {
  if (!limit || limit <= 0) {
    return [];
  }

  return photos
    .filter((photo) => photo?.name)
    .slice(0, limit)
    .map((photo) => ({
      name: photo.name,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx,
      url: null,
    }));
}
