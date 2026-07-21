/**
 * @typedef {Object} SavedRoute
 * @property {string} id
 * @property {string} name
 * @property {string} createdAt
 * @property {string|null} cityName
 * @property {{ latitude: number, longitude: number }|null} cityCoordinates
 * @property {string} startAddress
 * @property {string} endAddress
 * @property {string} travelMode
 * @property {import('./attraction').Attraction[]} attractions
 */

/**
 * @param {object} data
 * @returns {SavedRoute}
 */
export function createSavedRoute(data) {
  const attractions = Array.isArray(data.attractions) ? data.attractions : [];
  const cityLabel = data.cityName?.split?.(',')?.[0] || data.cityName || 'Trip';
  const defaultName = `${cityLabel} · ${attractions.length} stop${
    attractions.length === 1 ? '' : 's'
  }`;

  return {
    id: data.id || `route_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: (data.name || defaultName).trim() || defaultName,
    createdAt: data.createdAt || new Date().toISOString(),
    cityName: data.cityName || null,
    cityCoordinates: data.cityCoordinates || null,
    startAddress: data.startAddress || '',
    endAddress: data.endAddress || '',
    travelMode: data.travelMode || 'walking',
    attractions,
  };
}
