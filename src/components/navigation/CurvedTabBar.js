import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';

/** Bar content height (excluding safe-area). */
export const CURVED_TAB_BAR_HEIGHT = 68;
export const CURVED_TAB_FAB_SIZE = 62;
const NOTCH_RADIUS = 38;
const NOTCH_DEPTH = 26;

/**
 * Peripheral slots around the AI FAB.
 * Explore | Saved | [AI] | Map | Settings
 */
const LEFT_SLOTS = [
  { key: 'HomeTab', labelKey: 'tabs.explore', icon: 'compass-outline', iconActive: 'compass' },
  { key: 'SavedTab', labelKey: 'tabs.saved', icon: 'bookmark-outline', iconActive: 'bookmark' },
];

const RIGHT_SLOTS = [
  { key: 'MapTab', labelKey: 'tabs.map', icon: 'earth', iconActive: 'earth' },
  {
    key: 'SettingsTab',
    labelKey: 'tabs.settings',
    icon: 'cog-outline',
    iconActive: 'cog',
  },
];

function buildBarPath(width, height, centerX) {
  const left = centerX - NOTCH_RADIUS - 10;
  const right = centerX + NOTCH_RADIUS + 10;
  const curve = NOTCH_DEPTH;

  return [
    `M 0 ${curve}`,
    `L ${left} ${curve}`,
    `C ${left + 14} ${curve} ${centerX - NOTCH_RADIUS} 0 ${centerX} 0`,
    `C ${centerX + NOTCH_RADIUS} 0 ${right - 14} ${curve} ${right} ${curve}`,
    `L ${width} ${curve}`,
    `L ${width} ${height}`,
    `L 0 ${height}`,
    'Z',
  ].join(' ');
}

function PeripheralButton({
  slot,
  route,
  isFocused,
  options,
  onPress,
  onLongPress,
  badge,
  label,
}) {
  if (!route) {
    return <View style={styles.slot} />;
  }

  const color = isFocused ? colors.primary : colors.textMuted;
  const iconName = isFocused ? slot.iconActive : slot.icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options?.tabBarAccessibilityLabel || label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.slot, pressed && styles.pressed]}
    >
      <View style={[styles.iconCircle, isFocused && styles.iconCircleActive]}>
        <MaterialCommunityIcons name={iconName} size={22} color={color} />
        {badge != null ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : String(badge)}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[styles.label, isFocused && styles.labelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function CurvedTabBar({ state, descriptors, navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottomInset = Math.max(insets.bottom, 8);
  const totalHeight = CURVED_TAB_BAR_HEIGHT + bottomInset + NOTCH_DEPTH;
  const centerX = width / 2;
  const path = useMemo(
    () => buildBarPath(width, totalHeight, centerX),
    [width, totalHeight, centerX]
  );

  const routeByName = useMemo(() => {
    const map = {};
    state.routes.forEach((route, index) => {
      map[route.name] = { route, index };
    });
    return map;
  }, [state.routes]);

  const chatMeta = routeByName.ChatTab;
  const chatFocused = chatMeta ? state.index === chatMeta.index : false;

  const renderPeripheral = (slot) => {
    const meta = routeByName[slot.key];
    const route = meta?.route;
    const index = meta?.index;
    const isFocused = index != null && state.index === index;
    const options = route ? descriptors[route.key]?.options : {};
    const badge = options?.tabBarBadge;

    return (
      <PeripheralButton
        key={slot.key}
        slot={slot}
        route={route}
        isFocused={isFocused}
        options={options}
        badge={badge}
        label={t(slot.labelKey)}
        onPress={() => {
          if (!route) return;
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }}
        onLongPress={() => {
          if (!route) return;
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        }}
      />
    );
  };

  return (
    <View style={[styles.wrapper, { height: totalHeight }]}>
      <View style={styles.shadowHost} pointerEvents="none">
        <Svg width={width} height={totalHeight} style={StyleSheet.absoluteFill}>
          <Path d={path} fill={colors.surface} />
        </Svg>
      </View>

      <View
        style={[
          styles.row,
          {
            height: CURVED_TAB_BAR_HEIGHT + bottomInset,
            marginTop: NOTCH_DEPTH,
            paddingBottom: Math.max(bottomInset - 2, 6),
          },
        ]}
      >
        <View style={styles.side}>{LEFT_SLOTS.map(renderPeripheral)}</View>

        <View style={styles.fabSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={chatFocused ? { selected: true } : {}}
            accessibilityLabel={t('tabs.ai')}
            onPress={() => {
              if (!chatMeta?.route) return;
              const event = navigation.emit({
                type: 'tabPress',
                target: chatMeta.route.key,
                canPreventDefault: true,
              });
              if (!chatFocused && !event.defaultPrevented) {
                navigation.navigate(chatMeta.route.name);
              }
            }}
            style={({ pressed }) => [
              styles.fab,
              chatFocused && styles.fabActive,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name={chatFocused ? 'robot' : 'robot-outline'}
              size={28}
              color="#FFFFFF"
            />
          </Pressable>
          <Text style={[styles.fabLabel, chatFocused && styles.labelActive]}>
            {t('tabs.ai')}
          </Text>
        </View>

        <View style={styles.side}>{RIGHT_SLOTS.map(renderPeripheral)}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  shadowHost: {
    ...StyleSheet.absoluteFillObject,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    minWidth: 64,
    maxWidth: 96,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.primary,
  },
  fabSlot: {
    width: 92,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fab: {
    width: CURVED_TAB_FAB_SIZE,
    height: CURVED_TAB_FAB_SIZE,
    borderRadius: CURVED_TAB_FAB_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -(CURVED_TAB_FAB_SIZE / 2 + 4),
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  fabActive: {
    backgroundColor: colors.primaryDark,
  },
  fabLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
});
