import { useEffect, useState } from 'react';
import { resolvePlacePhotos } from '../services/pexelsPhotoService';

/**
 * Resolves Pexels cover + gallery photos for a place (with cache).
 *
 * @returns {{ imageUrl: string|null, photos: import('../types/attraction').AttractionPhoto[], loading: boolean }}
 */
export function usePlaceImage(place, cityName = null) {
  const existingPhotos = Array.isArray(place?.photos)
    ? place.photos.filter((photo) => typeof photo?.url === 'string' && photo.url)
    : [];
  const existingCover =
    (typeof place?.coverImageUrl === 'string' && place.coverImageUrl) ||
    existingPhotos[0]?.url ||
    null;

  const [photos, setPhotos] = useState(existingPhotos);
  const [imageUrl, setImageUrl] = useState(existingCover);
  const [loading, setLoading] = useState(
    existingPhotos.length < 2 && Boolean(place?.name)
  );

  useEffect(() => {
    if (existingPhotos.length >= 2) {
      setPhotos(existingPhotos);
      setImageUrl(existingCover);
      setLoading(false);
      return undefined;
    }

    if (!place?.name) {
      setPhotos([]);
      setImageUrl(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    resolvePlacePhotos(place, cityName)
      .then((resolved) => {
        if (cancelled) return;
        const next = resolved?.length ? resolved : existingPhotos;
        setPhotos(next);
        setImageUrl(next[0]?.url || existingCover || null);
      })
      .catch((error) => {
        console.warn('usePlaceImage failed:', place?.name, error?.message || error);
        if (!cancelled) {
          setPhotos(existingPhotos);
          setImageUrl(existingCover);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [place?.id, place?.name, cityName, existingCover, existingPhotos.length]);

  return { imageUrl, photos, loading };
}
