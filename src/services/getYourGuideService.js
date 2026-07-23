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
 * @param {{ partnerId?: string, cmp?: string }} [options]
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
  params.set('utm_source', 'travelgo');
  params.set('cmp', options.cmp || 'travelgo_place');

  return `${GYG_SEARCH_BASE}?${params.toString()}`;
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
