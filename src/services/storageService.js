import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SELECTED_ATTRACTIONS: '@travel/selected_attractions',
  LAST_CITY: '@travel/last_city',
};

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

  async clearRouteData() {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.SELECTED_ATTRACTIONS,
      STORAGE_KEYS.LAST_CITY,
    ]);
  },
};
