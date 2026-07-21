import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
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
        <Text style={styles.name} numberOfLines={2}>
          {attraction.name}
        </Text>
        {distanceLabel ? (
          <Text style={styles.distance}>
            {distanceLabel} from {originLabel}
          </Text>
        ) : null}
      </View>
      <IconButton
        icon="close"
        iconColor={colors.accent}
        size={18}
        style={styles.close}
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
    backgroundColor: colors.successSoft,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.success,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    marginBottom: spacing.sm,
  },
  indexBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.success,
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
    fontWeight: '700',
    fontSize: 15,
  },
  distance: {
    color: colors.successDark,
    fontWeight: '600',
    marginTop: 2,
    fontSize: 12,
  },
  close: {
    backgroundColor: '#FFFFFF',
  },
});
