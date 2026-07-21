import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, radii, spacing } from '../theme/colors';

/**
 * @param {Array<{ latitude: number, longitude: number }>} coordinates
 */
function getRegionForCoordinates(coordinates) {
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
 * Map preview for a single place or a full multi-stop route.
 *
 * @param {{
 *  points?: Array<{ id?: string, name?: string, latitude: number, longitude: number, role?: 'start'|'stop'|'end' }>,
 *  showRoute?: boolean,
 *  height?: number,
 * }} props
 */
export function PlaceMap({ points = [], showRoute = false, height = 220 }) {
  const mapRef = useRef(null);

  const validPoints = useMemo(
    () =>
      points.filter(
        (point) =>
          typeof point?.latitude === 'number' &&
          typeof point?.longitude === 'number'
      ),
    [points]
  );

  const region = useMemo(
    () => getRegionForCoordinates(validPoints),
    [validPoints]
  );

  const routeCoordinates = useMemo(
    () =>
      validPoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
      })),
    [validPoints]
  );

  useEffect(() => {
    if (!mapRef.current || validPoints.length < 2) return;

    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: true,
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [routeCoordinates, validPoints.length]);

  if (validPoints.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Map unavailable</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        scrollEnabled
        zoomEnabled
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {showRoute && routeCoordinates.length > 1 ? (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.secondary}
            strokeWidth={4}
          />
        ) : null}

        {validPoints.map((point, index) => {
          const pinColor =
            point.role === 'start'
              ? colors.success
              : point.role === 'end'
                ? colors.error
                : colors.primary;

          return (
            <Marker
              key={point.id || `${point.latitude}-${point.longitude}-${index}`}
              coordinate={{
                latitude: point.latitude,
                longitude: point.longitude,
              }}
              title={point.name || `Stop ${index + 1}`}
              description={
                point.role === 'start'
                  ? 'Start'
                  : point.role === 'end'
                    ? 'End'
                    : undefined
              }
              pinColor={pinColor}
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
  },
});
