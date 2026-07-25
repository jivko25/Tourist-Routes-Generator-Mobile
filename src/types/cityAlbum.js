/**
 * User photo albums keyed by country + city (logical folders).
 * Photos are Media Library references — not copied into the app sandbox.
 *
 * @typedef {Object} CityAlbumPhoto
 * @property {string} id
 * @property {string|null} assetId  MediaLibrary / ImagePicker asset id when available
 * @property {string|null} uri      Last-known display URI (fallback)
 * @property {string|null} fileName
 * @property {number|null} fileSize
 * @property {string|null} contentHash  MD5 of file bytes — stable across ImagePicker temp URIs
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
 * @param {string|null|undefined} assetId
 */
export function normalizeAssetId(assetId) {
  if (!assetId) return null;
  return String(assetId)
    .trim()
    .replace(/^ph:\/\//i, '')
    .toLowerCase();
}

/**
 * Stable identity keys for deduping the same gallery photo across picks.
 * Prefer contentHash — ImagePicker temp file:// URIs change every pick.
 *
 * @param {Partial<CityAlbumPhoto>|null|undefined} photo
 * @returns {string[]}
 */
export function photoIdentityKeys(photo) {
  if (!photo) return [];
  const keys = [];

  if (photo.contentHash) {
    keys.push(`hash:${String(photo.contentHash).toLowerCase()}`);
  }

  const assetId = normalizeAssetId(photo.assetId);
  if (assetId) keys.push(`asset:${assetId}`);

  const fileName = photo.fileName
    ? String(photo.fileName).trim().toLowerCase()
    : '';
  const fileSize = Number(photo.fileSize);
  if (fileName && Number.isFinite(fileSize) && fileSize > 0) {
    keys.push(`file:${fileName}:${fileSize}`);
  }

  if (photo.uri) keys.push(`uri:${String(photo.uri)}`);

  return keys;
}

/**
 * @param {object} data
 * @returns {CityAlbumPhoto}
 */
export function createCityAlbumPhoto(data = {}) {
  const fileSize = Number(data.fileSize);
  return {
    id:
      data.id ||
      `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    assetId: data.assetId || null,
    uri: data.uri || null,
    fileName: data.fileName ? String(data.fileName) : null,
    fileSize: Number.isFinite(fileSize) && fileSize > 0 ? fileSize : null,
    contentHash: data.contentHash ? String(data.contentHash).toLowerCase() : null,
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
