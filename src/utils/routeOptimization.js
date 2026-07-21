/**
 * Route optimization helpers (client-side TSP heuristics).
 * Good enough for typical tourist routes (< ~20 stops) without Directions API.
 */

const EARTH_RADIUS_KM = 6371;
const EPS_KM = 1e-6;

/**
 * @param {{ latitude: number, longitude: number }} a
 * @param {{ latitude: number, longitude: number }} b
 * @returns {number} distance in kilometers
 */
export function haversineDistanceKm(a, b) {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * @param {Array<{ latitude: number, longitude: number }>} points
 * @returns {number}
 */
export function totalPathDistanceKm(points) {
  if (!points || points.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total += haversineDistanceKm(points[i], points[i + 1]);
  }
  return total;
}

/**
 * Builds full path including optional fixed start/end.
 *
 * @param {Array<{ latitude: number, longitude: number }>} waypoints
 * @param {{ start?: object | null, end?: object | null }} options
 */
function buildFullPath(waypoints, options = {}) {
  return [
    ...(options.start ? [options.start] : []),
    ...waypoints,
    ...(options.end ? [options.end] : []),
  ];
}

/**
 * @param {Array<{ latitude: number, longitude: number }>} waypoints
 * @param {{ start?: object | null, end?: object | null }} options
 */
function pathDistanceKm(waypoints, options = {}) {
  return totalPathDistanceKm(buildFullPath(waypoints, options));
}

/**
 * Nearest-neighbor order for open path.
 *
 * @template {{ latitude: number, longitude: number, id?: string }} T
 * @param {T[]} waypoints
 * @param {{ start?: T | null, end?: T | null }} [options]
 * @returns {T[]}
 */
export function nearestNeighborOrder(waypoints, options = {}) {
  const points = Array.isArray(waypoints) ? [...waypoints] : [];
  if (points.length <= 1) return points;

  const start = options.start || null;
  const end = options.end || null;
  const remaining = [...points];
  const ordered = [];

  let current = start;
  if (!current) {
    remaining.sort((a, b) => a.longitude - b.longitude);
    current = remaining.shift();
    ordered.push(current);
  }

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestScore = Infinity;

    remaining.forEach((candidate, index) => {
      let score = haversineDistanceKm(current, candidate);
      if (end) {
        score += haversineDistanceKm(candidate, end) * 0.2;
      }
      if (score < nearestScore) {
        nearestScore = score;
        nearestIndex = index;
      }
    });

    current = remaining.splice(nearestIndex, 1)[0];
    ordered.push(current);
  }

  return ordered;
}

/**
 * 2-opt improvement for waypoint order, scoring the full start->stops->end path.
 *
 * @template {{ latitude: number, longitude: number }} T
 * @param {T[]} path
 * @param {{ start?: object | null, end?: object | null }} [options]
 * @returns {T[]}
 */
export function twoOptImprove(path, options = {}) {
  if (!path || path.length < 2) return path ? [...path] : [];

  const score = (waypoints) => pathDistanceKm(waypoints, options);

  let best = [...path];
  let improved = true;

  while (improved) {
    improved = false;

    // Try full reverse for open paths (same undirected length only without fixed ends,
    // but with fixed ends reverse of middle can differ — still worth checking via seeds).
    if (best.length >= 2) {
      const reversed = [...best].reverse();
      if (score(reversed) + EPS_KM < score(best)) {
        best = reversed;
        improved = true;
        continue;
      }
    }

    for (let i = 0; i < best.length - 1; i += 1) {
      for (let k = i + 1; k < best.length; k += 1) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1),
        ];

        if (score(candidate) + EPS_KM < score(best)) {
          best = candidate;
          improved = true;
        }
      }
    }
  }

  return best;
}

/**
 * Pick the shortest candidate; never worse than the original order.
 *
 * @template {{ latitude: number, longitude: number, id?: string }} T
 * @param {T[][]} candidates
 * @param {T[]} original
 * @param {{ start?: object | null, end?: object | null }} pathOptions
 */
function pickBestOrder(candidates, original, pathOptions) {
  let best = [...original];
  let bestDist = pathDistanceKm(best, pathOptions);

  candidates.forEach((candidate) => {
    if (!Array.isArray(candidate) || candidate.length !== original.length) {
      return;
    }
    const dist = pathDistanceKm(candidate, pathOptions);
    if (dist + EPS_KM < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  });

  return { ordered: best, distanceKm: bestDist };
}

/**
 * Optimizes attraction order between optional fixed start/end coordinates.
 * Tries several seeds (current, reverse, NN both ways) + 2-opt, keeps the best.
 * Never returns an order longer than the current one.
 *
 * @template {{ latitude: number, longitude: number, id?: string }} T
 * @param {T[]} attractions
 * @param {{ start?: { latitude: number, longitude: number } | null, end?: { latitude: number, longitude: number } | null }} [options]
 * @returns {{ ordered: T[], distanceKm: number, originalDistanceKm: number }}
 */
export function optimizeAttractionOrder(attractions, options = {}) {
  const original = Array.isArray(attractions) ? [...attractions] : [];
  const start = options.start || null;
  const end = options.end || null;
  const pathOptions = { start, end };
  const originalDistanceKm = pathDistanceKm(original, pathOptions);

  if (original.length <= 1) {
    return {
      ordered: original,
      distanceKm: originalDistanceKm,
      originalDistanceKm,
    };
  }

  const seeds = [
    [...original],
    [...original].reverse(),
    nearestNeighborOrder(original, pathOptions),
  ];

  // Approach from the opposite end, then reverse so fixed start/end stay correct.
  if (start && end) {
    const fromEnd = nearestNeighborOrder(original, {
      start: end,
      end: start,
    });
    seeds.push([...fromEnd].reverse());
  } else if (!start) {
    const byLat = [...original].sort((a, b) => a.latitude - b.latitude);
    seeds.push(nearestNeighborOrder(byLat, { end }));
    const byLonDesc = [...original].sort((a, b) => b.longitude - a.longitude);
    seeds.push(nearestNeighborOrder(byLonDesc, { end }));
  }

  const improved = seeds.map((seed) => twoOptImprove(seed, pathOptions));
  const { ordered, distanceKm } = pickBestOrder(
    improved,
    original,
    pathOptions
  );

  return {
    ordered,
    distanceKm,
    originalDistanceKm,
  };
}

/**
 * @param {number} km
 * @returns {string}
 */
export function formatDistanceKm(km) {
  if (!Number.isFinite(km) || km <= 0) return '0 km';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}
