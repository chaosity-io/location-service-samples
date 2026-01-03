import ClientOAuth2 from 'client-oauth2'
import { decodeJwt } from 'jose'

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
    private clientSecret: string
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
    const decoded = decodeJwt(token.accessToken)

    this.cache = {
      token: token.accessToken,
      expiresAt: decoded.exp || Math.floor(Date.now() / 1000) + 3600
    }

    return this.cache.token
  }

  clearCache(): void {
    this.cache = null
  }
}
