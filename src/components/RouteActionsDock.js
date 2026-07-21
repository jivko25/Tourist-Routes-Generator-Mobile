import React, { useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme/colors';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Compact bottom dock for route actions.
 * Primary CTA stays visible; secondary actions expand on demand.
 */
export function RouteActionsDock({
  stopCount = 0,
  opening = false,
  sharing = false,
  optimizing = false,
  canOptimize = false,
  onOpenMaps,
  onShare,
  onSave,
  onOptimize,
  onClear,
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [stopCount]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((current) => !current);
  };

  const busy = opening || sharing || optimizing;

  return (
    <View style={styles.dock}>
      <Pressable
        onPress={toggleExpanded}
        style={styles.handleRow}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide route actions' : 'Show more route actions'}
      >
        <View style={styles.handle} />
        <View style={styles.handleMeta}>
          <Text style={styles.handleTitle}>
            {stopCount} stop{stopCount === 1 ? '' : 's'}
          </Text>
          <View style={styles.handleRight}>
            <Text style={styles.handleHint}>
              {expanded ? 'Hide' : 'More'}
            </Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={colors.textMuted}
            />
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={onOpenMaps}
        disabled={busy}
        style={[styles.primaryBtn, busy && styles.btnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Open in Google Maps"
      >
        {opening ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <MaterialCommunityIcons
            name="map-marker-path"
            size={20}
            color="#FFFFFF"
          />
        )}
        <Text style={styles.primaryBtnText}>Open in Google Maps</Text>
      </Pressable>

      <View style={styles.quickRow}>
        <QuickAction
          icon="share-variant"
          label="Share"
          onPress={onShare}
          loading={sharing}
          disabled={busy}
        />
        <QuickAction
          icon="bookmark-plus-outline"
          label="Save"
          onPress={onSave}
          disabled={busy}
          tone="success"
        />
        <QuickAction
          icon="sitemap"
          label="Optimize"
          onPress={onOptimize}
          loading={optimizing}
          disabled={busy || !canOptimize}
          tone="primary"
        />
      </View>

      {expanded ? (
        <View style={styles.expanded}>
          <Text style={styles.expandedHint}>
            {canOptimize
              ? 'Optimize can reorder stops for a shorter path.'
              : 'Stop order looks optimal for the current path.'}
          </Text>

          <Pressable
            onPress={onOptimize}
            disabled={busy || !canOptimize}
            style={[
              styles.secondaryBtn,
              styles.optimizeBtn,
              (!canOptimize || busy) && styles.btnDisabled,
            ]}
          >
            {optimizing ? (
              <ActivityIndicator color={colors.primaryDark} />
            ) : (
              <MaterialCommunityIcons
                name="sitemap"
                size={18}
                color={colors.primaryDark}
              />
            )}
            <Text style={styles.secondaryBtnText}>
              {canOptimize ? 'Optimize stop order' : 'Order looks optimal'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onClear}
            disabled={busy}
            style={[styles.secondaryBtn, styles.clearBtn, busy && styles.btnDisabled]}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={18}
              color={colors.error}
            />
            <Text style={[styles.secondaryBtnText, styles.clearText]}>
              Clear route
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  loading = false,
  disabled = false,
  tone = 'neutral',
}) {
  const iconColor =
    tone === 'success'
      ? colors.successDark
      : tone === 'primary'
        ? colors.primaryDark
        : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.quickAction, disabled && styles.btnDisabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.quickIconWrap,
          tone === 'success' && styles.quickIconSuccess,
          tone === 'primary' && styles.quickIconPrimary,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={iconColor} size="small" />
        ) : (
          <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
        )}
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dock: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 2,
    gap: spacing.xs,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 2,
  },
  handleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  handleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  handleTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
  },
  handleHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconSuccess: {
    backgroundColor: colors.successSoft,
  },
  quickIconPrimary: {
    backgroundColor: colors.primarySoft,
  },
  quickLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  expanded: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  expandedHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
  },
  optimizeBtn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  clearBtn: {
    backgroundColor: '#FFF1F2',
    borderColor: 'rgba(225, 29, 72, 0.28)',
  },
  secondaryBtnText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 14,
  },
  clearText: {
    color: colors.error,
  },
  btnDisabled: {
    opacity: 0.45,
  },
});
