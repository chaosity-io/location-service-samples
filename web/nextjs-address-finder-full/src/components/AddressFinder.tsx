'use client'

const RASTER_NOTE =
  'Satellite and Hybrid reject these, so they are disabled for raster styles'

/**
 * Assemble the descriptor options from the current control values.
 *
 * Pure and module-level so the React Compiler has nothing to memoize and the
 * component has no ref to touch during render.
 *
 * `isRasterStyle` gates the Standard-only parameters: Satellite and Hybrid
 * reject colour scheme, terrain, buildings and contours, so sending them is a
 * guaranteed 400 whose message names a style the caller did not choose.
 *
 * `traffic` is deliberately NOT gated — it is the control that demonstrates the
 * API forwarding Amazon's own combination error rather than swallowing it:
 * Satellite + All answers "Traffic is not supported for style."
 */
function buildStyleOptions(
  c: StyleControls,
  isRasterStyle: boolean,
): Record<string, unknown> {
  return {
    ...(!isRasterStyle && {
      colorScheme: c.colorScheme,
      ...(c.terrain && { terrain: c.terrain }),
      ...(c.buildings && { buildings: 'Buildings3D' as const }),
      ...(c.contourDensity && { contourDensity: c.contourDensity }),
    }),
    ...(c.traffic && { traffic: c.traffic }),
    ...(c.travelModes.length && { travelModes: c.travelModes }),
    ...(c.politicalView && { politicalView: c.politicalView }),
  }
}

interface StyleControls {
  colorScheme: ColorScheme
  terrain: Terrain | ''
  buildings: boolean
  contourDensity: ContourDensity | ''
  traffic: TrafficMode | ''
  travelModes: TravelMode[]
  politicalView: string
}

import type {
  ColorScheme,
  ContourDensity,
  MapStyle,
  Terrain,
  TrafficMode,
  TravelMode,
} from '@chaosity/location-client'
import {
  AutocompleteCommand,
  AutocompleteCommandInput,
  AutocompleteCommandOutput,
  AutocompleteResultItem,
  // Accepted values, exported as VALUES so these pickers are built from the
  // same list the types are derived from. The API is case sensitive since
  // location-service-api#89, so taking them from here is what keeps the case
  // right — a hand-typed 'standard' is now a 400, not a working map.
  COLOR_SCHEMES,
  CONTOUR_DENSITIES,
  createTransformRequest,
  fetchMapStyle,
  GeocodeCommand,
  GeocodeCommandInput,
  GeocodeCommandOutput,
  GetPlaceCommand,
  GetPlaceCommandOutput,
  MAP_STYLES,
  ReverseGeocodeCommand,
  ReverseGeocodeCommandOutput,
  TERRAINS,
  TRAFFIC_MODES,
  TRAVEL_MODES,
} from '@chaosity/location-client'
import {
  useLocationClient,
  useMapLanguage,
} from '@chaosity/location-client-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BuildingsControl } from './BuildingsControl'

const API_URL = process.env.NEXT_PUBLIC_LOCATION_API_URL!

interface AddressResult {
  placeId?: string
  label?: string
  addressLineOne?: string
  addressLineTwo?: string
  city?: string
  province?: string
  postalCode?: string
  country?: string
  position?: [number, number]
}

export default function AddressFinder() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const marker = useRef<maplibregl.Marker | null>(null)
  const terrainControlRef = useRef<maplibregl.TerrainControl | null>(null)
  const mapState = useRef<{ center: [number, number]; zoom: number }>({
    center: [-98.5, 39.8],
    zoom: 4,
  })
  const colorSchemeSelectRef = useRef<HTMLSelectElement>(null)
  const politicalViewSelectRef = useRef<HTMLSelectElement>(null)
  const prevFilterCountryRef = useRef<string>('')
  const prevPoliticalViewRef = useRef<string>('')
  // Use a ref so mapClickHandler always reads the current language without stale closure
  const languageRef = useRef<string>('en')

  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const {
    client,
    getToken,
    loading: clientLoading,
    error: clientError,
  } = useLocationClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AutocompleteResultItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<AddressResult | null>(
    null,
  )
  const [isValidating, setIsValidating] = useState(false)
  const [searchMode, setSearchMode] = useState<'autocomplete' | 'geocode'>(
    'autocomplete',
  )
  const [mapStyle, setMapStyle] = useState<MapStyle>('Standard')
  const [colorScheme, setColorScheme] = useState<ColorScheme>('Light')
  const [politicalView, setPoliticalView] = useState('')
  // Previously hard-coded to Terrain3D / Buildings3D / Medium with no way to
  // change them, so three of the descriptor's parameters were never exercised.
  const [terrain, setTerrain] = useState<Terrain | ''>('Terrain3D')
  const [buildings, setBuildings] = useState(true)
  const [contourDensity, setContourDensity] = useState<ContourDensity | ''>(
    'Medium',
  )
  // Absent entirely before this. `traffic` is the one that shows the API
  // forwarding Amazon's own combination error: pick Satellite and All together
  // and the response is "Traffic is not supported for style."
  const [traffic, setTraffic] = useState<TrafficMode | ''>('')
  const [travelModes, setTravelModes] = useState<TravelMode[]>([])

  // Satellite and Hybrid reject the Standard-only parameters, so the controls
  // are disabled rather than left to produce a guaranteed 400.
  const isRasterStyle = mapStyle === 'Satellite' || mapStyle === 'Hybrid'

  // Same shape as languageRef below: the map-INIT effect reads the current
  // controls without listing them as dependencies, which would tear the map
  // down and rebuild it on every change instead of calling setStyle.
  const styleControlsRef = useRef<StyleControls>({
    colorScheme,
    terrain,
    buildings,
    contourDensity,
    traffic,
    travelModes,
    politicalView,
  })
  useEffect(() => {
    styleControlsRef.current = {
      colorScheme,
      terrain,
      buildings,
      contourDensity,
      traffic,
      travelModes,
      politicalView,
    }
  }, [
    colorScheme,
    terrain,
    buildings,
    contourDensity,
    traffic,
    travelModes,
    politicalView,
  ])
  const [filterCountry, setFilterCountry] = useState<string>('')
  const [language, setLanguage] = useState<string>('en')
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Keep languageRef in sync so the map click handler always uses the current language
  useEffect(() => {
    languageRef.current = language
  }, [language])
  // Track whether suggestions are open so the re-run effect doesn't re-open them after selection
  const showSuggestionsRef = useRef(false)
  useEffect(() => {
    showSuggestionsRef.current = showSuggestions
  }, [showSuggestions])

  // Apply language to map labels whenever language or map instance changes.
  // The hook also registers a 'style.load' listener, so language is reapplied after setStyle.
  useMapLanguage(mapInstance, language)

  // Add or replace the native TerrainControl based on whether the style has a raster-dem source.
  // AWS Terrain3D styles embed a raster-dem source in the descriptor — we extract its ID so
  // MapLibre's built-in button can toggle the terrain layer on/off.
  function syncTerrainControl(
    instance: maplibregl.Map,
    style: { sources?: Record<string, { type?: string }> },
  ) {
    if (terrainControlRef.current) {
      try {
        instance.removeControl(terrainControlRef.current)
      } catch {
        /* already removed */
      }
      terrainControlRef.current = null
    }
    const demSourceId = Object.entries(style.sources ?? {}).find(
      ([, src]) => src.type === 'raster-dem',
    )?.[0]
    if (demSourceId) {
      const ctrl = new maplibregl.TerrainControl({
        source: demSourceId,
        exaggeration: 1,
      })
      instance.addControl(ctrl, 'top-right')
      terrainControlRef.current = ctrl
    }
  }

  // mapClickHandler is attached to the map once at init — uses languageRef to avoid
  // stale closures when the user changes the language dropdown
  const mapClickHandler = useCallback(
    async (e: maplibregl.MapMouseEvent) => {
      if (!client) return
      const { lng, lat } = e.lngLat

      try {
        const command = new ReverseGeocodeCommand({
          QueryPosition: [lng, lat],
          Language: languageRef.current,
        })
        const response: ReverseGeocodeCommandOutput = await client.send(command)
        const result = response.ResultItems?.[0]

        if (result) {
          const address: AddressResult = {
            label: result.Address?.Label,
            addressLineOne: result.Address?.AddressNumber
              ? `${result.Address.AddressNumber} ${result.Address.Street || ''}`.trim()
              : result.Address?.Street,
            city: result.Address?.Locality,
            province: result.Address?.Region?.Name,
            postalCode: result.Address?.PostalCode,
            country:
              result.Address?.Country?.Code3 ??
              result.Address?.Country?.Name ??
              undefined,
            position: [lng, lat],
          }

          setSelectedAddress(address)
          setQuery(result.Address?.Label || '')

          if (marker.current) marker.current.remove()
          marker.current = new maplibregl.Marker({ color: '#3b82f6' })
            .setLngLat([lng, lat])
            .addTo(map.current!)
        }
      } catch (err) {
        console.error('Map click reverse geocode error:', err)
      }
    },
    [client],
  )

  // Initialize map once when auth is ready — style changes handled separately via setStyle
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
        const isRasterStyle = mapStyle === 'Satellite' || mapStyle === 'Hybrid'
        const style = await fetchMapStyle(API_URL, mapStyle, getToken, {
          ...buildStyleOptions(styleControlsRef.current, isRasterStyle),
          language: languageRef.current,
        })

        const instance = new maplibregl.Map({
          container: mapContainer.current!,
          style,
          center: mapState.current.center,
          zoom: mapState.current.zoom,
          pitch: 0,
          maxPitch: 85,
          transformRequest: createTransformRequest(
            API_URL,
            getToken,
          ) as maplibregl.RequestTransformFunction,
        })

        instance.addControl(
          new maplibregl.NavigationControl({ visualizePitch: true }),
          'top-right',
        )
        syncTerrainControl(instance, style)
        instance.addControl(new maplibregl.ScaleControl())
        instance.addControl(
          new maplibregl.GeolocateControl({
            showUserLocation: true,
            trackUserLocation: true,
            positionOptions: { enableHighAccuracy: true },
          }),
        )
        instance.addControl(new maplibregl.GlobeControl())
        // 3D buildings OFF by default — they hide the streets and labels
        // underneath, and this map exists to find an address. The control
        // toggles layer visibility rather than re-fetching the style, so a
        // toggle costs nothing (a descriptor fetch is a billable map load).
        instance.addControl(new BuildingsControl(), 'top-right')

        instance.on('click', mapClickHandler)
        instance.getCanvas().style.cursor = 'crosshair'

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
    }

    initMap()

    return () => {
      if (marker.current) marker.current.remove()
      if (map.current) map.current.remove()
      setMapInstance(null)
    }
    // Intentionally excludes mapStyle/colorScheme/politicalView —
    // style changes are handled by setStyle in the effect below to avoid full map recreation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientLoading, clientError, getToken])

  // Update map style in-place without destroying/recreating the map instance.
  // Language changes are handled by useMapLanguage above — no need to include it here.
  useEffect(() => {
    const isRasterStyle = mapStyle === 'Satellite' || mapStyle === 'Hybrid'

    // Raster styles have no colour scheme and Satellite has no political view;
    // the resets themselves happen in the Map Style onChange, not here.
    if (colorSchemeSelectRef.current) {
      colorSchemeSelectRef.current.disabled = isRasterStyle || loading
    }

    if (politicalViewSelectRef.current) {
      politicalViewSelectRef.current.disabled =
        mapStyle === 'Satellite' || loading
    }

    if (map.current && getToken) {
      const currentMap = map.current
      fetchMapStyle(API_URL, mapStyle, getToken, {
        ...buildStyleOptions(styleControlsRef.current, isRasterStyle),
        language: languageRef.current,
      })
        .then((style) => {
          currentMap.setStyle(style)
          syncTerrainControl(currentMap, style)
        })
        .catch((err) => console.error('[style update]', err))
    }
  }, [
    mapStyle,
    colorScheme,
    politicalView,
    terrain,
    buildings,
    contourDensity,
    traffic,
    travelModes,
    loading,
    getToken,
  ])

  const flyToCountryCenter = useCallback(
    async (countryCode: string) => {
      if (!client || !countryCode) return

      try {
        const command = new GeocodeCommand({
          QueryComponents: { Country: countryCode },
        })
        const response: GeocodeCommandOutput = await client.send(command)
        const countryGeocode = response.ResultItems?.find((item) =>
          item.PlaceType?.includes('Country'),
        )

        if (countryGeocode && map.current) {
          if (countryGeocode.MapView) {
            map.current.fitBounds(
              countryGeocode.MapView as [number, number, number, number],
              { padding: 20 },
            )
          } else if (countryGeocode.Position) {
            map.current.flyTo({
              center: countryGeocode.Position as [number, number],
              speed: 1.2,
              curve: 1.4,
            })
          }
        }
      } catch (err) {
        console.error('Fly to country error:', err)
      }
    },
    [client],
  )

  useEffect(() => {
    const filterCountryChanged = prevFilterCountryRef.current !== filterCountry
    const politicalViewChanged = prevPoliticalViewRef.current !== politicalView

    if (filterCountryChanged && filterCountry) {
      flyToCountryCenter(filterCountry)
    } else if (politicalViewChanged && politicalView) {
      flyToCountryCenter(politicalView)
    }

    prevFilterCountryRef.current = filterCountry
    prevPoliticalViewRef.current = politicalView
  }, [filterCountry, politicalView, flyToCountryCenter])

  const searchAddress = useCallback(
    (searchQuery: string) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)

      if (!client || !searchQuery || searchQuery.length < 3 || !map.current) {
        setSuggestions([])
        return
      }

      debounceTimer.current = setTimeout(async () => {
        const center = map.current!.getCenter()

        try {
          if (searchMode === 'geocode') {
            const commandInput: GeocodeCommandInput = {
              QueryText: searchQuery,
              BiasPosition: [center.lng, center.lat],
              MaxResults: 5,
              Language: language,
            }

            if (filterCountry) {
              commandInput.Filter = { IncludeCountries: [filterCountry] }
            }

            const command = new GeocodeCommand(commandInput)
            const response: GeocodeCommandOutput = await client.send(command)

            const geocodeResults: AutocompleteResultItem[] = (
              response.ResultItems || []
            ).map((item) => ({
              Title: item.Address?.Label || '',
              Address: item.Address,
              PlaceId: item.PlaceId,
              PlaceType: 'Street' as const,
            }))

            setSuggestions(geocodeResults)
            setShowSuggestions(true)
          } else {
            const commandInput: AutocompleteCommandInput = {
              QueryText: searchQuery,
              MaxResults: 5,
              Language: language,
              BiasPosition: [center.lng, center.lat],
            }

            if (filterCountry) {
              commandInput.Filter = { IncludeCountries: [filterCountry] }
            }

            const command = new AutocompleteCommand(commandInput)
            const response: AutocompleteCommandOutput =
              await client.send(command)

            setSuggestions(response.ResultItems || [])
            setShowSuggestions(true)
          }
        } catch (err) {
          console.error('Search error:', err)
        }
      }, 300)
    },
    [client, searchMode, language, filterCountry],
  )

  // Re-run the current query whenever language, filterCountry, or searchMode changes,
  // but only when the suggestions dropdown is already open (don't re-open after selection).
  // query is intentionally omitted — adding it would re-search on every keystroke.
  useEffect(() => {
    if (showSuggestionsRef.current && query.length >= 3) searchAddress(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchAddress])

  const selectAddress = useCallback(
    async (suggestion: AutocompleteResultItem) => {
      if (!client || !suggestion.PlaceId) return

      setIsValidating(true)
      try {
        const command = new GetPlaceCommand({
          PlaceId: suggestion.PlaceId,
          Language: language,
        })

        const response: GetPlaceCommandOutput = await client.send(command)

        const address: AddressResult = {
          placeId: suggestion.PlaceId,
          label: response.Address?.Label,
          addressLineOne: response.Address?.AddressNumber
            ? `${response.Address.AddressNumber} ${response.Address.Street || ''}`.trim()
            : response.Address?.Street,
          city: response.Address?.Locality,
          province: response.Address?.Region?.Name,
          postalCode: response.Address?.PostalCode,
          country:
            response.Address?.Country?.Code3 ??
            response.Address?.Country?.Name ??
            undefined,
          position: response.Position as [number, number],
        }

        setSelectedAddress(address)
        setQuery(response.Address?.Label || '')
        setShowSuggestions(false)

        if (response.Position && map.current) {
          map.current.flyTo({
            center: response.Position as [number, number],
            zoom: 15,
          })

          if (marker.current) marker.current.remove()
          marker.current = new maplibregl.Marker()
            .setLngLat(response.Position as [number, number])
            .addTo(map.current)
        }
      } catch (err) {
        console.error('GetPlace error:', err)
        setError('Failed to validate address')
      } finally {
        setIsValidating(false)
      }
    },
    [client, language],
  )

  const useCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation || !client) return

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { longitude, latitude } = position.coords

      try {
        const command = new ReverseGeocodeCommand({
          QueryPosition: [longitude, latitude],
          Language: language,
        })

        const response: ReverseGeocodeCommandOutput = await client.send(command)
        const result = response.ResultItems?.[0]

        if (result) {
          const address: AddressResult = {
            label: result.Address?.Label,
            addressLineOne: result.Address?.AddressNumber
              ? `${result.Address.AddressNumber} ${result.Address.Street || ''}`.trim()
              : result.Address?.Street,
            city: result.Address?.Locality,
            province: result.Address?.Region?.Name,
            postalCode: result.Address?.PostalCode,
            country:
              result.Address?.Country?.Code3 ??
              result.Address?.Country?.Name ??
              undefined,
            position: [longitude, latitude],
          }

          setSelectedAddress(address)
          setQuery(result.Address?.Label || '')

          if (map.current) {
            map.current.flyTo({ center: [longitude, latitude], zoom: 15 })
            if (marker.current) marker.current.remove()
            marker.current = new maplibregl.Marker()
              .setLngLat([longitude, latitude])
              .addTo(map.current)
          }
        }
      } catch (err) {
        console.error('Reverse geocode error:', err)
      }
    })
  }, [client, language])

  // A provider error (no credentials, token fetch failed) is shown here rather
  // than leaving the map on "Loading…" forever.
  const displayError = error ?? clientError
  if (displayError) {
    return (
      <div className="flex h-150 w-full items-center justify-center rounded-lg bg-red-50">
        <div className="text-center">
          <p className="font-semibold text-red-600">Failed to load</p>
          <p className="mt-2 text-sm text-red-500">{displayError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-lg bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Map Style
            </label>
            <select
              value={mapStyle}
              onChange={(e) => {
                // `e.target.value` is string; the options are rendered from
                // MAP_STYLES, so the cast is safe and the compiler now insists
                // on it rather than letting a typo through.
                const next = e.target.value as MapStyle
                setMapStyle(next)
                if (next === 'Satellite' || next === 'Hybrid')
                  setColorScheme('Light')
                if (next === 'Satellite') setPoliticalView('')
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={loading}
            >
              {MAP_STYLES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Color Scheme
            </label>
            <select
              ref={colorSchemeSelectRef}
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value as ColorScheme)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              {COLOR_SCHEMES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
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

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Terrain
            </label>
            <select
              value={terrain}
              onChange={(e) => setTerrain(e.target.value as Terrain | '')}
              disabled={isRasterStyle}
              title={isRasterStyle ? RASTER_NOTE : undefined}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">None</option>
              {TERRAINS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Contour density
            </label>
            <select
              value={contourDensity}
              onChange={(e) =>
                setContourDensity(e.target.value as ContourDensity | '')
              }
              disabled={isRasterStyle}
              title={isRasterStyle ? RASTER_NOTE : undefined}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">None</option>
              {CONTOUR_DENSITIES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Traffic
            </label>
            <select
              value={traffic}
              onChange={(e) => setTraffic(e.target.value as TrafficMode | '')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">None</option>
              {TRAFFIC_MODES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            {/* Deliberately NOT disabled for raster styles: this is the control
                that shows the API forwarding Amazon's own combination error. */}
            <p className="mt-1 text-xs text-gray-500">
              Try Satellite + All to see Amazon&apos;s own error forwarded.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Travel modes
            </label>
            <div className="flex gap-4 py-2">
              {TRAVEL_MODES.map((mode) => (
                <label key={mode} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={travelModes.includes(mode)}
                    onChange={(e) =>
                      setTravelModes((prev) =>
                        e.target.checked
                          ? [...prev, mode]
                          : prev.filter((m) => m !== mode),
                      )
                    }
                  />
                  {mode}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Sent comma-separated; the API checks each entry.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              3D buildings
            </label>
            <label className="flex items-center gap-2 py-2 text-sm">
              <input
                type="checkbox"
                checked={buildings}
                disabled={isRasterStyle}
                onChange={(e) => setBuildings(e.target.checked)}
              />
              Buildings3D
            </label>
          </div>
        </div>

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

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="space-y-4">
          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Search Address
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchMode('autocomplete')}
                  className={`rounded px-3 py-1 text-xs ${
                    searchMode === 'autocomplete'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Autocomplete
                </button>
                <button
                  onClick={() => setSearchMode('geocode')}
                  className={`rounded px-3 py-1 text-xs ${
                    searchMode === 'geocode'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Geocode
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    searchAddress(e.target.value)
                  }}
                  onFocus={() =>
                    suggestions.length > 0 && setShowSuggestions(true)
                  }
                  placeholder={
                    searchMode === 'geocode'
                      ? 'Enter full address (e.g., 123 Main St, Apt 4B, City)...'
                      : 'Enter an address...'
                  }
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => selectAddress(suggestion)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      >
                        <div className="font-medium">{suggestion.Title}</div>
                        {suggestion.Address?.Label && (
                          <div className="text-sm text-gray-600">
                            {suggestion.Address.Label}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={useCurrentLocation}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                📍 Use My Location
              </button>
            </div>
          </div>

          {isValidating && (
            <div className="text-center text-gray-600">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="mt-2">Validating address...</p>
            </div>
          )}

          {selectedAddress && !isValidating && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="mb-2 font-semibold text-green-900">
                ✓ Address Validated
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedAddress.addressLineOne && (
                  <div>
                    <span className="font-medium text-gray-700">Street:</span>
                    <p className="text-gray-900">
                      {selectedAddress.addressLineOne}
                    </p>
                  </div>
                )}
                {selectedAddress.city && (
                  <div>
                    <span className="font-medium text-gray-700">City:</span>
                    <p className="text-gray-900">{selectedAddress.city}</p>
                  </div>
                )}
                {selectedAddress.province && (
                  <div>
                    <span className="font-medium text-gray-700">
                      State/Province:
                    </span>
                    <p className="text-gray-900">{selectedAddress.province}</p>
                  </div>
                )}
                {selectedAddress.postalCode && (
                  <div>
                    <span className="font-medium text-gray-700">
                      Postal Code:
                    </span>
                    <p className="text-gray-900">
                      {selectedAddress.postalCode}
                    </p>
                  </div>
                )}
                {selectedAddress.country && (
                  <div>
                    <span className="font-medium text-gray-700">Country:</span>
                    <p className="text-gray-900">{selectedAddress.country}</p>
                  </div>
                )}
                {selectedAddress.position && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">
                      Coordinates:
                    </span>
                    <p className="font-mono text-xs text-gray-900">
                      {selectedAddress.position[1].toFixed(6)},{' '}
                      {selectedAddress.position[0].toFixed(6)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative h-125 w-full overflow-hidden rounded-lg bg-white shadow-lg">
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
