import worldMap from '@svg-maps/world';

const world = worldMap?.default || worldMap;

export const WORLD_VIEW_BOX = world.viewBox || '0 0 1010 666';

const [ , , vbW, vbH] = WORLD_VIEW_BOX.split(/\s+/).map(Number);
export const WORLD_WIDTH = vbW || 1010;
export const WORLD_HEIGHT = vbH || 666;

export const WORLD_LOCATIONS = (world.locations || []).map((loc) => ({
  id: String(loc.id || '').toUpperCase(),
  name: loc.name || String(loc.id || '').toUpperCase(),
  path: loc.path,
}));

const BY_CODE = new Map(WORLD_LOCATIONS.map((loc) => [loc.id, loc]));
const BY_NAME = new Map(
  WORLD_LOCATIONS.map((loc) => [loc.name.toLowerCase(), loc.id])
);

export function getCountryByCode(code) {
  if (!code) return null;
  return BY_CODE.get(String(code).toUpperCase()) || null;
}

export function getCountryName(code) {
  return getCountryByCode(code)?.name || String(code || '').toUpperCase();
}

/**
 * Resolve ISO-like country code from free text ("Paris, France" / "Bulgaria").
 */
export function resolveCountryCodeFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    const code = trimmed.toUpperCase();
    return BY_CODE.has(code) ? code : null;
  }

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  const candidates = [...parts].reverse();

  for (const part of candidates) {
    const hit = BY_NAME.get(part.toLowerCase());
    if (hit) return hit;
  }

  const lower = trimmed.toLowerCase();
  for (const [name, code] of BY_NAME.entries()) {
    if (lower.includes(name)) return code;
  }

  return null;
}
