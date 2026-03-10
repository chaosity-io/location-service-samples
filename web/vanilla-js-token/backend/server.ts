import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { getClientConfig } from '@chaosity/location-client/server'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const { LOCATION_API_URL, LOCATION_CLIENT_ID, LOCATION_CLIENT_SECRET, PORT = '3001' } = process.env
if (!LOCATION_API_URL || !LOCATION_CLIENT_ID || !LOCATION_CLIENT_SECRET) {
  throw new Error('Missing required environment variables')
}

const credentials = {
  apiUrl: LOCATION_API_URL,
  clientId: LOCATION_CLIENT_ID,
  clientSecret: LOCATION_CLIENT_SECRET
}

console.log('Token server ready')

// Token endpoint for SPA
app.get('/api/token', async (req, res) => {
  try {
    // getClientConfig handles token caching and refresh internally
    const config = await getClientConfig(credentials)

    res.json({
      access_token: config.token,
      expires_at: config.expiresAt ?? null,
      api_url: config.apiUrl
    })
  } catch (error: any) {
    console.error('Token generation failed:', error)
    res.status(500).json({ error: 'Token generation failed' })
  }
})

app.listen(PORT, () => {
  console.log(`Token server running on http://localhost:${PORT}`)
})
