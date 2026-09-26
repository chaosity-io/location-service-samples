'use client'

import { describeError } from '@/lib/address'
import { useTestbedMap } from '@/lib/map/useTestbedMap'
import { useCountry } from '@/lib/settings/country'
import { useMapSettings } from '@/lib/settings/map-settings'
import { GeoPlaces } from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder'
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css'
import * as maplibregl from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'

/**
 * The MapLibre geocoder control on the SDK's `GeoPlaces` adapter:
 * Suggest per keystroke (proximity = map centre) → GetPlace on select, and a
 * forward Geocode on Enter. Country and language follow the global bar.
 */
export default function MapGeocoder() {
  const container = useRef<HTMLDivElement>(null)
  const geocoderRef = useRef<MaplibreGeocoder | null>(null)
  const { client } = useLocationClient()
  const [{ language }] = useMapSettings()
  const { code: country } = useCountry()
  const { map, ready, error: mapError } = useTestbedMap(container)

  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string>('')

  // The control lives as long as the map does.
  useEffect(() => {
    if (!map || !client) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the provider's LocationClient is not the adapter's GeoPlacesClient type
    const geoPlaces = new GeoPlaces(client as any, map)
    const geocoder = new MaplibreGeocoder(geoPlaces, {
      maplibregl,
      placeholder: 'Search for places',
      showResultsWhileTyping: true,
      minLength: 3,
      marker: true,
      popup: true,
      trackProximity: true,
      limit: 5,
      flyTo: { speed: 1.5 },
    })
    // Without a listener the control's EventEmitter THROWS on `error` and the
    // console shows "Unhandled error. (undefined)" with the cause discarded.
    geocoder.on('error', (e: { error?: unknown }) => {
      setError(describeError(e.error ?? e, 'Geocoder error'))
    })
    // Two paths deliver a selection. Picking a SUGGESTION makes the control
    // call the adapter's searchByPlaceId and emit `results` carrying `place`
    // (that is also what draws the marker and flies the map); `result` fires
    // only for a typed forward geocode chosen from the list. Listen to both.
    geocoder.on('results', (e) => {
      // `place` is what the control attaches on the searchByPlaceId path; the
      // plugin's event type does not declare it, and the adapter hands it
      // over as a one-element array.
      const raw = (e as { place?: unknown }).place
      const place = Array.isArray(raw) ? raw[0] : raw
      if (!place) return
      setError(null)
      setResult(JSON.stringify(place, null, 2))
    })
    geocoder.on('result', (e: { result?: unknown }) => {
      setError(null)
      setResult(JSON.stringify(e.result ?? e, null, 2))
    })
    geocoder.on('clear', () => setResult(''))
    map.addControl(geocoder, 'top-left')
    geocoderRef.current = geocoder
    // QA handle, dev only (see `__testbedMap` in useTestbedMap).
    if (process.env.NODE_ENV !== 'production') {
      ;(
        window as unknown as { __testbedGeocoder?: MaplibreGeocoder }
      ).__testbedGeocoder = geocoder
    }
    return () => {
      geocoderRef.current = null
      try {
        map.removeControl(geocoder)
      } catch {
        /* map already removed */
      }
    }
  }, [map, client])

  useEffect(() => {
    geocoderRef.current?.setCountries(country)
  }, [country, map])

  useEffect(() => {
    geocoderRef.current?.setLanguage(language)
  }, [language, map])

  const displayError = error ?? mapError

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Suggest with proximity = map centre
        {country ? `, countries = ${country}` : ''}, language {language}. Pick a
        suggestion for GetPlace; press Enter for a forward Geocode.
      </p>
      {displayError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {displayError}
        </p>
      )}
      <div className="relative h-150 w-full overflow-hidden rounded-lg bg-white shadow-lg">
        {!ready && !displayError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        )}
        <div ref={container} className="h-full w-full" />
      </div>
      {result && (
        <details className="rounded-lg bg-white p-4 shadow" open>
          <summary className="cursor-pointer text-sm font-semibold text-gray-900">
            Selected place (what the adapter handed the control)
          </summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-gray-50 p-3 text-xs">
            {result}
          </pre>
        </details>
      )}
    </div>
  )
}
