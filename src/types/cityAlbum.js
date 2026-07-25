/**
 * User photo albums keyed by country + city (logical folders).
 * Photos are Media Library references — not copied into the app sandbox.
 *
 * @typedef {Object} CityAlbumPhoto
 * @property {string} id
 * @property {string|null} assetId  MediaLibrary / ImagePicker asset id when available
 * @property {string|null} uri      Last-known display URI (fallback)
 * @property {string} createdAt
 *
 * @typedef {Object} CityAlbum
 * @property {string} countryCode
 * @property {string} countryName
 * @property {string} cityName
 * @property {CityAlbumPhoto[]} photos
 * @property {string} updatedAt
 */

/**
 * @param {string} countryCode
 * @param {string} cityName
 */
export function makeAlbumKey(countryCode, cityName) {
  const code = String(countryCode || '')
    .trim()
    .toUpperCase();
  const city = String(cityName || '')
    .trim()
    .toLowerCase();
  return `${code}::${city}`;
}

/**
 * @param {object} data
 * @returns {CityAlbumPhoto}
 */
export function createCityAlbumPhoto(data = {}) {
  return {
    id:
      data.id ||
      `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    assetId: data.assetId || null,
    uri: data.uri || null,
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

/**
 * @param {object} data
 * @returns {CityAlbum}
 */
export function createCityAlbum(data = {}) {
  const photos = Array.isArray(data.photos)
    ? data.photos.map((item) => createCityAlbumPhoto(item))
    : [];

  return {
    countryCode: String(data.countryCode || '')
      .trim()
      .toUpperCase(),
    countryName: data.countryName || data.countryCode || '',
    cityName: String(data.cityName || '').trim(),
    photos,
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}
