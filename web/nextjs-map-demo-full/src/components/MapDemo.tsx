'use client'

import { GeocodeCommand, GeocodeCommandInput, GeocodeCommandOutput } from '@chaosity/location-client'
import { GeoPlaces, createTransformRequest, fetchMapStyle } from '@chaosity/location-client'
import { useLocationClient, useMapLanguage } from '@chaosity/location-client-react'
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder'
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_LOCATION_API_URL!

export default function MapDemo() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const geocoderRef = useRef<MaplibreGeocoder | null>(null)
  const terrainControlRef = useRef<maplibregl.TerrainControl | null>(null)
  const prevFilterCountryRef = useRef<string>('')
  const prevPoliticalViewRef = useRef<string>('')
  const { client, getToken, loading: clientLoading, error: clientError } = useLocationClient()
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapStyle, setMapStyle] = useState('Standard')
  const [colorScheme, setColorScheme] = useState('Light')
  const [politicalView, setPoliticalView] = useState('')
  const [filterCountry, setFilterCountry] = useState<string>('')
  const [language, setLanguage] = useState<string>('en')
  const languageRef = useRef(language)
  languageRef.current = language

  // Client-side language switching — zero API calls
  useMapLanguage(mapInstance, language)

  const isRasterStyle = mapStyle === 'Satellite' || mapStyle === 'Hybrid'

  const flyToCountryCenter = useCallback(async (countryCode: string) => {
    if (clientLoading || !client) return
    if (clientError) {
      setError(clientError)
      return
    }

    const commandInput: GeocodeCommandInput = {
      QueryComponents: { Country: countryCode }
    }
    const response: GeocodeCommandOutput = await client.send(new GeocodeCommand(commandInput))

    if (response.ResultItems && response.ResultItems.length > 0) {
      const countryGeocode = response.ResultItems.find(item => item.PlaceType?.includes('Country'))
      if (countryGeocode) {
        map.current?.flyTo({
          center: countryGeocode.Position as [number, number],
          speed: 1.2,
          curve: 1.4,
        })
        map.current?.fitBounds(countryGeocode.MapView as [number, number, number, number], { padding: 20 })
      }
    }
  }, [clientLoading, client, clientError])

  // Sync TerrainControl after each style load
  const syncTerrainControl = useCallback((mapInst: maplibregl.Map) => {
    if (terrainControlRef.current) {
      try { mapInst.removeControl(terrainControlRef.current) } catch { /* noop */ }
      terrainControlRef.current = null
    }
    if (mapInst.getSource('amazon')) {
      const tc = new maplibregl.TerrainControl({ source: 'amazon' })
      mapInst.addControl(tc, 'top-right')
      terrainControlRef.current = tc
    }
  }, [])

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || map.current || clientLoading || !client) return
    if (clientError) {
      setError(clientError)
      setLoading(false)
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const style = await fetchMapStyle(API_URL, mapStyle, getToken, {
          colorScheme: colorScheme as 'Light' | 'Dark',
          ...(!isRasterStyle && { terrain: 'Terrain3D' as const, buildings: 'Buildings3D' as const }),
          ...(politicalView && { politicalView }),
          language: languageRef.current,
        })

        if (cancelled) return

        const instance = new maplibregl.Map({
          container: mapContainer.current!,
          style,
          center: [-122.4, 37.8],
          zoom: 10,
          minZoom: 3,
          maxPitch: 85,
          transformRequest: createTransformRequest(API_URL, getToken),
        })

        instance.addControl(new maplibregl.NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: true,
        }), 'top-right')

        instance.addControl(new maplibregl.GeolocateControl({
          showUserLocation: true,
          trackUserLocation: true,
          positionOptions: { enableHighAccuracy: true }
        }))

        instance.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }))
        instance.addControl(new maplibregl.GlobeControl())

        const geoPlaces = new GeoPlaces(client, instance)
        const geocoder = new MaplibreGeocoder(geoPlaces, {
          maplibregl: maplibregl,
          placeholder: 'Search for places',
          showResultsWhileTyping: true,
          minLength: 3,
          marker: true,
          popup: true,
          trackProximity: true,
          limit: 5,
          flyTo: { speed: 1.5 },
        })

        geocoderRef.current = geocoder
        instance.addControl(geocoder, 'top-left')

        instance.on('style.load', () => {
          instance.setProjection({ type: 'globe' })
          syncTerrainControl(instance)
        })

        map.current = instance
        setMapInstance(instance)
        setLoading(false)
      } catch (err) {
        console.error('Map initialization error:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize map')
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (map.current) {
        map.current.remove()
        map.current = null
        setMapInstance(null)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientLoading, client, clientError])

  // Style update effect — uses languageRef to avoid triggering on language-only changes
  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || loading) return

    fetchMapStyle(API_URL, mapStyle, getToken, {
      ...(!isRasterStyle && { colorScheme: colorScheme as 'Light' | 'Dark' }),
      ...(!isRasterStyle && { terrain: 'Terrain3D' as const, buildings: 'Buildings3D' as const }),
      ...(politicalView && { politicalView }),
      language: languageRef.current,
    })
      .then(style => currentMap.setStyle(style))
      .catch(err => console.error('[style update]', err))
  }, [mapStyle, colorScheme, politicalView, loading, getToken, isRasterStyle])

  // Country filter and language for geocoder
  useEffect(() => {
    const filterCountryChanged = prevFilterCountryRef.current !== filterCountry
    const politicalViewChanged = prevPoliticalViewRef.current !== politicalView

    if (filterCountryChanged && filterCountry) {
      flyToCountryCenter(filterCountry)
      if (geocoderRef.current) {
        geocoderRef.current.setCountries(filterCountry)
      }
    } else if (politicalViewChanged && politicalView) {
      flyToCountryCenter(politicalView)
    }

    prevFilterCountryRef.current = filterCountry
    prevPoliticalViewRef.current = politicalView

    if (geocoderRef.current && language) {
      geocoderRef.current.setLanguage(language)
    }
  }, [filterCountry, politicalView, language, flyToCountryCenter])

  // Reset controls for raster styles
  useEffect(() => {
    if (isRasterStyle) {
      setColorScheme('Light')
      if (mapStyle === 'Satellite') setPoliticalView('')
    }
  }, [mapStyle, isRasterStyle])

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
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {/* Row 1: Map Style, Color Scheme, Political View */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Map Style</label>
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="Standard">Standard</option>
              <option value="Monochrome">Monochrome</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Satellite">Satellite</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
            <select
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isRasterStyle || loading}
            >
              <option value="Light">Light</option>
              <option value="Dark">Dark</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Political View</label>
            <select
              value={politicalView}
              onChange={(e) => setPoliticalView(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={mapStyle === 'Satellite' || loading}
            >
              <option value="">Default</option>
              <option value="IND">India</option>
              <option value="ARG">Argentina</option>
              <option value="EGY">Egypt</option>
              <option value="MAR">Morocco</option>
              <option value="RUS">Russia</option>
              <option value="SDN">Sudan</option>
              <option value="SRB">Serbia</option>
              <option value="SYR">Syria</option>
              <option value="TUR">Turkey</option>
            </select>
          </div>
        </div>

        {/* Row 2: Country Filter, Language */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country Filter</label>
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">All Countries</option>
              <option value="CA">Canada</option>
              <option value="US">USA</option>
              <option value="GB">UK</option>
              <option value="JP">Japan</option>
              <option value="AU">Australia</option>
              <option value="FR">France</option>
              <option value="DE">Germany</option>
              <option value="IN">India</option>
              <option value="BR">Brazil</option>
              <option value="MX">Mexico</option>
              <option value="IT">Italy</option>
              <option value="ES">Spain</option>
              <option value="CN">China</option>
              <option value="KR">South Korea</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese</option>
              <option value="ar">Arabic</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
              <option value="hi">Hindi</option>
              <option value="ko">Korean</option>
              <option value="it">Italian</option>
            </select>
          </div>
        </div>
      </div>

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
    </div>
  )
}
