/**
 * Domain models for the travel planner.
 * Prepared for future persistence (saved trips, offline mode, accounts).
 */

/**
 * @typedef {Object} City
 * @property {string} id
 * @property {string} name
 * @property {number} latitude
 * @property {number} longitude
 */

/**
 * @typedef {Object} AttractionPhoto
 * @property {string} name - Places API photo resource name
 * @property {string} url - Ready-to-render media URL
 * @property {number} [widthPx]
 * @property {number} [heightPx]
 */

/**
 * @typedef {Object} Attraction
 * @property {string} id
 * @property {string} name
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} category
 * @property {string} googlePlaceId
 * @property {string} description
 * @property {AttractionPhoto[]} photos
 * @property {number|null} rating
 */

/**
 * @param {Partial<City> & Pick<City, 'name' | 'latitude' | 'longitude'>} data
 * @returns {City}
 */
export function createCity(data) {
  return {
    id: data.id || `city_${data.name.toLowerCase().replace(/\s+/g, '_')}`,
    name: data.name,
    latitude: data.latitude,
    longitude: data.longitude,
  };
}

/**
 * @param {Partial<Attraction> & Pick<Attraction, 'name' | 'latitude' | 'longitude'>} data
 * @returns {Attraction}
 */
export function createAttraction(data) {
  return {
    id: data.id || data.googlePlaceId || `attraction_${Date.now()}`,
    name: data.name,
    latitude: data.latitude,
    longitude: data.longitude,
    category: data.category || 'Tourist Attraction',
    googlePlaceId: data.googlePlaceId || '',
    description: data.description || '',
    photos: Array.isArray(data.photos) ? data.photos : [],
    rating: typeof data.rating === 'number' ? data.rating : null,
  };
}
