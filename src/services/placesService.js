import axios from 'axios';
import { createAttraction } from '../types/attraction';
import {
  DEFAULT_MAX_RESULTS,
  DEFAULT_SEARCH_RADIUS_METERS,
  getGooglePlacesApiKey,
  PLACES_API_BASE_URL,
  PLACES_MAX_PAGES_PER_TYPE,
  PLACES_NEARBY_MAX_RADIUS_METERS,
  PLACES_SOFT_RESULT_LIMIT,
} from '../utils/config';
import { mapPlacePhotos } from '../utils/placePhotos';
import { haversineDistanceKm } from '../utils/routeOptimization';
import { getPopularityScore } from '../utils/attractionSort';
import { mapPriceRange } from '../utils/placePricing';
import { mapOpeningHoursFromPlace } from '../utils/openingHours';

const PLACE_FIELD_MASK = [
  'places.displayName',
  'places.location',
  'places.id',
  'places.photos',
  'places.editorialSummary',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.rating',
  'places.userRatingCount',
  'places.currentOpeningHours',
  'nextPageToken',
].join(',');

const PLACE_DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'location',
  'photos',
  'editorialSummary',
  'primaryType',
  'primaryTypeDisplayName',
  'rating',
  'userRatingCount',
  'priceLevel',
  'priceRange',
  'reviews',
  'websiteUri',
  'googleMapsUri',
  'googleMapsLinks',
  'currentOpeningHours',
  'regularOpeningHours',
].join(',');

const TYPE_TEXT_QUERIES = {
  tourist_attraction: 'tourist attractions',
  museum: 'museums',
  art_gallery: 'art galleries',
  performing_arts_theater: 'theaters',
  cultural_center: 'cultural centers',
  park: 'parks',
  national_park: 'national parks',
  hiking_area: 'hiking areas',
  historical_landmark: 'historical landmarks',
  church: 'churches',
  mosque: 'mosques',
  synagogue: 'synagogues',
  hindu_temple: 'hindu temples',
  amusement_park: 'amusement parks',
  zoo: 'zoos',
  aquarium: 'aquarium',
  restaurant: 'restaurants',
};

/** Niche types rarely need many pages; tourist/museum/park get full pagination. */
const TYPE_MAX_PAGES = {
  aquarium: 2,
  zoo: 2,
  amusement_park: 2,
  national_park: 2,
  hiking_area: 2,
  cultural_center: 2,
  performing_arts_theater: 2,
  hindu_temple: 2,
  synagogue: 2,
  mosque: 2,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Approximate a circle as a lat/lng bounding rectangle.
 *
 * @param {{ latitude: number, longitude: number }} center
 * @param {number} radiusMeters
 */
function circleToRectangle(center, radiusMeters) {
  const latDelta = radiusMeters / 111320;
  const longitudeScale = Math.cos((center.latitude * Math.PI) / 180);
  const lngDelta =
    radiusMeters / (111320 * Math.max(Math.abs(longitudeScale), 0.2));

  return {
    low: {
      latitude: center.latitude - latDelta,
      longitude: center.longitude - lngDelta,
    },
    high: {
      latitude: center.latitude + latDelta,
      longitude: center.longitude + lngDelta,
    },
  };
}

/**
 * @param {object} place
 * @returns {import('../types/attraction').AttractionReview[]}
 */
function mapPlaceReviews(place) {
  if (!Array.isArray(place?.reviews)) return [];

  return place.reviews
    .map((review, index) => {
      const text =
        review?.text?.text ||
        review?.originalText?.text ||
        '';
      const authorName =
        review?.authorAttribution?.displayName || 'Google user';

      return {
        id: review?.name || `${place.id || 'review'}_${index}`,
        authorName,
        authorPhotoUrl: review?.authorAttribution?.photoUri || null,
        rating: typeof review?.rating === 'number' ? review.rating : null,
        text: String(text).trim(),
        relativeTime: review?.relativePublishTimeDescription || '',
        publishTime: review?.publishTime || null,
      };
    })
    .filter((review) => review.text.length > 0 || review.rating != null);
}

/**
 * @param {object} place
 * @param {string} [placeType]
 * @returns {import('../types/attraction').Attraction | null}
 */
function mapPlaceToAttraction(place, placeType = '') {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  const name = place.displayName?.text;

  if (!name || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }

  const hours = mapOpeningHoursFromPlace(place);

  return createAttraction({
    id: place.id,
    googlePlaceId: place.id,
    name,
    latitude,
    longitude,
    category:
      place.primaryTypeDisplayName?.text ||
      (placeType ? placeType.replace(/_/g, ' ') : 'Place'),
    description: place.editorialSummary?.text || '',
    photos: mapPlacePhotos(place.photos, 8),
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    primaryType: place.primaryType || placeType || null,
    priceLevel: place.priceLevel || null,
    priceRange: mapPriceRange(place.priceRange),
    reviews: mapPlaceReviews(place),
    websiteUri: place.websiteUri || null,
    googleMapsUri: place.googleMapsUri || place.googleMapsLinks?.placeUri || null,
    googleMapsLinks: place.googleMapsLinks
      ? {
          placeUri: place.googleMapsLinks.placeUri || null,
          reviewsUri: place.googleMapsLinks.reviewsUri || null,
          photosUri: place.googleMapsLinks.photosUri || null,
          directionsUri: place.googleMapsLinks.directionsUri || null,
        }
      : null,
    openNow: hours.openNow,
    weekdayDescriptions: hours.weekdayDescriptions,
  });
}

/**
 * Fetches Place Details (reviews, pricing, website) for a place id.
 *
 * @param {string} placeId
 * @returns {Promise<import('../types/attraction').Attraction>}
 */
export async function fetchPlaceDetails(placeId) {
  if (!placeId) {
    throw new Error('A Google Place ID is required.');
  }

  const apiKey = getGooglePlacesApiKey();
  const resourceName = placeId.startsWith('places/')
    ? placeId
    : `places/${placeId}`;

  const response = await axios.get(`${PLACES_API_BASE_URL}/${resourceName}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
    },
    timeout: 20000,
  });

  const mapped = mapPlaceToAttraction(response.data);
  if (!mapped) {
    throw new Error('Place details response was incomplete.');
  }

  return mapped;
}

/**
 * @param {{ latitude: number, longitude: number }} center
 * @param {string} placeType
 * @param {{ radius: number, maxResultCount: number, apiKey: string }} options
 */
async function searchNearbyByType(center, placeType, options) {
  const response = await axios.post(
    `${PLACES_API_BASE_URL}/places:searchNearby`,
    {
      includedTypes: [placeType],
      maxResultCount: options.maxResultCount,
      locationRestriction: {
        circle: {
          center: {
            latitude: center.latitude,
            longitude: center.longitude,
          },
          radius: options.radius,
        },
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': options.apiKey,
        'X-Goog-FieldMask': PLACE_FIELD_MASK,
      },
      timeout: 20000,
    }
  );

  return (response.data?.places || [])
    .map((place) => mapPlaceToAttraction(place, placeType))
    .filter(Boolean);
}

/**
 * Paginated Text Search for a place type within a circular area.
 * Fetches multiple pages via nextPageToken.
 *
 * @param {{ latitude: number, longitude: number }} center
 * @param {string} placeType
 * @param {{ radius: number, maxResultCount: number, apiKey: string, maxPages?: number }} options
 */
async function searchTextByTypePaginated(center, placeType, options) {
  const rectangle = circleToRectangle(center, options.radius);
  const textQuery =
    TYPE_TEXT_QUERIES[placeType] || placeType.replace(/_/g, ' ');
  const maxPages =
    options.maxPages ??
    TYPE_MAX_PAGES[placeType] ??
    PLACES_MAX_PAGES_PER_TYPE;
  const radiusKm = options.radius / 1000;
  const collected = [];
  let pageToken;
  let page = 0;

  while (page < maxPages) {
    const body = {
      textQuery,
      includedType: placeType,
      pageSize: options.maxResultCount,
      locationRestriction: {
        rectangle,
      },
    };

    if (pageToken) {
      body.pageToken = pageToken;
    }

    const response = await axios.post(
      `${PLACES_API_BASE_URL}/places:searchText`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': options.apiKey,
          'X-Goog-FieldMask': PLACE_FIELD_MASK,
        },
        timeout: 25000,
      }
    );

    const pagePlaces = (response.data?.places || [])
      .map((place) => mapPlaceToAttraction(place, placeType))
      .filter(Boolean)
      .filter(
        (attraction) => haversineDistanceKm(center, attraction) <= radiusKm
      );

    collected.push(...pagePlaces);
    pageToken = response.data?.nextPageToken;
    page += 1;

    if (!pageToken) break;

    // Tokens can need a short delay before becoming valid.
    await sleep(350);
  }

  return collected;
}

/**
 * Merge attraction lists by id, keeping the richer record.
 *
 * @param {import('../types/attraction').Attraction[][]} groups
 */
function mergeAttractions(groups) {
  const byId = new Map();

  groups.flat().forEach((attraction) => {
    if (!byId.has(attraction.id)) {
      byId.set(attraction.id, attraction);
      return;
    }

    const existing = byId.get(attraction.id);
    const richer =
      (attraction.description?.length || 0) >
        (existing.description?.length || 0) ||
      (attraction.photos?.length || 0) > (existing.photos?.length || 0) ||
      (attraction.userRatingCount || 0) > (existing.userRatingCount || 0)
        ? attraction
        : existing;
    byId.set(attraction.id, richer);
  });

  return Array.from(byId.values());
}

/**
 * Searches nearby places using Google Places API (New).
 * Nearby Search for <=50km + paginated Text Search for fuller coverage.
 *
 * @param {{ latitude: number, longitude: number }} center
 * @param {{ radius?: number, maxResultCount?: number, includedTypes?: string[] }} [options]
 * @returns {Promise<import('../types/attraction').Attraction[]>}
 */
export async function searchNearbyAttractions(center, options = {}) {
  if (
    typeof center?.latitude !== 'number' ||
    typeof center?.longitude !== 'number'
  ) {
    throw new Error('Valid city coordinates are required to search attractions.');
  }

  const apiKey = getGooglePlacesApiKey();
  const radius = options.radius ?? DEFAULT_SEARCH_RADIUS_METERS;
  const maxResultCount = options.maxResultCount ?? DEFAULT_MAX_RESULTS;
  const includedTypes =
    Array.isArray(options.includedTypes) && options.includedTypes.length > 0
      ? options.includedTypes
      : ['tourist_attraction', 'aquarium', 'zoo'];

  const nearbyRadius = Math.min(radius, PLACES_NEARBY_MAX_RADIUS_METERS);
  const useNearby = radius <= PLACES_NEARBY_MAX_RADIUS_METERS;

  const results = await Promise.all(
    includedTypes.map(async (placeType) => {
      try {
        const requests = [
          searchTextByTypePaginated(center, placeType, {
            apiKey,
            radius,
            maxResultCount,
          }),
        ];

        if (useNearby) {
          requests.push(
            searchNearbyByType(center, placeType, {
              apiKey,
              radius: nearbyRadius,
              maxResultCount,
            })
          );
        }

        const groups = await Promise.all(
          requests.map((request) =>
            request.catch((error) => {
              console.warn(
                `Place search failed for type "${placeType}":`,
                error?.response?.data?.error?.message || error?.message
              );
              return [];
            })
          )
        );

        return mergeAttractions(groups);
      } catch (error) {
        console.warn(
          `Place search failed for type "${placeType}":`,
          error?.response?.data?.error?.message || error?.message
        );
        return [];
      }
    })
  );

  return mergeAttractions(results)
    .sort((a, b) => getPopularityScore(b) - getPopularityScore(a))
    .slice(0, PLACES_SOFT_RESULT_LIMIT);
}
