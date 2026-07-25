import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../theme/colors';

/**
 * Fullscreen swipeable photo viewer for attraction / album images.
 */
export function FullscreenPhotoModal({
  visible,
  photos = [],
  initialIndex = 0,
  onClose,
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const { width, height } = Dimensions.get('window');
  const [index, setIndex] = useState(initialIndex);

  const uris = (photos || [])
    .map((photo) => photo?.url || photo?.uri || null)
    .filter(Boolean);

  useEffect(() => {
    if (!visible) return;
    const next = Math.min(
      Math.max(0, initialIndex),
      Math.max(0, uris.length - 1)
    );
    setIndex(next);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex?.({ index: next, animated: false });
    });
  }, [visible, initialIndex, uris.length]);

  if (!uris.length) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <View
          style={[
            styles.topBar,
            { paddingTop: Math.max(insets.top, spacing.sm) },
          ]}
        >
          <Text style={styles.counter}>
            {index + 1} / {uris.length}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.dismiss')}
          >
            <Text style={styles.closeLabel}>✕</Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={uris}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex, uris.length - 1)}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          onMomentumScrollEnd={(event) => {
            const next = Math.round(
              event.nativeEvent.contentOffset.x / Math.max(width, 1)
            );
            if (next >= 0 && next < uris.length) setIndex(next);
          }}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item }) => (
            <Pressable
              style={{ width, height }}
              onPress={onClose}
              accessibilityRole="image"
            >
              <Image
                source={{ uri: item }}
                style={styles.image}
                resizeMode="contain"
              />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

/**
 * Thumbnail that resolves MediaLibrary asset id → display URI.
 */
export function AlbumPhotoThumb({
  photo,
  style,
  resolveUri,
  onPress,
  onLongPress,
}) {
  const [uri, setUri] = useState(photo?.uri || null);
  const [loading, setLoading] = useState(!photo?.uri && Boolean(photo?.assetId));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    if (!photo) {
      setUri(null);
      setLoading(false);
      return undefined;
    }

    if (!resolveUri) {
      setUri(photo.uri || null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    resolveUri(photo)
      .then((resolved) => {
        if (!cancelled) {
          setUri(resolved);
          setLoading(false);
          if (!resolved) setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUri(photo.uri || null);
          setLoading(false);
          if (!photo.uri) setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [photo?.id, photo?.assetId, photo?.uri, resolveUri]);

  return (
    <Pressable
      onPress={() => onPress?.(uri)}
      onLongPress={onLongPress}
      disabled={!uri && !onLongPress}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {loading ? (
        <View style={styles.thumbPlaceholder}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : uri && !failed ? (
        <Image
          source={{ uri }}
          style={styles.thumbImage}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={styles.thumbPlaceholder}>
          <Text style={styles.missing}>?</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  counter: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  closeLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  missing: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 18,
  },
  pressed: {
    opacity: 0.9,
  },
});
