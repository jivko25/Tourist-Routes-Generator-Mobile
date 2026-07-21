import React, { useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { formatCoordinate } from '../utils/googleMaps';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Card for a single attraction with preview photo, short description,
 * details navigation and select / deselect action.
 */
export function AttractionCard({
  attraction,
  cityName,
  selected = false,
  onToggle,
  onPressDetails,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const coverPhoto = attraction.photos?.[0]?.url;
  const shortDescription = attraction.description
    ? attraction.description.length > 110
      ? `${attraction.description.slice(0, 110).trim()}…`
      : attraction.description
    : 'No description available yet. Open details to see more.';

  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.97,
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
    <Animated.View style={{ transform: [{ scale }] }}>
      <Card
        style={[styles.card, selected && styles.cardSelected]}
        mode="elevated"
      >
        <Pressable onPress={() => onPressDetails?.(attraction)}>
          {coverPhoto ? (
            <Image source={{ uri: coverPhoto }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Text style={styles.coverPlaceholderText}>No photo</Text>
            </View>
          )}
          <Card.Content style={styles.content}>
            <View style={styles.titleRow}>
              <Text variant="titleMedium" style={styles.name} numberOfLines={2}>
                {attraction.name}
              </Text>
              {typeof attraction.rating === 'number' ? (
                <Text style={styles.rating}>★ {attraction.rating.toFixed(1)}</Text>
              ) : null}
            </View>
            <Text variant="bodyMedium" style={styles.meta}>
              {attraction.category || 'Tourist Attraction'}
            </Text>
            {cityName ? (
              <Text variant="bodySmall" style={styles.city}>
                {cityName}
              </Text>
            ) : null}
            <Text variant="bodyMedium" style={styles.description} numberOfLines={3}>
              {shortDescription}
            </Text>
            <Text variant="bodySmall" style={styles.coords}>
              {formatCoordinate(attraction.latitude)},{' '}
              {formatCoordinate(attraction.longitude)}
            </Text>
          </Card.Content>
        </Pressable>
        <Card.Actions style={styles.actions}>
          <Button
            mode="text"
            onPress={() => onPressDetails?.(attraction)}
            textColor={colors.primary}
          >
            Details
          </Button>
          <Button
            mode={selected ? 'outlined' : 'contained'}
            onPress={handleToggle}
            buttonColor={selected ? undefined : colors.primary}
            textColor={selected ? colors.primary : '#FFFFFF'}
            style={styles.action}
          >
            {selected ? 'Remove' : 'Add'}
          </Button>
        </Card.Actions>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.secondarySoft,
  },
  cover: {
    width: '100%',
    height: 160,
    backgroundColor: colors.surfaceMuted,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    color: colors.textMuted,
  },
  content: {
    paddingTop: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
  },
  rating: {
    color: colors.secondary,
    fontWeight: '700',
    marginTop: 2,
  },
  meta: {
    color: colors.primaryLight,
    marginTop: spacing.xs,
  },
  city: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  description: {
    color: colors.text,
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  coords: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    justifyContent: 'space-between',
  },
  action: {
    borderRadius: radii.sm,
  },
});
