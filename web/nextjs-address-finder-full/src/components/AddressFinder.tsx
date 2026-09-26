'use client'

import {
  type AddressResult,
  describeError,
  toAddressResult,
} from '@/lib/address'
import { useTestbedMap } from '@/lib/map/useTestbedMap'
import { countryFilter, useCountry } from '@/lib/settings/country'
import { useMapSettings } from '@/lib/settings/map-settings'
import {
  AutocompleteCommand,
  type AutocompleteCommandInput,
  type AutocompleteCommandOutput,
  type AutocompleteResultItem,
  GeocodeCommand,
  type GeocodeCommandInput,
  type GeocodeCommandOutput,
  GetPlaceCommand,
  type GetPlaceCommandOutput,
  ReverseGeocodeCommand,
  type ReverseGeocodeCommandOutput,
} from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'
import * as maplibregl from 'maplibre-gl'
import { useCallback, useEffect, useRef, useState } from 'react'

type SearchMode = 'autocomplete' | 'geocode'

/**
 * Address finder: the direct SDK commands.
 *
 *   typing        → Autocomplete or Geocode, biased to the map centre, filtered
 *                   to the selected country, in the selected language
 *   select        → GetPlace
 *   map click     → ReverseGeocode
 *   "my location" → ReverseGeocode
 *
 * The map itself, its style and the country come from the global bar; this
 * component owns only the search.
 */
export default function AddressFinder() {
  const container = useRef<HTMLDivElement>(null)
  const marker = useRef<maplibregl.Marker | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { client } = useLocationClient()
  const [{ language }] = useMapSettings()
  const { code: country } = useCountry()

  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('autocomplete')
  const [suggestions, setSuggestions] = useState<AutocompleteResultItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selected, setSelected] = useState<AddressResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [raw, setRaw] = useState('')
  const [timing, setTiming] = useState('')

  const pin = useCallback(
    (map: maplibregl.Map, position: [number, number], color = '#3b82f6') => {
      marker.current?.remove()
      marker.current = new maplibregl.Marker({ color })
        .setLngLat(position)
        .addTo(map)
    },
    [],
  )

  const reverseGeocode = useCallback(
    async (position: [number, number], map: maplibregl.Map | null) => {
      if (!client) return
      setError(null)
      const started = performance.now()
      try {
        const out: ReverseGeocodeCommandOutput = await client.send(
          new ReverseGeocodeCommand({
            QueryPosition: position,
            Language: language,
          }),
        )
        setRaw(JSON.stringify(out, null, 2))
        setTiming(
          `ReverseGeocode · ${Math.round(performance.now() - started)} ms`,
        )
        const item = out.ResultItems?.[0]
        if (!item) {
          setError('ReverseGeocode: no result at that position')
          return
        }
        setSelected(toAddressResult(item.Address, position, item.PlaceId))
        setQuery(item.Address?.Label ?? '')
        setShowSuggestions(false)
        if (map) pin(map, position)
      } catch (err) {
        setError(describeError(err))
      }
    },
    [client, language, pin],
  )

  const {
    map,
    ready,
    error: mapError,
  } = useTestbedMap(container, {
    onClick: (lngLat) => void reverseGeocode(lngLat, map),
    cursor: 'crosshair',
  })

  const search = useCallback(
    (text: string) => {
      if (debounce.current) clearTimeout(debounce.current)
      if (!client || text.length < 3) {
        setSuggestions([])
        return
      }
      debounce.current = setTimeout(async () => {
        const center = map?.getCenter()
        const bias = center
          ? ([center.lng, center.lat] as [number, number])
          : undefined
        const started = performance.now()
        setError(null)
        try {
          if (searchMode === 'geocode') {
            const input: GeocodeCommandInput = {
              QueryText: text,
              MaxResults: 5,
              Language: language,
              ...(bias && { BiasPosition: bias }),
              ...countryFilter(country),
            }
            const out: GeocodeCommandOutput = await client.send(
              new GeocodeCommand(input),
            )
            setRaw(JSON.stringify(out, null, 2))
            setTiming(`Geocode · ${Math.round(performance.now() - started)} ms`)
            setSuggestions(
              (out.ResultItems ?? []).map((item) => ({
                Title: item.Address?.Label ?? '',
                Address: item.Address,
                PlaceId: item.PlaceId,
                PlaceType: 'Street' as const,
              })),
            )
          } else {
            const input: AutocompleteCommandInput = {
              QueryText: text,
              MaxResults: 5,
              Language: language,
              ...(bias && { BiasPosition: bias }),
              ...countryFilter(country),
            }
            const out: AutocompleteCommandOutput = await client.send(
              new AutocompleteCommand(input),
            )
            setRaw(JSON.stringify(out, null, 2))
            setTiming(
              `Autocomplete · ${Math.round(performance.now() - started)} ms`,
            )
            setSuggestions(out.ResultItems ?? [])
          }
          setShowSuggestions(true)
        } catch (err) {
          setError(describeError(err))
        }
      }, 300)
    },
    [client, map, searchMode, language, country],
  )

  // Re-run an open search when the mode, language or country changes — but
  // never re-open the list after a selection closed it.
  const showRef = useRef(false)
  useEffect(() => {
    showRef.current = showSuggestions
  }, [showSuggestions])
  useEffect(() => {
    if (showRef.current && query.length >= 3) search(query)
    // query is deliberately not a dependency: typing already calls search().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const select = useCallback(
    async (item: AutocompleteResultItem) => {
      if (!client || !item.PlaceId) return
      setValidating(true)
      setError(null)
      const started = performance.now()
      try {
        const out: GetPlaceCommandOutput = await client.send(
          new GetPlaceCommand({ PlaceId: item.PlaceId, Language: language }),
        )
        setRaw(JSON.stringify(out, null, 2))
        setTiming(`GetPlace · ${Math.round(performance.now() - started)} ms`)
        const position = out.Position as [number, number] | undefined
        setSelected(toAddressResult(out.Address, position, item.PlaceId))
        setQuery(out.Address?.Label ?? '')
        setShowSuggestions(false)
        if (position && map) {
          map.flyTo({ center: position, zoom: 17 })
          pin(map, position)
        }
      } catch (err) {
        setError(describeError(err))
      } finally {
        setValidating(false)
      }
    },
    [client, language, map, pin],
  )

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('This browser has no geolocation')
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position: [number, number] = [coords.longitude, coords.latitude]
        map?.flyTo({ center: position, zoom: 17 })
        void reverseGeocode(position, map)
      },
      (err) => setError(`Geolocation: ${err.message}`),
    )
  }, [map, reverseGeocode])

  const displayError = error ?? mapError

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Search address
          </label>
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {(['autocomplete', 'geocode'] as SearchMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSearchMode(m)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  searchMode === m
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {m === 'autocomplete' ? 'Autocomplete' : 'Geocode'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                search(e.target.value)
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={
                searchMode === 'geocode'
                  ? 'Full address, e.g. 1 Martin Place, Sydney'
                  : 'Start typing an address…'
              }
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg">
                {suggestions.map((item, i) => (
                  <button
                    key={item.PlaceId ?? i}
                    type="button"
                    onClick={() => select(item)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    <div className="font-medium">{item.Title}</div>
                    {item.Address?.Label && (
                      <div className="text-sm text-gray-600">
                        {item.Address.Label}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={!ready}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Use my location
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Biased to the map centre
          {country ? `, filtered to ${country}` : ''}, language {language}.
          Click the map to reverse-geocode a point.
          {timing && ` · ${timing}`}
        </p>
        {displayError && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {displayError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="relative h-125 overflow-hidden rounded-lg bg-white shadow-lg lg:col-span-2">
          {!ready && !displayError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          )}
          <div ref={container} className="h-full w-full" />
        </div>

        <div className="h-125 overflow-auto rounded-lg bg-white p-4 shadow">
          {validating ? (
            <div className="text-center text-gray-600">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="mt-2 text-sm">GetPlace…</p>
            </div>
          ) : selected ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-green-800">
                Address
              </h3>
              <dl className="space-y-1 text-sm">
                {(
                  [
                    ['Street', selected.addressLineOne],
                    ['City', selected.city],
                    ['State / Province', selected.province],
                    ['Postal code', selected.postalCode],
                    ['Country', selected.country],
                    ['PlaceId', selected.placeId],
                  ] as [string, string | undefined][]
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-gray-500">{k}</dt>
                      <dd className="break-all text-gray-900">{v}</dd>
                    </div>
                  ))}
                {selected.position && (
                  <div>
                    <dt className="text-xs text-gray-500">Position</dt>
                    <dd className="font-mono text-xs text-gray-900">
                      {selected.position[1].toFixed(6)},{' '}
                      {selected.position[0].toFixed(6)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Pick a suggestion, click the map, or use your location.
            </p>
          )}
        </div>
      </div>

      {raw && (
        <details className="rounded-lg bg-white p-4 shadow">
          <summary className="cursor-pointer text-sm font-semibold text-gray-900">
            Raw response
          </summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-gray-50 p-3 text-xs">
            {raw}
          </pre>
        </details>
      )}
    </div>
  )
}
