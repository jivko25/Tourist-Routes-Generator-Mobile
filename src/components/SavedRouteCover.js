import React from 'react';
import { PlaceCover } from './PlaceCover';
import { usePlaceImage } from '../hooks/usePlaceImage';

/**
 * Saved-route thumbnail with Wikipedia/cover image fallback.
 */
export function SavedRouteCover({ place, cityName, height = 112, style }) {
  const { imageUrl, loading } = usePlaceImage(place, cityName);

  return (
    <PlaceCover
      place={place}
      imageUrl={imageUrl}
      loading={loading}
      height={height}
      style={style}
    />
  );
}
