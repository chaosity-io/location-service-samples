import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { getClientConfig } from '@chaosity/location-client/server'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const {
  LOCATION_API_URL,
  LOCATION_CLIENT_ID,
  LOCATION_CLIENT_SECRET,
  PORT = '3001',
} = process.env
if (!LOCATION_API_URL || !LOCATION_CLIENT_ID || !LOCATION_CLIENT_SECRET) {
  throw new Error('Missing required environment variables')
}

const credentials = {
  apiUrl: LOCATION_API_URL,
  clientId: LOCATION_CLIENT_ID,
  clientSecret: LOCATION_CLIENT_SECRET,
}

console.log('Token server ready')

// Token endpoint for the SPA. The body may name `refusedToken`, a token the
// API has refused: getClientConfig caches one token and would hand that same
// one back, so it is replaced, but only when it is the one refused. That mints
// once per refused token, and nothing for a report of any other; it does not
// stop a caller echoing the token it holds, so rate-limit the route if that
// matters.
app.post('/api/token', async (req, res) => {
  try {
    const refused: unknown = req.body?.refusedToken
    let config = await getClientConfig(credentials)
    if (typeof refused === 'string' && refused === config.token) {
      config = await getClientConfig({ ...credentials, forceRefresh: true })
    }

    res.json({
      access_token: config.token,
      expires_at: config.expiresAt ?? null,
      api_url: config.apiUrl,
    })
  } catch (error) {
    console.error('Token generation failed:', error)
    res.status(500).json({ error: 'Token generation failed' })
  }
})

app.listen(PORT, () => {
  console.log(`Token server running on http://localhost:${PORT}`)
})
