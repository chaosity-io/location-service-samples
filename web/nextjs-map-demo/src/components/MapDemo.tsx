'use client'

import { GeoPlaces, transformRequest } from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder'
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'

export default function MapDemo() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const geocoderRef = useRef<MaplibreGeocoder | null>(null)
  const { config, client, loading: clientLoading, error: clientError } = useLocationClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    async function initMap() {
      if (clientLoading || !config || !client) return
      if (clientError) {
        setError(clientError)
        setLoading(false)
        return
      }

      try {
        const params = new URLSearchParams({
          'color-scheme': 'Light',
          'terrain': 'Hillshade',
        })
        const styleUrl = `${config.apiUrl}/maps/Standard/descriptor?${params.toString()}`

        const mapInstance = new maplibregl.Map({
          container: mapContainer.current!,
          style: styleUrl,
          center: [-122.4, 37.8],
          zoom: 10,
          minZoom: 3,
          transformRequest: (url) => transformRequest(url, config),
        })

        mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right')
        mapInstance.addControl(new maplibregl.GeolocateControl({
          showUserLocation: true,
          trackUserLocation: true,
        }))
        mapInstance.addControl(new maplibregl.ScaleControl())

        const geoPlaces = new GeoPlaces(client, mapInstance)
        const geocoder = new MaplibreGeocoder(geoPlaces, {
          maplibregl: maplibregl,
          placeholder: 'Search for places',
          showResultsWhileTyping: true,
          minLength: 3,
          marker: true,
          popup: true,
          limit: 5,
        })

        geocoderRef.current = geocoder
        mapInstance.addControl(geocoder, 'top-left')

        setLoading(false)
        map.current = mapInstance
      } catch (err) {
        console.error('Map initialization error:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize map')
        setLoading(false)
      }
    }

    initMap()

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [clientLoading, config, client, clientError])

  if (error) {
    return (
      <div className="w-full h-[600px] bg-red-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Failed to load map</p>
          <p className="text-red-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[600px] bg-white rounded-lg shadow-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  )
}
