import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useLiveTrip } from '../context/LiveTripContext';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Start / stop live trip tracking on the Route screen.
 */
export function LiveTripPanel() {
  const { t } = useTranslation();
  const {
    isActive,
    busy,
    error,
    nextStop,
    lastArrival,
    progressLabel,
    startTrip,
    stopTrip,
    openLastArrivalDetail,
    trip,
  } = useLiveTrip();

  const handleStart = async () => {
    try {
      const result = await startTrip();
      const bgNote = result?.backgroundGranted
        ? t('trip.bgOk')
        : t('trip.bgLimited');
      Alert.alert(t('trip.startedTitle'), `${t('trip.startedBody')}\n\n${bgNote}`);
    } catch (err) {
      Alert.alert(t('trip.startFailed'), err?.message || t('trip.tryAgain'));
    }
  };

  const handleStop = () => {
    Alert.alert(t('trip.stopTitle'), t('trip.stopBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('trip.stopConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await stopTrip();
          } catch (err) {
            Alert.alert(t('trip.stopFailed'), err?.message || t('trip.tryAgain'));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.wrap} testID="live-trip-panel">
      <Text style={styles.title}>{t('trip.title')}</Text>
      <Text style={styles.hint}>{t('trip.hint')}</Text>

      {isActive ? (
        <>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>
              {t('trip.activeBadge', { progress: progressLabel })}
            </Text>
          </View>
          {nextStop ? (
            <Text style={styles.next} testID="live-trip-next-stop">
              {t('trip.nextStop', { name: nextStop.name })}
            </Text>
          ) : (
            <Text style={styles.next}>{t('trip.complete')}</Text>
          )}
          {lastArrival ? (
            <Button
              mode="text"
              compact
              onPress={openLastArrivalDetail}
              textColor={colors.primaryDark}
              testID="live-trip-open-arrival"
            >
              {t('trip.openLastArrival', { name: lastArrival.stopName })}
            </Button>
          ) : null}
          {!trip?.backgroundGranted ? (
            <Text style={styles.warn}>{t('trip.bgLimited')}</Text>
          ) : null}
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {!isActive ? (
          <Button
            mode="contained"
            icon="play-circle"
            loading={busy}
            disabled={busy}
            onPress={handleStart}
            buttonColor={colors.success}
            textColor="#FFFFFF"
            style={styles.btn}
            testID="live-trip-start"
          >
            {t('trip.start')}
          </Button>
        ) : (
          <Button
            mode="outlined"
            icon="stop-circle"
            loading={busy}
            disabled={busy}
            onPress={handleStop}
            textColor={colors.error}
            style={styles.btn}
            testID="live-trip-stop"
          >
            {t('trip.stop')}
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  badgeText: {
    color: colors.successDark,
    fontWeight: '800',
    fontSize: 12,
  },
  next: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  warn: {
    color: colors.accent,
    fontSize: 12,
    lineHeight: 16,
  },
  error: {
    color: colors.error,
    fontSize: 13,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btn: {
    borderRadius: radii.pill,
  },
});
