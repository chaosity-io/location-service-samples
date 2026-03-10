# Node.js OAuth2 Library Sample

Token generation using the `client-oauth2` library for OAuth 2.0 client credentials flow.

## Features

- ✅ **OAuth2 library** - Uses `client-oauth2` for token management
- ✅ **Automatic token handling** - Library handles OAuth 2.0 flow
- ✅ **Custom caching** - Token cache with JWT expiry checking
- ✅ **60-second buffer** - Proactive token refresh before expiry
- ✅ **Express REST API** - Search, reverse geocode, and autocomplete endpoints
- ✅ **TypeScript** - Full type safety

## Use Cases

- Learning OAuth 2.0 with established libraries
- Understanding token lifecycle with library abstractions
- Comparing library vs manual implementation
- Educational purposes

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
   LOCATION_ALLOWED_DOMAIN=example.com
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

### Initialize OAuth2 Client
```typescript
import ClientOAuth2 from 'client-oauth2'

const oauth2Client = new ClientOAuth2({
  clientId: clientId,
  clientSecret: clientSecret,
  accessTokenUri: `${apiUrl}/auth/token`,
})
```

### Get Token with Library
```typescript
// Library handles the HTTP request and authentication
const token = await oauth2Client.credentials.getToken()
const accessToken = token.accessToken
```

### Decode JWT and Cache Token
```typescript
import { decodeJwt } from 'jose'

const decoded = decodeJwt(accessToken)

// Cache with expiry from JWT
cache = {
  token: accessToken,
  expiresAt: decoded.exp || Math.floor(Date.now() / 1000) + 3600
}
```

### Check Expiry with Buffer
```typescript
async getToken(): Promise<string> {
  // Return cached token if still valid (with 60 second buffer)
  if (this.cache && Date.now() / 1000 < this.cache.expiresAt - 60) {
    return this.cache.token
  }
  
  // Generate new token using library
  const token = await this.oauth2Client.credentials.getToken()
  return token.accessToken
}
```

### Make API Request with Token
```typescript
// In Express endpoint handler
app.post('/api/search', async (req, res) => {
  const token = await tokenManager.getToken()

  const response = await fetch(`${LOCATION_API_URL}/address/search/text`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Origin': process.env.LOCATION_ALLOWED_DOMAIN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      QueryText: req.body.query,
      MaxResults: req.body.maxResults || 5
    })
  })

  const data = await response.json()
  res.json(data)
})
```

### Origin Header Required
The `Origin` header must match one of the allowed domains configured in your application settings.

**Important:**
- Set `LOCATION_ALLOWED_DOMAIN` in your `.env` to your configured domain (e.g., `example.com`)
- The value is the domain name without protocol (not `https://example.com`)
- In browsers, the `Origin` header is set automatically by the browser

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

## Token Manager

The `TokenManager` class handles:
- OAuth2 client initialization with `client-oauth2`
- Token generation via library (abstracts HTTP details)
- JWT decoding to extract expiry time
- Caching with expiry timestamps from JWT
- Automatic refresh when expired
- 60-second buffer before expiry

## Library vs Manual Comparison

**OAuth2 Library (this sample):**
- ✅ Abstracts OAuth 2.0 protocol details
- ✅ Handles request formatting automatically
- ✅ Well-tested and maintained
- ❌ Additional dependency

**Manual Implementation ([nodejs-manual-token](../nodejs-manual-token)):**
- ✅ No external OAuth dependencies
- ✅ Full control over requests
- ✅ Educational - see exact HTTP flow
- ❌ More code to maintain

## Direct API Testing

Test token generation and API calls directly with curl:

```bash
# Generate token (library handles this internally)
TOKEN=$(curl -X POST "$LOCATION_API_URL/auth/token" \
  -u "$LOCATION_CLIENT_ID:$LOCATION_CLIENT_SECRET" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'grant_type=client_credentials' \
  | jq -r '.access_token')

# Search
curl -X POST "$LOCATION_API_URL/address/search/text" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Origin: example.com" \
  -H "Content-Type: application/json" \
  -d '{"QueryText": "Space Needle", "MaxResults": 5}'

# Reverse Geocode
curl -X POST "$LOCATION_API_URL/address/search/reverse-geocode" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Origin: example.com" \
  -H "Content-Type: application/json" \
  -d '{"QueryPosition": [-122.3493, 47.6205]}'

# Autocomplete
curl -X POST "$LOCATION_API_URL/address/suggestion" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Origin: example.com" \
  -H "Content-Type: application/json" \
  -d '{"QueryText": "star", "MaxResults": 5}'
```

## Learn More

- [Documentation](https://docs.chaosity.cloud)
- [Authentication Guide](https://docs.chaosity.cloud/docs/authentication)
- [Token-Based Auth Method](https://docs.chaosity.cloud/docs/authentication/methods#method-2-token-based-authentication)
- [client-oauth2 Library](https://github.com/lelylan/simple-oauth2)
- **For production:** [nodejs-client-library](../nodejs-client-library) with automatic token management
