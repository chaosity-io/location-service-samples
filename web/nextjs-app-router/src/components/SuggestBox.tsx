'use client'

import { useLocationClient } from '@chaosity/location-client-react'
import {
  SuggestCommand,
  type SuggestCommandInput,
  type SuggestResultItem,
} from '@chaosity/location-client'
import { useState } from 'react'

/**
 * Suggest — Get search term predictions as the user types.
 *
 * Use when: building a search bar that shows both place suggestions
 * AND query completions. Unlike Autocomplete (address-focused),
 * Suggest handles broader searches including POIs, businesses,
 * and categories.
 *
 * Key params:
 *  - QueryText (required): partial search text
 *  - BiasPosition: [lng, lat] to prefer nearby results
 *  - MaxResults: limit suggestions
 *  - Filter.IncludeCountries: restrict to specific countries
 *
 * Returns: ResultItems[] with Title, Highlights, SuggestResultItemType
 *          (Place or Query), PlaceId (for Place type results).
 *
 * Tip: Results come in two types:
 *  - "Place": a specific location — use PlaceId with GetPlace for details
 *  - "Query": a search suggestion — use with SearchText for full results
 *
 * @see https://docs.chaosity.cloud/docs/client-libraries
 */
export function SuggestBox() {
  const { client, loading } = useLocationClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SuggestResultItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleInput = async (value: string) => {
    setQuery(value)
    if (!client || value.length < 2) {
      setResults([])
      return
    }

    setError(null)
    try {
      const input: SuggestCommandInput = {
        QueryText: value,
        MaxResults: 5,
      }
      const result = await client.send(new SuggestCommand(input))
      setResults(result.ResultItems || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suggest failed')
    }
  }

  if (loading) return <div className="loading">Initializing client...</div>

  return (
    <div className="demo-section">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        placeholder='Start typing, e.g. "starbucks" or "airport"'
      />

      {error && <div className="error">{error}</div>}

      {results.length > 0 && (
        <ul className="results">
          {results.map((item, i) => (
            <li key={i}>
              <strong>{item.Title}</strong>
              {item.SuggestResultItemType && (
                <span className={`type-badge ${item.SuggestResultItemType.toLowerCase()}`}>
                  {item.SuggestResultItemType}
                </span>
              )}
              {item.Place?.Address?.Label && (
                <span className="label">{item.Place.Address.Label}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
