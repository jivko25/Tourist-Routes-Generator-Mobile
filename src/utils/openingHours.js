/**
 * Opening-hours helpers for Google Places (New) responses.
 */

export const OPEN_STATUS = {
  open: 'open',
  closed: 'closed',
  unknown: 'unknown',
};

export const OPEN_STATUS_COLORS = {
  open: '#16A34A',
  closed: '#E11D48',
  unknown: '#EAB308',
};

/**
 * @param {object} place - raw Places API place object
 * @returns {{ openNow: boolean|null, weekdayDescriptions: string[] }}
 */
export function mapOpeningHoursFromPlace(place) {
  const current = place?.currentOpeningHours;
  const regular = place?.regularOpeningHours;

  let openNow = null;
  if (typeof current?.openNow === 'boolean') {
    openNow = current.openNow;
  } else if (typeof regular?.openNow === 'boolean') {
    openNow = regular.openNow;
  }

  const weekdayDescriptions = Array.isArray(regular?.weekdayDescriptions)
    ? regular.weekdayDescriptions
    : Array.isArray(current?.weekdayDescriptions)
      ? current.weekdayDescriptions
      : [];

  return {
    openNow,
    weekdayDescriptions: weekdayDescriptions.filter(
      (line) => typeof line === 'string' && line.trim().length > 0
    ),
  };
}

/**
 * @param {{ openNow?: boolean|null }} place
 * @returns {'open'|'closed'|'unknown'}
 */
export function getOpenStatus(place) {
  if (place?.openNow === true) return OPEN_STATUS.open;
  if (place?.openNow === false) return OPEN_STATUS.closed;
  return OPEN_STATUS.unknown;
}

/**
 * @param {'open'|'closed'|'unknown'} status
 * @returns {string}
 */
export function formatOpenStatusLabel(status) {
  switch (status) {
    case OPEN_STATUS.open:
      return 'Open now';
    case OPEN_STATUS.closed:
      return 'Closed now';
    default:
      return 'Hours unknown';
  }
}

/**
 * @param {'open'|'closed'|'unknown'} status
 * @returns {string}
 */
export function getOpenStatusColor(status) {
  return OPEN_STATUS_COLORS[status] || OPEN_STATUS_COLORS.unknown;
}
