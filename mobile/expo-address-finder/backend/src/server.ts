import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { getClientConfig } from '@chaosity/location-client/server'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// Config endpoint — returns a short-lived token for the React Native client.
// The client calls this on startup and whenever the token expires. After the
// API refuses a token, the body names it as `refusedToken`: getClientConfig
// caches one token and would hand that same one back, so it is replaced, but
// only when it is the one refused.
app.post('/config', async (req, res) => {
  try {
    const refused: unknown = req.body?.refusedToken
    const config = await getClientConfig()
    res.json(
      typeof refused === 'string' && refused === config.token
        ? await getClientConfig({ forceRefresh: true })
        : config,
    )
  } catch (error) {
    console.error('Config error:', error)
    const err = error as { message?: string }
    res.status(500).json({ error: err.message || 'Failed to get config' })
  }
})

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Token backend running on http://localhost:${PORT}`)
  console.log(`Config endpoint: POST http://localhost:${PORT}/config`)
})
