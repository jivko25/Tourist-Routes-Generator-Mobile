import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { formatCoordinate } from '../utils/googleMaps';
import {
  formatDistanceKm,
  haversineDistanceKm,
} from '../utils/routeOptimization';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Compact selected place row for the route planner screen.
 */
export function SelectedPlaceCard({
  attraction,
  index,
  origin = null,
  originLabel = 'start',
  onRemove,
}) {
  const distanceLabel = useMemo(() => {
    if (
      !origin ||
      typeof origin.latitude !== 'number' ||
      typeof origin.longitude !== 'number'
    ) {
      return null;
    }

    return formatDistanceKm(haversineDistanceKm(origin, attraction));
  }, [origin, attraction]);

  return (
    <View style={styles.container}>
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{index}</Text>
      </View>
      <View style={styles.content}>
        <Text variant="titleSmall" style={styles.name} numberOfLines={2}>
          {attraction.name}
        </Text>
        {distanceLabel ? (
          <Text variant="bodySmall" style={styles.distance}>
            {distanceLabel} from {originLabel}
          </Text>
        ) : null}
        <Text variant="bodySmall" style={styles.coords}>
          {formatCoordinate(attraction.latitude)},{' '}
          {formatCoordinate(attraction.longitude)}
        </Text>
      </View>
      <IconButton
        icon="close-circle-outline"
        iconColor={colors.error}
        size={22}
        onPress={() => onRemove?.(attraction.id)}
        accessibilityLabel={`Remove ${attraction.name}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    marginBottom: spacing.sm,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  indexText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontWeight: '600',
  },
  distance: {
    color: colors.secondary,
    fontWeight: '700',
    marginTop: 2,
  },
  coords: {
    color: colors.textMuted,
    marginTop: 2,
  },
});
