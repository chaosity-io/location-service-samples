'use server'

import { getClientConfig } from '@chaosity/location-client'

export async function getLocationConfig() {
  return getClientConfig()
}
