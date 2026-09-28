import express from 'express'
import dotenv from 'dotenv'
import { LocationServiceConnector } from '@chaosity/location-client/server'
import {
  SearchTextCommand,
  type SearchTextCommandOutput,
  ReverseGeocodeCommand,
  type ReverseGeocodeCommandOutput,
  SuggestCommand,
  type SuggestCommandOutput,
} from '@chaosity/location-client'

dotenv.config()

const app = express()
app.use(express.json())

// Connector auto-detects config from environment, LOCATION_ORIGIN included
const connector = new LocationServiceConnector()

// The API refuses a request whose Origin is not the application's allowed
// domain. A browser's Origin is forwarded as it came; a caller without one
// (curl, a job) gets the connector's LOCATION_ORIGIN. Forwarding
// `${req.headers.origin}` sent the string "undefined" for such a caller, and a
// per-call header beats the connector's default, so it was refused.
const forwardOrigin = (req: express.Request) =>
  req.headers.origin ? { headers: { Origin: req.headers.origin } } : undefined

console.log('✓ Location client configured')

// Search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query, biasPosition, maxResults = 5 } = req.body

    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    const result: SearchTextCommandOutput = await connector.send(
      new SearchTextCommand({
        QueryText: query,
        BiasPosition: biasPosition,
        MaxResults: maxResults,
      }),
      forwardOrigin(req),
    )

    res.json(result)
  } catch (error) {
    console.error('Search error:', error)
    const err = error as { statusCode?: number; message?: string }
    res.status(err.statusCode || 500).json({
      error: err.message || 'Search failed',
    })
  }
})

// Reverse geocode endpoint
app.post('/api/reverse-geocode', async (req, res) => {
  try {
    const { position } = req.body

    if (!position || !Array.isArray(position) || position.length !== 2) {
      return res
        .status(400)
        .json({ error: 'Valid position [lng, lat] is required' })
    }

    const result: ReverseGeocodeCommandOutput = await connector.send(
      new ReverseGeocodeCommand({
        QueryPosition: position,
      }),
      forwardOrigin(req),
    )

    res.json(result)
  } catch (error) {
    console.error('Reverse geocode error:', error)
    const err = error as { statusCode?: number; message?: string }
    res.status(err.statusCode || 500).json({
      error: err.message || 'Reverse geocode failed',
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

    const result: SuggestCommandOutput = await connector.send(
      new SuggestCommand({
        QueryText: query,
        BiasPosition: biasPosition,
        MaxResults: maxResults,
      }),
      forwardOrigin(req),
    )

    res.json(result)
  } catch (error) {
    console.error('Suggest error:', error)
    const err = error as { statusCode?: number; message?: string }
    res.status(err.statusCode || 500).json({
      error: err.message || 'Suggest failed',
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
