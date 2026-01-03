import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { getClientConfig } from '@chaosity/location-client'
import { decodeJwt } from 'jose'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const { LOCATION_API_URL, LOCATION_CLIENT_ID, LOCATION_CLIENT_SECRET, PORT = '3001' } = process.env
if (!LOCATION_API_URL || !LOCATION_CLIENT_ID || !LOCATION_CLIENT_SECRET) {
  throw new Error('Missing required environment variables')
}

// Setup config once at startup
const config = await getClientConfig({
  apiUrl: LOCATION_API_URL,
  clientId: LOCATION_CLIENT_ID,
  clientSecret: LOCATION_CLIENT_SECRET
})

console.log('✓ Token server ready')

// Token endpoint for SPA
app.get('/api/token', async (req, res) => {
  try {
    const { token } = await config.getToken()
    const decoded = decodeJwt(token!)
    
    res.json({
      access_token: token,
      expires_at: decoded.exp ? decoded.exp * 1000 : null,
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
