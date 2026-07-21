import {
  getGooglePlacesApiKey,
  PLACES_API_BASE_URL,
} from './config';

/**
 * Builds a Google Places photo media URL from a photo resource name.
 *
 * @param {string} photoName - e.g. places/ChIJ.../photos/AW...
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
 * Maps Places API photo objects into app-friendly photo models.
 *
 * @param {Array<{ name?: string, widthPx?: number, heightPx?: number }>} [photos]
 * @param {number} [limit=8]
 * @returns {import('../types/attraction').AttractionPhoto[]}
 */
export function mapPlacePhotos(photos = [], limit = 8) {
  return photos
    .filter((photo) => photo?.name)
    .slice(0, limit)
    .map((photo) => ({
      name: photo.name,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx,
      url: buildPlacePhotoUrl(photo.name, {
        maxWidthPx: 900,
        maxHeightPx: 900,
      }),
    }));
}
