'use server'

import { getClientConfig } from '@chaosity/location-client'

export async function getLocationConfig1() {
  return getClientConfig({
    apiUrl: process.env.LOCATION_API_URL!,
    clientId: process.env.LOCATION_CLIENT_ID!,
    clientSecret: process.env.LOCATION_CLIENT_SECRET!
  })
}

export async function getLocationConfig() {
  console.log('[getLocationConfig] Server Action - fetching config')
  const config = await getClientConfig()
  console.log('[getLocationConfig] Got config:', { 
    apiUrl: config.apiUrl, 
    tokenLength: config.token?.length 
  })
  return config
}
