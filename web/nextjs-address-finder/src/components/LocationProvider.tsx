'use client'

import { LocationClientProvider } from '@chaosity/location-client-react'
import { getLocationConfig } from '@/lib/actions/location'

export function LocationProvider({ children }: { children: React.ReactNode }) {
  return (
    <LocationClientProvider getConfig={getLocationConfig} refreshBuffer={800}>
      {children}
    </LocationClientProvider>
  )
}
