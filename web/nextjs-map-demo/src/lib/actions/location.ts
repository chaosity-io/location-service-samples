'use server'

import { getClientConfig } from '@chaosity/location-client/server'

export async function getLocationConfig() {
  return getClientConfig()
}
