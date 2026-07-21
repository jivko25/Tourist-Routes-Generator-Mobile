/**
 * Place category filters mapped to Google Places API (New) Table A types.
 * Default selection is tourist attractions (+ popular related sights).
 */

export const PLACE_CATEGORIES = [
  {
    id: 'tourist',
    label: 'Tourist',
    description: 'Popular tourist attractions, aquariums and zoos',
    // Aquarium/zoo often are not tagged only as tourist_attraction (e.g. Oceanário).
    types: ['tourist_attraction', 'aquarium', 'zoo', 'amusement_park'],
  },
  {
    id: 'museums',
    label: 'Museums',
    description: 'Museums and exhibitions',
    types: ['museum'],
  },
  {
    id: 'art',
    label: 'Art & Culture',
    description: 'Galleries, theaters, cultural centers',
    types: ['art_gallery', 'performing_arts_theater', 'cultural_center'],
  },
  {
    id: 'nature',
    label: 'Nature & Parks',
    description: 'Parks, national parks, hiking areas',
    types: ['park', 'national_park', 'hiking_area'],
  },
  {
    id: 'landmarks',
    label: 'Landmarks',
    description: 'Historical landmarks and monuments',
    types: ['historical_landmark'],
  },
  {
    id: 'religious',
    label: 'Religious sites',
    description: 'Churches, temples, mosques and more',
    types: ['church', 'mosque', 'synagogue', 'hindu_temple'],
  },
  {
    id: 'family',
    label: 'Family fun',
    description: 'Amusement parks, zoos, aquariums',
    types: ['amusement_park', 'zoo', 'aquarium'],
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
    description: 'Restaurants and places to eat',
    types: ['restaurant'],
  },
];

export const DEFAULT_PLACE_CATEGORY_IDS = ['tourist'];

/**
 * @param {string[]} categoryIds
 * @returns {string[]}
 */
export function resolvePlaceTypes(categoryIds = DEFAULT_PLACE_CATEGORY_IDS) {
  const selected = new Set(
    Array.isArray(categoryIds) && categoryIds.length > 0
      ? categoryIds
      : DEFAULT_PLACE_CATEGORY_IDS
  );

  const types = [];
  const seen = new Set();

  PLACE_CATEGORIES.forEach((category) => {
    if (!selected.has(category.id)) return;
    category.types.forEach((type) => {
      if (!seen.has(type)) {
        seen.add(type);
        types.push(type);
      }
    });
  });

  return types.length > 0 ? types : ['tourist_attraction', 'aquarium', 'zoo'];
}

/**
 * @param {string[]} categoryIds
 * @returns {string}
 */
export function formatSelectedCategoriesLabel(categoryIds = []) {
  const selected = PLACE_CATEGORIES.filter((category) =>
    categoryIds.includes(category.id)
  );

  if (selected.length === 0) return 'Tourist';
  if (selected.length === 1) return selected[0].label;
  if (selected.length === 2) {
    return `${selected[0].label} + ${selected[1].label}`;
  }
  return `${selected.length} categories`;
}
