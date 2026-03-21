'use client'

import {
  GeoPlaces,
  GeocodeCommand,
  createTransformRequest,
  type GeocodeCommandInput,
  type GeocodeCommandOutput,
} from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'
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
  const colorSchemeSelectRef = useRef<HTMLSelectElement>(null)
  const politicalViewSelectRef = useRef<HTMLSelectElement>(null)
  const prevFilterCountryRef = useRef<string>('')
  const prevPoliticalViewRef = useRef<string>('')
  const mapState = useRef<{ center: [number, number]; zoom: number }>({
    center: [-122.4, 37.8],
    zoom: 10,
  })
  const {
    client,
    getToken,
    loading: clientLoading,
    error: clientError,
  } = useLocationClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapStyle, setMapStyle] = useState('Standard')
  const [colorScheme, setColorScheme] = useState('Light')
  const [politicalView, setPoliticalView] = useState('')
  const [filterCountry, setFilterCountry] = useState<string>('')
  const [language, setLanguage] = useState<string>('en')

  // MapLibre style expressions are recursive JSON arrays (Mapbox Style Spec)
  type StyleExpression = unknown[] | string | number | boolean | null

  interface StyleLayer {
    type: string
    layout?: { 'text-field'?: StyleExpression; [key: string]: unknown }
    [key: string]: unknown
  }

  interface MapStyle {
    version: 8
    sources: Record<string, unknown>
    layers: StyleLayer[]
    [key: string]: unknown
  }

  const recurseExpression = useCallback(
    (
      exp: StyleExpression,
      prevPropertyRegex: RegExp,
      nextProperty: string,
    ): StyleExpression => {
      if (!Array.isArray(exp)) return exp
      if (exp[0] !== 'coalesce')
        return exp.map((v) =>
          recurseExpression(
            v as StyleExpression,
            prevPropertyRegex,
            nextProperty,
          ),
        )

      const first = exp[1] as unknown[]
      const second = exp[2] as unknown[]

      let isMatch =
        Array.isArray(first) &&
        first[0] === 'get' &&
        !!(first[1] as string).match(prevPropertyRegex)?.[0]
      isMatch = isMatch && Array.isArray(second) && second[0] === 'get'
      isMatch = isMatch && !exp?.[4]

      if (!isMatch)
        return exp.map((v) =>
          recurseExpression(
            v as StyleExpression,
            prevPropertyRegex,
            nextProperty,
          ),
        )

      return [
        'coalesce',
        ['get', nextProperty],
        ['get', 'name:en'],
        ['get', 'name'],
      ]
    },
    [],
  )

  const updateLayer = useCallback(
    (
      layer: StyleLayer,
      prevPropertyRegex: RegExp,
      nextProperty: string,
    ): StyleLayer => {
      return {
        ...layer,
        layout: {
          ...layer.layout,
          'text-field': recurseExpression(
            layer.layout?.['text-field'] ?? null,
            prevPropertyRegex,
            nextProperty,
          ),
        },
      }
    },
    [recurseExpression],
  )

  const setPreferredLanguage = useCallback(
    (style: MapStyle, language: string): MapStyle => {
      const nextStyle = { ...style }
      nextStyle.layers = nextStyle.layers.map((l) => {
        if (l.type !== 'symbol' || !l?.layout?.['text-field']) return l
        return updateLayer(l, /^name:([A-Za-z\-\_]+)$/g, `name:${language}`)
      })
      return nextStyle
    },
    [updateLayer],
  )

  const getStyleWithPreferredLanguage = useCallback(
    async (styleUrl: string, language: string) => {
      const token = getToken()
      const res = await fetch(styleUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
      const style = await res.json()
      return setPreferredLanguage(style, language)
    },
    [getToken, setPreferredLanguage],
  )

  const flyToCountryCenter = useCallback(
    async (countryCode: string) => {
      if (clientLoading || !client) return
      if (clientError) {
        setError(clientError)
        setLoading(false)
        return
      }

      if (geocoderRef.current && countryCode) {
        const commandInput: GeocodeCommandInput = {
          QueryComponents: { Country: countryCode },
        }
        const command = new GeocodeCommand(commandInput)
        const response: GeocodeCommandOutput = await client.send(command)

        if (response.ResultItems && response.ResultItems.length > 0) {
          const countryGeocode = response.ResultItems.find((item) =>
            item.PlaceType?.includes('Country'),
          )
          if (countryGeocode) {
            map.current?.flyTo({
              center: countryGeocode.Position as [number, number],
              speed: 1.2,
              curve: 1.4,
            })
            map.current?.fitBounds(
              countryGeocode.MapView as [number, number, number, number],
              { padding: 20 },
            )
          }
        }
      }
    },
    [clientLoading, client, clientError],
  )

  useEffect(() => {
    if (!mapContainer.current) return

    async function initMap() {
      if (clientLoading || !client || !getToken) return
      if (clientError) {
        setError(clientError)
        setLoading(false)
        return
      }

      try {
        // Save current map state before removing
        if (map.current) {
          const center = map.current.getCenter()
          mapState.current = {
            center: [center.lng, center.lat],
            zoom: map.current.getZoom(),
          }
          map.current.remove()
          map.current = null
        }

        const params = new URLSearchParams({
          'color-scheme': colorScheme,
          terrain: 'Hillshade',
        })
        const styleUrl = `${API_URL}/maps/${mapStyle}/descriptor?${params.toString()}`

        const mapInstance = new maplibregl.Map({
          container: mapContainer.current!,
          style: styleUrl,
          center: mapState.current.center,
          zoom: mapState.current.zoom,
          minZoom: 3,
          transformRequest: createTransformRequest(
            API_URL,
            getToken,
          ) as maplibregl.RequestTransformFunction,
        })

        mapInstance.addControl(
          new maplibregl.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true,
          }),
          'top-right',
        )

        mapInstance.addControl(
          new maplibregl.GeolocateControl({
            showUserLocation: true,
            trackUserLocation: true,
            positionOptions: { enableHighAccuracy: true },
          }),
        )

        mapInstance.addControl(
          new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }),
        )
        mapInstance.addControl(new maplibregl.GlobeControl())

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duplicate maplibre-gl types from geocoder plugin
        const geoPlaces = new GeoPlaces(client as any, mapInstance as any)
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
        mapInstance.addControl(geocoder, 'top-left')

        mapInstance.on('style.load', () => {
          mapInstance.setProjection({ type: 'globe' })
        })

        setLoading(false)
        map.current = mapInstance
      } catch (err) {
        console.error('Map initialization error:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to initialize map',
        )
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    clientLoading,
    API_URL,
    client,
    clientError,
    getToken,
    colorScheme,
    mapStyle,
  ])

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

  useEffect(() => {
    const isRasterStyle = mapStyle === 'Satellite' || mapStyle === 'Hybrid'

    if (colorSchemeSelectRef.current) {
      colorSchemeSelectRef.current.disabled = isRasterStyle || loading
      if (isRasterStyle) setColorScheme('Light')
    }

    if (politicalViewSelectRef.current) {
      politicalViewSelectRef.current.disabled =
        mapStyle === 'Satellite' || loading
      if (mapStyle === 'Satellite') setPoliticalView('')
    }

    if (map.current) {
      const params = new URLSearchParams({
        'color-scheme': colorScheme,
        ...(politicalView && { 'political-view': politicalView }),
      })

      const styleUrl = `${API_URL}/maps/${mapStyle}/descriptor?${params.toString()}`
      const setStyle = async (styleUrl: string, language: string) => {
        try {
          const style = await getStyleWithPreferredLanguage(styleUrl, language)
          map.current?.setStyle(style as maplibregl.StyleSpecification)
        } catch (error) {
          console.error('Failed to set map style:', error)
        }
      }

      setStyle(styleUrl, language)
    }
  }, [
    mapStyle,
    colorScheme,
    politicalView,
    language,
    getStyleWithPreferredLanguage,
    loading,
  ])

  if (error) {
    return (
      <div className="flex h-150 w-full items-center justify-center rounded-lg bg-red-50">
        <div className="text-center">
          <p className="font-semibold text-red-600">Failed to load map</p>
          <p className="mt-2 text-sm text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-lg bg-white p-4 shadow">
        {/* Row 1: Map Style, Color Scheme, Political View */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Map Style
            </label>
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={loading}
            >
              <option value="Standard">Standard</option>
              <option value="Monochrome">Monochrome</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Satellite">Satellite</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Color Scheme
            </label>
            <select
              ref={colorSchemeSelectRef}
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="Light">Light</option>
              <option value="Dark">Dark</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Political View
            </label>
            <select
              ref={politicalViewSelectRef}
              value={politicalView}
              onChange={(e) => setPoliticalView(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Country Filter
            </label>
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

      <div className="relative h-150 w-full overflow-hidden rounded-lg bg-white shadow-lg">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="h-full w-full" />
      </div>
    </div>
  )
}
