import { useCallback, useState } from 'react';
import { geocodeCity } from '../services/geocodingService';
import { searchNearbyAttractions } from '../services/placesService';
import { enrichAttractionsWithImages } from '../services/pexelsPhotoService';
import { useTravel } from '../context/TravelContext';
import { resolvePlaceTypes } from '../constants/placeCategories';

/**
 * Encapsulates city search + nearby attractions flow.
 */
export function usePlaces() {
  const { setSearchResult, settings, clearRoute } = useTravel();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const publishWithImages = useCallback(
    async (city, attractions) => {
      const copies = (attractions || []).map((item) => ({ ...item }));

      // Wait for first screenful so covers are visible when Attractions opens.
      const firstBatch = await enrichAttractionsWithImages(copies, city?.name || null, {
        concurrency: 3,
        limit: 12,
      });
      setSearchResult(city, firstBatch);

      // Fill the rest in the background.
      enrichAttractionsWithImages(firstBatch, city?.name || null, {
        concurrency: 3,
        limit: 40,
      })
        .then((full) => {
          setSearchResult(city, full);
        })
        .catch((err) => {
          console.warn('Background image enrichment failed:', err?.message || err);
        });

      return firstBatch;
    },
    [setSearchResult]
  );

  const searchCityAttractions = useCallback(
    async (cityName, overrides = {}) => {
      setLoading(true);
      setError(null);
      clearRoute();

      try {
        const categories =
          overrides.selectedCategories || settings.selectedCategories;
        const radius =
          overrides.searchRadiusMeters ?? settings.searchRadiusMeters;

        const city = await geocodeCity(cityName);
        const attractions = await searchNearbyAttractions(
          {
            latitude: city.latitude,
            longitude: city.longitude,
          },
          {
            radius,
            includedTypes: resolvePlaceTypes(categories),
          }
        );

        return {
          city,
          attractions: await publishWithImages(city, attractions),
        };
      } catch (err) {
        const message =
          err?.response?.data?.error?.message ||
          err?.message ||
          'Something went wrong while searching.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      publishWithImages,
      clearRoute,
      settings.searchRadiusMeters,
      settings.selectedCategories,
    ]
  );

  const refreshAttractions = useCallback(
    async (cityCoordinates, cityName, overrides = {}) => {
      if (!cityCoordinates) {
        setError('No city selected to refresh.');
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const categories =
          overrides.selectedCategories || settings.selectedCategories;
        const radius =
          overrides.searchRadiusMeters ?? settings.searchRadiusMeters;

        const attractions = await searchNearbyAttractions(cityCoordinates, {
          radius,
          includedTypes: resolvePlaceTypes(categories),
        });
        const city = {
          id: `city_${cityName || 'refresh'}`,
          name: cityName || 'Selected city',
          latitude: cityCoordinates.latitude,
          longitude: cityCoordinates.longitude,
        };
        return publishWithImages(city, attractions);
      } catch (err) {
        const message =
          err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to refresh attractions.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      publishWithImages,
      settings.searchRadiusMeters,
      settings.selectedCategories,
    ]
  );

  return {
    loading,
    error,
    setError,
    searchCityAttractions,
    refreshAttractions,
  };
}
