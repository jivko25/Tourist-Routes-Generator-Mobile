import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import {
  getPricingDisplay,
  isTicketedPlace,
} from '../utils/placePricing';
import { colors, radii, spacing } from '../theme/colors';

function openUrl(url) {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

/**
 * Pricing / admission links: official site + Google Maps tickets when available.
 */
export function PlacePricingCard({ place, loading = false }) {
  const pricing = getPricingDisplay(place);
  const ticketed = isTicketedPlace(place);
  const mapsUri =
    place?.googleMapsLinks?.placeUri || place?.googleMapsUri || null;
  const websiteUri = place?.websiteUri || null;
  const hasLinks = Boolean(websiteUri || (mapsUri && ticketed));

  if (loading) {
    return (
      <View style={styles.box}>
        <Text style={styles.muted}>Checking prices…</Text>
      </View>
    );
  }

  if (!pricing && !hasLinks) {
    return (
      <View style={styles.box}>
        <Text style={styles.muted}>
          No ticket or website links are available for this place.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      {pricing ? (
        <View style={styles.priceBlock}>
          <Text style={styles.title}>{pricing.title}</Text>
          <Text style={styles.primary}>{pricing.primary}</Text>
          {pricing.secondary ? (
            <Text style={styles.secondary}>{pricing.secondary}</Text>
          ) : null}
        </View>
      ) : null}

      {hasLinks ? (
        <View style={styles.links}>
          {websiteUri ? (
            <Pressable
              style={styles.linkRow}
              onPress={() => openUrl(websiteUri)}
            >
              <View style={styles.linkCopy}>
                <Text style={styles.linkTitle} numberOfLines={1}>
                  {place?.name || 'Official site'}
                </Text>
                <View style={styles.badgeRow}>
                  <Text style={styles.badge}>Official site</Text>
                  <Text style={styles.linkHint}>Tickets & info</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ) : null}

          {mapsUri && ticketed ? (
            <Pressable
              style={styles.linkRow}
              onPress={() => openUrl(mapsUri)}
            >
              <View style={styles.linkCopy}>
                <Text style={styles.linkTitle}>Google Maps tickets</Text>
                <Text style={styles.linkHint}>
                  Compare Official, GetYourGuide, Klook and more
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
  links: {
    gap: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkCopy: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.sm,
  },
  linkTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '700',
  },
  linkHint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: '300',
  },
});
