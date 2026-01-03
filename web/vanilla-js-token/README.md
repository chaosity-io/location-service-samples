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

### ✅ SPA Cannot Use LocationClientProvider
- No server-side (no Server Actions)
- Must use separate backend for tokens
- Frontend caches tokens manually

### ✅ Token Caching in Frontend
```javascript
let tokenCache = null

async function getToken() {
  if (tokenCache && Date.now() < tokenCache.expires_at) {
    return tokenCache  // Reuse cached token
  }
  
  // Fetch new token from backend
  const response = await fetch('http://localhost:3001/api/token')
  tokenCache = await response.json()
  return tokenCache
}
```

### ✅ Backend Uses getToken()
```typescript
const config = await getClientConfig({...})

app.get('/api/token', async (req, res) => {
  const { token, expiresAt } = await config.getToken()
  res.json({ access_token: token, expires_at: expiresAt })
})
```

## Setup

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

Backend runs on `http://localhost:3001`

### 2. Frontend Setup

```bash
cd frontend
# Serve with any static server
python -m http.server 8000
# or
npx serve
```

Frontend runs on `http://localhost:8000`

### 3. Test

1. Open `http://localhost:8000`
2. Search for "Space Needle"
3. Check browser console - see token caching

## Files

### Backend
- `server.ts` - Token generation endpoint
- `.env` - Credentials (not committed)

### Frontend
- `index.html` - UI
- `app.js` - Token caching + API calls
- `styles.css` - Styles

## Security

✅ Credentials stay in backend
✅ Frontend only receives tokens
✅ Tokens cached and reused
✅ CORS enabled for local development

## Learn More

- [Documentation](https://docs.chaosity.io)
- [Authentication Methods](https://docs.chaosity.io/docs/authentication/methods)
- [Token Lifecycle](https://docs.chaosity.io/docs/authentication/token-lifecycle)
