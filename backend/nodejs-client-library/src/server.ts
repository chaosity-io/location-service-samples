import express from 'express'
import dotenv from 'dotenv'
import { LocationServiceConnector, SearchTextCommand, ReverseGeocodeCommand, SuggestCommand } from '@chaosity/location-client'


dotenv.config()

const app = express()
app.use(express.json())

// Connector auto-detects config from environment
const connector = new LocationServiceConnector()

console.log('✓ Location client configured')

// Search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query, biasPosition, maxResults = 5 } = req.body

    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    const result = await connector.send(
      new SearchTextCommand({
        QueryText: query,
        BiasPosition: biasPosition,
        MaxResults: maxResults
      }),
      { headers: { Origin: `${req.headers.origin}` } }
    )

    res.json(result)
  } catch (error: any) {
    console.error('Search error:', error)
    res.status(error.statusCode || 500).json({
      error: error.message || 'Search failed'
    })
  }
})

// Reverse geocode endpoint
app.post('/api/reverse-geocode', async (req, res) => {
  try {
    const { position } = req.body
    const { position } = req.body

    if (!position || !Array.isArray(position) || position.length !== 2) {
      return res.status(400).json({ error: 'Valid position [lng, lat] is required' })
    }

    const result = await connector.send(
      new ReverseGeocodeCommand({
        QueryPosition: position
      }),
      { headers: { Origin: `${req.headers.origin}` } }
    )

    res.json(result)
  } catch (error: any) {
    console.error('Reverse geocode error:', error)
    res.status(error.statusCode || 500).json({
      error: error.message || 'Reverse geocode failed'
    })
  }
})

// Autocomplete endpoint
app.post('/api/suggest', async (req, res) => {
  try {
    const { query, biasPosition, maxResults = 5 } = req.body

    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    const result = await connector.send(
      new SuggestCommand({
        QueryText: query,
        BiasPosition: biasPosition,
        MaxResults: maxResults
      }),
      { headers: { Origin: `${req.headers.origin}` } }
    )

    res.json(result)
  } catch (error: any) {
    console.error('Suggest error:', error)
    res.status(error.statusCode || 500).json({
      error: error.message || 'Suggest failed'
    })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || '3000'

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
