# Next.js Map Demo - Location Service

Interactive map demo with geocoding search powered by AWS Location Service.

## Features

- 🗺️ Interactive map with MapLibre GL
- 🔍 Geocoding search with autocomplete
- 📍 Geolocation support
- 🧭 Navigation controls and scale
- ⚡ Built with Next.js 15 App Router
- 🎨 Styled with Tailwind CSS

## Prerequisites

- Node.js 18+ 
- Location Service API credentials

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add the endpoint and credentials shown for your application:
   ```
   LOCATION_API_URL=https://api.yourdomain.com
   LOCATION_CLIENT_ID=your_client_id
   LOCATION_CLIENT_SECRET=your_client_secret
   NEXT_PUBLIC_LOCATION_API_URL=https://api.yourdomain.com
   ```

   The first three stay on the server. `NEXT_PUBLIC_LOCATION_API_URL` is the
   same endpoint for the browser, where the map requests its style and tiles.
   The application's allowed domain must match where the sample runs:
   `localhost:3001`.

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   ```
   http://localhost:3001
   ```

## Project Structure

```
nextjs-map-demo/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with LocationProvider
│   │   └── page.tsx            # Home page with map
│   ├── components/
│   │   ├── LocationProvider.tsx # Client provider wrapper
│   │   └── MapDemo.tsx         # Map component with geocoder
│   ├── lib/
│   │   └── actions/
│   │       └── location.ts     # Server action for config
│   └── styles/
│       └── globals.css         # Global styles
├── package.json
└── README.md
```

## How It Works

1. **Server-side Authentication:**
   - `getLocationConfig()` Server Action fetches OAuth2 token, and replaces it when the provider (from `@chaosity/location-client-react` 0.10.0) reports it refused (`{ refusedToken }`)
   - Token is passed to client via `LocationClientProvider`

2. **Client-side Map:**
   - `MapDemo` component initializes MapLibre GL map with `createTransformRequest` for authenticated tile requests, and `refreshTokenOnUnauthorized` with the provider's `refreshToken`, so a tile the API refuses is reloaded with a new token (from `@chaosity/location-client-react` 0.10.1 and `@chaosity/location-client` 0.13.1)
   - `GeoPlaces` adapter connects Location Service to MapLibre Geocoder
   - Search box provides autocomplete geocoding

3. **Token Management:**
   - Provider automatically refreshes tokens before expiry, and replaces one the API refuses when the map asks (`refreshToken`)
   - No manual token handling needed in components

## Usage

### Basic Search

Type a location name in the search box to find places. Click a result to fly to that location.

### Geolocation

Click the geolocation button (crosshair icon) to center the map on your current location.

### Navigation

- **Zoom:** Use +/- buttons or scroll wheel
- **Pan:** Click and drag
- **Rotate:** Right-click and drag (or Ctrl+drag)
- **Tilt:** Ctrl+drag up/down

## Customization

### Change Map Style

The map opens on `Standard` / `Light`, the controls' initial state. To open on
another, change that state in `MapDemo.tsx`. The first load and the controls
share one set of style options, so the selects then show what the map shows:
```tsx
const [mapStyle, setMapStyle] = useState<MapStyle>('Monochrome')
const [colorScheme, setColorScheme] = useState('Dark')
```

`Standard` and `Monochrome` work on every plan with the map routes. `Hybrid` and
`Satellite`, a political view, 3D terrain and 3D buildings are plan features: an
application whose plan does not include one gets 403
`FeatureNotEntitledException` for the whole style, with a message naming the
feature. That is why the demo opens without them, offers each as a control, and
shows a refusal on the page while the map keeps its last style.

### Adjust Initial View

```tsx
const mapInstance = new maplibregl.Map({
  center: [-122.4, 37.8], // [longitude, latitude]
  zoom: 10,
})
```

### Customize Geocoder

```tsx
const geocoder = new MaplibreGeocoder(geoPlaces, {
  placeholder: 'Search for places',
  minLength: 3,
  limit: 5,
  // ... more options
})
```

## Learn More

- [Location Service Documentation](https://github.com/chaosity-io/location-service-client)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [Next.js Documentation](https://nextjs.org/docs)

## License

MIT
