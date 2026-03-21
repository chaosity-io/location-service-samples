import ClientOAuth2 from 'client-oauth2'

interface TokenCache {
  token: string
  expiresAt: number
}

export class TokenManager {
  private cache: TokenCache | null = null
  private oauth2Client: ClientOAuth2

  constructor(
    private apiUrl: string,
    private clientId: string,
    private clientSecret: string,
  ) {
    this.oauth2Client = new ClientOAuth2({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      accessTokenUri: `${this.apiUrl}/auth/token`,
    })

    this.getToken()
  }

  async getToken(): Promise<string> {
    if (this.cache && Date.now() / 1000 < this.cache.expiresAt - 60) {
      console.log('Using cached token')
      return this.cache.token
    }

    console.log('Generating new token')

    const token = await this.oauth2Client.credentials.getToken()

    this.cache = {
      token: token.accessToken,
      expiresAt: token.data.expires_at
        ? Math.floor(Number(token.data.expires_at) / 1000)
        : Math.floor(Date.now() / 1000) +
          (Number(token.data.expires_in) || 3600),
    }

    return this.cache.token
  }

  clearCache(): void {
    this.cache = null
  }
}
