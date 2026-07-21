import axios from 'axios';
import { createAttraction } from '../types/attraction';
import {
  DEFAULT_MAX_RESULTS,
  DEFAULT_SEARCH_RADIUS_METERS,
  getGooglePlacesApiKey,
  PLACES_API_BASE_URL,
  PLACES_NEARBY_MAX_RADIUS_METERS,
} from '../utils/config';
import { mapPlacePhotos } from '../utils/placePhotos';
import { haversineDistanceKm } from '../utils/routeOptimization';

const PLACE_FIELD_MASK = [
  'places.displayName',
  'places.location',
  'places.id',
  'places.photos',
  'places.editorialSummary',
  'places.primaryTypeDisplayName',
  'places.rating',
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
  aquarium: 'aquariums',
};

/**
 * Approximate a circle as a lat/lng bounding rectangle.
 * Used when radius exceeds Nearby Search's 50 km circle limit.
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
 * @param {string} placeType
 * @returns {import('../types/attraction').Attraction | null}
 */
function mapPlaceToAttraction(place, placeType) {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  const name = place.displayName?.text;

  if (!name || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }

  return createAttraction({
    id: place.id,
    googlePlaceId: place.id,
    name,
    latitude,
    longitude,
    category:
      place.primaryTypeDisplayName?.text || placeType.replace(/_/g, ' '),
    description: place.editorialSummary?.text || '',
    photos: mapPlacePhotos(place.photos, 8),
    rating: place.rating,
  });
}

/**
 * @param {{ latitude: number, longitude: number }} center
 * @param {string} placeType
 * @param {{ radius: number, maxResultCount: number, apiKey: string }} options
 * @returns {Promise<import('../types/attraction').Attraction[]>}
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
 * Text Search over a rectangular area — supports radii above the 50 km Nearby limit.
 *
 * @param {{ latitude: number, longitude: number }} center
 * @param {string} placeType
 * @param {{ radius: number, maxResultCount: number, apiKey: string }} options
 * @returns {Promise<import('../types/attraction').Attraction[]>}
 */
async function searchWideAreaByType(center, placeType, options) {
  const rectangle = circleToRectangle(center, options.radius);
  const textQuery =
    TYPE_TEXT_QUERIES[placeType] || placeType.replace(/_/g, ' ');

  const response = await axios.post(
    `${PLACES_API_BASE_URL}/places:searchText`,
    {
      textQuery,
      includedType: placeType,
      maxResultCount: options.maxResultCount,
      locationRestriction: {
        rectangle,
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

  const radiusKm = options.radius / 1000;

  return (response.data?.places || [])
    .map((place) => mapPlaceToAttraction(place, placeType))
    .filter(Boolean)
    .filter(
      (attraction) => haversineDistanceKm(center, attraction) <= radiusKm
    );
}

/**
 * Searches nearby places using Google Places API (New).
 * Uses Nearby Search up to 50 km; for larger radii uses Text Search + rectangle.
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
      : ['tourist_attraction'];

  const useWideSearch = radius > PLACES_NEARBY_MAX_RADIUS_METERS;
  const searchFn = useWideSearch ? searchWideAreaByType : searchNearbyByType;
  const requestRadius = useWideSearch
    ? radius
    : Math.min(radius, PLACES_NEARBY_MAX_RADIUS_METERS);

  const results = await Promise.all(
    includedTypes.map((placeType) =>
      searchFn(center, placeType, {
        apiKey,
        radius: requestRadius,
        maxResultCount,
      }).catch((error) => {
        console.warn(
          `Place search failed for type "${placeType}":`,
          error?.response?.data?.error?.message || error?.message
        );
        return [];
      })
    )
  );

  const byId = new Map();

  results.flat().forEach((attraction) => {
    if (!byId.has(attraction.id)) {
      byId.set(attraction.id, attraction);
      return;
    }

    const existing = byId.get(attraction.id);
    const richer =
      (attraction.description?.length || 0) > (existing.description?.length || 0) ||
      (attraction.photos?.length || 0) > (existing.photos?.length || 0)
        ? attraction
        : existing;
    byId.set(attraction.id, richer);
  });

  return Array.from(byId.values())
    .sort((a, b) => {
      const distanceDiff =
        haversineDistanceKm(center, a) - haversineDistanceKm(center, b);
      if (Math.abs(distanceDiff) > 0.05) return distanceDiff;
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(
      0,
      Math.min(40, maxResultCount * Math.max(1, includedTypes.length))
    );
}
