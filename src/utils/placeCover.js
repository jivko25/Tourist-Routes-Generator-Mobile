import { colors } from '../theme/colors';

/**
 * Free visual covers by place type — no Places Photo API.
 */

const COVER_PRESETS = [
  {
    match: /(restaurant|cafe|bakery|meal|food|bar)/i,
    icon: 'silverware-fork-knife',
    colors: ['#F97316', '#C2410C'],
  },
  {
    match: /(museum|gallery|art|theater|theatre|cultural)/i,
    icon: 'palette',
    colors: ['#8B5CF6', '#5B21B6'],
  },
  {
    match: /(park|garden|nature|hiking|national_park|zoo|aquarium)/i,
    icon: 'tree',
    colors: ['#22C55E', '#15803D'],
  },
  {
    match: /(church|mosque|synagogue|temple|hindu|religious)/i,
    icon: 'church',
    colors: ['#64748B', '#334155'],
  },
  {
    match: /(amusement|stadium|casino)/i,
    icon: 'ferris-wheel',
    colors: ['#EC4899', '#BE185D'],
  },
  {
    match: /(landmark|monument|historical|tourist)/i,
    icon: 'binoculars',
    colors: ['#3B82F6', '#1D4ED8'],
  },
];

const DEFAULT_PRESET = {
  icon: 'map-marker',
  colors: [colors.primary, colors.primaryDark],
};

/**
 * @param {{ primaryType?: string|null, category?: string|null, name?: string|null }} place
 */
export function getPlaceCoverPreset(place = {}) {
  const haystack = [place.primaryType, place.category, place.name]
    .filter(Boolean)
    .join(' ');

  const match = COVER_PRESETS.find((preset) => preset.match.test(haystack));
  return match || DEFAULT_PRESET;
}
