# Vanilla JS Token Sample

Pure JavaScript SPA with separate backend for token generation. Shows proper token caching and reuse.

## Architecture

```
Frontend (SPA)          Backend (Express)       Location API
─────────────          ─────────────────       ─────────────
index.html             server.ts
app.js                 ↓
  │                    GET /api/token
  ├─────────────────> (generates token) ───────> OAuth2
  │                    ↓
  │ {token, expires}   Returns token
  │<───────────────────┘
  │
  │ (caches token)
  │
  │ POST /address/search
  └──────────────────────────────────────────> API call
     Authorization: Bearer {token}
```

## Key Concepts

### SPA Cannot Use LocationClientProvider
- No server-side runtime (no Server Actions)
- Must use a separate backend for token generation
- Frontend caches tokens manually with a 60-second refresh buffer

### Token Caching in Frontend
```javascript
let tokenCache = null
const REFRESH_BUFFER_MS = 60_000

async function getToken() {
  if (tokenCache && Date.now() < tokenCache.expires_at - REFRESH_BUFFER_MS) {
    return tokenCache  // Reuse cached token
  }

  const response = await fetch('http://localhost:3001/api/token')
  tokenCache = await response.json()
  return tokenCache
}
```

### Backend Token Endpoint
```typescript
import { getClientConfig } from '@chaosity/location-client/server'

const credentials = {
  apiUrl: process.env.LOCATION_API_URL!,
  clientId: process.env.LOCATION_CLIENT_ID!,
  clientSecret: process.env.LOCATION_CLIENT_SECRET!,
}

app.get('/api/token', async (req, res) => {
  // getClientConfig handles token caching and refresh internally
  const config = await getClientConfig(credentials)
  res.json({
    access_token: config.token,
    expires_at: config.expiresAt ?? null,
    api_url: config.apiUrl,
  })
})
```

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env  # Add your credentials
npm run dev           # http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
# Serve with any static server
python -m http.server 8000
# or
npx serve
```

### 3. Test

1. Open `http://localhost:8000`
2. Search for "Space Needle"
3. Check browser console to see token caching in action

## Files

```
backend/
├── server.ts       # Token generation endpoint
├── .env.example    # Credentials template
└── package.json

frontend/
├── index.html      # UI
├── app.js          # Token caching + API calls
└── styles.css      # Styles
```

## Security

- Credentials stay in backend (never exposed to browser)
- Frontend only receives short-lived tokens
- Tokens cached and reused with 60-second refresh buffer
- CORS enabled for local development

## Learn More

- [Documentation](https://docs.chaosity.cloud)
- [Authentication Guide](https://docs.chaosity.cloud/docs/authentication)
- [Client Libraries](https://docs.chaosity.cloud/docs/client-libraries)
