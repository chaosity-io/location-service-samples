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
    this.getToken();
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
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
      },
      body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
      throw new Error('Token generation failed')
    }

    const data = await response.json()

    // Cache token with expiry from OAuth2 response (prefer absolute expires_at)
    this.cache = {
      token: data.access_token,
      expiresAt: data.expires_at
        ? Math.floor(data.expires_at / 1000)
        : Math.floor(Date.now() / 1000) + (data.expires_in || 3600)
    }

    return this.cache.token
  }

  clearCache(): void {
    this.cache = null
  }
}
