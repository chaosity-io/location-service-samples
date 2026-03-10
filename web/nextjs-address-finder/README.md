# Next.js Address Finder

Address autocomplete and validation using AWS Location Service. Searches within visible map area.

## Quick Start

```bash
npm install
cp .env.example .env  # Add your credentials
npm run dev           # http://localhost:3001
```

## Features

- **Map-Bounded Search** - Only finds addresses in visible map area
- **Smart Autocomplete** - Real-time suggestions (min 3 chars)
- **Address Validation** - Parses street, city, state, postal code, country
- **Geolocation** - "Use My Location" button
- **Coordinates** - Shows lat/lng for validated addresses

## Use Cases

- **Retail**: Find nearest store by postcode
- **Delivery**: Validate shipping addresses
- **Services**: Locate petrol stations, restaurants in area
- **Regional Search**: Zoom to city, search only within that area

## How It Works

1. User types address → Autocomplete API (filtered by map bounds)
2. User selects → GetPlace API validates and parses
3. Map shows marker at exact location
4. Address components displayed in panel

## API Usage

### Autocomplete with Map Bounds
```typescript
const bounds = map.getBounds()
const command = new AutocompleteCommand({
  QueryText: searchQuery,
  MaxResults: 5,
  Filter: {
    BoundingBox: [bounds.west, bounds.south, bounds.east, bounds.north],
  },
})
```

### Validate Address
```typescript
const command = new GetPlaceCommand({
  PlaceId: suggestion.PlaceId,
  Language: 'en',
})
const response = await client.send(command)
// response.Address contains: Street, Locality, Region, PostalCode, Country
```

### Reverse Geocode
```typescript
const command = new ReverseGeocodeCommand({
  QueryPosition: [longitude, latitude],
})
```

## Customization

### Change Map Style
```typescript
const styleUrl = `${apiUrl}/maps/Monochrome/descriptor?color-scheme=Dark`
```

### Filter by Country
```typescript
Filter: {
  IncludeCountries: ['US', 'CA'],
}
```

### Increase Suggestions
```typescript
MaxResults: 10,
```

## Architecture

```
src/
├── app/
│   ├── layout.tsx              # LocationProvider wrapper
│   └── page.tsx                # Main page
├── components/
│   └── AddressFinder.tsx       # Autocomplete + validation + map
└── lib/actions/
    └── location.ts             # Server action for config
```

## vs address-form-sdk-js

| Feature | SDK | This Sample |
|---------|-----|-------------|
| UI | Pre-built | Custom |
| Bundle | Larger | Smaller |
| Control | Limited | Full |
| Use Case | Drop-in form | Custom finder |

## Related

- [nextjs-map-demo](../nextjs-map-demo/) - Full map with styles/filters
- [nextjs-app-router](../nextjs-app-router/) - All Places API demos

## Learn More

- [Documentation](https://docs.chaosity.cloud)
- [Client Libraries](https://docs.chaosity.cloud/docs/client-libraries)
- [Authentication Guide](https://docs.chaosity.cloud/docs/authentication)
