import React, { useState } from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Horizontal photo gallery with page indicators + Pexels attribution.
 */
export function PhotoGallery({
  photos = [],
  height = 220,
  width: widthProp,
  emptyLabel = 'No photos available',
  showAttribution = true,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const width = widthProp || windowWidth - spacing.lg * 2;
  const [activeIndex, setActiveIndex] = useState(0);

  if (!photos.length) {
    return (
      <View style={[styles.empty, { height, width }]}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  const active = photos[activeIndex] || photos[0];

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
      {showAttribution ? (
        <Text style={styles.credit}>
          {active?.photographer ? (
            <>
              Photo by{' '}
              <Text
                style={styles.creditLink}
                onPress={() => {
                  const url =
                    active.photographerUrl ||
                    active.pexelsUrl ||
                    'https://www.pexels.com';
                  Linking.openURL(url).catch(() => {});
                }}
              >
                {active.photographer}
              </Text>
              {' on '}
            </>
          ) : (
            'Photos provided by '
          )}
          <Text
            style={styles.creditLink}
            onPress={() =>
              Linking.openURL(
                active?.pexelsUrl || 'https://www.pexels.com'
              ).catch(() => {})
            }
          >
            Pexels
          </Text>
        </Text>
      ) : null}
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
  credit: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: 11,
  },
  creditLink: {
    color: colors.primaryDark,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
