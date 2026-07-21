require('dotenv').config();

module.exports = {
  name: 'Tourist Routes Generator',
  slug: 'Tourist-Routes-Generator-Mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0B3D2E',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.touristroutes.generator',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#0B3D2E',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    package: 'com.touristroutes.generator',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
  },
};
