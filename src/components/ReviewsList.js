import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Google Maps-style review list for a place.
 */
export function ReviewsList({
  reviews = [],
  rating = null,
  userRatingCount = null,
  loading = false,
}) {
  if (loading) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>Loading Google reviews…</Text>
      </View>
    );
  }

  if (!reviews.length) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>
          No Google reviews are available for this place yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {(typeof rating === 'number' || typeof userRatingCount === 'number') && (
        <View style={styles.summary}>
          {typeof rating === 'number' ? (
            <Text style={styles.summaryRating}>★ {rating.toFixed(1)}</Text>
          ) : null}
          {typeof userRatingCount === 'number' ? (
            <Text style={styles.summaryCount}>
              {userRatingCount.toLocaleString()} Google review
              {userRatingCount === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>
      )}

      {reviews.map((review) => (
        <View key={review.id} style={styles.card}>
          <View style={styles.header}>
            {review.authorPhotoUrl ? (
              <Image
                source={{ uri: review.authorPhotoUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>
                  {(review.authorName || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.headerCopy}>
              <Text style={styles.author} numberOfLines={1}>
                {review.authorName}
              </Text>
              <View style={styles.metaRow}>
                {typeof review.rating === 'number' ? (
                  <Text style={styles.stars}>
                    {'★'.repeat(Math.round(review.rating))}
                    {'☆'.repeat(Math.max(0, 5 - Math.round(review.rating)))}
                  </Text>
                ) : null}
                {review.relativeTime ? (
                  <Text style={styles.time}>{review.relativeTime}</Text>
                ) : null}
              </View>
            </View>
          </View>
          {review.text ? (
            <Text style={styles.text}>{review.text}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  summaryRating: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
  },
  summaryCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.chip,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  author: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stars: {
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 1,
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
  },
  text: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  emptyBox: {
    paddingVertical: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    lineHeight: 20,
  },
});
