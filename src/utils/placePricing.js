/**
 * Helpers for Google Places pricing + place-type classification.
 */

const PRICE_LEVEL_LABELS = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: 'Inexpensive',
  PRICE_LEVEL_MODERATE: 'Moderate',
  PRICE_LEVEL_EXPENSIVE: 'Expensive',
  PRICE_LEVEL_VERY_EXPENSIVE: 'Very expensive',
};

const PRICE_LEVEL_SYMBOLS = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '€',
  PRICE_LEVEL_MODERATE: '€€',
  PRICE_LEVEL_EXPENSIVE: '€€€',
  PRICE_LEVEL_VERY_EXPENSIVE: '€€€€',
};

const FOOD_TYPES = new Set([
  'restaurant',
  'cafe',
  'bar',
  'bakery',
  'meal_takeaway',
  'meal_delivery',
  'fast_food_restaurant',
  'seafood_restaurant',
  'steak_house',
  'sushi_restaurant',
  'pizza_restaurant',
  'hamburger_restaurant',
  'ice_cream_shop',
  'coffee_shop',
]);

const TICKET_TYPES = new Set([
  'museum',
  'art_gallery',
  'tourist_attraction',
  'aquarium',
  'zoo',
  'amusement_park',
  'historical_landmark',
  'performing_arts_theater',
  'cultural_center',
  'national_park',
  'church',
  'mosque',
  'synagogue',
  'hindu_temple',
]);

/**
 * @param {unknown} money
 * @returns {string|null}
 */
function formatMoney(money) {
  if (!money || typeof money !== 'object') return null;

  const units = Number(money.units || 0);
  const nanos = Number(money.nanos || 0);
  const amount = units + nanos / 1e9;
  if (!Number.isFinite(amount)) return null;

  const currency = money.currencyCode || '';
  try {
    return new Intl.NumberFormat(undefined, {
      style: currency ? 'currency' : 'decimal',
      currency: currency || undefined,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return currency ? `${amount} ${currency}` : String(amount);
  }
}

/**
 * @param {object|null|undefined} priceRange
 * @returns {{ startLabel: string|null, endLabel: string|null, label: string|null }|null}
 */
export function mapPriceRange(priceRange) {
  if (!priceRange) return null;

  const startLabel = formatMoney(priceRange.startPrice);
  const endLabel = formatMoney(priceRange.endPrice);

  if (!startLabel && !endLabel) return null;

  let label = null;
  if (startLabel && endLabel) {
    label = `${startLabel} – ${endLabel}`;
  } else if (startLabel) {
    label = `From ${startLabel}`;
  } else {
    label = `Up to ${endLabel}`;
  }

  return { startLabel, endLabel, label };
}

/**
 * @param {string|null|undefined} priceLevel
 * @returns {string|null}
 */
export function formatPriceLevelLabel(priceLevel) {
  if (!priceLevel) return null;
  return PRICE_LEVEL_LABELS[priceLevel] || null;
}

/**
 * @param {string|null|undefined} priceLevel
 * @returns {string|null}
 */
export function formatPriceLevelSymbols(priceLevel) {
  if (!priceLevel) return null;
  return PRICE_LEVEL_SYMBOLS[priceLevel] || null;
}

/**
 * @param {{ primaryType?: string|null, category?: string|null }} place
 * @returns {boolean}
 */
export function isFoodPlace(place) {
  const type = (place?.primaryType || '').toLowerCase();
  if (FOOD_TYPES.has(type)) return true;

  const category = (place?.category || '').toLowerCase();
  return (
    category.includes('restaurant') ||
    category.includes('cafe') ||
    category.includes('bar') ||
    category.includes('bakery')
  );
}

/**
 * @param {{ primaryType?: string|null, category?: string|null }} place
 * @returns {boolean}
 */
export function isTicketedPlace(place) {
  const type = (place?.primaryType || '').toLowerCase();
  if (TICKET_TYPES.has(type)) return true;
  if (isFoodPlace(place)) return false;

  const category = (place?.category || '').toLowerCase();
  return (
    category.includes('museum') ||
    category.includes('gallery') ||
    category.includes('attraction') ||
    category.includes('zoo') ||
    category.includes('aquarium') ||
    category.includes('park') ||
    category.includes('landmark') ||
    category.includes('theater') ||
    category.includes('theatre')
  );
}

/**
 * @param {{ primaryType?: string|null, category?: string|null, priceLevel?: string|null, priceRange?: { label?: string|null }|null }} place
 * @returns {{ title: string, primary: string, secondary?: string }|null}
 */
export function getPricingDisplay(place) {
  const rangeLabel = place?.priceRange?.label || null;
  const levelLabel = formatPriceLevelLabel(place?.priceLevel);
  const levelSymbols = formatPriceLevelSymbols(place?.priceLevel);
  const food = isFoodPlace(place);
  const ticketed = isTicketedPlace(place);

  if (!rangeLabel && !levelLabel) return null;

  const title = food
    ? 'Price level'
    : ticketed
      ? 'Tickets & entry'
      : 'Pricing';

  if (rangeLabel && levelSymbols) {
    return {
      title,
      primary: rangeLabel,
      secondary: `${levelSymbols} · ${levelLabel}`,
    };
  }

  if (rangeLabel) {
    return {
      title,
      primary: rangeLabel,
      secondary: food
        ? 'Typical spend per person (Google)'
        : 'Typical entry / ticket range (Google)',
    };
  }

  return {
    title,
    primary: levelSymbols || levelLabel,
    secondary: levelLabel && levelSymbols ? levelLabel : 'Based on Google price level',
  };
}
