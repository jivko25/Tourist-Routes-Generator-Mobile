require('dotenv').config();

function googleAndroidReverseScheme() {
  const id = String(
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || ''
  ).trim();
  const hash = id.replace(/\.apps\.googleusercontent\.com$/i, '');
  if (!hash || hash === id) return null;
  // Required so Google can redirect back after Drive OAuth.
  return `com.googleusercontent.apps.${hash}`;
}

const schemes = ['travelgo', googleAndroidReverseScheme()].filter(Boolean);

module.exports = {
  name: 'Travel Go',
  slug: 'travel-go',
  version: '1.0.0',
  scheme: schemes.length === 1 ? schemes[0] : schemes,
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
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'CAMERA',
      'READ_MEDIA_IMAGES',
      'READ_EXTERNAL_STORAGE',
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
        'Travel Go uses your location to start the route from where you are and to detect when you arrive at a stop.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Travel Go uses background location during a live trip to notify you when you arrive at the next stop — even if Maps is open.',
      NSLocationAlwaysUsageDescription:
        'Travel Go uses background location during a live trip to notify you when you arrive at the next stop.',
      NSCameraUsageDescription:
        'Travel Go uses the camera so you can add photos to a city album.',
      NSPhotoLibraryUsageDescription:
        'Travel Go needs photo access to attach your pictures to city albums without duplicating them.',
      NSPhotoLibraryAddUsageDescription:
        'Travel Go can save a camera photo to your library and link it to a city album.',
    },
    config: {
      googleMapsApiKey: process.env.GOOGLE_PLACES_API_KEY,
    },
  },
  plugins: [
    'expo-localization',
    'expo-web-browser',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Allow Travel Go to use your location to start routes and detect arrivals at stops.',
        locationAlwaysAndWhenInUsePermission:
          'Allow Travel Go to track your live trip in the background and notify you when you arrive at the next stop.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/TravelGoIcon.png',
        color: '#3B82F6',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Allow Travel Go to attach your photos to city albums.',
        cameraPermission:
          'Allow Travel Go to take photos for city albums.',
      },
    ],
    [
      'expo-media-library',
      {
        photosPermission:
          'Allow Travel Go to link photos from your library to city albums.',
        savePhotosPermission:
          'Allow Travel Go to save camera photos to your library for city albums.',
        isAccessMediaLocationEnabled: false,
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
    travelApiBaseUrl:
      process.env.EXPO_PUBLIC_API_BASE_URL ||
      process.env.TRAVEL_API_BASE_URL ||
      'https://tourist-routes-generator-server.vercel.app',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    googleAndroidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    eas: {
      projectId: '223672ff-5c6c-410e-a7d2-733b07881c13',
    },
  },
  owner: 'jivko25',
};
