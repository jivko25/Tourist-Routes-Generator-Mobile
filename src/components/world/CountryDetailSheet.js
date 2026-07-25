import React, { useMemo } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { CountrySilhouette } from './WorldMapSvg';
import { getApproxPathBounds } from '../../utils/svgPathBounds';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../../utils/worldCountries';
import { colors, radii, spacing } from '../../theme/colors';

function formatVisitDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function buildSheetTransform(d) {
  const bounds = d ? getApproxPathBounds(d) : null;
  if (!bounds) return undefined;

  const { minX, minY, width, height } = bounds;
  const cx = minX + width / 2;
  const cy = minY + height / 2;
  const scale = Math.min(
    (WORLD_WIDTH * 0.8) / width,
    (WORLD_HEIGHT * 0.8) / height
  );

  return `translate(${WORLD_WIDTH / 2} ${WORLD_HEIGHT / 2}) scale(${scale}) translate(${-cx} ${-cy})`;
}

export function CountryDetailSheet({
  country,
  visits = [],
  translateY,
  onClose,
  onMarkVisited,
  onClearCountry,
  isVisited,
}) {
  const transform = useMemo(
    () => (country?.d ? buildSheetTransform(country.d) : undefined),
    [country?.d]
  );

  if (!country) return null;

  const placeVisits = visits.filter((v) => v.placeName);
  const hasAny = visits.length > 0;

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{country.name || country.id}</Text>
          <Text style={styles.subtitle}>
            {isVisited
              ? `${visits.length} logged visit${visits.length === 1 ? '' : 's'}`
              : 'Not marked yet'}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeLabel}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.preview}>
        <CountrySilhouette d={country.d} transform={transform} />
      </View>

      {placeVisits.length > 0 ? (
        <FlatList
          data={placeVisits}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.visitRow}>
              <Text style={styles.visitPlace} numberOfLines={1}>
                {item.placeName}
              </Text>
              <Text style={styles.visitMeta}>
                {[item.cityName, formatVisitDate(item.visitedAt)]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          )}
        />
      ) : (
        <Text style={styles.empty}>
          {hasAny
            ? 'Country marked as visited. Place-level history will appear when you complete stops on a live route.'
            : 'No visits here yet. Mark the country, or complete a live route stop later to log places automatically.'}
        </Text>
      )}

      <View style={styles.actions}>
        {isVisited ? (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.pressed,
            ]}
            onPress={onClearCountry}
          >
            <Text style={styles.secondaryBtnText}>Clear visits</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
            onPress={onMarkVisited}
          >
            <Text style={styles.primaryBtnText}>Mark as visited</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 320,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 10,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textMuted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  closeLabel: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '700',
  },
  preview: {
    height: 88,
    marginBottom: spacing.sm,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  list: {
    flexGrow: 0,
    maxHeight: 96,
  },
  listContent: {
    paddingBottom: spacing.xs,
  },
  visitRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  visitPlace: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  visitMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  empty: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  actions: {
    marginTop: 'auto',
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.88,
  },
});
