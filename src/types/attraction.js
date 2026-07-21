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
 * @typedef {Object} AttractionReview
 * @property {string} id
 * @property {string} authorName
 * @property {string|null} authorPhotoUrl
 * @property {number|null} rating
 * @property {string} text
 * @property {string} relativeTime
 * @property {string|null} publishTime
 */

/**
 * @typedef {Object} AttractionPriceRange
 * @property {string|null} startLabel
 * @property {string|null} endLabel
 * @property {string|null} label
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
 * @property {number|null} userRatingCount
 * @property {string|null} primaryType
 * @property {string|null} priceLevel
 * @property {AttractionPriceRange|null} priceRange
 * @property {AttractionReview[]} reviews
 * @property {string|null} websiteUri
 * @property {string|null} googleMapsUri
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
    userRatingCount:
      typeof data.userRatingCount === 'number' ? data.userRatingCount : null,
    primaryType: data.primaryType || null,
    priceLevel: data.priceLevel || null,
    priceRange: data.priceRange || null,
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
    websiteUri: data.websiteUri || null,
    googleMapsUri: data.googleMapsUri || null,
  };
}
