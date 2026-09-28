# Next.js Map Demo

Interactive map with geocoding search, multiple styles, and advanced filters powered by Location Service.

## Quick Start

```bash
npm install
cp .env.example .env  # Add your credentials
npm run dev           # http://localhost:3001
```

`.env` needs four values: `LOCATION_API_URL`, `LOCATION_CLIENT_ID` and
`LOCATION_CLIENT_SECRET` (the endpoint and credentials shown for your
application, used on the server), and `NEXT_PUBLIC_LOCATION_API_URL`, the same
endpoint again for the browser's map requests. The application's allowed domain
must match where the sample runs: `localhost:3001`.

## Features

- **Multiple Map Styles** - Standard and Monochrome; Hybrid and Satellite on a plan that includes them
- **Color Schemes** - Light and Dark themes
- **Political Views** - Country-specific boundary representations, on a plan that includes them
- **Smart Geocoding** - Real-time search with autocomplete via MapLibre Geocoder
- **Multi-language** - 12 languages including English, Spanish, Japanese, Chinese
- **Country Filters** - Restrict search results to specific countries
- **Globe View** - 3D globe projection

Satellite, Hybrid, a political view and hillshading are plan features. The map
opens on plain Standard, which every plan with the map routes has; a style
change your plan does not include is refused (403
`FeatureNotEntitledException`), the page says which feature, and the map keeps
its last style.

## How It Works

1. Server Action fetches OAuth2 token via `getClientConfig()`
2. `LocationClientProvider` manages token lifecycle (auto-refresh before expiry)
3. `MapDemo` initializes MapLibre GL map with `createTransformRequest` for authenticated tile requests
4. `GeoPlaces` adapter connects Location Service to MapLibre Geocoder for search

## API Usage

### Map Tiles with Authentication
```typescript
import { createTransformRequest } from '@chaosity/location-client'

const map = new maplibregl.Map({
  style: `${apiUrl}/maps/Standard/descriptor?color-scheme=Light`,
  transformRequest: createTransformRequest(apiUrl, getToken),
})
```

### Geocoder Integration
```typescript
import { GeoPlaces } from '@chaosity/location-client'

const geoPlaces = new GeoPlaces(client, mapInstance)
const geocoder = new MaplibreGeocoder(geoPlaces, {
  maplibregl,
  showResultsWhileTyping: true,
  minLength: 3,
})
mapInstance.addControl(geocoder, 'top-left')
```

### Dynamic Style Changes
```typescript
const params = new URLSearchParams({ 'color-scheme': 'Dark' })
const styleUrl = `${apiUrl}/maps/Monochrome/descriptor?${params}`
```

A plan feature goes on the same query (`political-view=IND`, `terrain=Hillshade`)
or in the path (`/maps/Satellite/descriptor`). An application whose plan does not
include it gets 403 `FeatureNotEntitledException` for the whole style, with a
message naming the feature.

## Architecture

```
src/
├── app/
│   ├── layout.tsx              # LocationProvider wrapper
│   └── page.tsx                # Main page with MapDemo
├── components/
│   ├── LocationProvider.tsx     # Client provider wrapper
│   └── MapDemo.tsx             # Map + controls + geocoder
└── lib/actions/
    └── location.ts             # Server action for config
```

## Learn More

- [Documentation](https://docs.chaosity.cloud)
- [Client Libraries](https://docs.chaosity.cloud/docs/client-libraries)
- [Authentication Guide](https://docs.chaosity.cloud/docs/authentication)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
