import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radii } from '../theme/colors';

/**
 * Frosted glass panel — falls back to translucent surface when blur is unavailable.
 */
export function GlassCard({
  children,
  style,
  contentStyle,
  intensity = 35,
  tint = 'light',
  dark = false,
}) {
  const borderColor = dark ? 'rgba(255,255,255,0.22)' : colors.glassBorder;
  const fallbackBg = dark ? colors.glassDark : colors.glass;

  if (Platform.OS === 'android') {
    // Android blur support varies; keep a soft translucent glass look.
    return (
      <View
        style={[
          styles.base,
          { backgroundColor: fallbackBg, borderColor },
          style,
        ]}
      >
        <View style={contentStyle}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.base, { borderColor }, style]}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.28)' },
        ]}
      />
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
  },
});
