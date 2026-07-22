import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radii } from '../theme/colors';
import { getPlaceCoverPreset } from '../utils/placeCover';

/**
 * Place cover image. Prefers Wikipedia/cover URL; falls back to category gradient.
 * No vector icons here (avoids invalid-glyph Text node crashes).
 */
export function PlaceCover({
  place,
  imageUrl = null,
  loading = false,
  height = 180,
  style,
  children,
}) {
  const preset = getPlaceCoverPreset(place);
  const resolvedUrl =
    imageUrl ||
    place?.coverImageUrl ||
    place?.photos?.find((photo) => photo?.url)?.url ||
    null;
  const [failed, setFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    setFailed(false);
  }, [resolvedUrl]);

  const showPhoto = Boolean(resolvedUrl) && !failed;

  return (
    <View style={[{ height, borderRadius: radii.lg, overflow: 'hidden' }, style]}>
      {showPhoto ? (
        <Image
          key={`${resolvedUrl}-${retryToken}`}
          source={{ uri: resolvedUrl }}
          style={styles.photo}
          resizeMode="cover"
          onError={() => {
            // One silent retry helps with flaky CDN redirects.
            if (retryToken < 1) {
              setRetryToken(1);
              return;
            }
            setFailed(true);
          }}
        />
      ) : (
        <LinearGradient
          colors={preset.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <LinearGradient
        colors={
          showPhoto
            ? ['rgba(15,23,42,0.1)', 'rgba(15,23,42,0.55)']
            : ['rgba(15,23,42,0.05)', 'rgba(15,23,42,0.35)']
        }
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {loading && !showPhoto ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : null}

      <View style={styles.foreground} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foreground: {
    ...StyleSheet.absoluteFillObject,
  },
});
