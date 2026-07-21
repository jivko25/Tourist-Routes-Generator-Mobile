import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SEARCH_RADIUS_METERS,
  DEFAULT_TRAVEL_MODE,
  normalizeTravelMode,
} from '../utils/config';
import { DEFAULT_PLACE_CATEGORY_IDS } from '../constants/placeCategories';

const STORAGE_KEYS = {
  SELECTED_ATTRACTIONS: '@travel/selected_attractions',
  LAST_CITY: '@travel/last_city',
  SETTINGS: '@travel/settings',
};

export const DEFAULT_SETTINGS = {
  startAddress: '',
  endAddress: '',
  searchRadiusMeters: DEFAULT_SEARCH_RADIUS_METERS,
  selectedCategories: [...DEFAULT_PLACE_CATEGORY_IDS],
  travelMode: DEFAULT_TRAVEL_MODE,
};

function normalizeCategories(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return [...DEFAULT_PLACE_CATEGORY_IDS];
  }
  return value.filter((id) => typeof id === 'string');
}

/**
 * Local persistence layer — ready for saved trips / offline mode later.
 */
export const storageService = {
  async saveSelectedAttractions(attractions) {
    await AsyncStorage.setItem(
      STORAGE_KEYS.SELECTED_ATTRACTIONS,
      JSON.stringify(attractions)
    );
  },

  async loadSelectedAttractions() {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_ATTRACTIONS);
    return raw ? JSON.parse(raw) : [];
  },

  async saveLastCity(city) {
    if (!city) {
      await AsyncStorage.removeItem(STORAGE_KEYS.LAST_CITY);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_CITY, JSON.stringify(city));
  },

  async loadLastCity() {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_CITY);
    return raw ? JSON.parse(raw) : null;
  },

  async saveSettings(settings) {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  async loadSettings() {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };

    try {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        searchRadiusMeters:
          Number(parsed.searchRadiusMeters) || DEFAULT_SEARCH_RADIUS_METERS,
        selectedCategories: normalizeCategories(parsed.selectedCategories),
        travelMode: normalizeTravelMode(parsed.travelMode),
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  async clearRouteData() {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.SELECTED_ATTRACTIONS,
      STORAGE_KEYS.LAST_CITY,
    ]);
  },
};
