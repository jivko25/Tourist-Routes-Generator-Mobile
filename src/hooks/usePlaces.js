import { useCallback, useState } from 'react';
import { geocodeCity } from '../services/geocodingService';
import { searchNearbyAttractions } from '../services/placesService';
import { useTravel } from '../context/TravelContext';

/**
 * Encapsulates city search + nearby attractions flow.
 */
export function usePlaces() {
  const { setSearchResult } = useTravel();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchCityAttractions = useCallback(
    async (cityName) => {
      setLoading(true);
      setError(null);

      try {
        const city = await geocodeCity(cityName);
        const attractions = await searchNearbyAttractions({
          latitude: city.latitude,
          longitude: city.longitude,
        });

        setSearchResult(city, attractions);
        return { city, attractions };
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
    [setSearchResult]
  );

  const refreshAttractions = useCallback(
    async (cityCoordinates, cityName) => {
      if (!cityCoordinates) {
        setError('No city selected to refresh.');
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const attractions = await searchNearbyAttractions(cityCoordinates);
        setSearchResult(
          {
            id: `city_${cityName || 'refresh'}`,
            name: cityName || 'Selected city',
            latitude: cityCoordinates.latitude,
            longitude: cityCoordinates.longitude,
          },
          attractions
        );
        return attractions;
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
    [setSearchResult]
  );

  return {
    loading,
    error,
    setError,
    searchCityAttractions,
    refreshAttractions,
  };
}
