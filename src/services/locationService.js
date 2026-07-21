import * as Location from 'expo-location';

/**
 * Requests foreground permission and returns the current GPS coordinates.
 *
 * @returns {Promise<{ latitude: number, longitude: number, accuracy: number|null }>}
 */
export async function getCurrentGpsPosition() {
  const current = await Location.getForegroundPermissionsAsync();
  let status = current.status;

  if (status !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    throw new Error(
      'Location permission is required to start the route from your position.'
    );
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error(
      'Location services are turned off. Enable GPS and try again.'
    );
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const latitude = position?.coords?.latitude;
  const longitude = position?.coords?.longitude;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Could not read your current GPS coordinates.');
  }

  return {
    latitude,
    longitude,
    accuracy:
      typeof position.coords.accuracy === 'number'
        ? position.coords.accuracy
        : null,
  };
}
