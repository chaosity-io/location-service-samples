import { ClientConfig } from '@chaosity/location-client'

const TOKEN_BACKEND_URL = process.env.EXPO_PUBLIC_TOKEN_BACKEND_URL

export async function getConfig(): Promise<ClientConfig & { expiresAt?: number }> {
  if (!TOKEN_BACKEND_URL) {
    throw new Error('EXPO_PUBLIC_TOKEN_BACKEND_URL is not set')
  }

  const response = await fetch(`${TOKEN_BACKEND_URL}/config`)
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
