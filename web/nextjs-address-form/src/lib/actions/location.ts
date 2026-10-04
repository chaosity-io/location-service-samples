'use server'

import { getClientConfig } from '@chaosity/location-client/server'

const credentials = () => ({
  apiUrl: process.env.LOCATION_API_URL!,
  clientId: process.env.LOCATION_CLIENT_ID!,
  clientSecret: process.env.LOCATION_CLIENT_SECRET!,
})

/**
 * After the API refuses a token, the provider asks again with
 * `{ refusedToken }`. getClientConfig() keeps one token per application and
 * would hand that same one back, so replace it, but only when it is the one
 * refused. That mints once per refused token, and nothing for a report of
 * any other; it does not stop a caller echoing the token it holds, so
 * rate-limit the action if that matters.
 */
export async function getLocationConfig(request?: { refusedToken?: string }) {
  const config = await getClientConfig(credentials())
  return request?.refusedToken === config.token
    ? getClientConfig({ ...credentials(), forceRefresh: true })
    : config
}
