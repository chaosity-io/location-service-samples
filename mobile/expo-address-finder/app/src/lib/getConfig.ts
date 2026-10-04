import { ClientConfig } from '@chaosity/location-client'

const TOKEN_BACKEND_URL = process.env.EXPO_PUBLIC_TOKEN_BACKEND_URL

/**
 * After the API refuses a token, the provider calls this with
 * `{ refusedToken }`, and the backend replaces exactly that token.
 */
export async function getConfig(request?: {
  refusedToken: string
}): Promise<ClientConfig & { expiresAt?: number }> {
  if (!TOKEN_BACKEND_URL) {
    throw new Error('EXPO_PUBLIC_TOKEN_BACKEND_URL is not set')
  }

  const response = await fetch(`${TOKEN_BACKEND_URL}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request ?? {}),
  })
  if (!response.ok) {
    throw new Error(
      `Failed to fetch config: ${response.status} ${response.statusText}`,
    )
  }

  return response.json()
}
