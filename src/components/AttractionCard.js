import React, { useMemo, useRef } from 'react';
import {
  Animated,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from './GlassCard';
import {
  formatDistanceKm,
  haversineDistanceKm,
} from '../utils/routeOptimization';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Modern photo card with glass overlay and clear selected state.
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
  const coverPhoto = attraction.photos?.[0]?.url;

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

  const handleToggle = () => {
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
        <ImageBackground
          source={coverPhoto ? { uri: coverPhoto } : undefined}
          style={styles.image}
          imageStyle={styles.imageInner}
        >
          {!coverPhoto ? <View style={styles.imageFallback} /> : null}
          <LinearGradient
            colors={
              selected
                ? ['rgba(22,163,74,0.28)', 'rgba(15,23,42,0.55)']
                : ['transparent', 'rgba(15,23,42,0.4)']
            }
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.topRow}>
            <View style={styles.topLeft}>
              {typeof attraction.rating === 'number' ? (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>
                    ★ {attraction.rating.toFixed(1)}
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
            </View>

            {selected ? (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>✓ Added</Text>
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
        </ImageBackground>
      </Pressable>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => onPressDetails?.(attraction)}
          textColor={colors.primary}
          style={styles.secondaryBtn}
          labelStyle={styles.actionLabel}
        >
          Details
        </Button>
        <Button
          mode="contained"
          onPress={handleToggle}
          buttonColor={selected ? colors.success : colors.accent}
          textColor="#FFFFFF"
          style={[styles.primaryBtn, selected && styles.primaryBtnSelected]}
          labelStyle={styles.actionLabel}
          icon={selected ? 'check-circle' : 'plus'}
        >
          {selected ? 'Added' : 'Add'}
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
  image: {
    height: 240,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  imageInner: {
    borderRadius: radii.lg - 2,
  },
  imageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#C7D7EE',
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
