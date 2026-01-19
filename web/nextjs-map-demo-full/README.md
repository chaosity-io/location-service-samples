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
   
   Edit `.env` and add your Location Service credentials:
   ```
   LOCATION_API_URL=https://your-api-url.com
   LOCATION_CLIENT_ID=your_client_id
   LOCATION_CLIENT_SECRET=your_client_secret
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   ```
   http://localhost:3002
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
   - `getLocationConfig()` Server Action fetches OAuth2 token
   - Token is passed to client via `LocationClientProvider`

2. **Client-side Map:**
   - `MapDemo` component initializes MapLibre GL map
   - `GeoPlaces` adapter connects Location Service to MapLibre Geocoder
   - Search box provides autocomplete geocoding

3. **Token Management:**
   - Provider automatically refreshes tokens before expiry
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

Edit `MapDemo.tsx`:
```tsx
const styleUrl = `${config.apiUrl}/maps/Satellite/descriptor?${params.toString()}`
```

Available styles: `Standard`, `Monochrome`, `Hybrid`, `Satellite`

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
