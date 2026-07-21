import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Compact banner when the device has no internet.
 */
export function OfflineBanner({
  message = 'You’re offline. Saved routes still work — new searches need internet.',
}) {
  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Offline mode</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    gap: 2,
  },
  title: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 13,
  },
  message: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
});
