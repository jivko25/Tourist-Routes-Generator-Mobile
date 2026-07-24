/**
 * GetYourGuide affiliate deep links.
 *
 * We do not scrape GYG or call undocumented endpoints.
 * Links open GetYourGuide search for the place (tickets / tours / experiences)
 * with partner_id for affiliate tracking.
 *
 * Docs / portal: https://partner.getyourguide.com
 * Search URL pattern: https://www.getyourguide.com/s/?q=...&partner_id=...
 */

import { getGetYourGuidePartnerId } from '../utils/config';

const GYG_SEARCH_BASE = 'https://www.getyourguide.com/s/';

/**
 * @param {string|null|undefined} cityName
 * @returns {string}
 */
export function cityLabelFromSearch(cityName) {
  if (!cityName || typeof cityName !== 'string') return '';
  return cityName.split(',')[0].trim();
}

/**
 * Build a tracked GetYourGuide search URL.
 *
 * @param {string} query
 * @param {{
 *   partnerId?: string,
 *   cmp?: string,
 *   startDate?: string|null,
 *   endDate?: string|null,
 * }} [options]
 * @returns {string}
 */
export function buildGetYourGuideSearchUrl(query, options = {}) {
  const q = (query || '').trim();
  if (!q) return '';

  const partnerId =
    options.partnerId || getGetYourGuidePartnerId() || '';
  const params = new URLSearchParams();
  params.set('q', q);
  if (partnerId) {
    params.set('partner_id', partnerId);
  }
  // Optional date hints (GYG may ignore unknown params; safe for affiliate landing).
  if (options.startDate) {
    params.set('date_from', String(options.startDate).slice(0, 10));
  }
  if (options.endDate) {
    params.set('date_to', String(options.endDate).slice(0, 10));
  }
  params.set('utm_source', 'travelgo');
  params.set('cmp', options.cmp || 'travelgo_place');

  return `${GYG_SEARCH_BASE}?${params.toString()}`;
}

/**
 * Affiliate activity cards from AI parse result (destination + places).
 *
 * @param {{
 *   destination?: string|null,
 *   places?: string[],
 *   travelDates?: { start?: string|null, end?: string|null }|null,
 * }} input
 * @returns {Array<{ id: string, title: string, subtitle: string, url: string }>}
 */
export function buildGetYourGuideLinksFromIntent(input = {}) {
  const destination = (input.destination || '').trim();
  const places = Array.isArray(input.places)
    ? input.places.map((p) => String(p || '').trim()).filter(Boolean)
    : [];
  const startDate = input.travelDates?.start || null;
  const endDate = input.travelDates?.end || null;

  const dateOpts = { startDate, endDate, cmp: 'travelgo_chat' };

  if (places.length === 0) {
    if (!destination) return [];
    const url = buildGetYourGuideSearchUrl(
      `${destination} activities`,
      dateOpts
    );
    return url
      ? [
          {
            id: `gyg-dest-${destination}`,
            title: destination,
            subtitle: `Things to do in ${destination}`,
            url,
          },
        ]
      : [];
  }

  return places
    .map((place) => {
      const query = destination ? `${place} ${destination}` : place;
      const url = buildGetYourGuideSearchUrl(query, dateOpts);
      if (!url) return null;
      return {
        id: `gyg-${place}`,
        title: place,
        subtitle: destination
          ? `Activities near ${place} · ${destination}`
          : `Activities for ${place}`,
        url,
      };
    })
    .filter(Boolean);
}

/**
 * Activity-oriented affiliate links for a specific attraction.
 *
 * @param {{ name?: string, category?: string|null, primaryType?: string|null }} place
 * @param {string|null} [cityName]
 * @returns {Array<{ id: string, title: string, subtitle: string, url: string }>}
 */
export function getGetYourGuideActivityLinks(place, cityName = null) {
  const name = place?.name?.trim();
  if (!name) return [];

  const city = cityLabelFromSearch(cityName);
  const withCity = city ? `${name} ${city}` : name;

  const links = [
    {
      id: 'tickets',
      title: 'Entry tickets',
      subtitle: `Tickets for ${name}`,
      query: `${withCity} tickets`,
      cmp: 'travelgo_tickets',
    },
    {
      id: 'skip',
      title: 'Skip-the-line',
      subtitle: 'Faster entry options',
      query: `${withCity} skip the line`,
      cmp: 'travelgo_skip',
    },
    {
      id: 'tour',
      title: 'Guided tours',
      subtitle: `Tours & experiences at ${name}`,
      query: `${withCity} guided tour`,
      cmp: 'travelgo_tour',
    },
    {
      id: 'activities',
      title: 'More activities',
      subtitle: city
        ? `Things to do near ${name} in ${city}`
        : `Things to do near ${name}`,
      query: city ? `${name} ${city} activities` : `${name} activities`,
      cmp: 'travelgo_activities',
    },
  ];

  if (city) {
    links.push({
      id: 'city',
      title: `Explore ${city}`,
      subtitle: 'Top-rated activities in this city',
      query: `${city} attractions`,
      cmp: 'travelgo_city',
    });
  }

  return links
    .map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      url: buildGetYourGuideSearchUrl(item.query, { cmp: item.cmp }),
    }))
    .filter((item) => Boolean(item.url));
}
