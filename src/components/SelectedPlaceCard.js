import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import {
  formatDistanceKm,
  haversineDistanceKm,
} from '../utils/routeOptimization';
import { formatPlaceVisitDuration } from '../utils/visitDuration';
import {
  formatOpenStatusLabel,
  getOpenStatus,
  getOpenStatusColor,
} from '../utils/openingHours';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Compact selected place row for the route planner screen.
 */
export function SelectedPlaceCard({
  attraction,
  index,
  isStart = false,
  isEnd = false,
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

  const visitLabel = useMemo(
    () => formatPlaceVisitDuration(attraction),
    [attraction]
  );

  const openStatus = getOpenStatus(attraction);
  const openColor = getOpenStatusColor(openStatus);

  return (
    <View
      style={[
        styles.container,
        isStart && styles.containerStart,
        isEnd && !isStart && styles.containerEnd,
      ]}
    >
      <View
        style={[
          styles.indexBadge,
          isStart && styles.indexStart,
          isEnd && !isStart && styles.indexEnd,
        ]}
      >
        <Text style={styles.indexText}>{index}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={2}>
            {attraction.name}
          </Text>
          {isStart ? (
            <Text style={[styles.roleBadge, styles.roleStart]}>START</Text>
          ) : null}
          {isEnd ? (
            <Text style={[styles.roleBadge, styles.roleEnd]}>END</Text>
          ) : null}
        </View>
        <Text style={styles.meta}>
          ~{visitLabel}
          {distanceLabel ? ` · ${distanceLabel} from ${originLabel}` : ''}
        </Text>
        <View
          style={[styles.openBadge, { backgroundColor: `${openColor}22` }]}
        >
          <View style={[styles.openDot, { backgroundColor: openColor }]} />
          <Text style={[styles.openText, { color: openColor }]}>
            {formatOpenStatusLabel(openStatus)}
          </Text>
        </View>
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
  containerStart: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  containerEnd: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
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
  indexStart: {
    backgroundColor: colors.primary,
  },
  indexEnd: {
    backgroundColor: colors.accent,
  },
  indexText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    overflow: 'hidden',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleStart: {
    color: colors.primaryDark,
    backgroundColor: '#FFFFFF',
  },
  roleEnd: {
    color: colors.accent,
    backgroundColor: '#FFFFFF',
  },
  meta: {
    color: colors.successDark,
    fontWeight: '600',
    marginTop: 2,
    fontSize: 12,
  },
  openBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  openText: {
    fontWeight: '800',
    fontSize: 11,
  },
  close: {
    backgroundColor: '#FFFFFF',
  },
});
