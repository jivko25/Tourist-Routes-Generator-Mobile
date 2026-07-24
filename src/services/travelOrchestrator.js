import { getCurrentGpsPosition } from './locationService';
import { buildGetYourGuideLinksFromIntent } from './getYourGuideService';

const CURRENT_LOCATION = 'CURRENT_LOCATION';

/**
 * @typedef {Object} ServiceResultCard
 * @property {string} id
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} [url]
 * @property {'link'|'placeholder'|'info'} kind
 */

/**
 * @typedef {Object} ServiceResultBlock
 * @property {string} type
 * @property {string} title
 * @property {string} [status]
 * @property {string} [message]
 * @property {ServiceResultCard[]} [cards]
 * @property {object} [meta]
 */

/**
 * Replace CURRENT_LOCATION with GPS coordinates for transport services.
 * Does not invent a city name.
 *
 * @param {import('../types/travelRequest').TravelParseResult} parsed
 * @returns {Promise<{
 *   parsed: import('../types/travelRequest').TravelParseResult,
 *   currentLocation: { latitude: number, longitude: number, accuracy: number|null }|null,
 *   locationError: string|null
 * }>}
 */
export async function resolveCurrentLocationInServices(parsed) {
  const services = Array.isArray(parsed?.services) ? parsed.services : [];
  const needsGps = services.some(
    (service) =>
      service?.type === 'transport' &&
      String(service.from || '').toUpperCase() === CURRENT_LOCATION
  );

  if (!needsGps) {
    return { parsed, currentLocation: null, locationError: null };
  }

  try {
    const position = await getCurrentGpsPosition();
    const fromLabel = `${position.latitude.toFixed(5)},${position.longitude.toFixed(5)}`;
    const nextServices = services.map((service) => {
      if (
        service?.type === 'transport' &&
        String(service.from || '').toUpperCase() === CURRENT_LOCATION
      ) {
        return {
          ...service,
          from: fromLabel,
          fromResolved: {
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
            source: 'gps',
          },
        };
      }
      return service;
    });

    return {
      parsed: { ...parsed, services: nextServices },
      currentLocation: position,
      locationError: null,
    };
  } catch (error) {
    return {
      parsed,
      currentLocation: null,
      locationError:
        error?.message ||
        'Could not read GPS. Transport will stay as CURRENT_LOCATION for now.',
    };
  }
}

/**
 * @param {import('../types/travelRequest').TravelService} service
 * @param {import('../types/travelRequest').TravelParseResult} parsed
 * @returns {Promise<ServiceResultBlock>}
 */
async function handleTransport(service, parsed) {
  const from = service?.from || 'origin';
  const to = service?.to || parsed.destination || 'destination';
  return {
    type: 'transport',
    title: 'Flights & transport',
    status: 'coming_soon',
    message: 'Flights coming soon',
    cards: [
      {
        id: 'transport-placeholder',
        kind: 'placeholder',
        title: 'Flights coming soon',
        subtitle: `${from} → ${to}`,
      },
    ],
    meta: {
      from,
      to,
      fromResolved: service?.fromResolved || null,
    },
  };
}

/**
 * @param {import('../types/travelRequest').TravelService} _service
 * @param {import('../types/travelRequest').TravelParseResult} parsed
 * @returns {Promise<ServiceResultBlock>}
 */
async function handleHotel(_service, parsed) {
  return {
    type: 'hotel',
    title: 'Hotels',
    status: 'coming_soon',
    message: 'Hotels coming soon',
    cards: [
      {
        id: 'hotel-placeholder',
        kind: 'placeholder',
        title: 'Hotels coming soon',
        subtitle: parsed.destination
          ? `Stays in ${parsed.destination}`
          : 'Booking.com affiliate later',
      },
    ],
  };
}

/**
 * @param {import('../types/travelRequest').TravelService} service
 * @param {import('../types/travelRequest').TravelParseResult} parsed
 * @returns {Promise<ServiceResultBlock>}
 */
async function handleActivities(service, parsed) {
  const places = Array.isArray(service?.places) ? service.places : [];
  const links = buildGetYourGuideLinksFromIntent({
    destination: parsed.destination,
    places,
    travelDates: parsed.travelDates,
  });

  if (!links.length) {
    return {
      type: 'activities',
      title: 'Activities',
      status: 'empty',
      message: 'No activity links could be built for this request.',
      cards: [],
    };
  }

  return {
    type: 'activities',
    title: 'Activities on GetYourGuide',
    status: 'ready',
    message: 'Partner links · we may earn a commission if you book.',
    cards: links.map((link) => ({
      id: link.id,
      kind: 'link',
      title: link.title,
      subtitle: link.subtitle,
      url: link.url,
    })),
  };
}

/**
 * @returns {Promise<ServiceResultBlock>}
 */
async function handleCarRental() {
  return {
    type: 'car_rental',
    title: 'Car rental',
    status: 'coming_soon',
    message: 'Car rental coming soon',
    cards: [
      {
        id: 'car-placeholder',
        kind: 'placeholder',
        title: 'Car rental coming soon',
        subtitle: 'We will add partners here later',
      },
    ],
  };
}

/**
 * @param {import('../types/travelRequest').TravelService} service
 * @param {import('../types/travelRequest').TravelParseResult} parsed
 * @returns {Promise<ServiceResultBlock>}
 */
async function dispatchService(service, parsed) {
  switch (service?.type) {
    case 'transport':
      return handleTransport(service, parsed);
    case 'hotel':
      return handleHotel(service, parsed);
    case 'activities':
      return handleActivities(service, parsed);
    case 'car_rental':
      return handleCarRental();
    default:
      return {
        type: service?.type || 'unknown',
        title: 'Other',
        status: 'unsupported',
        message: `Unsupported service: ${service?.type || 'unknown'}`,
        cards: [],
      };
  }
}

/**
 * Resolve GPS for CURRENT_LOCATION, then run service handlers in parallel.
 *
 * @param {import('../types/travelRequest').TravelParseResult} parsed
 * @returns {Promise<{
 *   parsed: import('../types/travelRequest').TravelParseResult,
 *   blocks: ServiceResultBlock[],
 *   currentLocation: { latitude: number, longitude: number, accuracy: number|null }|null,
 *   locationError: string|null
 * }>}
 */
export async function orchestrateTravelServices(parsed) {
  const {
    parsed: resolved,
    currentLocation,
    locationError,
  } = await resolveCurrentLocationInServices(parsed);

  const services = Array.isArray(resolved.services) ? resolved.services : [];
  if (!services.length) {
    return {
      parsed: resolved,
      blocks: [],
      currentLocation,
      locationError,
    };
  }

  const settled = await Promise.allSettled(
    services.map((service) => dispatchService(service, resolved))
  );

  const blocks = settled.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    const type = services[index]?.type || 'unknown';
    return {
      type,
      title: type,
      status: 'error',
      message: result.reason?.message || 'Failed to process this service.',
      cards: [],
    };
  });

  return {
    parsed: resolved,
    blocks,
    currentLocation,
    locationError,
  };
}
