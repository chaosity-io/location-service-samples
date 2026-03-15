'use server'

import { getClientConfig } from '@chaosity/location-client/server'

export async function getLocationConfig() {
  return getClientConfig({
    apiUrl: process.env.LOCATION_API_URL!,
    clientId: process.env.LOCATION_CLIENT_ID!,
    clientSecret: process.env.LOCATION_CLIENT_SECRET!
  })
}
