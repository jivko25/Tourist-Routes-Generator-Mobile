import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import {
  formatOpenStatusLabel,
  getOpenStatus,
  getOpenStatusColor,
} from '../utils/openingHours';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Shows open/closed status + weekday hours from Google Places.
 */
export function OpeningHoursSection({ place, loading = false }) {
  const status = getOpenStatus(place);
  const statusColor = getOpenStatusColor(status);
  const weekdayDescriptions = place?.weekdayDescriptions || [];

  if (loading) {
    return (
      <View style={styles.box}>
        <Text style={styles.muted}>Loading opening hours…</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <View style={[styles.badge, { backgroundColor: `${statusColor}22` }]}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <Text style={[styles.badgeText, { color: statusColor }]}>
          {formatOpenStatusLabel(status)}
        </Text>
      </View>

      {weekdayDescriptions.length > 0 ? (
        <View style={styles.list}>
          {weekdayDescriptions.map((line) => (
            <Text key={line} style={styles.line}>
              {line}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>
          No weekly schedule is available from Google for this place.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontWeight: '800',
    fontSize: 13,
  },
  list: {
    gap: 6,
  },
  line: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
