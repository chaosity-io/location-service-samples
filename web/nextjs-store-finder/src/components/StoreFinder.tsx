'use client'

import {
  COUNTRY_TO_REGION,
  getStoresByRegion,
  REGION_CENTERS,
  stores,
  type Store,
} from '@/data/stores'
import type {
  AutocompleteCommandOutput,
  AutocompleteResultItem,
  GetPlaceCommandOutput,
  ReverseGeocodeCommandOutput,
} from '@chaosity/location-client'
import {
  AutocompleteCommand,
  createTransformRequest,
  fetchMapStyle,
  GetPlaceCommand,
  ReverseGeocodeCommand,
} from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_LOCATION_API_URL!

// ---------------------------------------------------------------------------
// Haversine distance (km) between two points
// ---------------------------------------------------------------------------
function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---------------------------------------------------------------------------
// Category styling helpers
// ---------------------------------------------------------------------------
const CATEGORY_COLORS: Record<Store['category'], string> = {
  flagship: '#3b82f6',
  outlet: '#22c55e',
  express: '#6b7280',
}

const CATEGORY_BADGE: Record<Store['category'], { bg: string; text: string }> =
  {
    flagship: { bg: 'bg-blue-100 text-blue-700', text: 'Flagship' },
    outlet: { bg: 'bg-green-100 text-green-700', text: 'Outlet' },
    express: { bg: 'bg-gray-100 text-gray-600', text: 'Express' },
  }

const REGION_LABELS: Record<string, string> = {
  'north-america': 'North America',
  europe: 'Europe',
  oceania: 'Australia & New Zealand',
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StoreWithDistance extends Store {
  distance: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function StoreFinder() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const storeMarkers = useRef<maplibregl.Marker[]>([])
  const searchMarker = useRef<maplibregl.Marker | null>(null)
  const openPopup = useRef<maplibregl.Popup | null>(null)

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
  const [searchPosition, setSearchPosition] = useState<[number, number] | null>(
    null,
  )
  const [radius, setRadius] = useState(25)
  const [filteredStores, setFilteredStores] = useState<StoreWithDistance[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [activeRegion, setActiveRegion] = useState<string>('north-america')
  const [regionStores, setRegionStores] = useState<Store[]>(stores)
  const [detectingLocation, setDetectingLocation] = useState(true)

  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // ---------------------------------------------------------------------------
  // Detect user's region on mount via geolocation + reverse geocode
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!client || clientLoading) return

    const detectRegion = async (lng: number, lat: number) => {
      try {
        const response: ReverseGeocodeCommandOutput = await client.send(
          new ReverseGeocodeCommand({
            QueryPosition: [lng, lat],
            MaxResults: 1,
          }),
        )
        const countryCode =
          response.ResultItems?.[0]?.Address?.Country?.Code2 ??
          response.ResultItems?.[0]?.Address?.Country?.Code3?.substring(0, 2)

        if (countryCode) {
          const region = COUNTRY_TO_REGION[countryCode.toUpperCase()]
          if (region) {
            setActiveRegion(region)
            setRegionStores(getStoresByRegion(region))

            // Pan map to detected region
            if (map.current) {
              const rc = REGION_CENTERS[region]
              map.current.flyTo({
                center: rc.center,
                zoom: rc.zoom,
                speed: 1.5,
              })
            }
          }
        }
      } catch (err) {
        console.error('Region detection error:', err)
      } finally {
        setDetectingLocation(false)
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          detectRegion(position.coords.longitude, position.coords.latitude),
        () => setDetectingLocation(false),
        { timeout: 5000 },
      )
    } else {
      setDetectingLocation(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, clientLoading])

  // ---------------------------------------------------------------------------
  // Switch region manually
  // ---------------------------------------------------------------------------
  const switchRegion = useCallback((region: string) => {
    setActiveRegion(region)
    const regionList = getStoresByRegion(region)
    setRegionStores(regionList)
    setHasSearched(false)
    setFilteredStores([])
    setSearchPosition(null)
    setSelectedStoreId(null)
    setQuery('')

    // Remove search marker
    if (searchMarker.current) {
      searchMarker.current.remove()
      searchMarker.current = null
    }

    // Fly to region and re-add markers
    if (map.current) {
      const rc = REGION_CENTERS[region]
      map.current.flyTo({ center: rc.center, zoom: rc.zoom, speed: 1.5 })
      showAllStores(regionList)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // Filter stores by radius from a point
  // ---------------------------------------------------------------------------
  const filterStores = useCallback(
    (center: [number, number], radiusKm: number): StoreWithDistance[] => {
      return regionStores
        .map((s) => ({
          ...s,
          distance: haversine(
            center[1],
            center[0],
            s.position[1],
            s.position[0],
          ),
        }))
        .filter((s) => s.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance)
    },
    [regionStores],
  )

  // ---------------------------------------------------------------------------
  // Clear existing store markers
  // ---------------------------------------------------------------------------
  const clearMarkers = useCallback(() => {
    storeMarkers.current.forEach((m) => m.remove())
    storeMarkers.current = []
    if (openPopup.current) {
      openPopup.current.remove()
      openPopup.current = null
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Show all stores for a list (initial or region switch)
  // ---------------------------------------------------------------------------
  const showAllStores = useCallback(
    (storeList: Store[]) => {
      if (!map.current) return
      clearMarkers()

      const bounds = new maplibregl.LngLatBounds()

      storeList.forEach((store) => {
        const popup = new maplibregl.Popup({
          offset: 25,
          maxWidth: '260px',
        }).setHTML(
          `<div style="font-family:system-ui,-apple-system,sans-serif">
            <p style="font-weight:600;margin:0 0 4px">${store.name}</p>
            <p style="color:#6b7280;font-size:13px;margin:0 0 4px">${store.address}</p>
            <p style="color:#6b7280;font-size:13px;margin:0 0 4px">${store.phone}</p>
            <p style="color:#6b7280;font-size:12px;margin:0">${store.hours}</p>
          </div>`,
        )

        const marker = new maplibregl.Marker({
          color: CATEGORY_COLORS[store.category],
        })
          .setLngLat(store.position)
          .setPopup(popup)
          .addTo(map.current!)

        marker.getElement().addEventListener('click', () => {
          setSelectedStoreId(store.id)
          if (openPopup.current) openPopup.current.remove()
          openPopup.current = popup
        })

        storeMarkers.current.push(marker)
        bounds.extend(store.position)
      })

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 60, maxZoom: 13 })
      }
    },
    [clearMarkers],
  )

  // ---------------------------------------------------------------------------
  // Add store markers to map and fit bounds (search results)
  // ---------------------------------------------------------------------------
  const addMarkers = useCallback(
    (storeList: StoreWithDistance[], center?: [number, number]) => {
      if (!map.current) return
      clearMarkers()

      const bounds = new maplibregl.LngLatBounds()

      storeList.forEach((store) => {
        const popup = new maplibregl.Popup({
          offset: 25,
          maxWidth: '260px',
        }).setHTML(
          `<div style="font-family:system-ui,-apple-system,sans-serif">
            <p style="font-weight:600;margin:0 0 4px">${store.name}</p>
            <p style="color:#6b7280;font-size:13px;margin:0 0 4px">${store.address}</p>
            <p style="color:#6b7280;font-size:13px;margin:0 0 4px">${store.phone}</p>
            <p style="color:#6b7280;font-size:12px;margin:0">${store.hours}</p>
          </div>`,
        )

        const marker = new maplibregl.Marker({
          color: CATEGORY_COLORS[store.category],
        })
          .setLngLat(store.position)
          .setPopup(popup)
          .addTo(map.current!)

        marker.getElement().addEventListener('click', () => {
          setSelectedStoreId(store.id)
          if (openPopup.current) openPopup.current.remove()
          openPopup.current = popup
        })

        storeMarkers.current.push(marker)
        bounds.extend(store.position)
      })

      if (center) bounds.extend(center)

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 60, maxZoom: 13 })
      }
    },
    [clearMarkers],
  )

  // ---------------------------------------------------------------------------
  // Update search results
  // ---------------------------------------------------------------------------
  const updateResults = useCallback(
    (center: [number, number], radiusKm: number) => {
      const nearby = filterStores(center, radiusKm)
      setFilteredStores(nearby)
      setHasSearched(true)
      setSelectedStoreId(null)

      if (searchMarker.current) searchMarker.current.remove()
      searchMarker.current = new maplibregl.Marker({ color: '#ef4444' })
        .setLngLat(center)
        .addTo(map.current!)

      addMarkers(nearby, center)
    },
    [filterStores, addMarkers],
  )

  // ---------------------------------------------------------------------------
  // Re-filter when radius changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (searchPosition) {
      updateResults(searchPosition, radius)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius])

  // ---------------------------------------------------------------------------
  // Initialize map
  // ---------------------------------------------------------------------------
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
        const style = await fetchMapStyle(API_URL, 'Standard', getToken, {
          colorScheme: 'Light' as const,
          terrain: 'Terrain3D' as const,
          buildings: 'Buildings3D' as const,
        })

        if (cancelled) return

        const rc = REGION_CENTERS[activeRegion]

        const instance = new maplibregl.Map({
          container: mapContainer.current!,
          style,
          center: rc.center,
          zoom: rc.zoom,
          maxPitch: 85,
          transformRequest: createTransformRequest(API_URL, getToken),
        })

        instance.addControl(
          new maplibregl.NavigationControl({ visualizePitch: true }),
          'top-right',
        )

        const demSourceId = Object.entries(
          (style as { sources?: Record<string, { type?: string }> }).sources ??
            {},
        ).find(([, src]) => src.type === 'raster-dem')?.[0]
        if (demSourceId) {
          instance.addControl(
            new maplibregl.TerrainControl({ source: demSourceId }),
            'top-right',
          )
        }

        instance.addControl(
          new maplibregl.GeolocateControl({
            showUserLocation: true,
            trackUserLocation: false,
            positionOptions: { enableHighAccuracy: true },
          }),
        )

        map.current = instance

        instance.on('load', () => {
          showAllStores(regionStores)
        })

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
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientLoading, client, clientError])

  // ---------------------------------------------------------------------------
  // Autocomplete search (debounced)
  // ---------------------------------------------------------------------------
  const searchAddress = useCallback(
    (searchQuery: string) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)

      if (!client || !searchQuery || searchQuery.length < 3) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      debounceTimer.current = setTimeout(async () => {
        try {
          const biasPosition: [number, number] | undefined = map.current
            ? [map.current.getCenter().lng, map.current.getCenter().lat]
            : undefined

          const command = new AutocompleteCommand({
            QueryText: searchQuery,
            MaxResults: 5,
            ...(biasPosition && { BiasPosition: biasPosition }),
          })

          const response: AutocompleteCommandOutput = await client.send(command)
          setSuggestions(response.ResultItems || [])
          setShowSuggestions(true)
        } catch (err) {
          console.error('Autocomplete error:', err)
        }
      }, 300)
    },
    [client],
  )

  // ---------------------------------------------------------------------------
  // Select a suggestion -> GetPlace -> detect region -> filter stores
  // ---------------------------------------------------------------------------
  const selectSuggestion = useCallback(
    async (suggestion: AutocompleteResultItem) => {
      if (!client || !suggestion.PlaceId) return

      setShowSuggestions(false)

      try {
        const command = new GetPlaceCommand({ PlaceId: suggestion.PlaceId })
        const response: GetPlaceCommandOutput = await client.send(command)

        if (response.Position) {
          const pos: [number, number] = response.Position as [number, number]
          setQuery(response.Address?.Label || suggestion.Title || '')
          setSearchPosition(pos)

          // Auto-detect region from the selected address
          const countryCode =
            response.Address?.Country?.Code2 ??
            response.Address?.Country?.Code3?.substring(0, 2)
          if (countryCode) {
            const detectedRegion = COUNTRY_TO_REGION[countryCode.toUpperCase()]
            if (detectedRegion && detectedRegion !== activeRegion) {
              setActiveRegion(detectedRegion)
              const regionList = getStoresByRegion(detectedRegion)
              setRegionStores(regionList)
              // filterStores uses regionStores, so we compute inline here
              const nearby = regionList
                .map((s) => ({
                  ...s,
                  distance: haversine(
                    pos[1],
                    pos[0],
                    s.position[1],
                    s.position[0],
                  ),
                }))
                .filter((s) => s.distance <= radius)
                .sort((a, b) => a.distance - b.distance)
              setFilteredStores(nearby)
              setHasSearched(true)
              setSelectedStoreId(null)

              if (searchMarker.current) searchMarker.current.remove()
              searchMarker.current = new maplibregl.Marker({ color: '#ef4444' })
                .setLngLat(pos)
                .addTo(map.current!)

              // Clear and add markers inline
              storeMarkers.current.forEach((m) => m.remove())
              storeMarkers.current = []
              const bounds = new maplibregl.LngLatBounds()
              bounds.extend(pos)
              nearby.forEach((store) => {
                const popup = new maplibregl.Popup({
                  offset: 25,
                  maxWidth: '260px',
                }).setHTML(
                  `<div style="font-family:system-ui,-apple-system,sans-serif">
                    <p style="font-weight:600;margin:0 0 4px">${store.name}</p>
                    <p style="color:#6b7280;font-size:13px;margin:0 0 4px">${store.address}</p>
                    <p style="color:#6b7280;font-size:13px;margin:0 0 4px">${store.phone}</p>
                    <p style="color:#6b7280;font-size:12px;margin:0">${store.hours}</p>
                  </div>`,
                )
                const marker = new maplibregl.Marker({
                  color: CATEGORY_COLORS[store.category],
                })
                  .setLngLat(store.position)
                  .setPopup(popup)
                  .addTo(map.current!)
                marker.getElement().addEventListener('click', () => {
                  setSelectedStoreId(store.id)
                  if (openPopup.current) openPopup.current.remove()
                  openPopup.current = popup
                })
                storeMarkers.current.push(marker)
                bounds.extend(store.position)
              })
              if (!bounds.isEmpty()) {
                map.current?.fitBounds(bounds, { padding: 60, maxZoom: 13 })
              }
              return
            }
          }

          updateResults(pos, radius)
        }
      } catch (err) {
        console.error('GetPlace error:', err)
      }
    },
    [client, radius, updateResults, activeRegion],
  )

  // ---------------------------------------------------------------------------
  // Use My Location
  // ---------------------------------------------------------------------------
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation || !client) return

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const pos: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ]
        setQuery('My Location')
        setSearchPosition(pos)

        // Detect region from current location
        try {
          const response: ReverseGeocodeCommandOutput = await client.send(
            new ReverseGeocodeCommand({ QueryPosition: pos, MaxResults: 1 }),
          )
          const countryCode =
            response.ResultItems?.[0]?.Address?.Country?.Code2 ??
            response.ResultItems?.[0]?.Address?.Country?.Code3?.substring(0, 2)
          if (countryCode) {
            const detectedRegion = COUNTRY_TO_REGION[countryCode.toUpperCase()]
            if (detectedRegion && detectedRegion !== activeRegion) {
              setActiveRegion(detectedRegion)
              const regionList = getStoresByRegion(detectedRegion)
              setRegionStores(regionList)
            }
          }
        } catch {
          // Fall through to use current region
        }

        updateResults(pos, radius)
      },
      (err) => {
        console.error('Geolocation error:', err)
      },
    )
  }, [client, radius, updateResults, activeRegion])

  // ---------------------------------------------------------------------------
  // Click a store card -> highlight + fly to + open popup
  // ---------------------------------------------------------------------------
  const selectStore = useCallback(
    (store: StoreWithDistance) => {
      setSelectedStoreId(store.id)
      if (!map.current) return

      map.current.flyTo({ center: store.position, zoom: 14, speed: 1.2 })

      const idx = filteredStores.findIndex((s) => s.id === store.id)
      if (idx >= 0 && storeMarkers.current[idx]) {
        if (openPopup.current) openPopup.current.remove()
        storeMarkers.current[idx].togglePopup()
        openPopup.current = storeMarkers.current[idx].getPopup()
      }
    },
    [filteredStores],
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-red-50">
        <div className="text-center">
          <p className="font-semibold text-red-600">Failed to load</p>
          <p className="mt-2 text-sm text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Left sidebar                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex w-100 shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* Search area */}
        <div className="space-y-3 border-b border-gray-100 p-4">
          {/* Region tabs */}
          <div className="flex gap-1">
            {Object.entries(REGION_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => switchRegion(key)}
                className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-colors ${
                  activeRegion === key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Address input */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                searchAddress(e.target.value)
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search an address..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onMouseDown={() => selectSuggestion(suggestion)}
                    className="w-full border-b border-gray-50 px-4 py-2.5 text-left last:border-0 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {suggestion.Title}
                    </div>
                    {suggestion.Address?.Label && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        {suggestion.Address.Label}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Use My Location */}
          <button
            onClick={useMyLocation}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Use My Location
          </button>

          {/* Radius selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Radius
            </label>
            <div className="flex flex-1 gap-1">
              {[5, 10, 25, 50].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                    radius === r
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5">
          {hasSearched ? (
            <p className="text-xs font-medium text-gray-600">
              {filteredStores.length} store
              {filteredStores.length !== 1 ? 's' : ''} within {radius} km
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              {detectingLocation
                ? 'Detecting your location...'
                : `${regionStores.length} stores in ${REGION_LABELS[activeRegion]}`}
            </p>
          )}
        </div>

        {/* Store list */}
        <div className="flex-1 overflow-y-auto">
          {!hasSearched &&
            regionStores.map((store) => (
              <div
                key={store.id}
                className={`cursor-pointer border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50 ${
                  selectedStoreId === store.id
                    ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset'
                    : ''
                }`}
                onClick={() => {
                  setSelectedStoreId(store.id)
                  map.current?.flyTo({
                    center: store.position,
                    zoom: 14,
                    speed: 1.2,
                  })
                  const idx = regionStores.findIndex((s) => s.id === store.id)
                  if (idx >= 0 && storeMarkers.current[idx]) {
                    if (openPopup.current) openPopup.current.remove()
                    storeMarkers.current[idx].togglePopup()
                    openPopup.current = storeMarkers.current[idx].getPopup()
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {store.name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_BADGE[store.category].bg}`}
                  >
                    {CATEGORY_BADGE[store.category].text}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{store.address}</p>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                  <span>{store.phone}</span>
                  <span className="text-gray-300">|</span>
                  <span>{store.hours}</span>
                </div>
              </div>
            ))}

          {hasSearched && filteredStores.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-gray-500">
                No stores found within {radius} km.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Try increasing the search radius.
              </p>
            </div>
          )}

          {hasSearched &&
            filteredStores.map((store) => (
              <div
                key={store.id}
                onClick={() => selectStore(store)}
                className={`cursor-pointer border-b border-gray-100 px-4 py-3 transition-colors ${
                  selectedStoreId === store.id
                    ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {store.name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_BADGE[store.category].bg}`}
                  >
                    {CATEGORY_BADGE[store.category].text}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{store.address}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      {store.distance.toFixed(1)} km
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>{store.phone}</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${store.position[1]},${store.position[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    Get Directions
                  </a>
                </div>
                <p className="mt-1 text-[11px] text-gray-400">{store.hours}</p>
              </div>
            ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Map                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="mt-3 text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="h-full w-full" />
      </div>
    </div>
  )
}
