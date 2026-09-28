'use client'

import {
  GeoPlaces,
  GeocodeCommand,
  GeocodeCommandInput,
  GeocodeCommandOutput,
  createTransformRequest,
  fetchMapStyle,
  type MapStyle,
} from '@chaosity/location-client'
import {
  useLocationClient,
  useMapLanguage,
} from '@chaosity/location-client-react'
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder'
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'

// MapLibre 6 runs its worker from a file the app serves, and cannot find one
// under a bundler on its own: without this the map mounts and draws no tile.
// `scripts/copy-maplibre-worker.mjs` puts it in public/maplibre/ before every
// `dev` and `build`.
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

const API_URL = process.env.NEXT_PUBLIC_LOCATION_API_URL!

export default function MapDemo() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const geocoderRef = useRef<MaplibreGeocoder | null>(null)
  const terrainControlRef = useRef<maplibregl.TerrainControl | null>(null)
  const prevFilterCountryRef = useRef<string>('')
  const prevPoliticalViewRef = useRef<string>('')
  const {
    client,
    getToken,
    loading: clientLoading,
    error: clientError,
  } = useLocationClient()
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapStyle, setMapStyle] = useState<MapStyle>('Standard')
  const [colorScheme, setColorScheme] = useState('Light')
  const [politicalView, setPoliticalView] = useState('')
  // Terrain and 3D buildings are plan features, like the Satellite and Hybrid
  // styles and a political view: a style that asks for one the application's
  // plan lacks is refused whole (403 FeatureNotEntitledException). So the
  // first load asks for none of them, and each is a control the reader turns on.
  const [terrain, setTerrain] = useState(false)
  const [buildings, setBuildings] = useState(false)
  const [styleError, setStyleError] = useState<string | null>(null)
  const [filterCountry, setFilterCountry] = useState<string>('')
  const [language, setLanguage] = useState<string>('en')
  const languageRef = useRef(language)
  languageRef.current = language

  // Client-side language switching — zero API calls
  useMapLanguage(mapInstance, language)

  const isRasterStyle = mapStyle === 'Satellite' || mapStyle === 'Hybrid'

  // The descriptor options the controls ask for (language aside: it is
  // applied in place), and a key for them. The key of the style on the map is
  // kept, so the style effect does not fetch (and bill) the same descriptor
  // again when it first runs, or when a refused change is undone.
  const styleOptions = {
    ...(!isRasterStyle && {
      colorScheme: colorScheme as 'Light' | 'Dark',
      ...(terrain && { terrain: 'Terrain3D' as const }),
      ...(buildings && { buildings: 'Buildings3D' as const }),
    }),
    ...(politicalView && { politicalView }),
  }
  const styleKey = `${mapStyle}|${JSON.stringify(styleOptions)}`
  const appliedStyleKey = useRef('')

  const flyToCountryCenter = useCallback(
    async (countryCode: string) => {
      if (clientLoading || !client) return
      if (clientError) {
        setError(clientError)
        return
      }

      const commandInput: GeocodeCommandInput = {
        QueryComponents: { Country: countryCode },
      }
      // Called from an effect, so nothing above would catch a failure: log it
      // here rather than leave an unhandled rejection.
      let response: GeocodeCommandOutput
      try {
        response = await client.send(new GeocodeCommand(commandInput))
      } catch (err) {
        console.error('Country geocode error:', err)
        return
      }

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
    },
    [clientLoading, client, clientError],
  )

  // Sync TerrainControl after each style load, on whichever elevation source
  // the style declares: the descriptor names it (today `terrainSource`), so
  // the source is read from the style rather than assumed.
  const syncTerrainControl = useCallback((mapInst: maplibregl.Map) => {
    if (terrainControlRef.current) {
      try {
        mapInst.removeControl(terrainControlRef.current)
      } catch {
        /* noop */
      }
      terrainControlRef.current = null
    }
    const dem = Object.entries(mapInst.getStyle().sources ?? {}).find(
      ([, src]) => src.type === 'raster-dem',
    )?.[0]
    if (dem) {
      const tc = new maplibregl.TerrainControl({ source: dem })
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
        // Plain Standard / Light: nothing any plan with the map routes lacks.
        const style = await fetchMapStyle(API_URL, mapStyle, getToken, {
          ...styleOptions,
          language: languageRef.current,
        })

        if (cancelled) return
        appliedStyleKey.current = styleKey

        const instance = new maplibregl.Map({
          container: mapContainer.current!,
          style,
          center: [-122.4, 37.8],
          zoom: 10,
          minZoom: 3,
          maxPitch: 85,
          transformRequest: createTransformRequest(
            API_URL,
            getToken,
          ) as maplibregl.RequestTransformFunction,
        })

        instance.addControl(
          new maplibregl.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true,
          }),
          'top-right',
        )

        instance.addControl(
          new maplibregl.GeolocateControl({
            showUserLocation: true,
            trackUserLocation: true,
            positionOptions: { enableHighAccuracy: true },
          }),
        )

        instance.addControl(
          new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }),
        )
        instance.addControl(new maplibregl.GlobeControl())

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duplicate maplibre-gl types from geocoder plugin
        const geoPlaces = new GeoPlaces(client as any, instance as any)
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
        setError(
          err instanceof Error ? err.message : 'Failed to initialize map',
        )
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
    if (appliedStyleKey.current === styleKey) {
      setStyleError(null)
      return
    }
    // A later change supersedes this one: its answer must not land after it.
    let cancelled = false

    fetchMapStyle(API_URL, mapStyle, getToken, {
      ...styleOptions,
      language: languageRef.current,
    })
      .then((style) => {
        if (cancelled) return
        // Terrain on a source the next style may not have → detach first.
        currentMap.setTerrain(null)
        currentMap.setStyle(style)
        appliedStyleKey.current = styleKey
        setStyleError(null)
      })
      .catch((err) => {
        // A refused option (403 FeatureNotEntitledException) names the
        // feature in its message. Say so on screen and keep the map that is
        // already drawn, rather than swapping in a style that cannot load.
        if (cancelled) return
        console.error('[style update]', err)
        setStyleError(
          err instanceof Error ? err.message : 'The map style was refused',
        )
      })
    return () => {
      cancelled = true
    }
    // The controls' state is folded into styleKey; listing it too would
    // double-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleKey, loading, getToken])

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
              onChange={(e) => setMapStyle(e.target.value as MapStyle)}
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
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
              disabled={isRasterStyle || loading}
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
              value={politicalView}
              onChange={(e) => setPoliticalView(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
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

        {/* Row 2: plan features that are opt-in */}
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={terrain}
              onChange={(e) => setTerrain(e.target.checked)}
              disabled={isRasterStyle || loading}
            />
            3D terrain
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={buildings}
              onChange={(e) => setBuildings(e.target.checked)}
              disabled={isRasterStyle || loading}
            />
            3D buildings
          </label>
          <span className="text-xs text-gray-500">
            Satellite, Hybrid, a political view, terrain and 3D buildings are
            plan features. One your plan does not include is refused, and the
            map keeps its last style.
          </span>
        </div>

        {/* Row 3: Country Filter, Language */}
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

      {styleError && (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <strong>Map not updated:</strong> {styleError} The map shows the last
          style that loaded.
        </div>
      )}

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
