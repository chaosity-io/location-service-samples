# Node.js Direct Authentication Sample

⚠️ **Prototyping only** - Uses HTTP Basic Auth with credentials in every request. Not recommended for production.

## Features

- ✅ **Simple setup** - No client library needed
- ✅ **No token management** - Credentials sent with each request
- ✅ **Direct HTTP requests** - Standard fetch API
- ✅ **Express REST API** - Search, reverse geocode, and autocomplete endpoints
- ✅ **TypeScript** - Full type safety

## ⚠️ Security Warning

**Server-side only:** Direct Authentication exposes credentials in every request. Only use in:
- Backend services
- Internal APIs
- Scripts and automation
- Quick prototyping

**Never use in:**
- Frontend applications
- Mobile apps
- Public-facing code
- Production deployments

**For production, use:** [nodejs-client-library](../nodejs-client-library) with automatic token management.

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
   PORT=3000
   ```

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
    "biasPosition": [-122.3321, 47.6062],
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
    "position": [-122.3493, 47.6205]
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
    "query": "star",
    "biasPosition": [-122.3321, 47.6062],
    "maxResults": 5
  }'
```

**Parameters:**
- `query` (required): Partial search text
- `biasPosition` (optional): [longitude, latitude] to bias results
- `maxResults` (optional): Number of suggestions (default: 5)

## Key Concepts

### Create Basic Auth Header
```typescript
// Using btoa (browser) or Buffer (Node.js)
const authHeader = `Basic ${btoa(`${clientId}:${clientSecret}`)}`

// Node.js alternative
const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
const authHeader = `Basic ${credentials}`
```

### Make API Request
```typescript
const response = await fetch(`${LOCATION_API_URL}/address/search/text`, {
  method: 'POST',
  headers: {
    'Authorization': authHeader,
    'Origin': 'http://localhost:3000', // Must match allowed origins
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    QueryText: 'Space Needle',
    MaxResults: 5
  })
})

const data = await response.json()
```

### Origin Header Required
The `Origin` header must match one of the allowed origins configured in your application settings.

**Important:** 
- In browsers, the `Origin` header is set automatically
- In Node.js/server environments, you must set it manually
- Must match exactly (including protocol and port)

### Error Handling
```typescript
try {
  const response = await fetch(url, options)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Request failed')
  }
  
  return await response.json()
} catch (error) {
  console.error('API Error:', error)
  throw error
}
```

## Direct API Testing

Test the Location Service API directly with curl:

```bash
# Search
curl -X POST "$LOCATION_API_URL/address/search/text" \
  -u "$LOCATION_CLIENT_ID:$LOCATION_CLIENT_SECRET" \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"QueryText": "Space Needle", "MaxResults": 5}'

# Reverse Geocode
curl -X POST "$LOCATION_API_URL/address/search/reverse-geocode" \
  -u "$LOCATION_CLIENT_ID:$LOCATION_CLIENT_SECRET" \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"QueryPosition": [-122.3493, 47.6205]}'

# Autocomplete
curl -X POST "$LOCATION_API_URL/address/suggestion" \
  -u "$LOCATION_CLIENT_ID:$LOCATION_CLIENT_SECRET" \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"QueryText": "star", "MaxResults": 5}'
```

## Learn More

- [Documentation](https://docs.chaosity.io)
- [Authentication Guide](https://docs.chaosity.io/docs/authentication)
- [Direct Auth Method](https://docs.chaosity.io/docs/authentication/methods#method-1-direct-authentication)
- **For production:** [nodejs-client-library](../nodejs-client-library) with automatic token management
