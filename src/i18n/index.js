import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en.json';
import bg from './locales/bg.json';

export const SUPPORTED_LANGUAGES = ['en', 'bg'];
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
  if (code === 'bg') return 'bg';
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
    lng: detectDeviceLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
