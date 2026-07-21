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
 * Searches nearby tourist attractions using Google Places API (New).
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
  const includedTypes = options.includedTypes ?? ['tourist_attraction'];

  const response = await axios.post(
    `${PLACES_API_BASE_URL}/places:searchNearby`,
    {
      includedTypes,
      maxResultCount,
      locationRestriction: {
        circle: {
          center: {
            latitude: center.latitude,
            longitude: center.longitude,
          },
          radius,
        },
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
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
          place.primaryTypeDisplayName?.text || 'Tourist Attraction',
        description: place.editorialSummary?.text || '',
        photos: mapPlacePhotos(place.photos, 8),
        rating: place.rating,
      });
    })
    .filter(Boolean);
}
