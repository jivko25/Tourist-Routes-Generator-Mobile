require('dotenv').config();

module.exports = {
  name: 'Travel Go',
  slug: 'travel-go',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/TravelGoIcon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/TravelGoIcon.png',
    resizeMode: 'contain',
    backgroundColor: '#5BA8DC',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.travelgo.app',
    config: {
      googleMapsApiKey: process.env.GOOGLE_PLACES_API_KEY,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#5BA8DC',
      foregroundImage: './assets/TravelGoIcon.png',
    },
    package: 'com.travelgo.app',
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_PLACES_API_KEY,
      },
    },
  },
  web: {
    favicon: './assets/TravelGoIcon.png',
  },
  extra: {
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
  },
};
