/**
 * Wikipedia place stories for Attraction detail + future live-trip TTS.
 *
 * Strategy:
 * 1) Geosearch near the place (best match)
 * 2) Fallback text search: "{name} {city}"
 * 3) Fetch plain-text extract (full lead+body), trim to ~2.5–3.5 min reading
 *
 * Free, no API key. Requires descriptive User-Agent / Api-User-Agent.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppLanguage } from '../i18n/language';

const CACHE_KEY = '@travel/wiki_story_cache_v1';
/** ~150 wpm TTS ≈ 2.5–3.5 minutes */
const TARGET_MIN_CHARS = 2200;
const TARGET_MAX_CHARS = 4200;
const PREVIEW_CHARS = 320;

const USER_AGENT =
  'TravelGo/1.0 (https://github.com/jivko25/Tourist-Routes-Generator-Mobile; tourist-routes-app)';

const memoryCache = new Map();
const inflight = new Map();
let diskReady = null;
let diskCache = {};

/**
 * @typedef {Object} WikipediaStory
 * @property {string} title
 * @property {string} extract Full plain text for reading / TTS
 * @property {string} preview Short teaser for the detail screen
 * @property {string} url
 * @property {string} language
 * @property {number|null} pageId
 * @property {string} source
 * @property {number} charCount
 * @property {number} estimatedReadMinutes
 */

function wikiApiBase(lang) {
  const code = lang === 'bg' ? 'bg' : 'en';
  return `https://${code}.wikipedia.org/w/api.php`;
}

function wikiHeaders() {
  return {
    Accept: 'application/json',
    'Api-User-Agent': USER_AGENT,
    'User-Agent': USER_AGENT,
  };
}

function cacheKey(place, language) {
  const id = place?.googlePlaceId || place?.id;
  const lang = language || getAppLanguage();
  if (id) return `${lang}:id:${id}`;
  const name = String(place?.name || '')
    .trim()
    .toLowerCase();
  const lat =
    typeof place?.latitude === 'number' ? place.latitude.toFixed(3) : '';
  const lng =
    typeof place?.longitude === 'number' ? place.longitude.toFixed(3) : '';
  return `${lang}:name:${name}|${lat},${lng}`;
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

async function saveStory(key, story) {
  if (!key || !story?.extract) return;
  memoryCache.set(key, story);
  const cache = await getDiskCache();
  cache[key] = story;
  const entries = Object.entries(cache);
  diskCache =
    entries.length > 250
      ? Object.fromEntries(entries.slice(-180))
      : { ...cache };
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(diskCache)).catch(() => {});
}

function normalizePlainText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function buildPreview(text) {
  const clean = normalizePlainText(text);
  if (clean.length <= PREVIEW_CHARS) return clean;
  const slice = clean.slice(0, PREVIEW_CHARS);
  const cut = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf(' '));
  const preview = (cut > 80 ? slice.slice(0, cut + 1) : slice).trim();
  return `${preview}${preview.endsWith('.') ? '' : '…'}`;
}

function trimForReading(text) {
  const clean = normalizePlainText(text);
  if (clean.length <= TARGET_MAX_CHARS) return clean;

  const slice = clean.slice(0, TARGET_MAX_CHARS);
  const paragraphCut = slice.lastIndexOf('\n\n');
  const sentenceCut = slice.lastIndexOf('. ');
  const cut = Math.max(paragraphCut, sentenceCut);
  if (cut > TARGET_MIN_CHARS) {
    return slice.slice(0, cut + (sentenceCut >= paragraphCut ? 1 : 0)).trim();
  }
  return slice.trim();
}

function estimateReadMinutes(charCount) {
  // ~5 chars/word, ~150 wpm speaking / reading aloud — whole minutes only
  const words = Math.max(1, Math.round(charCount / 5));
  return Math.max(1, Math.round(words / 150));
}

function scoreTitleMatch(title, placeName) {
  const a = String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const b = String(placeName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;
  const aTokens = new Set(a.split(/[^a-z0-9а-яё]+/i).filter(Boolean));
  const bTokens = b.split(/[^a-z0-9а-яё]+/i).filter(Boolean);
  if (!bTokens.length) return 0;
  let hit = 0;
  bTokens.forEach((token) => {
    if (aTokens.has(token)) hit += 1;
  });
  return Math.round((hit / bTokens.length) * 60);
}

async function wikiGet(lang, params) {
  const response = await axios.get(wikiApiBase(lang), {
    timeout: 20000,
    headers: wikiHeaders(),
    params: {
      format: 'json',
      origin: '*',
      ...params,
    },
  });
  return response.data;
}

async function geosearchPages(lang, place) {
  if (
    typeof place?.latitude !== 'number' ||
    typeof place?.longitude !== 'number'
  ) {
    return [];
  }

  const data = await wikiGet(lang, {
    action: 'query',
    list: 'geosearch',
    gscoord: `${place.latitude}|${place.longitude}`,
    gsradius: 1200,
    gslimit: 8,
  });

  return data?.query?.geosearch || [];
}

async function textSearchPages(lang, place, cityName) {
  const city = cityName?.split(',')?.[0]?.trim() || '';
  const query = [place?.name, city].filter(Boolean).join(' ').trim();
  if (!query) return [];

  const data = await wikiGet(lang, {
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: 6,
    srprop: 'snippet',
  });

  return (data?.query?.search || []).map((item) => ({
    pageid: item.pageid,
    title: item.title,
  }));
}

async function fetchExtractByTitle(lang, title) {
  const data = await wikiGet(lang, {
    action: 'query',
    prop: 'extracts|info',
    exlimit: 1,
    explaintext: 1,
    exsectionformat: 'plain',
    inprop: 'url',
    redirects: 1,
    titles: title,
  });

  const pages = data?.query?.pages || {};
  const page = Object.values(pages)[0];
  if (!page || page.missing != null || !page.extract) return null;

  const extract = trimForReading(page.extract);
  if (extract.length < 180) return null;

  return {
    title: page.title || title,
    extract,
    preview: buildPreview(extract),
    url: page.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title || title)}`,
    language: lang,
    pageId: typeof page.pageid === 'number' ? page.pageid : null,
    source: 'wikipedia',
    charCount: extract.length,
    estimatedReadMinutes: estimateReadMinutes(extract.length),
  };
}

function pickBestCandidate(candidates, placeName) {
  if (!candidates?.length) return null;
  let best = null;
  let bestScore = -1;
  candidates.forEach((item) => {
    const score = scoreTitleMatch(item.title, placeName);
    const distBonus =
      typeof item.dist === 'number' ? Math.max(0, 20 - item.dist / 50) : 0;
    const total = score + distBonus;
    if (total > bestScore) {
      bestScore = total;
      best = item;
    }
  });
  // Require a minimal relevance signal
  if (bestScore < 18) return best || candidates[0];
  return best;
}

async function resolveStoryForLanguage(place, cityName, lang) {
  const geo = await geosearchPages(lang, place).catch(() => []);
  const search = await textSearchPages(lang, place, cityName).catch(() => []);
  const merged = [];
  const seen = new Set();

  [...geo, ...search].forEach((item) => {
    const title = item?.title;
    if (!title || seen.has(title)) return;
    seen.add(title);
    merged.push(item);
  });

  const chosen = pickBestCandidate(merged, place?.name);
  if (!chosen?.title) return null;
  return fetchExtractByTitle(lang, chosen.title);
}

/**
 * Load a Wikipedia story for a place (cached).
 *
 * @param {{ name?: string, latitude?: number, longitude?: number, id?: string, googlePlaceId?: string }} place
 * @param {string|null} [cityName]
 * @param {{ language?: string }} [options]
 * @returns {Promise<WikipediaStory|null>}
 */
export async function fetchPlaceWikipediaStory(
  place,
  cityName = null,
  options = {}
) {
  if (!place?.name?.trim()) return null;

  const language = options.language || getAppLanguage();
  const key = cacheKey(place, language);

  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const task = (async () => {
    try {
      const disk = await getDiskCache();
      if (disk[key]?.extract) {
        memoryCache.set(key, disk[key]);
        return disk[key];
      }

      const preferred = language === 'bg' ? ['bg', 'en'] : ['en', 'bg'];
      let story = null;

      for (const lang of preferred) {
        story = await resolveStoryForLanguage(place, cityName, lang);
        if (story?.extract) break;
      }

      if (story) {
        await saveStory(key, story);
      } else {
        memoryCache.set(key, null);
      }

      return story;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
}

export const WIKIPEDIA_PREVIEW_CHARS = PREVIEW_CHARS;
