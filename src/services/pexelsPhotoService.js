/**
 * Place cover + gallery images via Pexels API (free, multi-photo).
 * Attribution: show "Photos by Pexels" / photographer credit in UI.
 *
 * Photo search queries are ALWAYS English — Pexels matches EN much better
 * than localized (e.g. BG) Google Places display names.
 *
 * GET https://api.pexels.com/v1/search?query=...
 * Header: Authorization: <PEXELS_API_KEY>
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPexelsApiKey } from '../utils/config';
import { geocodeCity } from './geocodingService';
import { fetchPlaceDetails } from './placesService';

const CACHE_KEY = '@travel/pexels_photo_cache_v2';
const EN_LABEL_CACHE_KEY = '@travel/pexels_en_labels_v1';
const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search';
/** Photos per place for list + detail gallery */
export const PEXELS_PHOTOS_PER_PLACE = 5;

const memoryCache = new Map();
const englishLabelMemory = new Map();
let diskReady = null;
let diskCache = {};
let enLabelDiskReady = null;
let enLabelDisk = {};
const inflight = new Map();
const enLabelInflight = new Map();

function hasNonLatinScript(text) {
  return /[^\u0000-\u024F\u1E00-\u1EFF]/.test(String(text || ''));
}

function cacheKey(place, cityName) {
  const id = place?.googlePlaceId || place?.id;
  if (id) return `id:${String(id)}`;
  const city = (cityName || '').split(',')[0].trim().toLowerCase();
  const name = (place?.name || '').trim().toLowerCase();
  if (name) return `name:${name}|${city}`;
  if (
    typeof place?.latitude === 'number' &&
    typeof place?.longitude === 'number'
  ) {
    return `geo:${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;
  }
  return `empty:${city}`;
}

async function getDiskCache() {
  if (!diskReady) {
    diskReady = AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        try {
          diskCache = raw ? JSON.parse(raw) || {} : {};
        } catch {
          diskCache = {};
        }
        return diskCache;
      })
      .catch(() => {
        diskCache = {};
        return diskCache;
      });
  }
  return diskReady;
}

async function getEnLabelDisk() {
  if (!enLabelDiskReady) {
    enLabelDiskReady = AsyncStorage.getItem(EN_LABEL_CACHE_KEY)
      .then((raw) => {
        try {
          enLabelDisk = raw ? JSON.parse(raw) || {} : {};
        } catch {
          enLabelDisk = {};
        }
        return enLabelDisk;
      })
      .catch(() => {
        enLabelDisk = {};
        return enLabelDisk;
      });
  }
  return enLabelDiskReady;
}

/**
 * @param {string} key
 * @param {import('../types/attraction').AttractionPhoto[]} photos
 */
async function savePhotos(key, photos) {
  if (!photos?.length) return;
  const cache = await getDiskCache();
  cache[key] = photos;
  const entries = Object.entries(cache);
  diskCache =
    entries.length > 600
      ? Object.fromEntries(entries.slice(-400))
      : { ...cache };
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(diskCache)).catch(() => {});
}

async function saveEnglishLabel(key, label) {
  if (!key || !label) return;
  englishLabelMemory.set(key, label);
  const cache = await getEnLabelDisk();
  cache[key] = label;
  enLabelDisk = { ...cache };
  AsyncStorage.setItem(EN_LABEL_CACHE_KEY, JSON.stringify(enLabelDisk)).catch(
    () => {}
  );
}

/**
 * Resolve an English place name for Pexels (UI name may be localized).
 */
async function resolveEnglishPlaceName(place) {
  const fallback = place?.name?.trim() || '';
  const placeId = place?.googlePlaceId || place?.id;
  if (!placeId) return fallback;
  if (!hasNonLatinScript(fallback)) return fallback;

  const key = `place:${placeId}`;
  if (englishLabelMemory.has(key)) return englishLabelMemory.get(key);

  if (enLabelInflight.has(key)) return enLabelInflight.get(key);

  const task = (async () => {
    try {
      const disk = await getEnLabelDisk();
      if (typeof disk[key] === 'string' && disk[key]) {
        englishLabelMemory.set(key, disk[key]);
        return disk[key];
      }

      const details = await fetchPlaceDetails(placeId, { languageCode: 'en' });
      const englishName = details?.name?.trim() || fallback;
      await saveEnglishLabel(key, englishName);
      return englishName;
    } catch (error) {
      console.warn(
        'English place label lookup failed:',
        placeId,
        error?.message || error
      );
      return fallback;
    } finally {
      enLabelInflight.delete(key);
    }
  })();

  enLabelInflight.set(key, task);
  return task;
}

/**
 * Resolve an English city label for Pexels.
 */
async function resolveEnglishCityName(cityName) {
  const raw = cityName?.split(',')?.[0]?.trim() || '';
  if (!raw) return '';
  if (!hasNonLatinScript(raw)) return raw;

  const key = `city:${raw.toLowerCase()}`;
  if (englishLabelMemory.has(key)) return englishLabelMemory.get(key);
  if (enLabelInflight.has(key)) return enLabelInflight.get(key);

  const task = (async () => {
    try {
      const disk = await getEnLabelDisk();
      if (typeof disk[key] === 'string' && disk[key]) {
        englishLabelMemory.set(key, disk[key]);
        return disk[key];
      }

      const city = await geocodeCity(raw, { language: 'en' });
      const englishCity = city?.name?.split(',')?.[0]?.trim() || raw;
      await saveEnglishLabel(key, englishCity);
      return englishCity;
    } catch (error) {
      console.warn(
        'English city label lookup failed:',
        raw,
        error?.message || error
      );
      return raw;
    } finally {
      enLabelInflight.delete(key);
    }
  })();

  enLabelInflight.set(key, task);
  return task;
}

function buildSearchQuery(placeName, cityLabel) {
  const name = placeName?.trim() || '';
  const city = cityLabel?.trim() || '';
  if (name && city) return `${name} ${city}`;
  if (name) return name;
  return city || 'travel landmark';
}

/**
 * Map Pexels photo objects → AttractionPhoto[].
 *
 * @param {Array} pexelsPhotos
 * @returns {import('../types/attraction').AttractionPhoto[]}
 */
function mapPexelsPhotos(pexelsPhotos = []) {
  return pexelsPhotos
    .map((photo) => {
      const url =
        photo?.src?.large ||
        photo?.src?.medium ||
        photo?.src?.landscape ||
        photo?.src?.original ||
        null;
      if (!url) return null;
      return {
        name: `pexels:${photo.id}`,
        url,
        widthPx: photo.width,
        heightPx: photo.height,
        photographer: photo.photographer || null,
        photographerUrl: photo.photographer_url || null,
        pexelsUrl: photo.url || null,
      };
    })
    .filter(Boolean);
}

/**
 * Search Pexels for place photos.
 *
 * @param {string} query
 * @param {number} [perPage]
 * @returns {Promise<import('../types/attraction').AttractionPhoto[]>}
 */
async function searchPexelsPhotos(query, perPage = PEXELS_PHOTOS_PER_PLACE) {
  const apiKey = getPexelsApiKey();
  const response = await axios.get(PEXELS_SEARCH_URL, {
    timeout: 20000,
    headers: {
      Authorization: apiKey,
      Accept: 'application/json',
    },
    params: {
      query,
      per_page: Math.min(Math.max(perPage, 1), 15),
      orientation: 'landscape',
      locale: 'en-US',
    },
  });

  return mapPexelsPhotos(response.data?.photos || []);
}

/**
 * Resolve multiple Pexels photos for a place (cached).
 *
 * @param {{ name?: string, latitude?: number, longitude?: number, id?: string, googlePlaceId?: string }} place
 * @param {string|null} [cityName]
 * @param {{ perPage?: number }} [options]
 * @returns {Promise<import('../types/attraction').AttractionPhoto[]>}
 */
export async function resolvePlacePhotos(place, cityName = null, options = {}) {
  const name = place?.name?.trim();
  if (!name && !cityName) return [];

  const key = cacheKey(place, cityName);
  if (memoryCache.has(key)) {
    return memoryCache.get(key) || [];
  }
  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const perPage = options.perPage ?? PEXELS_PHOTOS_PER_PLACE;

  const task = (async () => {
    try {
      const disk = await getDiskCache();
      const cached = disk[key];
      if (Array.isArray(cached) && cached.length > 0) {
        memoryCache.set(key, cached);
        return cached;
      }
      if (typeof cached === 'string' && cached) {
        const migrated = [{ name: `pexels:cached`, url: cached }];
        memoryCache.set(key, migrated);
        return migrated;
      }

      const [englishName, englishCity] = await Promise.all([
        resolveEnglishPlaceName(place),
        resolveEnglishCityName(cityName),
      ]);

      const query = buildSearchQuery(englishName, englishCity);
      let photos = [];
      try {
        photos = await searchPexelsPhotos(query, perPage);
      } catch (error) {
        console.warn('Pexels search failed:', query, error?.message || error);
      }

      if (!photos.length && englishCity) {
        const cityOnly = englishCity.split(',')[0].trim();
        if (cityOnly && cityOnly !== query) {
          try {
            photos = await searchPexelsPhotos(cityOnly, perPage);
          } catch (error) {
            console.warn(
              'Pexels city fallback failed:',
              cityOnly,
              error?.message || error
            );
          }
        }
      }

      memoryCache.set(key, photos);
      if (photos.length) {
        await savePhotos(key, photos);
      }

      return photos;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
}

/**
 * @param {{ name?: string, latitude?: number, longitude?: number }} place
 * @param {string|null} [cityName]
 * @returns {Promise<string|null>}
 */
export async function resolvePlaceImage(place, cityName = null) {
  const photos = await resolvePlacePhotos(place, cityName, { perPage: 1 });
  return photos[0]?.url || null;
}

/**
 * Enrich attractions with coverImageUrl + photos[] from Pexels.
 *
 * @param {import('../types/attraction').Attraction[]} attractions
 * @param {string|null} [cityName]
 * @param {{ concurrency?: number, limit?: number, perPage?: number }} [options]
 */
export async function enrichAttractionsWithImages(
  attractions,
  cityName = null,
  options = {}
) {
  const list = (Array.isArray(attractions) ? attractions : []).map((item) => ({
    ...item,
  }));
  const concurrency = options.concurrency ?? 3;
  const perPage = options.perPage ?? PEXELS_PHOTOS_PER_PLACE;
  const limit = Math.min(list.length, options.limit ?? 40);
  const targetIndexes = list.slice(0, limit).map((_, index) => index);
  let cursor = 0;

  async function worker() {
    while (cursor < targetIndexes.length) {
      const index = targetIndexes[cursor];
      cursor += 1;
      const place = list[index];
      if (!place?.name) continue;
      const hasGallery =
        Array.isArray(place.photos) &&
        place.photos.filter((p) => p?.url).length >= 2;
      if (place.coverImageUrl && hasGallery) continue;

      try {
        const photos = await resolvePlacePhotos(place, cityName, { perPage });
        if (photos.length) {
          list[index] = {
            ...place,
            coverImageUrl: photos[0].url,
            photos,
          };
        }
      } catch {
        // continue
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, targetIndexes.length || 1) },
      () => worker()
    )
  );

  return list;
}
