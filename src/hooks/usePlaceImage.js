import { useEffect, useState } from 'react';
import { resolvePlaceImage } from '../services/wikiPhotoService';

/**
 * Resolves a free cover image for a place (Wikipedia), with cache.
 */
export function usePlaceImage(place, cityName = null) {
  const existing =
    (typeof place?.coverImageUrl === 'string' && place.coverImageUrl) ||
    place?.photos?.find((photo) => typeof photo?.url === 'string' && photo.url)
      ?.url ||
    null;

  const [imageUrl, setImageUrl] = useState(existing);
  const [loading, setLoading] = useState(!existing && Boolean(place?.name));

  useEffect(() => {
    if (existing) {
      setImageUrl(existing);
      setLoading(false);
      return undefined;
    }

    if (!place?.name) {
      setImageUrl(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    resolvePlaceImage(place, cityName)
      .then((url) => {
        if (!cancelled) {
          setImageUrl(url);
        }
      })
      .catch((error) => {
        console.warn('usePlaceImage failed:', place?.name, error?.message || error);
        if (!cancelled) setImageUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [place?.id, place?.name, cityName, existing]);

  return { imageUrl, loading };
}
