import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import {
  LIVE_TRIP_DEBOUNCE_MS,
  LIVE_TRIP_GEOFENCE_TASK,
  LIVE_TRIP_PENDING_KEY,
  LIVE_TRIP_RADIUS_METERS,
  LIVE_TRIP_STORAGE_KEY,
} from './liveTripConstants';
import { haversineDistanceKm } from '../utils/routeOptimization';
import { resolveCountryCodeFromText } from '../utils/worldCountries';

/**
 * @typedef {Object} LiveTripStop
 * @property {string} id
 * @property {string} name
 * @property {number} latitude
 * @property {number} longitude
 * @property {string|null} [googlePlaceId]
 */

/**
 * @typedef {Object} LiveTripState
 * @property {string} id
 * @property {boolean} active
 * @property {string|null} cityName
 * @property {string|null} countryCode
 * @property {{ latitude: number, longitude: number }|null} cityCoordinates
 * @property {LiveTripStop[]} stops
 * @property {number} nextIndex
 * @property {string[]} arrivedStopIds
 * @property {number} startedAt
 * @property {number} updatedAt
 */

/** @type {((arrival: object) => void)|null} */
let foregroundArrivalHandler = null;

export function setLiveTripForegroundHandler(handler) {
  foregroundArrivalHandler = typeof handler === 'function' ? handler : null;
}

export async function loadLiveTrip() {
  try {
    const raw = await AsyncStorage.getItem(LIVE_TRIP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.active ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveLiveTrip(trip) {
  if (!trip) {
    await AsyncStorage.removeItem(LIVE_TRIP_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(LIVE_TRIP_STORAGE_KEY, JSON.stringify(trip));
}

export async function loadPendingArrival() {
  try {
    const raw = await AsyncStorage.getItem(LIVE_TRIP_PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearPendingArrival() {
  await AsyncStorage.removeItem(LIVE_TRIP_PENDING_KEY);
}

async function writePendingArrival(arrival) {
  await AsyncStorage.setItem(LIVE_TRIP_PENDING_KEY, JSON.stringify(arrival));
}

function buildStops(attractions) {
  return (attractions || [])
    .filter(
      (item) =>
        item?.id &&
        typeof item.latitude === 'number' &&
        typeof item.longitude === 'number'
    )
    .map((item) => ({
      id: String(item.id),
      name: String(item.name || 'Stop'),
      latitude: item.latitude,
      longitude: item.longitude,
      googlePlaceId: item.googlePlaceId || null,
    }));
}

async function ensureNotificationPermissions() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return Boolean(
    requested.granted ||
      requested.iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function ensureLocationPermissions({ needBackground = true } = {}) {
  const fg = await Location.getForegroundPermissionsAsync();
  let fgStatus = fg.status;
  if (fgStatus !== 'granted') {
    const asked = await Location.requestForegroundPermissionsAsync();
    fgStatus = asked.status;
  }
  if (fgStatus !== 'granted') {
    throw new Error('Location permission is required to start a live trip.');
  }

  let backgroundGranted = false;
  if (needBackground) {
    const bg = await Location.getBackgroundPermissionsAsync();
    let bgStatus = bg.status;
    if (bgStatus !== 'granted') {
      const askedBg = await Location.requestBackgroundPermissionsAsync();
      bgStatus = askedBg.status;
    }
    backgroundGranted = bgStatus === 'granted';
  }

  return { backgroundGranted };
}

function regionForStop(stop, radius = LIVE_TRIP_RADIUS_METERS) {
  return {
    identifier: String(stop.id),
    latitude: stop.latitude,
    longitude: stop.longitude,
    radius,
    notifyOnEnter: true,
    notifyOnExit: false,
  };
}

export async function armNextGeofence(trip) {
  if (!trip?.active) return false;
  const next = trip.stops[trip.nextIndex];
  if (!next) {
    const started = await Location.hasStartedGeofencingAsync(LIVE_TRIP_GEOFENCE_TASK);
    if (started) await Location.stopGeofencingAsync(LIVE_TRIP_GEOFENCE_TASK);
    return false;
  }

  try {
    await Location.startGeofencingAsync(LIVE_TRIP_GEOFENCE_TASK, [
      regionForStop(next),
    ]);
    return true;
  } catch (error) {
    console.warn('Geofencing unavailable:', error?.message || error);
    return false;
  }
}

/**
 * Start live trip tracking for the current route stops.
 */
export async function startLiveTrip({
  attractions,
  cityName = null,
  cityCoordinates = null,
  routeId = null,
}) {
  const stops = buildStops(attractions);
  if (stops.length === 0) {
    throw new Error('Add at least one place with coordinates before starting a trip.');
  }

  await ensureNotificationPermissions();
  const { backgroundGranted } = await ensureLocationPermissions({
    needBackground: true,
  });

  const countryCode =
    resolveCountryCodeFromText(cityName) ||
    resolveCountryCodeFromText(
      typeof cityName === 'string' ? cityName.split(',').pop() : ''
    );

  const trip = {
    id: routeId || `trip_${Date.now()}`,
    active: true,
    cityName: cityName || null,
    countryCode: countryCode || null,
    cityCoordinates: cityCoordinates || null,
    stops,
    nextIndex: 0,
    arrivedStopIds: [],
    startedAt: Date.now(),
    updatedAt: Date.now(),
    backgroundGranted,
    lastArrivalAt: 0,
  };

  await saveLiveTrip(trip);
  await clearPendingArrival();
  const geofenceArmed = await armNextGeofence(trip);

  return { trip, geofenceArmed, backgroundGranted };
}

export async function stopLiveTrip() {
  try {
    const started = await Location.hasStartedGeofencingAsync(LIVE_TRIP_GEOFENCE_TASK);
    if (started) await Location.stopGeofencingAsync(LIVE_TRIP_GEOFENCE_TASK);
  } catch {
    // ignore
  }
  await saveLiveTrip(null);
  await clearPendingArrival();
}

/**
 * Shared arrival path for geofence Enter / foreground distance check.
 * @param {LiveTripStop} stop
 * @param {{ source?: string, notify?: boolean }} [options]
 */
export async function processStopArrival(stop, options = {}) {
  const { source = 'trip', notify = true } = options;
  if (!stop?.id) return null;

  const trip = await loadLiveTrip();
  if (!trip?.active) return null;

  const now = Date.now();
  if (
    trip.lastArrivalAt &&
    now - trip.lastArrivalAt < LIVE_TRIP_DEBOUNCE_MS &&
    trip.arrivedStopIds?.includes(stop.id)
  ) {
    return null;
  }

  if (trip.arrivedStopIds?.includes(stop.id)) {
    // Already counted — still advance geofence if this is the current next stop.
  } else {
    trip.arrivedStopIds = [...(trip.arrivedStopIds || []), stop.id];
  }

  const stopIndex = trip.stops.findIndex((item) => item.id === stop.id);
  if (stopIndex >= 0) {
    trip.nextIndex = Math.max(trip.nextIndex, stopIndex + 1);
  } else if (trip.stops[trip.nextIndex]?.id === stop.id) {
    trip.nextIndex += 1;
  }

  trip.lastArrivalAt = now;
  trip.updatedAt = now;

  const arrival = {
    tripId: trip.id,
    stopId: stop.id,
    stopName: stop.name,
    latitude: stop.latitude,
    longitude: stop.longitude,
    googlePlaceId: stop.googlePlaceId || null,
    cityName: trip.cityName,
    countryCode: trip.countryCode,
    cityCoordinates: trip.cityCoordinates,
    arrivedAt: new Date().toISOString(),
    source,
    hasNext: trip.nextIndex < trip.stops.length,
    nextStop: trip.stops[trip.nextIndex] || null,
  };

  await writePendingArrival(arrival);

  if (trip.nextIndex >= trip.stops.length) {
    trip.active = false;
    await saveLiveTrip(trip);
    try {
      const started = await Location.hasStartedGeofencingAsync(LIVE_TRIP_GEOFENCE_TASK);
      if (started) await Location.stopGeofencingAsync(LIVE_TRIP_GEOFENCE_TASK);
    } catch {
      // ignore
    }
  } else {
    await saveLiveTrip(trip);
    await armNextGeofence(trip);
  }

  if (notify) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Arrived',
          body: arrival.hasNext
            ? `You’re at ${stop.name}. Tap for details — next: ${arrival.nextStop?.name}`
            : `You’re at ${stop.name}. Trip complete!`,
          data: {
            type: 'live_trip_arrival',
            attractionId: stop.id,
            title: stop.name,
            tripId: trip.id,
          },
          sound: true,
          ...(Platform.OS === 'android' ? { channelId: 'live-trip' } : null),
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('Arrival notification failed:', error?.message || error);
    }
  }

  if (foregroundArrivalHandler) {
    try {
      foregroundArrivalHandler(arrival);
    } catch (error) {
      console.warn('Foreground arrival handler failed:', error?.message || error);
    }
  }

  return { trip, arrival };
}

/**
 * Called from the background geofence task.
 */
export async function handleGeofenceEnter(regionIdentifier) {
  const trip = await loadLiveTrip();
  if (!trip?.active) return null;
  const stop =
    trip.stops.find((item) => item.id === regionIdentifier) ||
    trip.stops[trip.nextIndex];
  if (!stop) return null;
  return processStopArrival(stop, { source: 'trip', notify: true });
}

/**
 * Foreground distance check (works even when geofencing is unavailable).
 * @param {{ latitude: number, longitude: number }} coords
 */
export async function checkArrivalFromCoords(coords) {
  const trip = await loadLiveTrip();
  if (!trip?.active || !coords) return null;
  const stop = trip.stops[trip.nextIndex];
  if (!stop) return null;

  const distanceM =
    haversineDistanceKm(coords, stop) * 1000;
  if (distanceM <= LIVE_TRIP_RADIUS_METERS) {
    return processStopArrival(stop, { source: 'trip', notify: true });
  }
  return null;
}

export function getNextStop(trip) {
  if (!trip?.active) return null;
  return trip.stops[trip.nextIndex] || null;
}

export function formatDistanceToStop(coords, stop) {
  if (!coords || !stop) return null;
  const km = haversineDistanceKm(coords, stop);
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
