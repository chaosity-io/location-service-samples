import express from 'express'
import dotenv from 'dotenv'
import { TokenManager } from './token-manager.js'

dotenv.config()

const app = express()
app.use(express.json())

const { LOCATION_API_URL, LOCATION_CLIENT_ID, LOCATION_CLIENT_SECRET, PORT = '3000' } = process.env
if (!LOCATION_API_URL || !LOCATION_CLIENT_ID || !LOCATION_CLIENT_SECRET) {
  throw new Error('Missing required environment variables')
}

const tokenManager = new TokenManager(
  LOCATION_API_URL,
  LOCATION_CLIENT_ID,
  LOCATION_CLIENT_SECRET
)

console.log('✓ Token manager initialized')

function getOriginHeader(req: express.Request): Record<string, string> {
  if (req.headers.origin) {
    return { 'Origin': req.headers.origin }
  }
  
  if (req.headers.referer) {
    try {
      const url = new URL(req.headers.referer)
      return { 'Origin': url.origin }
    } catch {}
  }
  
  if (req.headers.host) {
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'
    return { 'Origin': `${protocol}://${req.headers.host}` }
  }
  
  return {}
}

async function makeRequest(endpoint: string, body: any, headers: Record<string, string> = {}) {
  const token = await tokenManager.getToken()
  
  const response = await fetch(`${LOCATION_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Request failed')
  }

  return response.json()
}

app.post('/api/search', async (req, res) => {
  try {
    const { query, biasPosition, maxResults = 5 } = req.body
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    const result = await makeRequest('/address/search/text', {
      QueryText: query,
      BiasPosition: biasPosition,
      MaxResults: maxResults
    }, getOriginHeader(req))

    res.json(result)
  } catch (error: any) {
    console.error('Search error:', error)
    res.status(500).json({ error: error.message || 'Search failed' })
  }
})

app.post('/api/reverse-geocode', async (req, res) => {
  try {
    const { position } = req.body
    
    if (!position || !Array.isArray(position) || position.length !== 2) {
      return res.status(400).json({ error: 'Valid position [lng, lat] is required' })
    }

    const result = await makeRequest('/address/search/reverse-geocode', {
      QueryPosition: position
    }, getOriginHeader(req))

    res.json(result)
  } catch (error: any) {
    console.error('Reverse geocode error:', error)
    res.status(500).json({ error: error.message || 'Reverse geocode failed' })
  }
})

app.post('/api/suggest', async (req, res) => {
  try {
    const { query, biasPosition, maxResults = 5 } = req.body
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    const result = await makeRequest('/address/suggestion', {
      QueryText: query,
      BiasPosition: biasPosition,
      MaxResults: maxResults
    }, getOriginHeader(req))

    res.json(result)
  } catch (error: any) {
    console.error('Suggest error:', error)
    res.status(500).json({ error: error.message || 'Suggest failed' })
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
