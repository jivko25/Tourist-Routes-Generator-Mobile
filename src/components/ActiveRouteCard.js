import React, { useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { GlassCard } from './GlassCard';
import { formatTravelModeLabel } from '../utils/config';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Home-screen summary for an in-progress route.
 */
export function ActiveRouteCard({
  selectedAttractions = [],
  searchedCity,
  settings,
  onContinue,
  onClear,
}) {
  const stopPreview = useMemo(() => {
    const names = selectedAttractions.slice(0, 3).map((item) => item.name);
    if (selectedAttractions.length > 3) {
      return `${names.join(' · ')} +${selectedAttractions.length - 3} more`;
    }
    return names.join(' · ');
  }, [selectedAttractions]);

  const handleClear = () => {
    Alert.alert(
      'Start a new route?',
      'This clears all selected places from the current itinerary.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & start new',
          style: 'destructive',
          onPress: onClear,
        },
      ]
    );
  };

  if (!selectedAttractions.length) return null;

  return (
    <GlassCard style={styles.card} contentStyle={styles.content}>
      <View style={styles.badge}>
        <View style={styles.badgeDot} />
        <Text style={styles.badgeText}>Route in progress</Text>
      </View>

      <Text style={styles.title}>
        {selectedAttractions.length} stop
        {selectedAttractions.length === 1 ? '' : 's'} ready
      </Text>

      <Text style={styles.preview} numberOfLines={2}>
        {stopPreview}
      </Text>

      <View style={styles.metaRow}>
        {searchedCity ? (
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText} numberOfLines={1}>
              {searchedCity}
            </Text>
          </View>
        ) : null}
        <View style={[styles.metaPill, styles.metaPillOrange]}>
          <Text style={[styles.metaPillText, styles.metaPillOrangeText]}>
            {formatTravelModeLabel(settings?.travelMode)}
          </Text>
        </View>
        {settings?.startAddress?.trim() ? (
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText} numberOfLines={1}>
              Start set
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={onContinue}
          buttonColor={colors.accent}
          textColor="#FFFFFF"
          style={styles.continueBtn}
          contentStyle={styles.actionContent}
          labelStyle={styles.actionLabel}
          icon="map-marker-path"
        >
          Continue route
        </Button>
        <Button
          mode="outlined"
          onPress={handleClear}
          textColor={colors.textMuted}
          style={styles.clearBtn}
          contentStyle={styles.actionContent}
          labelStyle={styles.actionLabel}
          icon="refresh"
        >
          Clear & new
        </Button>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  preview: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  metaPillOrange: {
    backgroundColor: colors.accentSoft,
  },
  metaPillText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
  metaPillOrangeText: {
    color: colors.accent,
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  continueBtn: {
    borderRadius: radii.pill,
  },
  clearBtn: {
    borderRadius: radii.pill,
    borderColor: colors.border,
  },
  actionContent: {
    paddingVertical: 4,
  },
  actionLabel: {
    fontWeight: '700',
  },
});
