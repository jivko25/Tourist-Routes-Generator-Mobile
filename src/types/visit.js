/**
 * @typedef {'manual'|'trip'|'route'} VisitSource
 *
 * @typedef {Object} Visit
 * @property {string} id
 * @property {string} countryCode  ISO-like uppercase (e.g. "BG")
 * @property {string} countryName
 * @property {string|null} placeName
 * @property {string|null} cityName
 * @property {string} visitedAt ISO datetime
 * @property {VisitSource} source
 */

/**
 * @param {object} data
 * @returns {Visit}
 */
export function createVisit(data) {
  const countryCode = String(data.countryCode || '')
    .trim()
    .toUpperCase();

  return {
    id:
      data.id ||
      `visit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    countryCode,
    countryName: data.countryName || countryCode,
    placeName: data.placeName || null,
    cityName: data.cityName || null,
    visitedAt: data.visitedAt || new Date().toISOString(),
    source: data.source || 'manual',
  };
}
