'use client'

import {
  AutocompleteCommand,
  AutocompleteCommandInput,
  AutocompleteCommandOutput,
  AutocompleteResultItem,
  createTransformRequest,
  fetchMapStyle,
  GeocodeCommand,
  GeocodeCommandInput,
  GeocodeCommandOutput,
  GetPlaceCommand,
  GetPlaceCommandOutput,
  ReverseGeocodeCommand,
  ReverseGeocodeCommandOutput
} from '@chaosity/location-client'
import { useLocationClient, useMapLanguage } from '@chaosity/location-client-react'
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
  const mapState = useRef<{ center: [number, number]; zoom: number }>({ center: [-98.5, 39.8], zoom: 4 })
  const colorSchemeSelectRef = useRef<HTMLSelectElement>(null)
  const politicalViewSelectRef = useRef<HTMLSelectElement>(null)
  const prevFilterCountryRef = useRef<string>('')
  const prevPoliticalViewRef = useRef<string>('')
  // Use a ref so mapClickHandler always reads the current language without stale closure
  const languageRef = useRef<string>('en')

  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const { client, getToken, loading: clientLoading, error: clientError } = useLocationClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AutocompleteResultItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<AddressResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [searchMode, setSearchMode] = useState<'autocomplete' | 'geocode'>('autocomplete')
  const [mapStyle, setMapStyle] = useState('Standard')
  const [colorScheme, setColorScheme] = useState('Light')
  const [politicalView, setPoliticalView] = useState('')
  const [filterCountry, setFilterCountry] = useState<string>('')
  const [language, setLanguage] = useState<string>('en')
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Keep languageRef in sync so the map click handler always uses the current language
  languageRef.current = language
  // Track whether suggestions are open so the re-run effect doesn't re-open them after selection
  const showSuggestionsRef = useRef(false)
  showSuggestionsRef.current = showSuggestions

  // Apply language to map labels whenever language or map instance changes.
  // The hook also registers a 'style.load' listener, so language is reapplied after setStyle.
  useMapLanguage(mapInstance, language)

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
        const style = await fetchMapStyle(API_URL, mapStyle, getToken, {
          colorScheme: colorScheme as 'Light' | 'Dark',
          terrain: 'Hillshade',
          language: languageRef.current,
          ...(politicalView && { politicalView }),
        })

        const instance = new maplibregl.Map({
          container: mapContainer.current!,
          style,
          center: mapState.current.center,
          zoom: mapState.current.zoom,
          transformRequest: createTransformRequest(API_URL, getToken),
        })

        instance.addControl(new maplibregl.NavigationControl(), 'top-right')
        instance.addControl(new maplibregl.ScaleControl())
        instance.addControl(new maplibregl.GeolocateControl({
          showUserLocation: true,
          trackUserLocation: true,
          positionOptions: { enableHighAccuracy: true }
        }))
        instance.addControl(new maplibregl.GlobeControl())

        instance.on('click', mapClickHandler)
        instance.getCanvas().style.cursor = 'crosshair'

        map.current = instance
        setMapInstance(instance)
        setLoading(false)
      } catch (err) {
        console.error('Map initialization error:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize map')
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

    if (colorSchemeSelectRef.current) {
      colorSchemeSelectRef.current.disabled = isRasterStyle || loading
      if (isRasterStyle) setColorScheme('Light')
    }

    if (politicalViewSelectRef.current) {
      politicalViewSelectRef.current.disabled = mapStyle === 'Satellite' || loading
      if (mapStyle === 'Satellite') setPoliticalView('')
    }

    if (map.current && getToken) {
      const currentMap = map.current
      fetchMapStyle(API_URL, mapStyle, getToken, {
        colorScheme: colorScheme as 'Light' | 'Dark',
        terrain: 'Hillshade',
        language: languageRef.current,
        ...(politicalView && { politicalView }),
      }).then(style => currentMap.setStyle(style))
    }
  }, [mapStyle, colorScheme, politicalView, loading, getToken])

  const flyToCountryCenter = useCallback(async (countryCode: string) => {
    if (!client || !countryCode) return

    try {
      const command = new GeocodeCommand({
        QueryComponents: { Country: countryCode }
      })
      const response: GeocodeCommandOutput = await client.send(command)
      const countryGeocode = response.ResultItems?.find(item => item.PlaceType?.includes('Country'))

      if (countryGeocode && map.current) {
        if (countryGeocode.MapView) {
          map.current.fitBounds(countryGeocode.MapView as [number, number, number, number], { padding: 20 })
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
  }, [client])

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

  // mapClickHandler is attached to the map once at init — uses languageRef to avoid
  // stale closures when the user changes the language dropdown
  const mapClickHandler = useCallback(async (e: maplibregl.MapMouseEvent) => {
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
          country: result.Address?.Country?.Code3 ?? result.Address?.Country?.Name ?? undefined,
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
  }, [client])

  const searchAddress = useCallback((searchQuery: string) => {
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

          const geocodeResults: AutocompleteResultItem[] = (response.ResultItems || []).map(item => ({
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
          const response: AutocompleteCommandOutput = await client.send(command)

          setSuggestions(response.ResultItems || [])
          setShowSuggestions(true)
        }
      } catch (err) {
        console.error('Search error:', err)
      }
    }, 300)
  }, [client, searchMode, language, filterCountry])

  // Re-run the current query whenever language, filterCountry, or searchMode changes,
  // but only when the suggestions dropdown is already open (don't re-open after selection).
  // query is intentionally omitted — adding it would re-search on every keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (showSuggestionsRef.current && query.length >= 3) searchAddress(query)
  }, [searchAddress])

  const selectAddress = useCallback(async (suggestion: AutocompleteResultItem) => {
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
        country: response.Address?.Country?.Code3 ?? response.Address?.Country?.Name ?? undefined,
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
  }, [client, language])

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
            country: result.Address?.Country?.Code3 ?? result.Address?.Country?.Name ?? undefined,
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

  if (error) {
    return (
      <div className="w-full h-150 bg-red-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Failed to load</p>
          <p className="text-red-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
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
              ref={colorSchemeSelectRef}
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="Light">Light</option>
              <option value="Dark">Dark</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Political View</label>
            <select
              ref={politicalViewSelectRef}
              value={politicalView}
              onChange={(e) => setPoliticalView(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Search Address</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchMode('autocomplete')}
                  className={`px-3 py-1 text-xs rounded ${searchMode === 'autocomplete'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  Autocomplete
                </button>
                <button
                  onClick={() => setSearchMode('geocode')}
                  className={`px-3 py-1 text-xs rounded ${searchMode === 'geocode'
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
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder={searchMode === 'geocode' ? 'Enter full address (e.g., 123 Main St, Apt 4B, City)...' : 'Enter an address...'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => selectAddress(suggestion)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      >
                        <div className="font-medium">{suggestion.Title}</div>
                        {suggestion.Address?.Label && (
                          <div className="text-sm text-gray-600">{suggestion.Address.Label}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={useCurrentLocation}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                📍 Use My Location
              </button>
            </div>
          </div>

          {isValidating && (
            <div className="text-center text-gray-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2">Validating address...</p>
            </div>
          )}

          {selectedAddress && !isValidating && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">✓ Address Validated</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedAddress.addressLineOne && (
                  <div>
                    <span className="font-medium text-gray-700">Street:</span>
                    <p className="text-gray-900">{selectedAddress.addressLineOne}</p>
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
                    <span className="font-medium text-gray-700">State/Province:</span>
                    <p className="text-gray-900">{selectedAddress.province}</p>
                  </div>
                )}
                {selectedAddress.postalCode && (
                  <div>
                    <span className="font-medium text-gray-700">Postal Code:</span>
                    <p className="text-gray-900">{selectedAddress.postalCode}</p>
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
                    <span className="font-medium text-gray-700">Coordinates:</span>
                    <p className="text-gray-900 font-mono text-xs">
                      {selectedAddress.position[1].toFixed(6)}, {selectedAddress.position[0].toFixed(6)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full h-125 bg-white rounded-lg shadow-lg overflow-hidden">
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
