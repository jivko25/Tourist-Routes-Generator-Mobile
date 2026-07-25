import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en.json';
import bg from './locales/bg.json';

/** Flip to true when Bulgarian should be selectable again. */
export const IS_BULGARIAN_ENABLED = false;

export const SUPPORTED_LANGUAGES = IS_BULGARIAN_ENABLED
  ? ['en', 'bg']
  : ['en'];
export const DEFAULT_LANGUAGE = 'en';

/**
 * @param {string} [value]
 * @returns {'en'|'bg'}
 */
export function normalizeLanguage(value) {
  const code = String(value || '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];
  if (code === 'bg' && IS_BULGARIAN_ENABLED) return 'bg';
  if (code === 'en') return 'en';
  return DEFAULT_LANGUAGE;
}

/**
 * Device locale → supported app language.
 */
export function detectDeviceLanguage() {
  try {
    const tag =
      Localization.getLocales?.()?.[0]?.languageCode ||
      Localization.locale?.split?.('-')?.[0];
    return normalizeLanguage(tag);
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/**
 * Google APIs language / languageCode value.
 * @param {string} [appLanguage]
 */
export function toGoogleLanguage(appLanguage) {
  return normalizeLanguage(appLanguage);
}

const resources = {
  en: { translation: en },
  bg: { translation: bg },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
