'use client'

import { useLocationClient } from '@chaosity/location-client-react'
import {
  ReverseGeocodeCommand,
  type ReverseGeocodeCommandInput,
  type ReverseGeocodeResultItem,
} from '@chaosity/location-client'
import { useState } from 'react'

/**
 * ReverseGeocode — Convert coordinates to a human-readable address.
 *
 * Use when: you have a lat/lng (e.g. from a map click, GPS, or device
 * location) and need the corresponding street address or place name.
 *
 * Key params:
 *  - QueryPosition (required): [longitude, latitude]
 *  - MaxResults: limit number of results
 *
 * Returns: ResultItems[] with Title, Address (Label, Street, City,
 *          Region, PostalCode, Country), Position, Distance.
 *
 * @see https://docs.chaosity.cloud/docs/client-libraries
 */
export function ReverseGeocodeBox() {
  const { client, loading } = useLocationClient()
  const [lng, setLng] = useState('-122.3493')
  const [lat, setLat] = useState('47.6205')
  const [results, setResults] = useState<ReverseGeocodeResultItem[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client) return

    setSearching(true)
    setError(null)
    try {
      const input: ReverseGeocodeCommandInput = {
        QueryPosition: [parseFloat(lng), parseFloat(lat)],
        MaxResults: 3,
      }
      const result = await client.send(new ReverseGeocodeCommand(input))
      setResults(result.ResultItems || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reverse geocode failed')
    } finally {
      setSearching(false)
    }
  }

  if (loading) return <div className="loading">Initializing client...</div>

  return (
    <div className="demo-section">
      <form onSubmit={handleSubmit}>
        <div className="coord-inputs">
          <label>
            Longitude
            <input type="text" value={lng} onChange={(e) => setLng(e.target.value)} />
          </label>
          <label>
            Latitude
            <input type="text" value={lat} onChange={(e) => setLat(e.target.value)} />
          </label>
        </div>
        <button type="submit" disabled={searching}>
          {searching ? 'Looking up...' : 'Reverse Geocode'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {results.length > 0 && (
        <ul className="results">
          {results.map((item, i) => (
            <li key={i}>
              <strong>{item.Title}</strong>
              {item.Address?.Label && <span className="label">{item.Address.Label}</span>}
              {item.Distance !== undefined && (
                <span className="coords">Distance: {item.Distance.toFixed(0)}m</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
