'use server'

import { getClientConfig } from '@chaosity/location-client/server'

/**
 * After the API refuses a token, the provider asks again with
 * `{ refusedToken }`. getClientConfig() keeps one token per application and
 * would hand that same one back, so replace it, but only when it is the one
 * refused. That mints once per refused token, and nothing for a report of
 * any other; it does not stop a caller echoing the token it holds, so
 * rate-limit the action if that matters.
 */
export async function getLocationConfig(request?: { refusedToken?: string }) {
  const config = await getClientConfig()
  return request?.refusedToken === config.token
    ? getClientConfig({ forceRefresh: true })
    : config
}
