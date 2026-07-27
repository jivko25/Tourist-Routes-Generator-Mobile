import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import {
  formatOpenStatusLabel,
  getOpenStatus,
  getOpenStatusColor,
} from '../utils/openingHours';
import {
  formatDistanceKm,
  haversineDistanceKm,
} from '../utils/routeOptimization';
import { formatPlaceVisitDuration } from '../utils/visitDuration';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Compact preview card when a map marker is selected.
 */
export function AttractionMapPreview({
  attraction,
  cityName,
  origin = null,
  selected = false,
  onClose,
  onToggle,
  onPressDetails,
}) {
  const openStatus = getOpenStatus(attraction);
  const openColor = getOpenStatusColor(openStatus);
  const visitLabel = formatPlaceVisitDuration(attraction);

  const distanceLabel = useMemo(() => {
    if (!origin || !attraction) return null;
    if (
      typeof origin.latitude !== 'number' ||
      typeof origin.longitude !== 'number'
    ) {
      return null;
    }
    return formatDistanceKm(haversineDistanceKm(origin, attraction));
  }, [origin, attraction]);

  if (!attraction) return null;

  return (
    <View style={styles.wrap} testID="attraction-map-preview">
      <View style={styles.handleRow}>
        <View style={styles.handle} />
        <Pressable onPress={onClose} hitSlop={12} testID="attraction-map-preview-close">
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {attraction.name}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {attraction.category || 'Tourist Attraction'}
        {cityName ? ` · ${cityName}` : ''}
      </Text>

      <View style={styles.pills}>
        {typeof attraction.rating === 'number' ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>★ {attraction.rating.toFixed(1)}</Text>
          </View>
        ) : null}
        {distanceLabel ? (
          <View style={[styles.pill, styles.pillBlue]}>
            <Text style={[styles.pillText, styles.pillBlueText]}>
              {distanceLabel}
            </Text>
          </View>
        ) : null}
        <View style={[styles.pill, styles.pillOrange]}>
          <Text style={[styles.pillText, styles.pillOrangeText]}>
            ~{visitLabel}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: `${openColor}22` }]}>
          <Text style={[styles.pillText, { color: openColor }]}>
            {formatOpenStatusLabel(openStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => onPressDetails?.(attraction)}
          textColor={colors.primary}
          style={styles.btn}
          labelStyle={styles.btnLabel}
          testID="attraction-map-preview-details"
        >
          Details
        </Button>
        <Button
          mode="contained"
          onPress={() => onToggle?.(attraction)}
          buttonColor={selected ? colors.success : colors.accent}
          textColor="#FFFFFF"
          style={styles.btn}
          labelStyle={styles.btnLabel}
          icon={selected ? 'check-circle' : 'plus'}
          testID="attraction-map-preview-toggle"
        >
          {selected ? 'Added' : 'Add'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    gap: spacing.sm,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  close: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillBlue: {
    backgroundColor: colors.primarySoft,
  },
  pillOrange: {
    backgroundColor: colors.accentSoft,
  },
  pillText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  pillBlueText: {
    color: colors.primaryDark,
  },
  pillOrangeText: {
    color: colors.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btn: {
    flex: 1,
    borderRadius: radii.pill,
  },
  btnLabel: {
    fontWeight: '700',
  },
});
