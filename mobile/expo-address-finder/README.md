# expo-address-finder

A React Native (Expo) sample that demonstrates address autocomplete, geocoding, reverse geocoding, and interactive map display using the Chaosity Location Service. This is a direct port of the `nextjs-address-finder` web sample — the same commands and React hooks are used; only the UI layer changes.

## What this sample demonstrates

- Address autocomplete suggestions as you type (`AutocompleteCommand`)
- Full geocoding mode for complete address strings (`GeocodeCommand`)
- Place detail resolution from a suggestion (`GetPlaceCommand`)
- Reverse geocoding from device GPS coordinates (`ReverseGeocodeCommand`)
- Authenticated MapLibre map with a flyTo animation on selection
- Short-lived token management via `LocationClientProvider` with automatic refresh

## Architecture

```
┌─────────────────────────────────────┐
│  React Native app (app/)            │
│  LocationClientProvider             │
│    → fetches token from backend     │
│    → passes client to components    │
│  AddressFinder component            │
│    → autocomplete / geocode         │
│    → MapLibre map (native module)   │
└────────────────┬────────────────────┘
                 │ GET /config
┌────────────────▼────────────────────┐
│  Token backend (backend/)           │
│  Express + getClientConfig()        │
│    → exchanges client credentials   │
│      for a short-lived API token    │
│    → returns { apiUrl, token,       │
│                expiresAt }          │
└─────────────────────────────────────┘
```

**Why a token backend?** The Location Service API uses client credentials that must never be shipped inside a mobile app bundle. The backend holds the `LOCATION_CLIENT_ID` and `LOCATION_CLIENT_SECRET`, exchanges them for short-lived tokens, and vends those tokens to the app over a local (or deployed) HTTP endpoint.

## What is the same as the web sample

- All four SDK commands (`AutocompleteCommand`, `GeocodeCommand`, `GetPlaceCommand`, `ReverseGeocodeCommand`) are imported from `@chaosity/location-client` with identical inputs and outputs.
- `LocationClientProvider` from `@chaosity/location-client-react` wraps the app and manages token lifecycle.
- `useLocationClient()` provides `{ client, getToken, loading, error }` — same hook, same API.
- `createTransformRequest` authenticates map tile requests identically to the web version.
- The `getConfig` function fetches `{ apiUrl, token, expiresAt }` from the token backend (replaces the Next.js Server Action).

## What is different from the web sample

| Web (Next.js) | React Native (Expo) |
|---|---|
| HTML elements (`div`, `input`, `ul`) | `View`, `TextInput`, `FlatList`, `TouchableOpacity`, `Text` |
| Tailwind CSS classes | `StyleSheet.create()` |
| `navigator.geolocation` | `expo-location` `getCurrentPositionAsync()` |
| `maplibre-gl` (WebGL, browser) | `@maplibre/maplibre-react-native` (native module) |
| `new maplibregl.Map({ transformRequest })` | `<MapView transformRequest={...}>` prop |
| `import 'maplibre-gl/dist/maplibre-gl.css'` | Not needed |
| Next.js Server Action for token | Express backend + `fetch('/config')` |

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli` (or use `npx expo`)
- A physical device or simulator/emulator — **Expo Go is not supported** (see note below)
- Chaosity Location Service credentials from [portal.chaosity.cloud](https://portal.chaosity.cloud)

## Quick start

### 1. Start the token backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your LOCATION_CLIENT_ID and LOCATION_CLIENT_SECRET
npm run dev
```

The backend will start on `http://localhost:3001`. Verify it is running:

```bash
curl http://localhost:3001/health
# {"status":"ok"}
```

### 2. Configure the app

```bash
cd app
npm install
cp .env.example .env
# Edit .env if needed (defaults point to localhost:3001)
```

If running on a physical device, replace `localhost` in `EXPO_PUBLIC_TOKEN_BACKEND_URL` with your machine's local IP address (e.g. `http://192.168.1.42:3001`).

### 3. Run the app

```bash
cd app
npx expo run:ios
# or
npx expo run:android
```

The `run:ios` / `run:android` commands build a development client that includes the native MapLibre module.

## Note: expo-dev-client required (not Expo Go)

This sample uses `@maplibre/maplibre-react-native`, which contains native code (C++ / Obj-C / Java). Expo Go only supports the Expo SDK's built-in native modules and cannot load third-party native modules.

You must use `expo-dev-client` (already included in `app/package.json`) and build the app with `expo run:ios` or `expo run:android`. This compiles a custom development build that includes the MapLibre native module.

If you are setting up EAS Build, add `expo-dev-client` to your build profile and run `eas build --profile development`.
