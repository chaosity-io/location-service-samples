# Full-Featured Next.js Address Finder

Address finder with autocomplete, validation, and comprehensive map controls including style, political view, country filter, and language settings.

## Features

- **Address Search**: Autocomplete and Geocode modes with debounced search
- **Map Styles**: Standard, Monochrome, Hybrid, Satellite
- **Color Schemes**: Light and Dark modes
- **Political Views**: 9 country-specific views (India, Argentina, Egypt, Morocco, Russia, Sudan, Serbia, Syria, Turkey)
- **Country Filter**: 14 countries for search filtering
- **Multi-Language**: 12 language options for map labels and search
- **Click-to-Search**: Reverse geocode by clicking map
- **Current Location**: Use device geolocation

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3004](http://localhost:3004)

## Configuration

Set environment variables in `.env.local`:

```env
NEXT_PUBLIC_LOCATION_API_URL=your-api-url
NEXT_PUBLIC_LOCATION_API_KEY=your-api-key
```

## Usage

1. Select map style, color scheme, and filters
2. Choose country filter to limit search results
3. Select language for map labels
4. Type address in search box (3+ characters)
5. Toggle between Autocomplete and Geocode modes
6. Click map to reverse geocode location
7. Use "My Location" button for current position
