import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
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
  isCityVisited,
  placeVisits = [],
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
            {isVisited
              ? `${placeVisits.length} place${placeVisits.length === 1 ? '' : 's'} logged · tap a city`
              : 'Tap a city to explore'}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeLabel}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.preview}>
        <CountrySilhouette d={country.d} transform={transform} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {placeVisits.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Places you’ve been</Text>
            {placeVisits.map((visit) => (
              <View key={visit.id} style={styles.placeRow}>
                <View style={styles.placeIcon}>
                  <MaterialCommunityIcons
                    name="map-marker-check"
                    size={18}
                    color={colors.success}
                  />
                </View>
                <View style={styles.placeText}>
                  <Text style={styles.placeName} numberOfLines={1}>
                    {visit.placeName}
                  </Text>
                  <Text style={styles.placeMeta} numberOfLines={1}>
                    {[visit.cityName, formatVisitDate(visit.visitedAt)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.citiesHeader}>
          <Text style={styles.sectionTitle}>Top cities</Text>
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

        {!citiesError &&
          cities.map((item) => {
            const pop = formatPopulation(item.population);
            const busy = openingCityName === item.name;
            const visited =
              typeof isCityVisited === 'function'
                ? isCityVisited(item.name)
                : false;

            return (
              <Pressable
                key={String(item.geonameId || `${item.name}-${item.latitude}`)}
                disabled={Boolean(openingCityName)}
                onPress={() => onCityPress?.(item)}
                style={({ pressed }) => [
                  styles.cityRow,
                  pressed && styles.pressed,
                  busy && styles.cityRowBusy,
                ]}
              >
                <View style={styles.cityText}>
                  <View style={styles.cityNameRow}>
                    <Text style={styles.cityName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {visited ? (
                      <View style={styles.visitedBadge}>
                        <Text style={styles.visitedBadgeText}>Visited</Text>
                      </View>
                    ) : null}
                  </View>
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
          })}
      </ScrollView>

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
    height: 460,
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
    height: 56,
    marginBottom: spacing.sm,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: spacing.sm,
  },
  section: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  citiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  placeIcon: {
    width: 28,
    alignItems: 'center',
  },
  placeText: {
    flex: 1,
  },
  placeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  placeMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
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
  cityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  visitedBadge: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  visitedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.successDark,
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
