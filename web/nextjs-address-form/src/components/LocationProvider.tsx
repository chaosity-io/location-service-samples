'use client'

import { getLocationConfig } from '@/lib/actions/location'
import { LocationClientProvider } from '@chaosity/location-client-react'

export function LocationProvider({ children }: { children: React.ReactNode }) {
  return (
    <LocationClientProvider getConfig={getLocationConfig}>
      {children}
    </LocationClientProvider>
  )
}
