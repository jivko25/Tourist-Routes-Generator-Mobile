import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { GlassCard } from './GlassCard';
import { PlaceCover } from './PlaceCover';
import { usePlaceImage } from '../hooks/usePlaceImage';
import {
  formatDistanceKm,
  haversineDistanceKm,
} from '../utils/routeOptimization';
import { formatPlaceVisitDuration } from '../utils/visitDuration';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Place card with Wikipedia/cover image when available.
 */
export function AttractionCard({
  attraction,
  cityName,
  origin = null,
  selected = false,
  onToggle,
  onPressDetails,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [toggling, setToggling] = useState(false);
  const { imageUrl, loading: imageLoading } = usePlaceImage(
    attraction,
    cityName
  );

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

  useEffect(() => {
    setToggling(false);
  }, [selected]);

  useEffect(() => {
    if (!toggling) return undefined;
    const timeout = setTimeout(() => setToggling(false), 1200);
    return () => clearTimeout(timeout);
  }, [toggling]);

  const handleToggle = () => {
    if (toggling) return;

    setToggling(true);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.98,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
    onToggle?.(attraction);
  };

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => onPressDetails?.(attraction)}
        style={[styles.card, selected && styles.cardSelected]}
      >
        <PlaceCover
          place={attraction}
          imageUrl={imageUrl}
          loading={imageLoading}
          height={188}
          style={styles.cover}
        >
          <View style={styles.coverBody}>
            <View style={styles.topRow}>
              <View style={styles.topLeft}>
                {typeof attraction.rating === 'number' ? (
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>
                      {attraction.rating.toFixed(1)}
                    </Text>
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
              </View>

              {selected ? (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>Added</Text>
                </View>
              ) : null}
            </View>

            <GlassCard
              dark
              intensity={28}
              tint="dark"
              style={styles.glass}
              contentStyle={styles.glassContent}
            >
              <Text style={styles.name} numberOfLines={2}>
                {attraction.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {attraction.category || 'Tourist Attraction'}
                {cityName ? ` · ${cityName}` : ''}
              </Text>
              {attraction.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {attraction.description}
                </Text>
              ) : null}
            </GlassCard>
          </View>
        </PlaceCover>
      </Pressable>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => onPressDetails?.(attraction)}
          textColor={colors.primary}
          style={styles.secondaryBtn}
          labelStyle={styles.actionLabel}
          disabled={toggling}
        >
          Details
        </Button>
        <Button
          mode="contained"
          onPress={handleToggle}
          loading={toggling}
          disabled={toggling}
          buttonColor={selected ? colors.success : colors.accent}
          textColor="#FFFFFF"
          style={[styles.primaryBtn, selected && styles.primaryBtnSelected]}
          labelStyle={styles.actionLabel}
          icon={toggling ? undefined : selected ? 'check-circle' : 'plus'}
        >
          {toggling ? 'Updating...' : selected ? 'Added' : 'Add'}
        </Button>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.selectedBorder,
    shadowColor: colors.success,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  cover: {
    borderRadius: radii.lg - 2,
  },
  coverBody: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  topLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    flex: 1,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillBlue: {
    backgroundColor: colors.primarySoft,
  },
  pillText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  pillBlueText: {
    color: colors.primaryDark,
  },
  pillOrange: {
    backgroundColor: colors.accentSoft,
  },
  pillOrangeText: {
    color: colors.accent,
  },
  selectedBadge: {
    backgroundColor: colors.success,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  glass: {
    borderRadius: radii.md,
  },
  glassContent: {
    padding: spacing.md,
    gap: 4,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  meta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: radii.pill,
    borderColor: colors.primary,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: radii.pill,
  },
  primaryBtnSelected: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  actionLabel: {
    fontWeight: '700',
  },
});
