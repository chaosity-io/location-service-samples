import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(express.json())

// Validate environment variables
const { LOCATION_API_URL, LOCATION_CLIENT_ID, LOCATION_CLIENT_SECRET, PORT = '3000' } = process.env
if (!LOCATION_API_URL || !LOCATION_CLIENT_ID || !LOCATION_CLIENT_SECRET ) {
  throw new Error('Missing required environment variables')
}

const origin = `http://localhost:${PORT}`
// Create Basic Auth header
const authHeader = `Basic ${btoa(`${LOCATION_CLIENT_ID}:${LOCATION_CLIENT_SECRET}`)}`

console.log('✓ Direct Authentication configured')

// Helper function for API requests
async function makeRequest(endpoint: string, body: any, req: express.Request) {
  // Get origin from request headers
  const origin = req.headers.origin || 
    (req.headers.referer ? new URL(req.headers.referer).origin : '') ||
    `${req.secure ? 'https' : 'http'}://${req.headers.host}`
  
  const response = await fetch(`${LOCATION_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Origin': origin,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Request failed')
  }

  return response.json()
}

// Search endpoint
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
    })

    res.json(result)
  } catch (error: any) {
    console.error('Search error:', error)
    res.status(500).json({ error: error.message || 'Search failed' })
  }
})

// Reverse geocode endpoint
app.post('/api/reverse-geocode', async (req, res) => {
  try {
    const { position } = req.body
    
    if (!position || !Array.isArray(position) || position.length !== 2) {
      return res.status(400).json({ error: 'Valid position [lng, lat] is required' })
    }

    const result = await makeRequest('/address/search/reverse-geocode', {
      QueryPosition: position
    })

    res.json(result)
  } catch (error: any) {
    console.error('Reverse geocode error:', error)
    res.status(500).json({ error: error.message || 'Reverse geocode failed' })
  }
})

// Autocomplete endpoint
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
    })

    res.json(result)
  } catch (error: any) {
    console.error('Suggest error:', error)
    res.status(500).json({ error: error.message || 'Suggest failed' })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
