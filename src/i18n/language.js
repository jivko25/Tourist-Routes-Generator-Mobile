import i18n, { normalizeLanguage, toGoogleLanguage } from './index';

/**
 * Current app language (en | bg).
 */
export function getAppLanguage() {
  return normalizeLanguage(i18n.language);
}

/**
 * Language code for Google Places / Geocoding / Routes.
 */
export function getGoogleLanguageCode() {
  return toGoogleLanguage(getAppLanguage());
}

/**
 * Change UI language (also used before settings hydrate completes).
 * @param {string} language
 */
export async function setAppLanguage(language) {
  const next = normalizeLanguage(language);
  if (i18n.language !== next) {
    await i18n.changeLanguage(next);
  }
  return next;
}
