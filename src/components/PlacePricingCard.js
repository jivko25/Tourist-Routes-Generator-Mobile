import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { getPricingDisplay } from '../utils/placePricing';
import { colors, spacing } from '../theme/colors';

/**
 * Google price-level summary only (no ticket / website CTAs).
 * Ticket booking is handled by GetYourGuideCard.
 */
export function PlacePricingCard({ place, loading = false }) {
  const pricing = getPricingDisplay(place);

  if (loading) {
    return (
      <View style={styles.box}>
        <Text style={styles.muted}>Checking prices…</Text>
      </View>
    );
  }

  if (!pricing) {
    return (
      <View style={styles.box}>
        <Text style={styles.muted}>
          No price level is available for this place.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <View style={styles.priceBlock}>
        <Text style={styles.title}>{pricing.title}</Text>
        <Text style={styles.primary}>{pricing.primary}</Text>
        {pricing.secondary ? (
          <Text style={styles.secondary}>{pricing.secondary}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.md,
  },
  priceBlock: {
    gap: spacing.xs,
  },
  title: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  primary: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 22,
  },
  secondary: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  muted: {
    color: colors.textMuted,
    lineHeight: 20,
    fontSize: 14,
  },
});
