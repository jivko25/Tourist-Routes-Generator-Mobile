/**
 * Unified visit log for the visited map + future live trip tracking.
 *
 * Hierarchy (one store, different granularity):
 * - country: marked the country (no city/place)
 * - city: been in a city
 * - place: arrived at an attraction / route stop (feeds from live trip #9)
 *
 * @typedef {'country'|'city'|'place'} VisitKind
 * @typedef {'manual'|'trip'|'route'} VisitSource
 *
 * @typedef {Object} Visit
 * @property {string} id
 * @property {VisitKind} kind
 * @property {string} countryCode  ISO-like uppercase (e.g. "BG")
 * @property {string} countryName
 * @property {string|null} cityName
 * @property {number|null} cityLatitude
 * @property {number|null} cityLongitude
 * @property {string|null} placeId     Google place id / attraction id when kind=place
 * @property {string|null} placeName
 * @property {number|null} placeLatitude
 * @property {number|null} placeLongitude
 * @property {string|null} routeId     saved/active route that produced this visit
 * @property {string} visitedAt ISO datetime
 * @property {VisitSource} source
 */

/**
 * @param {object} data
 * @returns {VisitKind}
 */
function resolveKind(data) {
  if (data?.kind === 'country' || data?.kind === 'city' || data?.kind === 'place') {
    return data.kind;
  }
  if (data?.placeName || data?.placeId) return 'place';
  if (data?.cityName) return 'city';
  return 'country';
}

/**
 * @param {object} data
 * @returns {Visit}
 */
export function createVisit(data) {
  const countryCode = String(data.countryCode || '')
    .trim()
    .toUpperCase();
  const kind = resolveKind(data);

  return {
    id:
      data.id ||
      `visit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind,
    countryCode,
    countryName: data.countryName || countryCode,
    cityName: data.cityName || null,
    cityLatitude:
      typeof data.cityLatitude === 'number' && Number.isFinite(data.cityLatitude)
        ? data.cityLatitude
        : null,
    cityLongitude:
      typeof data.cityLongitude === 'number' &&
      Number.isFinite(data.cityLongitude)
        ? data.cityLongitude
        : null,
    placeId: data.placeId || data.attractionId || null,
    placeName: data.placeName || null,
    placeLatitude:
      typeof data.placeLatitude === 'number' &&
      Number.isFinite(data.placeLatitude)
        ? data.placeLatitude
        : typeof data.latitude === 'number' && Number.isFinite(data.latitude)
          ? data.latitude
          : null,
    placeLongitude:
      typeof data.placeLongitude === 'number' &&
      Number.isFinite(data.placeLongitude)
        ? data.placeLongitude
        : typeof data.longitude === 'number' && Number.isFinite(data.longitude)
          ? data.longitude
          : null,
    routeId: data.routeId || null,
    visitedAt: data.visitedAt || new Date().toISOString(),
    source: data.source || 'manual',
  };
}

/**
 * Normalize legacy visit records (before kind / placeId fields).
 * @param {object} raw
 * @returns {Visit}
 */
export function normalizeVisit(raw) {
  return createVisit(raw || {});
}

/**
 * @param {Visit[]} visits
 * @param {string} countryCode
 * @returns {string[]} unique city names (case-insensitive)
 */
export function getVisitedCityNames(visits, countryCode) {
  const code = String(countryCode || '').toUpperCase();
  const names = new Set();
  (visits || []).forEach((visit) => {
    if (String(visit.countryCode).toUpperCase() !== code) return;
    if (visit.cityName) names.add(String(visit.cityName).trim());
  });
  return [...names];
}

/**
 * @param {Visit[]} visits
 * @param {string} countryCode
 * @param {string} cityName
 * @returns {Visit[]} place-level visits in that city
 */
export function getPlaceVisitsForCity(visits, countryCode, cityName) {
  const code = String(countryCode || '').toUpperCase();
  const city = String(cityName || '').trim().toLowerCase();
  return (visits || [])
    .filter(
      (visit) =>
        visit.kind === 'place' &&
        String(visit.countryCode).toUpperCase() === code &&
        String(visit.cityName || '')
          .trim()
          .toLowerCase() === city
    )
    .sort(
      (a, b) =>
        new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
    );
}
