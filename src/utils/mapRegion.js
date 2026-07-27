/**
 * Compute a MapView region that fits the given coordinates.
 * @param {Array<{ latitude: number, longitude: number }>} coordinates
 */
export function getRegionForCoordinates(coordinates) {
  if (!coordinates.length) {
    return {
      latitude: 42.6977,
      longitude: 23.3219,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }

  if (coordinates.length === 1) {
    return {
      latitude: coordinates[0].latitude,
      longitude: coordinates[0].longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }

  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;

  coordinates.forEach((point) => {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  });

  const latitudeDelta = Math.max((maxLat - minLat) * 1.5, 0.03);
  const longitudeDelta = Math.max((maxLng - minLng) * 1.5, 0.03);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

/**
 * @param {unknown} point
 * @returns {boolean}
 */
export function hasValidCoordinates(point) {
  return (
    typeof point?.latitude === 'number' &&
    typeof point?.longitude === 'number' &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude)
  );
}
