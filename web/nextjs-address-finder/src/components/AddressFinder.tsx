'use client'

import {
  AutocompleteCommand,
  AutocompleteCommandInput,
  AutocompleteCommandOutput,
  AutocompleteResultItem,
  createTransformRequest,
  GeocodeCommand,
  GeocodeCommandInput,
  GeocodeCommandOutput,
  GetPlaceCommand,
  GetPlaceCommandOutput,
  ReverseGeocodeCommand,
  ReverseGeocodeCommandOutput,
} from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'

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
  const mapState = useRef<{ center: [number, number]; zoom: number }>({
    center: [-98.5, 39.8],
    zoom: 4,
  })
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
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

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
        const params = new URLSearchParams({
          'color-scheme': 'Light',
          terrain: 'Hillshade',
        })
        const styleUrl = `${API_URL}/maps/Standard/descriptor?${params.toString()}`

        const mapInstance = new maplibregl.Map({
          container: mapContainer.current!,
          style: styleUrl,
          center: mapState.current.center,
          zoom: mapState.current.zoom,
          transformRequest: createTransformRequest(
            API_URL,
            getToken,
          ) as maplibregl.RequestTransformFunction,
        })

        mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right')
        mapInstance.addControl(new maplibregl.ScaleControl())
        mapInstance.addControl(
          new maplibregl.GeolocateControl({
            showUserLocation: true,
            trackUserLocation: true,
            positionOptions: { enableHighAccuracy: true },
          }),
        )
        mapInstance.addControl(new maplibregl.GlobeControl())

        mapInstance.on('click', mapClickHandler)
        mapInstance.getCanvas().style.cursor = 'crosshair'

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
      if (marker.current) marker.current.remove()
      if (map.current) map.current.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientLoading, clientError, getToken])

  const mapClickHandler = useCallback(
    async (e: maplibregl.MapMouseEvent) => {
      if (!client) return
      const { lng, lat } = e.lngLat

      try {
        const command = new ReverseGeocodeCommand({
          QueryPosition: [lng, lat],
          Language: 'en',
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

  const searchAddress = useCallback(
    (searchQuery: string) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      if (!client || !searchQuery || searchQuery.length < 3 || !map.current) {
        setSuggestions([])
        return
      }

      debounceTimer.current = setTimeout(async () => {
        // Get map center and reverse geocode to find country
        const center = map.current!.getCenter()
        const reverseCmd = new ReverseGeocodeCommand({
          QueryPosition: [center.lng, center.lat],
          Language: 'en',
        })
        const reverseRes: ReverseGeocodeCommandOutput =
          await client.send(reverseCmd)
        const countryCode = reverseRes.ResultItems?.[0]?.Address?.Country?.Code3

        try {
          if (searchMode === 'geocode') {
            const commandInput: GeocodeCommandInput = {
              QueryText: searchQuery,
              BiasPosition: [center.lng, center.lat],
              MaxResults: 5,
              Language: 'en',
            }

            if (countryCode) {
              commandInput.Filter = { IncludeCountries: [countryCode] }
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
              Language: 'en',
              BiasPosition: [center.lng, center.lat],
            }

            if (countryCode) {
              commandInput.Filter = { IncludeCountries: [countryCode] }
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
      }, 800)
    },
    [client, searchMode],
  )

  // Re-run the current query when searchMode changes (Autocomplete ↔ Geocode).
  // query is intentionally omitted — adding it would re-search on every keystroke.
  useEffect(() => {
    if (query.length >= 3) searchAddress(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchAddress])

  const selectAddress = useCallback(
    async (suggestion: AutocompleteResultItem) => {
      if (!client || !suggestion.PlaceId) return

      setIsValidating(true)
      try {
        const command = new GetPlaceCommand({
          PlaceId: suggestion.PlaceId,
          Language: 'en',
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
    [client],
  )

  const useCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation || !client) return

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { longitude, latitude } = position.coords

      try {
        const command = new ReverseGeocodeCommand({
          QueryPosition: [longitude, latitude],
          Language: 'en',
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
  }, [client])

  if (error) {
    return (
      <div className="flex h-150 w-full items-center justify-center rounded-lg bg-red-50">
        <div className="text-center">
          <p className="font-semibold text-red-600">Failed to load</p>
          <p className="mt-2 text-sm text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
