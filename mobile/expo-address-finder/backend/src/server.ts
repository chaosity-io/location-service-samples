import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { getClientConfig } from '@chaosity/location-client/server'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// Config endpoint — returns a short-lived token for the React Native client.
// The client calls this on startup and whenever the token expires.
app.get('/config', async (_req, res) => {
  try {
    const config = await getClientConfig()
    res.json(config)
  } catch (error: any) {
    console.error('Config error:', error)
    res.status(500).json({ error: error.message || 'Failed to get config' })
  }
})

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Token backend running on http://localhost:${PORT}`)
  console.log(`Config endpoint: http://localhost:${PORT}/config`)
})
