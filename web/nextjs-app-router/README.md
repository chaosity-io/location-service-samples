# Next.js App Router Sample

**Recommended for React** — Next.js 15 with App Router, Server Actions, and `LocationClientProvider`.

Interactive demo showcasing all 7 Places API endpoints with tabbed navigation.

## Features

- **Server Actions** — Secure credential handling (secrets never reach the browser)
- **LocationClientProvider** — Automatic token management with 60s refresh buffer
- **React hooks** — `useLocationClient()` for easy client access
- **TypeScript** — Full type safety with AWS SDK command types
- **All Places APIs** — SearchText, Autocomplete, Suggest, Geocode, ReverseGeocode, SearchNearby, GetPlace

## API Endpoints Demonstrated

| API | Description | Use Case |
|-----|-------------|----------|
| **SearchText** | Find places by keyword or phrase | Search bars, place discovery |
| **Autocomplete** | Address suggestions as user types | Checkout forms, address inputs |
| **Suggest** | Search predictions (places + queries) | Type-ahead search bars |
| **Geocode** | Address to coordinates | Mapping, spatial analysis |
| **ReverseGeocode** | Coordinates to address | Map clicks, GPS locations |
| **SearchNearby** | Places within a radius | "Near me" features |
| **GetPlace** | Full details by PlaceId | Place detail pages |

## Prerequisites

- Node.js 18+
- Location Service API credentials

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure credentials:**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your credentials:
   ```bash
   LOCATION_API_URL=https://api.yourdomain.com
   LOCATION_CLIENT_ID=your_client_id
   LOCATION_CLIENT_SECRET=your_client_secret
   ```

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
src/
├── app/
│   ├── layout.tsx              # Root layout with LocationProvider
│   └── page.tsx                # Home page with DemoTabs
├── components/
│   ├── LocationProvider.tsx     # Client provider wrapper
│   ├── DemoTabs.tsx            # Tabbed navigation for all APIs
│   ├── SearchBox.tsx           # SearchText demo
│   ├── AutocompleteBox.tsx     # Autocomplete demo
│   ├── SuggestBox.tsx          # Suggest demo
│   ├── GeocodeBox.tsx          # Geocode demo
│   ├── ReverseGeocodeBox.tsx   # ReverseGeocode demo
│   ├── SearchNearbyBox.tsx     # SearchNearby demo
│   └── GetPlaceBox.tsx         # GetPlace demo
├── lib/
│   └── actions/
│       └── location.ts         # Server Action (getLocationConfig)
└── styles/
    └── globals.css             # Global styles
```

## Key Concepts

### 1. Server Action (credentials stay server-side)
```typescript
'use server'
import { getClientConfig } from '@chaosity/location-client/server'

export async function getLocationConfig() {
  return getClientConfig({
    apiUrl: process.env.LOCATION_API_URL!,
    clientId: process.env.LOCATION_CLIENT_ID!,
    clientSecret: process.env.LOCATION_CLIENT_SECRET!
  })
}
```

### 2. Provider wraps your app
```tsx
<LocationClientProvider getConfig={getLocationConfig}>
  {children}
</LocationClientProvider>
```

### 3. Use in any client component
```tsx
import { useLocationClient } from '@chaosity/location-client-react'
import { SearchTextCommand } from '@chaosity/location-client'

const { client, loading, error } = useLocationClient()

const result = await client.send(new SearchTextCommand({
  QueryText: 'Space Needle',
  MaxResults: 5,
}))
```

## Security

- Credentials stay server-side (Server Actions)
- Only access tokens reach the browser (not client ID/secret)
- Automatic token refresh with 60-second buffer before expiry
- No credential exposure in client bundle

## Learn More

- [Documentation](https://docs.chaosity.cloud)
- [Authentication Guide](https://docs.chaosity.cloud/docs/authentication)
- [React Client](https://www.npmjs.com/package/@chaosity/location-client-react)
- [Next.js App Router](https://nextjs.org/docs/app)
