import { decodeJwt } from 'jose'

interface TokenCache {
  token: string
  expiresAt: number // Unix timestamp in seconds
}

export class TokenManager {
  private cache: TokenCache | null = null

  constructor(
    private apiUrl: string,
    private clientId: string,
    private clientSecret: string
  ) { 
    // Remove async call from constructor - let getToken() handle initialization lazily
  }

  async getToken(): Promise<string> {
    // Return cached token if still valid (with 60 second buffer)
    if (this.cache && Date.now() / 1000 < this.cache.expiresAt - 60) {
      console.log('Using cached token')
      return this.cache.token
    }

    console.log('Generating new token')

    // Generate new token
    const response = await fetch(`${this.apiUrl}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
      }
    })

    if (!response.ok) {
      throw new Error('Token generation failed')
    }

    const data = await response.json()
    const decoded = decodeJwt(data.access_token)

    // Cache token with expiry from JWT
    this.cache = {
      token: data.access_token,
      expiresAt: decoded.exp || Math.floor(Date.now() / 1000) + 3600
    }

    return this.cache.token
  }

  clearCache(): void {
    this.cache = null
  }
}
