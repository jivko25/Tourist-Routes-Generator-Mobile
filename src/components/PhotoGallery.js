import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Horizontal photo gallery with page indicators.
 */
export function PhotoGallery({
  photos = [],
  height = 220,
  width,
  emptyLabel = 'No photos available',
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!photos.length) {
    return (
      <View style={[styles.empty, { height, width }]}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="start"
        disableIntervalMomentum
        onScroll={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / Math.max(width, 1)
          );
          if (index !== activeIndex && index >= 0 && index < photos.length) {
            setActiveIndex(index);
          }
        }}
        scrollEventThrottle={16}
      >
        {photos.map((photo, index) => (
          <Image
            key={photo.name || String(index)}
            source={{ uri: photo.url }}
            style={{ width, height, borderRadius: radii.lg }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
      {photos.length > 1 ? (
        <View style={styles.dots}>
          {photos.map((photo, index) => (
            <View
              key={photo.name || index}
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      ) : null}
      <Text style={styles.counter}>
        {activeIndex + 1} / {photos.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textMuted,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 16,
  },
  counter: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: 12,
  },
});
