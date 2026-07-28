import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useTravel } from './TravelContext';
import {
  checkArrivalFromCoords,
  clearPendingArrival,
  getNextStop,
  loadLiveTrip,
  loadPendingArrival,
  setLiveTripForegroundHandler,
  startLiveTrip as startLiveTripService,
  stopLiveTrip as stopLiveTripService,
} from '../services/liveTripService';
import { navigateToAttractionDetail } from '../navigation/navigationRef';

const LiveTripContext = createContext(null);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('live-trip', {
    name: 'Live trip arrivals',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3B82F6',
  });
}

export function LiveTripProvider({ children }) {
  const {
    selectedAttractions,
    searchedCity,
    cityCoordinates,
    recordPlaceVisit,
  } = useTravel();

  const [trip, setTrip] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastArrival, setLastArrival] = useState(null);
  const watchRef = useRef(null);
  const processingRef = useRef(false);

  const refreshTrip = useCallback(async () => {
    const loaded = await loadLiveTrip();
    setTrip(loaded);
    return loaded;
  }, []);

  const applyArrivalToVisits = useCallback(
    (arrival) => {
      if (!arrival?.stopId) return;
      try {
        if (arrival.countryCode) {
          recordPlaceVisit({
            countryCode: arrival.countryCode,
            cityName: arrival.cityName
              ? String(arrival.cityName).split(',')[0].trim()
              : null,
            cityLatitude: arrival.cityCoordinates?.latitude,
            cityLongitude: arrival.cityCoordinates?.longitude,
            placeId: arrival.stopId,
            placeName: arrival.stopName,
            latitude: arrival.latitude,
            longitude: arrival.longitude,
            routeId: arrival.tripId,
            source: 'trip',
            visitedAt: arrival.arrivedAt,
          });
        }
      } catch (err) {
        console.warn('recordPlaceVisit failed:', err?.message || err);
      }
    },
    [recordPlaceVisit]
  );

  const consumeArrival = useCallback(
    async (arrival, { openDetail = false } = {}) => {
      if (!arrival?.stopId) return;
      setLastArrival(arrival);
      applyArrivalToVisits(arrival);
      await clearPendingArrival();
      await refreshTrip();
      if (openDetail) {
        navigateToAttractionDetail(arrival.stopId, arrival.stopName);
      }
    },
    [applyArrivalToVisits, refreshTrip]
  );

  useEffect(() => {
    ensureAndroidNotificationChannel().catch(() => {});
  }, []);

  useEffect(() => {
    setLiveTripForegroundHandler((arrival) => {
      consumeArrival(arrival, { openDetail: false });
    });
    return () => setLiveTripForegroundHandler(null);
  }, [consumeArrival]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const loaded = await loadLiveTrip();
      if (mounted) setTrip(loaded);
      const pending = await loadPendingArrival();
      if (mounted && pending) {
        await consumeArrival(pending, { openDetail: false });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [consumeArrival]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response?.notification?.request?.content?.data;
        if (data?.type !== 'live_trip_arrival' || !data?.attractionId) return;
        navigateToAttractionDetail(data.attractionId, data.title);
        loadPendingArrival().then((pending) => {
          if (pending?.stopId === data.attractionId) {
            consumeArrival(pending, { openDetail: false });
          }
        });
      }
    );
    return () => sub.remove();
  }, [consumeArrival]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      refreshTrip();
      loadPendingArrival().then((pending) => {
        if (pending) consumeArrival(pending, { openDetail: false });
      });
    });
    return () => sub.remove();
  }, [consumeArrival, refreshTrip]);

  // Foreground watch — useful when background geofencing isn't available (Expo Go).
  useEffect(() => {
    let cancelled = false;

    async function startWatch() {
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
      if (!trip?.active) return;

      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 25,
          timeInterval: 8000,
        },
        async (position) => {
          if (cancelled || processingRef.current) return;
          const coords = position?.coords;
          if (!coords) return;
          processingRef.current = true;
          try {
            const result = await checkArrivalFromCoords({
              latitude: coords.latitude,
              longitude: coords.longitude,
            });
            if (result?.arrival) {
              await consumeArrival(result.arrival, { openDetail: false });
            }
          } catch (err) {
            console.warn('Foreground arrival check failed:', err?.message || err);
          } finally {
            processingRef.current = false;
          }
        }
      );
    }

    startWatch();
    return () => {
      cancelled = true;
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
    };
  }, [trip?.active, trip?.nextIndex, trip?.id, consumeArrival]);

  const startTrip = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await startLiveTripService({
        attractions: selectedAttractions,
        cityName: searchedCity,
        cityCoordinates,
      });
      setTrip(result.trip);
      setLastArrival(null);
      return result;
    } catch (err) {
      const message = err?.message || 'Could not start live trip.';
      setError(message);
      throw err;
    } finally {
      setBusy(false);
    }
  }, [selectedAttractions, searchedCity, cityCoordinates]);

  const stopTrip = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await stopLiveTripService();
      setTrip(null);
      setLastArrival(null);
    } catch (err) {
      setError(err?.message || 'Could not stop live trip.');
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const openLastArrivalDetail = useCallback(() => {
    if (!lastArrival?.stopId) return;
    navigateToAttractionDetail(lastArrival.stopId, lastArrival.stopName);
  }, [lastArrival]);

  const nextStop = useMemo(() => getNextStop(trip), [trip]);
  const isActive = Boolean(trip?.active);
  const progressLabel = trip
    ? `${trip.arrivedStopIds?.length || 0}/${trip.stops?.length || 0}`
    : null;

  const value = useMemo(
    () => ({
      trip,
      isActive,
      busy,
      error,
      setError,
      nextStop,
      lastArrival,
      progressLabel,
      startTrip,
      stopTrip,
      openLastArrivalDetail,
      refreshTrip,
    }),
    [
      trip,
      isActive,
      busy,
      error,
      nextStop,
      lastArrival,
      progressLabel,
      startTrip,
      stopTrip,
      openLastArrivalDetail,
      refreshTrip,
    ]
  );

  return (
    <LiveTripContext.Provider value={value}>{children}</LiveTripContext.Provider>
  );
}

export function useLiveTrip() {
  const ctx = useContext(LiveTripContext);
  if (!ctx) {
    throw new Error('useLiveTrip must be used within LiveTripProvider');
  }
  return ctx;
}
