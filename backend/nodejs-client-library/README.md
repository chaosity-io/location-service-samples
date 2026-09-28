# Node.js Client Library Sample

⭐ **Recommended approach** - Uses `@chaosity/location-client` with `LocationServiceConnector` for server-side usage.

## Features

- ✅ **Zero-config setup** - Auto-detects credentials from environment
- ✅ **Automatic token management** - Internal caching and refresh
- ✅ **AWS SDK commands** - Type-safe `SearchTextCommand`, `ReverseGeocodeCommand`, `SuggestCommand`
- ✅ **Express REST API** - Search, reverse geocode, and autocomplete endpoints
- ✅ **TypeScript** - Full type safety

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
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```bash
   LOCATION_API_URL=https://api.yourdomain.com
   LOCATION_CLIENT_ID=your_client_id
   LOCATION_CLIENT_SECRET=your_client_secret
   LOCATION_ORIGIN=https://example.com
   PORT=3000
   ```

   `LOCATION_API_URL` is the endpoint shown for your application. The API
   refuses any request whose `Origin` is not the application's allowed domain.
   This server forwards the `Origin` of the request it receives, and sends
   `LOCATION_ORIGIN` when there is none, as with the `curl` calls below.

3. **Run development server:**
   ```bash
   npm run dev
   ```

## API Endpoints

### Search
Search for places by text query with optional position bias.

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Space Needle",
    "biasPosition": [150.6916303670001, -33.77936728914894],
    "maxResults": 5
  }'
```

**Parameters:**
- `query` (required): Search text
- `biasPosition` (optional): [longitude, latitude] to bias results
- `maxResults` (optional): Number of results (default: 5)

### Reverse Geocode
Convert coordinates to address.

```bash
curl -X POST http://localhost:3000/api/reverse-geocode \
  -H "Content-Type: application/json" \
  -d '{
    "position": [150.6916303670001, -33.77936728914894]
  }'
```

**Parameters:**
- `position` (required): [longitude, latitude]

### Autocomplete/Suggest
Get autocomplete suggestions for partial queries.

```bash
curl -X POST http://localhost:3000/api/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "query": "IFly",
    "biasPosition": [150.6916303670001, -33.77936728914894],
    "maxResults": 5
  }'
```

**Parameters:**
- `query` (required): Partial search text
- `biasPosition` (optional): [longitude, latitude] to bias results
- `maxResults` (optional): Number of suggestions (default: 5)

## Key Concepts

### Zero-Config Setup
```typescript
import { LocationServiceConnector } from '@chaosity/location-client/server'

// Auto-detects from environment variables:
// LOCATION_API_URL, LOCATION_CLIENT_ID, LOCATION_CLIENT_SECRET, LOCATION_ORIGIN
const connector = new LocationServiceConnector()
```

### Send Commands
```typescript
import { SearchTextCommand } from '@chaosity/location-client'

const result = await connector.send(
  new SearchTextCommand({ QueryText: 'Space Needle' })
)
```

### Forwarding the caller's Origin (Optional)
```typescript
// A per-call Origin beats LOCATION_ORIGIN. Send one only when the incoming
// request has one: `${req.headers.origin}` would send the string "undefined".
const result = await connector.send(
  new SearchTextCommand({ QueryText: 'Space Needle' }),
  req.headers.origin ? { headers: { Origin: req.headers.origin } } : undefined,
)
```

## Learn More

- [Documentation](https://docs.chaosity.cloud)
- [Client Library](https://www.npmjs.com/package/@chaosity/location-client)
- [Authentication Guide](https://docs.chaosity.cloud/docs/authentication)
