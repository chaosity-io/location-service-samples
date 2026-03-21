'use client'

import { useLocationClient } from '@chaosity/location-client-react'
import {
  SearchNearbyCommand,
  type SearchNearbyCommandInput,
  type SearchNearbyCommandOutput,
  type SearchNearbyResultItem,
} from '@chaosity/location-client'
import { useState } from 'react'

/**
 * SearchNearby — Find places within a radius of a geographic point.
 *
 * Use when: building "near me" features, finding nearby restaurants,
 * ATMs, gas stations, or any POI around a known location.
 *
 * Key params:
 *  - QueryPosition (required): [longitude, latitude] center point
 *  - QueryRadius: search radius in meters (default varies)
 *  - MaxResults: limit results
 *  - Filter.IncludeCategories: filter by category (e.g. ["restaurant"])
 *
 * Returns: ResultItems[] with Title, Address, Position, Distance,
 *          Categories, ContactInformation, OpeningHours, FoodTypes.
 *
 * @see https://docs.chaosity.cloud/docs/client-libraries
 */
export function SearchNearbyBox() {
  const { client, loading } = useLocationClient()
  const [lng, setLng] = useState('-122.3493')
  const [lat, setLat] = useState('47.6205')
  const [results, setResults] = useState<SearchNearbyResultItem[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client) return

    setSearching(true)
    setError(null)
    try {
      const input: SearchNearbyCommandInput = {
        QueryPosition: [parseFloat(lng), parseFloat(lat)],
        MaxResults: 5,
      }
      const result: SearchNearbyCommandOutput = await client.send(new SearchNearbyCommand(input))
      setResults(result.ResultItems || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search nearby failed')
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
          {searching ? 'Searching...' : 'Search Nearby'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {results.length > 0 && (
        <ul className="results">
          {results.map((item, i) => (
            <li key={item.PlaceId || i}>
              <strong>{item.Title}</strong>
              {item.Address?.Label && <span className="label">{item.Address.Label}</span>}
              {item.Distance !== undefined && (
                <span className="coords">Distance: {item.Distance.toFixed(0)}m</span>
              )}
              {item.Categories && item.Categories.length > 0 && (
                <span className="tags">
                  {item.Categories.map(c => c.Name).filter(Boolean).join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
