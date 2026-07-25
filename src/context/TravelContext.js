import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DEFAULT_SETTINGS,
  storageService,
} from '../services/storageService';
import { createSavedRoute } from '../types/savedRoute';
import { createVisit, normalizeVisit } from '../types/visit';
import { generateGoogleMapsRoute } from '../services/mapsService';
import {
  MAX_SEARCH_RADIUS_METERS,
  MIN_SEARCH_RADIUS_METERS,
  normalizeTravelMode,
} from '../utils/config';
import { getCountryName } from '../utils/worldCountries';
import { normalizeLanguage } from '../i18n';

const TravelContext = createContext(null);

function clampRadius(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_SETTINGS.searchRadiusMeters;
  }
  return Math.min(
    MAX_SEARCH_RADIUS_METERS,
    Math.max(MIN_SEARCH_RADIUS_METERS, Math.round(numeric))
  );
}

export function TravelProvider({ children }) {
  const [searchedCity, setSearchedCity] = useState(null);
  const [cityCoordinates, setCityCoordinates] = useState(null);
  const [attractions, setAttractions] = useState([]);
  const [selectedAttractions, setSelectedAttractions] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [visits, setVisits] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const [savedAttractions, lastCity, savedSettings, routes, savedVisits] =
          await Promise.all([
            storageService.loadSelectedAttractions(),
            storageService.loadLastCity(),
            storageService.loadSettings(),
            storageService.loadSavedRoutes(),
            storageService.loadVisits(),
          ]);

        if (!mounted) return;

        setSelectedAttractions(savedAttractions);
        setSettings(savedSettings);
        setSavedRoutes(routes);
        setVisits(
          (savedVisits || [])
            .map((item) => normalizeVisit(item))
            .filter(
              (item) =>
                item.countryCode && !String(item.id || '').startsWith('demo_')
            )
        );
        if (lastCity) {
          setSearchedCity(lastCity.name);
          setCityCoordinates({
            latitude: lastCity.latitude,
            longitude: lastCity.longitude,
          });
        }
      } catch (error) {
        console.warn('Failed to hydrate travel state:', error);
      } finally {
        if (mounted) setIsHydrated(true);
      }
    }

    hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    storageService.saveSelectedAttractions(selectedAttractions).catch((error) => {
      console.warn('Failed to persist selected attractions:', error);
    });
  }, [selectedAttractions, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    storageService.saveSettings(settings).catch((error) => {
      console.warn('Failed to persist settings:', error);
    });
  }, [settings, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    storageService.saveSavedRoutes(savedRoutes).catch((error) => {
      console.warn('Failed to persist saved routes:', error);
    });
  }, [savedRoutes, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    storageService.saveVisits(visits).catch((error) => {
      console.warn('Failed to persist visits:', error);
    });
  }, [visits, isHydrated]);

  const visitedCountryCodes = useMemo(() => {
    const codes = new Set();
    visits.forEach((visit) => {
      if (visit?.countryCode) codes.add(String(visit.countryCode).toUpperCase());
    });
    return [...codes];
  }, [visits]);

  const getVisitsForCountry = useCallback(
    (countryCode) => {
      const code = String(countryCode || '').toUpperCase();
      return visits
        .filter((visit) => String(visit.countryCode).toUpperCase() === code)
        .sort(
          (a, b) =>
            new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
        );
    },
    [visits]
  );

  const addVisit = useCallback((data) => {
    const countryCode = String(data?.countryCode || '')
      .trim()
      .toUpperCase();
    if (!countryCode) {
      throw new Error('Country code is required.');
    }

    const visit = createVisit({
      ...data,
      countryCode,
      countryName: data?.countryName || getCountryName(countryCode),
    });

    setVisits((current) => [visit, ...current]);
    return visit;
  }, []);

  const markCountryVisited = useCallback(
    (countryCode, extras = {}) => {
      const code = String(countryCode || '')
        .trim()
        .toUpperCase();
      if (!code) return null;

      const existingCountryMark = visits.find(
        (visit) =>
          String(visit.countryCode).toUpperCase() === code &&
          visit.kind === 'country' &&
          visit.source === 'manual'
      );
      if (existingCountryMark) return existingCountryMark;

      return addVisit({
        kind: 'country',
        countryCode: code,
        source: 'manual',
        visitedAt: extras.visitedAt,
      });
    },
    [addVisit, visits]
  );

  const markCityVisited = useCallback(
    (countryCode, city, extras = {}) => {
      const code = String(countryCode || '')
        .trim()
        .toUpperCase();
      const cityName = String(city?.name || city || '').trim();
      if (!code || !cityName) return null;

      const existing = visits.find(
        (visit) =>
          String(visit.countryCode).toUpperCase() === code &&
          visit.kind === 'city' &&
          String(visit.cityName || '').toLowerCase() === cityName.toLowerCase()
      );
      if (existing) return existing;

      return addVisit({
        kind: 'city',
        countryCode: code,
        cityName,
        cityLatitude:
          typeof city?.latitude === 'number' ? city.latitude : null,
        cityLongitude:
          typeof city?.longitude === 'number' ? city.longitude : null,
        source: extras.source || 'manual',
        visitedAt: extras.visitedAt,
      });
    },
    [addVisit, visits]
  );

  /**
   * Log an attraction/stop arrival. Used by live trip tracking (#9).
   * Also ensures the parent city is marked visited.
   */
  const recordPlaceVisit = useCallback(
    (data) => {
      const code = String(data?.countryCode || '')
        .trim()
        .toUpperCase();
      const placeName = String(data?.placeName || data?.name || '').trim();
      if (!code || !placeName) {
        throw new Error('countryCode and placeName are required.');
      }

      const cityName = data?.cityName
        ? String(data.cityName).trim()
        : null;

      if (cityName) {
        markCityVisited(
          code,
          {
            name: cityName,
            latitude: data.cityLatitude,
            longitude: data.cityLongitude,
          },
          { source: data.source || 'trip' }
        );
      }

      const placeId = data.placeId || data.attractionId || null;
      if (placeId) {
        const duplicate = visits.find(
          (visit) =>
            visit.kind === 'place' &&
            visit.placeId &&
            visit.placeId === placeId
        );
        if (duplicate) return duplicate;
      }

      return addVisit({
        kind: 'place',
        countryCode: code,
        cityName,
        cityLatitude: data.cityLatitude ?? null,
        cityLongitude: data.cityLongitude ?? null,
        placeId,
        placeName,
        placeLatitude: data.latitude ?? data.placeLatitude ?? null,
        placeLongitude: data.longitude ?? data.placeLongitude ?? null,
        routeId: data.routeId || null,
        source: data.source || 'trip',
        visitedAt: data.visitedAt,
      });
    },
    [addVisit, markCityVisited, visits]
  );

  const isCityVisited = useCallback(
    (countryCode, cityName) => {
      const code = String(countryCode || '').toUpperCase();
      const city = String(cityName || '').trim().toLowerCase();
      if (!code || !city) return false;
      return visits.some(
        (visit) =>
          String(visit.countryCode).toUpperCase() === code &&
          String(visit.cityName || '').trim().toLowerCase() === city
      );
    },
    [visits]
  );

  const removeVisitsForCountry = useCallback((countryCode) => {
    const code = String(countryCode || '').toUpperCase();
    setVisits((current) =>
      current.filter((visit) => String(visit.countryCode).toUpperCase() !== code)
    );
  }, []);

  const deleteVisit = useCallback((visitId) => {
    setVisits((current) => current.filter((visit) => visit.id !== visitId));
  }, []);

  const setSearchResult = useCallback((city, places) => {
    setSearchedCity(city.name);
    setCityCoordinates({
      latitude: city.latitude,
      longitude: city.longitude,
    });
    setAttractions(places);
    storageService.saveLastCity(city).catch((error) => {
      console.warn('Failed to persist last city:', error);
    });
  }, []);

  const updateSettings = useCallback((partial) => {
    setSettings((current) => {
      const next = {
        ...current,
        ...partial,
      };

      if (partial.searchRadiusMeters != null) {
        next.searchRadiusMeters = clampRadius(partial.searchRadiusMeters);
      }

      if (partial.startAddress != null) {
        next.startAddress = String(partial.startAddress);
      }

      if (partial.endAddress != null) {
        next.endAddress = String(partial.endAddress);
      }

      if (partial.selectedCategories != null) {
        const categories = Array.isArray(partial.selectedCategories)
          ? partial.selectedCategories.filter((id) => typeof id === 'string')
          : [];
        next.selectedCategories =
          categories.length > 0
            ? categories
            : [...DEFAULT_SETTINGS.selectedCategories];
      }

      if (partial.travelMode != null) {
        next.travelMode = normalizeTravelMode(partial.travelMode);
      }

      if (partial.language != null) {
        next.language = normalizeLanguage(partial.language);
      }

      return next;
    });
  }, []);

  const toggleAttraction = useCallback((attraction) => {
    setSelectedAttractions((current) => {
      const exists = current.some((item) => item.id === attraction.id);
      if (exists) {
        return current.filter((item) => item.id !== attraction.id);
      }
      return [...current, attraction];
    });
  }, []);

  const removeAttraction = useCallback((attractionId) => {
    setSelectedAttractions((current) =>
      current.filter((item) => item.id !== attractionId)
    );
  }, []);

  const reorderSelectedAttractions = useCallback((nextAttractions) => {
    setSelectedAttractions(Array.isArray(nextAttractions) ? nextAttractions : []);
  }, []);

  const patchSelectedAttraction = useCallback((attractionId, partial) => {
    if (!attractionId || !partial || typeof partial !== 'object') return;
    setSelectedAttractions((current) =>
      current.map((item) =>
        item.id === attractionId ? { ...item, ...partial } : item
      )
    );
  }, []);

  const clearRoute = useCallback(() => {
    setSelectedAttractions([]);
  }, []);

  const clearSearch = useCallback(() => {
    setAttractions([]);
    setSearchedCity(null);
    setCityCoordinates(null);
  }, []);

  const isAttractionSelected = useCallback(
    (attractionId) => selectedAttractions.some((item) => item.id === attractionId),
    [selectedAttractions]
  );

  const saveCurrentRoute = useCallback(
    (name) => {
      if (!selectedAttractions.length) {
        throw new Error('Add at least one place before saving a route.');
      }

      let googleMapsUrl = null;
      try {
        googleMapsUrl = generateGoogleMapsRoute(selectedAttractions, {
          origin: settings.startAddress,
          destination: settings.endAddress,
          travelMode: settings.travelMode,
        });
      } catch {
        googleMapsUrl = null;
      }

      const route = createSavedRoute({
        name,
        cityName: searchedCity,
        cityCoordinates,
        startAddress: settings.startAddress,
        endAddress: settings.endAddress,
        travelMode: settings.travelMode,
        googleMapsUrl,
        attractions: selectedAttractions,
      });

      setSavedRoutes((current) => [route, ...current]);
      return route;
    },
    [selectedAttractions, searchedCity, cityCoordinates, settings]
  );

  const deleteSavedRoute = useCallback((routeId) => {
    setSavedRoutes((current) => current.filter((route) => route.id !== routeId));
  }, []);

  const loadSavedRoute = useCallback((route) => {
    if (!route?.attractions?.length) {
      throw new Error('This saved route has no places.');
    }

    setSelectedAttractions(route.attractions);
    setSearchedCity(route.cityName || null);
    setCityCoordinates(route.cityCoordinates || null);
    setSettings((current) => ({
      ...current,
      startAddress: route.startAddress || '',
      endAddress: route.endAddress || '',
      travelMode: normalizeTravelMode(route.travelMode),
    }));

    if (route.cityName && route.cityCoordinates) {
      storageService
        .saveLastCity({
          id: route.id,
          name: route.cityName,
          latitude: route.cityCoordinates.latitude,
          longitude: route.cityCoordinates.longitude,
        })
        .catch(() => {});
    }
  }, []);

  const value = useMemo(
    () => ({
      searchedCity,
      cityCoordinates,
      attractions,
      selectedAttractions,
      savedRoutes,
      visits,
      visitedCountryCodes,
      settings,
      isHydrated,
      setSearchResult,
      setAttractions,
      updateSettings,
      toggleAttraction,
      removeAttraction,
      reorderSelectedAttractions,
      patchSelectedAttraction,
      clearRoute,
      clearSearch,
      isAttractionSelected,
      saveCurrentRoute,
      deleteSavedRoute,
      loadSavedRoute,
      getVisitsForCountry,
      addVisit,
      markCountryVisited,
      markCityVisited,
      recordPlaceVisit,
      isCityVisited,
      removeVisitsForCountry,
      deleteVisit,
    }),
    [
      searchedCity,
      cityCoordinates,
      attractions,
      selectedAttractions,
      savedRoutes,
      visits,
      visitedCountryCodes,
      settings,
      isHydrated,
      setSearchResult,
      updateSettings,
      toggleAttraction,
      removeAttraction,
      reorderSelectedAttractions,
      patchSelectedAttraction,
      clearRoute,
      clearSearch,
      isAttractionSelected,
      saveCurrentRoute,
      deleteSavedRoute,
      loadSavedRoute,
      getVisitsForCountry,
      addVisit,
      markCountryVisited,
      markCityVisited,
      recordPlaceVisit,
      isCityVisited,
      removeVisitsForCountry,
      deleteVisit,
    ]
  );

  return (
    <TravelContext.Provider value={value}>{children}</TravelContext.Provider>
  );
}

export function useTravel() {
  const context = useContext(TravelContext);
  if (!context) {
    throw new Error('useTravel must be used within a TravelProvider');
  }
  return context;
}
