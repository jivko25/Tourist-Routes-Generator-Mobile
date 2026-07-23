import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { getGetYourGuideActivityLinks } from '../services/getYourGuideService';
import { getGetYourGuidePartnerId } from '../utils/config';
import { colors, radii, spacing } from '../theme/colors';

function openUrl(url) {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

/**
 * Affiliate activity links for a place (GetYourGuide).
 * Deep-links to GYG search for this attraction — no price scraping.
 */
export function GetYourGuideCard({ place, cityName = null }) {
  const links = getGetYourGuideActivityLinks(place, cityName);
  const hasPartnerId = Boolean(getGetYourGuidePartnerId());

  if (!links.length) {
    return (
      <View style={styles.box}>
        <Text style={styles.muted}>
          No GetYourGuide activities are available for this place yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.disclosure}>
        Partner links · opens GetYourGuide. We may earn a commission if you
        book.
        {!hasPartnerId
          ? ' Add GETYOURGUIDE_PARTNER_ID to enable tracking.'
          : ''}
      </Text>

      <View style={styles.links}>
        {links.map((link) => (
          <Pressable
            key={link.id}
            style={({ pressed }) => [
              styles.linkRow,
              pressed && styles.linkRowPressed,
            ]}
            onPress={() => openUrl(link.url)}
          >
            <View style={styles.linkCopy}>
              <View style={styles.badgeRow}>
                <Text style={styles.badge}>GetYourGuide</Text>
              </View>
              <Text style={styles.linkTitle} numberOfLines={1}>
                {link.title}
              </Text>
              <Text style={styles.linkHint} numberOfLines={2}>
                {link.subtitle}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.md,
  },
  disclosure: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
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
  linkRowPressed: {
    opacity: 0.85,
  },
  linkCopy: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    overflow: 'hidden',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '700',
  },
  linkTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  linkHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: '300',
  },
  muted: {
    color: colors.textMuted,
    lineHeight: 20,
    fontSize: 14,
  },
});
