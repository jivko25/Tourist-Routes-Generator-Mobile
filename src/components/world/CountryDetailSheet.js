import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CountrySilhouette } from './WorldMapSvg';
import { getApproxPathBounds } from '../../utils/svgPathBounds';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../../utils/worldCountries';
import { colors, radii, spacing } from '../../theme/colors';

function formatPopulation(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return String(value);
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
  translateY,
  onClose,
  onMarkVisited,
  onClearCountry,
  isVisited,
  cities = [],
  citiesLoading = false,
  citiesError = null,
  onRetryCities,
  onCityPress,
  openingCityName = null,
}) {
  const transform = useMemo(
    () => (country?.d ? buildSheetTransform(country.d) : undefined),
    [country?.d]
  );

  if (!country) return null;

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{country.name || country.id}</Text>
          <Text style={styles.subtitle}>
            {isVisited ? 'Visited · tap a city to explore' : 'Tap a city to explore'}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeLabel}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.preview}>
        <CountrySilhouette d={country.d} transform={transform} />
      </View>

      <View style={styles.citiesHeader}>
        <Text style={styles.citiesTitle}>Top cities</Text>
        {citiesLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : null}
      </View>

      {citiesError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{citiesError}</Text>
          {typeof onRetryCities === 'function' ? (
            <Pressable onPress={onRetryCities} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!citiesError && !citiesLoading && cities.length === 0 ? (
        <Text style={styles.empty}>No cities found for this country.</Text>
      ) : null}

      {!citiesError && cities.length > 0 ? (
        <FlatList
          data={cities}
          keyExtractor={(item) =>
            String(item.geonameId || `${item.name}-${item.latitude}`)
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const pop = formatPopulation(item.population);
            const busy = openingCityName === item.name;
            return (
              <Pressable
                disabled={Boolean(openingCityName)}
                onPress={() => onCityPress?.(item)}
                style={({ pressed }) => [
                  styles.cityRow,
                  pressed && styles.pressed,
                  busy && styles.cityRowBusy,
                ]}
              >
                <View style={styles.cityText}>
                  <Text style={styles.cityName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {pop ? (
                    <Text style={styles.cityMeta}>Pop. {pop}</Text>
                  ) : null}
                </View>
                {busy ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={colors.textMuted}
                  />
                )}
              </Pressable>
            );
          }}
        />
      ) : null}

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
    height: 420,
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
    height: 64,
    marginBottom: spacing.sm,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  citiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  citiesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  list: {
    flexGrow: 1,
    maxHeight: 180,
  },
  listContent: {
    paddingBottom: spacing.xs,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cityRowBusy: {
    opacity: 0.7,
  },
  cityText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  cityMeta: {
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
  errorBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: spacing.sm,
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
