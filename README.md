# Travel Go

React Native (Expo) travel planner: search a city, discover nearby attractions via Google Places API (New), select stops, optimize the route, and open it in Google Maps.

## Stack

- Expo SDK 54 + React Native (JavaScript) — compatible with Expo Go from the Play Store
- React Navigation
- React Native Paper
- Axios
- AsyncStorage
- Context API

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env`:

```env
GOOGLE_PLACES_API_KEY=your_key_here
```

3. Enable in Google Cloud Console:

- Geocoding API
- Places API (New)

4. Start the app:

```bash
npm start
```

## Architecture

```
src/
  components/     UI building blocks
  screens/        Home, Attractions, Route
  services/       Geocoding, Places, Maps, Storage
  context/        Global travel state
  hooks/          usePlaces search flow
  types/          City / Attraction models
  utils/          Config + Maps URL helpers
  theme/          Design tokens
```

## Flow

1. **Home** — enter a city (e.g. Paris)
2. Geocode city → coordinates
3. **Places Nearby** — tourist attractions within 10 km
4. **Attractions** — select places (persisted locally)
5. **Route** — generate & open Google Maps directions URL
