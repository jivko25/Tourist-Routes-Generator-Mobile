/**
 * Wikipedia place stories for Attraction detail + future live-trip TTS.
 *
 * Strategy:
 * 1) Geosearch near the place (best match)
 * 2) Fallback text search: place name, then "{name} {city}"
 * 3) Score titles by distinctive tokens (reject city-only articles like "Paris"
 *    for places named "… Paris")
 * 4) Fetch plain-text extract, trim to ~2.5–3.5 min reading
 *
 * Free, no API key. Requires descriptive User-Agent / Api-User-Agent.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppLanguage } from '../i18n/language';

/** v3: near-exact title match (rejects city/district/math false positives). */
const CACHE_KEY = '@travel/wiki_story_cache_v3';
/** ~150 wpm TTS ≈ 2.5–3.5 minutes */
const TARGET_MIN_CHARS = 2200;
const TARGET_MAX_CHARS = 4200;
const PREVIEW_CHARS = 320;
/** Near-exact only — weak token overlap is not enough. */
const MIN_ACCEPT_SCORE = 90;

const USER_AGENT =
  'TravelGo/1.0 (https://github.com/jivko25/Tourist-Routes-Generator-Mobile; tourist-routes-app)';

const STOP_TOKENS = new Set([
  'the',
  'a',
  'an',
  'of',
  'and',
  'or',
  'at',
  'in',
  'on',
  'to',
  'for',
  'le',
  'la',
  'les',
  'de',
  'du',
  'des',
  'el',
  'los',
  'las',
  'von',
  'van',
  'der',
  'die',
  'das',
  'hotel',
  'hostel',
  'restaurant',
  'cafe',
  'café',
  'bar',
  'shop',
  'store',
]);

/** Parenthetical disambiguation that may still be a place page. */
const PLACE_PAREN_HINT =
  /\b(basilica|church|cathedral|mosque|temple|museum|palace|castle|tower|bridge|park|garden|monument|building|hotel|abbey|chapel|paris|france|london|rome|italy|spain|germany|bulgaria|sofia)\b/i;

/** Generic venue-type words — optional in Wikipedia titles ("Louvre" vs "Louvre Museum"). */
const TYPE_TOKENS = new Set([
  'museum',
  'church',
  'cathedral',
  'basilica',
  'palace',
  'tower',
  'park',
  'garden',
  'monument',
  'bridge',
  'abbey',
  'chapel',
  'temple',
  'mosque',
  'gallery',
  'castle',
  'fort',
  'square',
  'plaza',
  'market',
  'station',
  'airport',
  'hotel',
  'restaurant',
  'cafe',
  'memorial',
  'statue',
  'fountain',
]);

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

function normalizeMatchText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function cityCoreName(cityName) {
  return String(cityName || '')
    .split(',')[0]
    .trim();
}

function tokenize(text) {
  return normalizeMatchText(text)
    .split(/[^a-z0-9а-яё]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_TOKENS.has(token));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripDisambiguation(title) {
  return String(title || '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function venueCoreName(placeName, cityName) {
  const placeNorm = normalizeMatchText(placeName);
  const cityNorm = normalizeMatchText(cityCoreName(cityName));
  if (!cityNorm) return placeNorm;
  const stripped = placeNorm
    .replace(new RegExp(`\\b${escapeRegex(cityNorm)}\\b`, 'g'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || placeNorm;
}

function tokensMatch(placeToken, titleToken) {
  if (placeToken === titleToken) return true;
  // Simple plural only (square/squares) — still requires the other distinctive tokens.
  if (placeToken.length >= 4 && titleToken.length >= 4) {
    if (placeToken === `${titleToken}s` || titleToken === `${placeToken}s`) {
      return true;
    }
  }
  return false;
}

function countVenueTokenHits(venueTokens, titleTokens) {
  let hits = 0;
  venueTokens.forEach((token) => {
    if ([...titleTokens].some((titleToken) => tokensMatch(token, titleToken))) {
      hits += 1;
    }
  });
  return hits;
}

/**
 * Core name tokens that must appear in the Wikipedia title.
 * Skips trailing type words (Museum, Church) so "Louvre" matches "Louvre Museum".
 */
function getPrimaryTokens(venueTokens) {
  if (venueTokens.length <= 1) return venueTokens;
  if (TYPE_TOKENS.has(venueTokens[1]) && venueTokens[0].length >= 4) {
    return venueTokens.slice(0, 1);
  }
  // "Seven Squares" — both matter; square is a type word but here it's the name.
  // Keep two tokens when the first is short/common number-like or both are non-type.
  return venueTokens.slice(0, 2);
}

function diceCoefficient(a, b) {
  const left = String(a || '').replace(/\s+/g, '');
  const right = String(b || '').replace(/\s+/g, '');
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;

  const bigrams = new Map();
  for (let i = 0; i < left.length - 1; i += 1) {
    const gram = left.slice(i, i + 2);
    bigrams.set(gram, (bigrams.get(gram) || 0) + 1);
  }

  let overlap = 0;
  for (let i = 0; i < right.length - 1; i += 1) {
    const gram = right.slice(i, i + 2);
    const count = bigrams.get(gram) || 0;
    if (count > 0) {
      overlap += 1;
      bigrams.set(gram, count - 1);
    }
  }

  return (2 * overlap) / (left.length - 1 + (right.length - 1));
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

/**
 * Near-exact score: attraction Wikipedia title must closely match the venue name.
 * Rejects city pages, district-only pages (Montmartre for Sacré-Cœur), and
 * unrelated token hits (math "Square" for "Seven Squares Paris").
 *
 * Primary name tokens (first 1–2) must all match. Trailing area tokens
 * (e.g. Montmartre) are optional when the landmark core already matches.
 *
 * @param {string} title
 * @param {string} placeName
 * @param {string|null} [cityName]
 */
function scoreTitleMatch(title, placeName, cityName = null) {
  const titleRaw = normalizeMatchText(title);
  const titleNorm = normalizeMatchText(stripDisambiguation(title));
  const placeNorm = normalizeMatchText(placeName);
  const cityNorm = normalizeMatchText(cityCoreName(cityName));
  const venueCore = venueCoreName(placeName, cityName);

  if (!titleNorm || !placeNorm || !venueCore) return 0;

  // City-only article for a specific venue.
  if (cityNorm && titleNorm === cityNorm && placeNorm !== cityNorm) return 0;

  // Academic / non-place disambiguation: "Square (algebra)", "Square (geometry)".
  const paren = titleRaw.match(/\(([^)]+)\)/);
  if (paren && !PLACE_PAREN_HINT.test(paren[1])) return 0;

  if (titleNorm === placeNorm || titleNorm === venueCore) return 100;

  // Title fully contains the venue core (e.g. "Basilica of the Sacre-Coeur de Montmartre").
  if (venueCore.length >= 5 && titleNorm.includes(venueCore)) return 98;

  const venueTokens = tokenize(venueCore);
  const titleTokens = new Set(tokenize(titleNorm));
  if (!venueTokens.length) return 0;

  const primaryTokens = getPrimaryTokens(venueTokens);
  const trailingTokens = venueTokens.slice(primaryTokens.length);

  const primaryHits = countVenueTokenHits(primaryTokens, titleTokens);
  // Landmark core must match completely. Blocks "Montmartre"-only and math "Square".
  if (primaryHits < primaryTokens.length) return 0;

  const trailingHits = countVenueTokenHits(trailingTokens, titleTokens);
  const primaryJoined = primaryTokens.join(' ');
  const dicePrimary = diceCoefficient(primaryJoined, titleNorm);
  const diceFull = diceCoefficient(venueCore, titleNorm);

  // Title is essentially the primary landmark name.
  if (
    titleNorm.length >= 5 &&
    (primaryJoined.includes(titleNorm) || titleNorm.includes(primaryJoined)) &&
    titleNorm.length >= primaryJoined.length * 0.7
  ) {
    return trailingHits === trailingTokens.length ? 97 : 94;
  }

  if (dicePrimary < 0.4 && diceFull < 0.45) return 0;

  let score = 90 + Math.round(dicePrimary * 6);
  if (trailingTokens.length > 0 && trailingHits === trailingTokens.length) {
    score += 3;
  }
  return Math.min(99, score);
}

/**
 * Lead checks for wrong page type (city / district / non-place).
 * @param {string} extract
 * @param {string|null} cityName
 * @param {string} placeName
 */
function looksLikeCityArticle(extract, cityName, placeName) {
  const city = cityCoreName(cityName);
  if (!city) return false;
  const placeNorm = normalizeMatchText(placeName);
  const cityNorm = normalizeMatchText(city);
  const venueCore = venueCoreName(placeName, cityName);
  if (!cityNorm || placeNorm === cityNorm) return false;

  const lead = normalizeMatchText(extract).slice(0, 320);
  const venueTokens = tokenize(venueCore);
  const leadTokens = new Set(tokenize(lead.slice(0, 180)));
  const primary = getPrimaryTokens(venueTokens);
  const primaryHits = countVenueTokenHits(primary, leadTokens);

  // District / hill article while landmark primary tokens are absent from the lead.
  if (
    primary.length >= 2 &&
    primaryHits === 0 &&
    (/\bhill\b/.test(lead) ||
      /\bdistrict\b/.test(lead) ||
      /\bquarter\b/.test(lead) ||
      /\bneighbourhood\b/.test(lead) ||
      /\bneighborhood\b/.test(lead) ||
      /\bхълм\b/.test(lead) ||
      /\bквартал\b/.test(lead))
  ) {
    return true;
  }

  if (!lead.startsWith(cityNorm) && !lead.includes(`${cityNorm} is `)) {
    return false;
  }

  return (
    /\bis the capital\b/.test(lead) ||
    /\bis a city\b/.test(lead) ||
    /\bis the largest city\b/.test(lead) ||
    /\bстолица\b/.test(lead)
  );
}

/**
 * Reject clearly non-place extracts (e.g. mathematics articles).
 * @param {string} extract
 */
function looksLikeNonPlaceArticle(extract) {
  const lead = normalizeMatchText(extract).slice(0, 280);
  return (
    /\bin mathematics\b/.test(lead) ||
    /\balgebra\b/.test(lead) ||
    /\bgeometry\b/.test(lead) ||
    /\bnumber theory\b/.test(lead) ||
    /\bin physics\b/.test(lead) ||
    /\bcomputational\b/.test(lead) ||
    /\bв математик/.test(lead)
  );
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
    gsradius: 800,
    gslimit: 10,
  });

  return data?.query?.geosearch || [];
}

async function textSearchPages(lang, place, cityName) {
  const city = cityCoreName(cityName);
  const name = String(place?.name || '').trim();
  if (!name) return [];

  // Prefer exact-ish title hits first.
  const queries = [`intitle:${name}`, `"${name}"`, name];
  if (city && !normalizeMatchText(name).includes(normalizeMatchText(city))) {
    queries.push(`${name} ${city}`);
  }

  const merged = [];
  const seen = new Set();

  for (const query of queries) {
    const data = await wikiGet(lang, {
      action: 'query',
      list: 'search',
      srsearch: query,
      srlimit: 8,
      srprop: 'snippet',
    });

    (data?.query?.search || []).forEach((item) => {
      if (!item?.title || seen.has(item.title)) return;
      seen.add(item.title);
      merged.push({
        pageid: item.pageid,
        title: item.title,
      });
    });
  }

  return merged;
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

function pickBestCandidate(candidates, placeName, cityName) {
  if (!candidates?.length) return null;
  let best = null;
  let bestScore = -1;

  candidates.forEach((item) => {
    const score = scoreTitleMatch(item.title, placeName, cityName);
    if (score <= 0) return;
    const distBonus =
      typeof item.dist === 'number' ? Math.max(0, 12 - item.dist / 80) : 0;
    const total = score + distBonus;
    if (total > bestScore) {
      bestScore = total;
      best = item;
    }
  });

  if (!best || bestScore < MIN_ACCEPT_SCORE) return null;
  return best;
}

async function resolveStoryForLanguage(place, cityName, lang) {
  const geo = await geosearchPages(lang, place).catch(() => []);
  const search = await textSearchPages(lang, place, cityName).catch(() => []);
  const merged = [];
  const seen = new Set();

  // Prefer text search (name-aware) over raw nearby geo hits (often the city page).
  [...search, ...geo].forEach((item) => {
    const title = item?.title;
    if (!title || seen.has(title)) return;
    seen.add(title);
    merged.push(item);
  });

  const chosen = pickBestCandidate(merged, place?.name, cityName);
  if (!chosen?.title) return null;

  const story = await fetchExtractByTitle(lang, chosen.title);
  if (!story?.extract) return null;

  if (looksLikeCityArticle(story.extract, cityName, place?.name)) {
    return null;
  }

  if (looksLikeNonPlaceArticle(story.extract)) {
    return null;
  }

  // Final title check after redirects (e.g. search hit redirects to city page).
  if (scoreTitleMatch(story.title, place?.name, cityName) < MIN_ACCEPT_SCORE) {
    return null;
  }

  return story;
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
