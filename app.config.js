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
  android: {
    adaptiveIcon: {
      backgroundColor: '#5BA8DC',
      foregroundImage: './assets/TravelGoIcon.png',
    },
    package: 'com.travelgo.app',
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
    ],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_PLACES_API_KEY,
      },
    },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.travelgo.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Travel Go uses your location to start the route from where you are.',
    },
    config: {
      googleMapsApiKey: process.env.GOOGLE_PLACES_API_KEY,
    },
  },
  plugins: [
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Allow Travel Go to use your location to start the route from where you are.',
      },
    ],
  ],
  web: {
    favicon: './assets/TravelGoIcon.png',
  },
  extra: {
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
    pexelsApiKey: process.env.PEXELS_API_KEY,
    getYourGuidePartnerId: process.env.GETYOURGUIDE_PARTNER_ID,
    eas: {
      projectId: '223672ff-5c6c-410e-a7d2-733b07881c13',
    },
  },
  owner: 'jivko25',
};
