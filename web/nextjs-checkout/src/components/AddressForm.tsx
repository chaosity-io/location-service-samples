'use client'

import type {
  GeocodeCommandOutput,
  GeocodeResultItem,
  ReverseGeocodeCommandOutput,
} from '@chaosity/location-client'
import {
  GeocodeCommand,
  ReverseGeocodeCommand,
  createTransformRequest,
  fetchMapStyle,
} from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_LOCATION_API_URL!

const COUNTRIES = [
  { code: 'US', code3: 'USA', name: 'United States' },
  { code: 'CA', code3: 'CAN', name: 'Canada' },
  { code: 'GB', code3: 'GBR', name: 'United Kingdom' },
  { code: 'FR', code3: 'FRA', name: 'France' },
  { code: 'DE', code3: 'DEU', name: 'Germany' },
  { code: 'JP', code3: 'JPN', name: 'Japan' },
  { code: 'AU', code3: 'AUS', name: 'Australia' },
  { code: 'IT', code3: 'ITA', name: 'Italy' },
  { code: 'ES', code3: 'ESP', name: 'Spain' },
  { code: 'BR', code3: 'BRA', name: 'Brazil' },
  { code: 'MX', code3: 'MEX', name: 'Mexico' },
  { code: 'IN', code3: 'IND', name: 'India' },
  { code: 'NL', code3: 'NLD', name: 'Netherlands' },
  { code: 'SE', code3: 'SWE', name: 'Sweden' },
  { code: 'NZ', code3: 'NZL', name: 'New Zealand' },
]

export interface AddressFields {
  address1: string
  address2: string
  city: string
  state: string
  postal: string
  country: string
}

export const EMPTY_ADDRESS: AddressFields = {
  address1: '',
  address2: '',
  city: '',
  state: '',
  postal: '',
  country: 'US',
}

interface ValidatedFields {
  address1: boolean
  city: boolean
  state: boolean
  postal: boolean
  country: boolean
}

const NO_VALIDATION: ValidatedFields = {
  address1: false,
  city: false,
  state: false,
  postal: false,
  country: false,
}

interface AddressFormProps {
  address: AddressFields
  onChange: (address: AddressFields) => void
  label: string
}

export function AddressForm({ address, onChange, label }: AddressFormProps) {
  const { client, getToken } = useLocationClient()
  const [suggestions, setSuggestions] = useState<GeocodeResultItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [validated, setValidated] = useState<ValidatedFields>(NO_VALIDATION)
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(
    null,
  )
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<
    'match' | 'mismatch' | null
  >(null)
  const [biasPosition, setBiasPosition] = useState<[number, number] | null>(
    null,
  )

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Detect browser location and auto-set country
  useEffect(() => {
    if (!('geolocation' in navigator) || !client) return

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lng = pos.coords.longitude
        const lat = pos.coords.latitude
        setBiasPosition([lng, lat])

        try {
          const cmd = new ReverseGeocodeCommand({
            QueryPosition: [lng, lat],
            Language: 'en',
          })
          const response: ReverseGeocodeCommandOutput = await client.send(cmd)
          const countryCode3 =
            response.ResultItems?.[0]?.Address?.Country?.Code3
          const countryCode2 =
            response.ResultItems?.[0]?.Address?.Country?.Code2
          if (countryCode3 || countryCode2) {
            const match = COUNTRIES.find(
              (c) => c.code3 === countryCode3 || c.code === countryCode2,
            )
            if (match && address.country === 'US' && !address.address1) {
              onChange({ ...address, country: match.code })
            }
          }
        } catch {
          // Reverse geocode failed, keep default country
        }
      },
      () => {},
    )
  }, [client]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !client || !getToken) return

    let cancelled = false

    async function initMap() {
      try {
        const style = await fetchMapStyle(API_URL, 'Standard', getToken!, {
          colorScheme: 'Light',
        })

        if (cancelled || !mapContainerRef.current) return

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style,
          center: [-98.5, 39.8],
          zoom: 3,
          interactive: false,
          transformRequest: createTransformRequest(API_URL, getToken!),
          attributionControl: false,
        })

        mapRef.current = map
      } catch {
        // Map init failed silently
      }
    }

    initMap()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [client, getToken])

  // Update marker when position changes
  useEffect(() => {
    if (!mapRef.current || !markerPosition) return

    if (markerRef.current) {
      markerRef.current.setLngLat(markerPosition)
    } else {
      markerRef.current = new maplibregl.Marker({ color: '#4f46e5' })
        .setLngLat(markerPosition)
        .addTo(mapRef.current)
    }

    mapRef.current.flyTo({ center: markerPosition, zoom: 15, duration: 800 })
  }, [markerPosition])

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const updateField = useCallback(
    (field: keyof AddressFields, value: string) => {
      onChange({ ...address, [field]: value })
      if (field in validated) {
        setValidated((v) => ({ ...v, [field]: false }))
      }
      setValidationResult(null)
    },
    [address, onChange, validated],
  )

  const handleAddress1Change = useCallback(
    (value: string) => {
      updateField('address1', value)
      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (value.length < 3 || !client) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      debounceRef.current = setTimeout(async () => {
        try {
          const cmd = new GeocodeCommand({
            QueryText: value,
            MaxResults: 5,
            Language: 'en',
            ...(biasPosition && { BiasPosition: biasPosition }),
          })
          const result: GeocodeCommandOutput = await client.send(cmd)
          if (result.ResultItems && result.ResultItems.length > 0) {
            setSuggestions(result.ResultItems)
            setShowSuggestions(true)
          } else {
            setSuggestions([])
            setShowSuggestions(false)
          }
        } catch {
          setSuggestions([])
          setShowSuggestions(false)
        }
      }, 300)
    },
    [client, biasPosition, updateField],
  )

  const handleSelectSuggestion = useCallback(
    (item: GeocodeResultItem) => {
      setShowSuggestions(false)
      setSuggestions([])

      // GeocodeCommand already returns full address — no extra API call needed
      const parts: string[] = []
      if (item.Address?.AddressNumber) parts.push(item.Address.AddressNumber)
      if (item.Address?.Street) parts.push(item.Address.Street)
      const newAddress1 = parts.join(' ') || address.address1

      let newCountry = address.country
      const cc2 = item.Address?.Country?.Code2
      const cc3 = item.Address?.Country?.Code3
      if (cc3 || cc2) {
        const match = COUNTRIES.find((c) => c.code3 === cc3 || c.code === cc2)
        if (match) newCountry = match.code
      }

      const updated: AddressFields = {
        address1: newAddress1,
        address2: address.address2,
        city: item.Address?.Locality || address.city,
        state: item.Address?.Region?.Name || address.state,
        postal: item.Address?.PostalCode || address.postal,
        country: newCountry,
      }

      onChange(updated)
      setValidated({
        address1: true,
        city: !!(item.Address?.Locality || address.city),
        state: !!(item.Address?.Region?.Name || address.state),
        postal: !!(item.Address?.PostalCode || address.postal),
        country: true,
      })
      setValidationResult('match')

      if (item.Position) {
        setMarkerPosition(item.Position as [number, number])
      }
    },
    [address, onChange],
  )

  const handleValidateAddress = useCallback(async () => {
    if (!client) return
    setValidating(true)
    setValidationResult(null)

    try {
      const queryText = [
        address.address1,
        address.address2,
        address.city,
        address.state,
        address.postal,
      ]
        .filter(Boolean)
        .join(', ')

      const cmd = new GeocodeCommand({
        QueryText: queryText,
        MaxResults: 1,
        Language: 'en',
        ...(address.country && {
          Filter: { IncludeCountries: [address.country] },
        }),
      })
      const result: GeocodeCommandOutput = await client.send(cmd)
      const item = result.ResultItems?.[0]

      if (item) {
        // Auto-fill form fields with the validated address
        const parts: string[] = []
        if (item.Address?.AddressNumber) parts.push(item.Address.AddressNumber)
        if (item.Address?.Street) parts.push(item.Address.Street)
        const validatedAddress1 = parts.join(' ') || address.address1

        let validatedCountry = address.country
        const cc2 = item.Address?.Country?.Code2
        const cc3 = item.Address?.Country?.Code3
        if (cc3 || cc2) {
          const match = COUNTRIES.find((c) => c.code3 === cc3 || c.code === cc2)
          if (match) validatedCountry = match.code
        }

        const updated: AddressFields = {
          address1: validatedAddress1,
          address2: address.address2,
          city: item.Address?.Locality || address.city,
          state: item.Address?.Region?.Name || address.state,
          postal: item.Address?.PostalCode || address.postal,
          country: validatedCountry,
        }

        onChange(updated)

        if (item.Position) {
          setMarkerPosition(item.Position as [number, number])
        }

        setValidationResult('match')
        setValidated({
          address1: true,
          city: true,
          state: true,
          postal: true,
          country: true,
        })
      } else {
        setValidationResult('mismatch')
      }
    } catch {
      setValidationResult('mismatch')
    } finally {
      setValidating(false)
    }
  }, [client, address, onChange])

  const fieldClass = (field: keyof ValidatedFields) =>
    `w-full px-3 py-2 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
      validated[field]
        ? 'border-l-4 border-l-green-500 border-t-gray-300 border-r-gray-300 border-b-gray-300'
        : 'border-gray-300'
    }`

  const CheckIcon = () => (
    <svg
      className="h-4 w-4 shrink-0 text-green-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  )

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">{label}</h3>

      {/* Country selector at the top so autocomplete filters by it */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Country
        </label>
        <div className="relative flex items-center">
          <select
            value={address.country}
            onChange={(e) => updateField('country', e.target.value)}
            className={fieldClass('country')}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          {validated.country && (
            <span className="absolute right-7">
              <CheckIcon />
            </span>
          )}
        </div>
      </div>

      {/* Address Line 1 with autocomplete */}
      <div className="relative" ref={suggestionsRef}>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Address Line 1
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Start typing your address (e.g., 123 Main St, Apt 4B)..."
            value={address.address1}
            onChange={(e) => handleAddress1Change(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className={fieldClass('address1')}
          />
          {validated.address1 && (
            <span className="absolute right-3">
              <CheckIcon />
            </span>
          )}
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {suggestions.map((item, idx) => {
              const parts: string[] = []
              if (item.Address?.AddressNumber)
                parts.push(item.Address.AddressNumber)
              if (item.Address?.Street) parts.push(item.Address.Street)
              const streetLine = parts.join(' ')
              const detail = [
                item.Address?.Locality,
                item.Address?.Region?.Name,
                item.Address?.PostalCode,
              ]
                .filter(Boolean)
                .join(', ')

              return (
                <button
                  key={item.PlaceId || idx}
                  type="button"
                  className="w-full border-b border-gray-100 px-4 py-3 text-left text-sm transition-colors last:border-0 hover:bg-indigo-50"
                  onClick={() => handleSelectSuggestion(item)}
                >
                  <span className="font-medium text-gray-900">
                    {item.Address?.Label || streetLine}
                  </span>
                  {streetLine && detail && (
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {streetLine} — {detail}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Address Line 2 */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Address Line 2
        </label>
        <input
          type="text"
          placeholder="Apt, suite, unit (optional)"
          value={address.address2}
          onChange={(e) => updateField('address2', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      {/* City + State row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            City
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="City"
              value={address.city}
              onChange={(e) => updateField('city', e.target.value)}
              className={fieldClass('city')}
            />
            {validated.city && (
              <span className="absolute right-3">
                <CheckIcon />
              </span>
            )}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            State / Province
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="State / Province"
              value={address.state}
              onChange={(e) => updateField('state', e.target.value)}
              className={fieldClass('state')}
            />
            {validated.state && (
              <span className="absolute right-3">
                <CheckIcon />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Postal Code */}
      <div className="w-full sm:w-1/2">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Postal / ZIP Code
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Postal / ZIP"
            value={address.postal}
            onChange={(e) => updateField('postal', e.target.value)}
            className={fieldClass('postal')}
          />
          {validated.postal && (
            <span className="absolute right-3">
              <CheckIcon />
            </span>
          )}
        </div>
      </div>

      {/* Validate button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleValidateAddress}
          disabled={validating || !address.address1}
          className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {validating ? 'Validating...' : 'Validate Address'}
        </button>
        {validationResult === 'match' && (
          <span className="flex items-center gap-1 text-sm font-medium text-green-600">
            <CheckIcon /> Address verified
          </span>
        )}
        {validationResult === 'mismatch' && (
          <span className="text-sm font-medium text-amber-600">
            Could not verify address
          </span>
        )}
      </div>

      {/* Map preview */}
      <div
        ref={mapContainerRef}
        className="h-50 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
      />
    </div>
  )
}
