import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { getPricingDisplay } from '../utils/placePricing';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Shows Google price level / price range when available.
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
          No ticket or price information is available from Google for this place.
        </Text>
        {place?.websiteUri ? (
          <Pressable onPress={() => Linking.openURL(place.websiteUri)}>
            <Text style={styles.link}>Check official website</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{pricing.title}</Text>
      <Text style={styles.primary}>{pricing.primary}</Text>
      {pricing.secondary ? (
        <Text style={styles.secondary}>{pricing.secondary}</Text>
      ) : null}
      {place?.websiteUri ? (
        <Pressable
          onPress={() => Linking.openURL(place.websiteUri)}
          style={styles.linkWrap}
        >
          <Text style={styles.link}>Official website / tickets</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
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
  },
  linkWrap: {
    marginTop: spacing.sm,
  },
  link: {
    color: colors.primaryDark,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
});
