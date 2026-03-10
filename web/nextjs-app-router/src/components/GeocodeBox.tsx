'use client'

import { useLocationClient } from '@chaosity/location-client-react'
import {
  GeocodeCommand,
  type GeocodeCommandInput,
  type GeocodeResultItem,
} from '@chaosity/location-client'
import { useState } from 'react'

/**
 * Geocode — Convert a structured address to geographic coordinates.
 *
 * Use when: you have a known address and need its exact coordinates
 * for mapping, distance calculation, or spatial analysis. Unlike
 * SearchText, Geocode is optimized for precise address resolution
 * and returns normalized/standardized address components.
 *
 * Key params:
 *  - QueryText (required): full or partial address
 *  - BiasPosition: [lng, lat] to disambiguate results
 *  - MaxResults: limit results
 *  - Filter.IncludeCountries: restrict to specific countries
 *
 * Returns: ResultItems[] with Title, Address (normalized components),
 *          Position [lng, lat], TimeZone, PlaceType.
 *
 * @see https://docs.chaosity.cloud/docs/client-libraries
 */
export function GeocodeBox() {
  const { client, loading } = useLocationClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResultItem[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client || !query) return

    setSearching(true)
    setError(null)
    try {
      const input: GeocodeCommandInput = {
        QueryText: query,
        MaxResults: 3,
      }
      const result = await client.send(new GeocodeCommand(input))
      setResults(result.ResultItems || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Geocode failed')
    } finally {
      setSearching(false)
    }
  }

  if (loading) return <div className="loading">Initializing client...</div>

  return (
    <div className="demo-section">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Enter an address, e.g. "400 Broad St, Seattle, WA"'
          disabled={searching}
        />
        <button type="submit" disabled={searching || !query}>
          {searching ? 'Geocoding...' : 'Geocode'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {results.length > 0 && (
        <ul className="results">
          {results.map((item, i) => (
            <li key={i}>
              <strong>{item.Title}</strong>
              {item.Address?.Label && <span className="label">{item.Address.Label}</span>}
              {item.Position && (
                <span className="coords">
                  {item.Position[1]?.toFixed(6)}, {item.Position[0]?.toFixed(6)}
                </span>
              )}
              {item.Address?.PostalCode && (
                <span className="tags">Postal: {item.Address.PostalCode}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
