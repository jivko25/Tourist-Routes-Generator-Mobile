/**
 * Free place cover images (no Google Places Photo).
 *
 * Order (mobile-friendly — avoids Commons/Wikipedia api.php 403 on RN):
 * 1) Openverse (CC) by place name
 * 2) Wikidata P18 by English/French label
 * 3) Wikidata P18 near lat/lng
 *
 * Image URLs are direct https links React Native Image can load.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@travel/free_photo_cache_v5';
const USER_AGENT =
  'TravelGo/1.0 (Expo; tourist route planner; https://github.com/jivko25)';

const memoryCache = new Map();
let diskReady = null;
let diskCache = {};
const inflight = new Map();

const http = axios.create({
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
    'Api-User-Agent': USER_AGENT,
  },
});

function cacheKey(place, cityName) {
  if (
    typeof place?.latitude === 'number' &&
    typeof place?.longitude === 'number'
  ) {
    return `geo:${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;
  }
  const city = (cityName || '').split(',')[0].trim().toLowerCase();
  return `name:${(place?.name || '').trim().toLowerCase()}|${city}`;
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

async function saveUrl(key, url) {
  if (!url) return;
  const cache = await getDiskCache();
  cache[key] = url;
  const entries = Object.entries(cache);
  diskCache =
    entries.length > 600
      ? Object.fromEntries(entries.slice(-400))
      : { ...cache };
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(diskCache)).catch(() => {});
}

function normalizeHttps(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
  return url.replace(/^http:\/\//i, 'https://');
}

/**
 * Convert Wikidata/Commons FilePath URI → loadable thumbnail URL.
 * Example:
 * http://commons.wikimedia.org/wiki/Special:FilePath/Tour_Eiffel.jpg
 * → https://commons.wikimedia.org/wiki/Special:FilePath/Tour_Eiffel.jpg?width=900
 */
function filePathToThumb(filePathUrl) {
  const normalized = normalizeHttps(filePathUrl);
  if (!normalized) return null;

  if (/Special:FilePath\//i.test(normalized)) {
    const base = normalized.split('?')[0];
    return `${base}?width=900`;
  }

  // Raw commons File: page → FilePath
  const fileMatch = normalized.match(/\/wiki\/File:(.+)$/i);
  if (fileMatch?.[1]) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${fileMatch[1]}?width=900`;
  }

  return normalized;
}

/**
 * Openverse — primary on mobile (API built for this; rarely 403).
 */
async function openverseImage(query) {
  const response = await http.get('https://api.openverse.org/v1/images/', {
    params: {
      q: query,
      page_size: 8,
      mature: false,
    },
  });

  const results = response.data?.results;
  if (!Array.isArray(results) || results.length === 0) return null;

  for (const item of results) {
    // Prefer full url when it's a direct image host; else thumbnail endpoint.
    const candidates = [item.url, item.thumbnail].map(normalizeHttps).filter(Boolean);
    for (const url of candidates) {
      if (url) return url;
    }
  }

  return null;
}

/**
 * Wikidata: entity with this label that has an image (P18).
 */
async function wikidataImageByLabel(name) {
  const safe = name.replace(/"/g, '\\"');
  const query = `
    SELECT ?image WHERE {
      VALUES ?label { "${safe}"@en "${safe}"@fr }
      ?item rdfs:label ?label .
      ?item wdt:P18 ?image .
    }
    LIMIT 3
  `;

  const response = await http.get('https://query.wikidata.org/sparql', {
    params: { query, format: 'json' },
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': USER_AGENT,
    },
  });

  const bindings = response.data?.results?.bindings || [];
  for (const row of bindings) {
    const thumb = filePathToThumb(row?.image?.value);
    if (thumb) return thumb;
  }

  return null;
}

/**
 * Wikidata: any imaged entity near coordinates (P18).
 * WKT point order is lon lat.
 */
async function wikidataImageNearby(latitude, longitude, radiusKm = 0.6) {
  const query = `
    SELECT ?image WHERE {
      SERVICE wikibase:around {
        ?place wdt:P625 ?location .
        bd:serviceParam wikibase:center "Point(${longitude} ${latitude})"^^geo:wktLiteral .
        bd:serviceParam wikibase:radius "${radiusKm}" .
      }
      ?place wdt:P18 ?image .
    }
    LIMIT 5
  `;

  const response = await http.get('https://query.wikidata.org/sparql', {
    params: { query, format: 'json' },
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': USER_AGENT,
    },
  });

  const bindings = response.data?.results?.bindings || [];
  for (const row of bindings) {
    const thumb = filePathToThumb(row?.image?.value);
    if (thumb) return thumb;
  }

  return null;
}

/**
 * @param {{ name?: string, latitude?: number, longitude?: number }} place
 * @param {string|null} [cityName]
 * @returns {Promise<string|null>}
 */
export async function resolvePlaceImage(place, cityName = null) {
  const name = place?.name?.trim();
  const hasCoords =
    typeof place?.latitude === 'number' && typeof place?.longitude === 'number';

  if (!name && !hasCoords) return null;

  const key = cacheKey(place, cityName);
  if (memoryCache.has(key)) {
    return memoryCache.get(key) || null;
  }
  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const task = (async () => {
    try {
      const disk = await getDiskCache();
      if (typeof disk[key] === 'string' && disk[key]) {
        memoryCache.set(key, disk[key]);
        return disk[key];
      }

      const cityLabel = cityName?.split(',')?.[0]?.trim() || '';
      const queries = [
        cityLabel && name ? `${name} ${cityLabel}` : null,
        name || null,
        cityLabel || null,
      ].filter(Boolean);

      let imageUrl = null;

      // 1) Openverse
      for (const query of queries) {
        try {
          imageUrl = await openverseImage(query);
          if (imageUrl) break;
        } catch (error) {
          console.warn('Openverse failed:', query, error?.message || error);
        }
      }

      // 2) Wikidata by label (great for "Eiffel Tower")
      if (!imageUrl && name) {
        try {
          imageUrl = await wikidataImageByLabel(name);
        } catch (error) {
          console.warn('Wikidata label failed:', name, error?.message || error);
        }
      }

      // 3) Wikidata nearby
      if (!imageUrl && hasCoords) {
        try {
          imageUrl = await wikidataImageNearby(
            place.latitude,
            place.longitude,
            0.8
          );
        } catch (error) {
          console.warn(
            'Wikidata nearby failed:',
            name,
            error?.message || error
          );
        }
      }

      if (imageUrl) {
        memoryCache.set(key, imageUrl);
        await saveUrl(key, imageUrl);
        console.log('[photo]', name || key, imageUrl.slice(0, 80));
      }

      return imageUrl;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
}

/**
 * Enrich copies with coverImageUrl. Returns a new array.
 */
export async function enrichAttractionsWithImages(
  attractions,
  cityName = null,
  options = {}
) {
  const list = (Array.isArray(attractions) ? attractions : []).map((item) => ({
    ...item,
  }));
  const concurrency = options.concurrency ?? 4;
  const limit = Math.min(list.length, options.limit ?? 40);
  const targetIndexes = list.slice(0, limit).map((_, index) => index);
  let cursor = 0;

  async function worker() {
    while (cursor < targetIndexes.length) {
      const index = targetIndexes[cursor];
      cursor += 1;
      const place = list[index];
      if (!place?.name || place.coverImageUrl) continue;
      try {
        const url = await resolvePlaceImage(place, cityName);
        if (url) {
          list[index] = {
            ...place,
            coverImageUrl: url,
            photos: [{ name: `free:${place.id || place.name}`, url }],
          };
        }
      } catch {
        // continue
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, targetIndexes.length || 1) }, () =>
      worker()
    )
  );

  return list;
}
