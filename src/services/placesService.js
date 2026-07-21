import axios from 'axios';
import { createAttraction } from '../types/attraction';
import {
  DEFAULT_MAX_RESULTS,
  DEFAULT_SEARCH_RADIUS_METERS,
  getGooglePlacesApiKey,
  PLACES_API_BASE_URL,
} from '../utils/config';
import { mapPlacePhotos } from '../utils/placePhotos';

const NEARBY_FIELD_MASK = [
  'places.displayName',
  'places.location',
  'places.id',
  'places.photos',
  'places.editorialSummary',
  'places.primaryTypeDisplayName',
  'places.rating',
].join(',');

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
        'X-Goog-FieldMask': NEARBY_FIELD_MASK,
      },
      timeout: 20000,
    }
  );

  const places = response.data?.places || [];

  return places
    .map((place) => {
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
          place.primaryTypeDisplayName?.text ||
          placeType.replace(/_/g, ' '),
        description: place.editorialSummary?.text || '',
        photos: mapPlacePhotos(place.photos, 8),
        rating: place.rating,
      });
    })
    .filter(Boolean);
}

/**
 * Searches nearby places using Google Places API (New).
 * Multiple types are queried separately (API uses AND for multi-type),
 * then merged and deduplicated.
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

  const results = await Promise.all(
    includedTypes.map((placeType) =>
      searchNearbyByType(center, placeType, {
        apiKey,
        radius,
        maxResultCount,
      }).catch((error) => {
        // Skip unsupported / empty type results without failing the whole search.
        console.warn(`Nearby search failed for type "${placeType}":`, error?.message);
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
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(
      0,
      Math.min(40, maxResultCount * Math.max(1, includedTypes.length))
    );
}
