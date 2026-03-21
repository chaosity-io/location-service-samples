'use client'

import { useLocationClient } from '@chaosity/location-client-react'
import {
  SearchTextCommand,
  type SearchTextCommandInput,
  type SearchTextCommandOutput,
  type SearchTextResultItem,
} from '@chaosity/location-client'
import { useState } from 'react'

/**
 * SearchText — Find places, POIs, or businesses by keyword.
 *
 * Use when: users search for a place by name, address, or category
 * (e.g. "coffee near me", "Space Needle", "123 Main St").
 *
 * Key params:
 *  - QueryText (required): search keyword or phrase
 *  - BiasPosition: [lng, lat] to prefer results near a location
 *  - MaxResults: limit number of results (default 5)
 *
 * Returns: ResultItems[] with Title, Address, Position, PlaceId,
 *          Categories, ContactInformation, OpeningHours, etc.
 *
 * @see https://docs.chaosity.cloud/docs/client-libraries
 */
export function SearchBox() {
  const { client, loading, error: clientError } = useLocationClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchTextResultItem[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client || !query) return

    setSearching(true)
    setError(null)
    try {
      const input: SearchTextCommandInput = {
        QueryText: query,
        MaxResults: 5,
      }
      const result: SearchTextCommandOutput = await client.send(new SearchTextCommand(input))
      setResults(result.ResultItems || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  if (loading) return <div className="loading">Initializing client...</div>
  if (clientError) return <div className="error">Client error: {clientError}</div>

  return (
    <div className="demo-section">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Try "Space Needle" or "coffee in Seattle"'
          disabled={searching}
        />
        <button type="submit" disabled={searching || !query}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {results.length > 0 && (
        <ul className="results">
          {results.map((item, i) => (
            <li key={item.PlaceId || i}>
              <strong>{item.Title}</strong>
              {item.Address?.Label && <span className="label">{item.Address.Label}</span>}
              {item.Position && (
                <span className="coords">
                  {item.Position[1]?.toFixed(4)}, {item.Position[0]?.toFixed(4)}
                </span>
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
