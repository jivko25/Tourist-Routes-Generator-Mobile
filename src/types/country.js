/**
 * @typedef {Object} CountryCity
 * @property {string} name
 * @property {number} latitude
 * @property {number} longitude
 * @property {number|null} [population]
 * @property {string|null} [timezone]
 * @property {string|null} [featureCode]
 * @property {number|null} [geonameId]
 */

/**
 * @typedef {Object} CountryDetailsResponse
 * @property {string} countryCode
 * @property {CountryCity[]} cities
 */

/**
 * @param {unknown} raw
 * @returns {CountryCity|null}
 */
export function normalizeCountryCity(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    name,
    latitude,
    longitude,
    population:
      typeof raw.population === 'number' && Number.isFinite(raw.population)
        ? raw.population
        : null,
    timezone: typeof raw.timezone === 'string' ? raw.timezone : null,
    featureCode: typeof raw.featureCode === 'string' ? raw.featureCode : null,
    geonameId:
      typeof raw.geonameId === 'number' && Number.isFinite(raw.geonameId)
        ? raw.geonameId
        : null,
  };
}

/**
 * @param {unknown} data
 * @returns {CountryDetailsResponse}
 */
export function normalizeCountryDetailsResponse(data) {
  const payload = data && typeof data === 'object' ? data : {};
  const countryCode = String(payload.countryCode || '')
    .trim()
    .toUpperCase();
  const cities = Array.isArray(payload.cities)
    ? payload.cities.map(normalizeCountryCity).filter(Boolean)
    : [];

  return {
    countryCode,
    cities,
  };
}
