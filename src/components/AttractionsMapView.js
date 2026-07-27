import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { getOpenStatus } from '../utils/openingHours';
import {
  getRegionForCoordinates,
  hasValidCoordinates,
} from '../utils/mapRegion';
import { colors, radii, spacing } from '../theme/colors';

/** Soft cap so Android stays responsive with large Places results. */
const MAX_MARKERS = 120;

/**
 * @param {{ openNow?: boolean|null }} attraction
 * @param {boolean} selected
 */
function resolvePinColor(attraction, selected) {
  if (selected) return 'green';
  const status = getOpenStatus(attraction);
  if (status === 'open') return 'blue';
  if (status === 'closed') return 'red';
  return 'yellow';
}

/**
 * Full-bleed discover map for city attractions.
 *
 * @param {{
 *  attractions: Array<object>,
 *  cityCoordinates?: { latitude: number, longitude: number }|null,
 *  isSelected: (id: string) => boolean,
 *  focusedId?: string|null,
 *  onSelect: (attraction: object) => void,
 *  onMapPress?: () => void,
 * }} props
 */
export function AttractionsMapView({
  attractions = [],
  cityCoordinates = null,
  isSelected,
  focusedId = null,
  onSelect,
  onMapPress,
}) {
  const mapRef = useRef(null);

  const mappable = useMemo(() => {
    const withCoords = attractions.filter(hasValidCoordinates);
    return withCoords.slice(0, MAX_MARKERS);
  }, [attractions]);

  const truncated = attractions.filter(hasValidCoordinates).length > MAX_MARKERS;

  const region = useMemo(() => {
    if (mappable.length > 0) {
      return getRegionForCoordinates(mappable);
    }
    if (hasValidCoordinates(cityCoordinates)) {
      return getRegionForCoordinates([cityCoordinates]);
    }
    return getRegionForCoordinates([]);
  }, [mappable, cityCoordinates]);

  useEffect(() => {
    if (!mapRef.current || mappable.length === 0) return;

    const coords = mappable.map((item) => ({
      latitude: item.latitude,
      longitude: item.longitude,
    }));

    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 56, right: 40, bottom: 72, left: 40 },
        animated: true,
      });
    }, 280);

    return () => clearTimeout(timeout);
  }, [mappable]);

  useEffect(() => {
    if (!mapRef.current || !focusedId) return;
    const focused = mappable.find((item) => item.id === focusedId);
    if (!focused) return;

    mapRef.current.animateToRegion(
      {
        latitude: focused.latitude,
        longitude: focused.longitude,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
      },
      280
    );
  }, [focusedId, mappable]);

  if (mappable.length === 0) {
    return (
      <View style={styles.empty} testID="attractions-map-empty">
        <Text style={styles.emptyTitle}>No map pins</Text>
        <Text style={styles.emptyText}>
          These places don’t have coordinates to show on the map.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap} testID="attractions-map">
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        onPress={onMapPress}
        moveOnMarkerPress={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {mappable.map((attraction) => {
          const selected = Boolean(isSelected?.(attraction.id));
          return (
            <Marker
              // Remount when selection changes — pinColor won't update with tracksViewChanges={false}
              key={`${attraction.id}:${selected ? 'in' : 'out'}`}
              identifier={attraction.id}
              coordinate={{
                latitude: attraction.latitude,
                longitude: attraction.longitude,
              }}
              title={attraction.name}
              pinColor={resolvePinColor(attraction, selected)}
              tracksViewChanges={false}
              onPress={(event) => {
                event?.stopPropagation?.();
                onSelect?.(attraction);
              }}
            />
          );
        })}
      </MapView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Open</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#EAB308' }]} />
          <Text style={styles.legendText}>Unknown</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.error }]} />
          <Text style={styles.legendText}>Closed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>In route</Text>
        </View>
      </View>

      {truncated ? (
        <View style={styles.capHint}>
          <Text style={styles.capHintText}>
            Showing {MAX_MARKERS} of {attractions.filter(hasValidCoordinates).length} pins
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceMuted,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  legend: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    top: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  capHint: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: spacing.sm,
    backgroundColor: 'rgba(15,23,42,0.78)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  capHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
