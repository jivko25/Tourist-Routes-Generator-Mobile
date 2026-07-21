/**
 * Sorting helpers for attraction lists.
 */

import { haversineDistanceKm } from './routeOptimization';

export const SORT_OPTIONS = [
  {
    id: 'popularity',
    label: 'Popularity',
    description: 'Best rated with most reviews',
  },
  {
    id: 'distance',
    label: 'Distance',
    description: 'Closest to city center first',
  },
  {
    id: 'rating',
    label: 'Rating',
    description: 'Highest star rating first',
  },
  {
    id: 'name_asc',
    label: 'Name A–Z',
    description: 'Alphabetical order',
  },
  {
    id: 'name_desc',
    label: 'Name Z–A',
    description: 'Reverse alphabetical order',
  },
];

export const DEFAULT_SORT_ID = 'popularity';

/**
 * @param {{ rating?: number|null, userRatingCount?: number|null }} attraction
 * @returns {number}
 */
export function getPopularityScore(attraction) {
  const rating = Number(attraction.rating) || 0;
  const reviews = Number(attraction.userRatingCount) || 0;
  return rating * Math.log10(reviews + 1) + rating;
}

/**
 * @param {import('../types/attraction').Attraction[]} attractions
 * @param {string} sortId
 * @param {{ latitude: number, longitude: number }|null} origin
 * @returns {import('../types/attraction').Attraction[]}
 */
export function sortAttractions(attractions, sortId = DEFAULT_SORT_ID, origin = null) {
  const list = [...(attractions || [])];

  switch (sortId) {
    case 'distance':
      if (!origin) return list;
      return list.sort(
        (a, b) => haversineDistanceKm(origin, a) - haversineDistanceKm(origin, b)
      );
    case 'rating':
      return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'name_asc':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'name_desc':
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case 'popularity':
    default:
      return list.sort(
        (a, b) => getPopularityScore(b) - getPopularityScore(a)
      );
  }
}

/**
 * @param {string} sortId
 * @returns {string}
 */
export function formatSortLabel(sortId) {
  return (
    SORT_OPTIONS.find((option) => option.id === sortId)?.label || 'Popularity'
  );
}
