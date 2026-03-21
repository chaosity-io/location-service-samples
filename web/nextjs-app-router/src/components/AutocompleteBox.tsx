'use client'

import { useLocationClient } from '@chaosity/location-client-react'
import {
  AutocompleteCommand,
  type AutocompleteCommandInput,
  type AutocompleteCommandOutput,
  type AutocompleteResultItem,
} from '@chaosity/location-client'
import { useState } from 'react'

/**
 * Autocomplete — Suggest address completions as the user types.
 *
 * Use when: building address input fields, checkout forms, or
 * any UI where users type an address and need real-time suggestions.
 *
 * Key params:
 *  - QueryText (required): partial address input
 *  - BiasPosition: [lng, lat] to prefer nearby results
 *  - MaxResults: limit suggestions
 *  - Filter.IncludeCountries: restrict to specific countries (ISO 3166 codes)
 *
 * Returns: ResultItems[] with Title, Address components, PlaceId, Highlights.
 *
 * Tip: Use the returned PlaceId with GetPlace to fetch full details
 * after the user selects a suggestion.
 *
 * @see https://docs.chaosity.cloud/docs/client-libraries
 */
export function AutocompleteBox() {
  const { client, loading } = useLocationClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AutocompleteResultItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleInput = async (value: string) => {
    setQuery(value)
    if (!client || value.length < 3) {
      setResults([])
      return
    }

    setError(null)
    try {
      const input: AutocompleteCommandInput = {
        QueryText: value,
        MaxResults: 5,
      }
      const result: AutocompleteCommandOutput = await client.send(new AutocompleteCommand(input))
      setResults(result.ResultItems || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autocomplete failed')
    }
  }

  if (loading) return <div className="loading">Initializing client...</div>

  return (
    <div className="demo-section">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        placeholder='Start typing an address, e.g. "123 Main"'
      />

      {error && <div className="error">{error}</div>}

      {results.length > 0 && (
        <ul className="results">
          {results.map((item, i) => (
            <li key={item.PlaceId || i}>
              <strong>{item.Title}</strong>
              {item.Address?.Label && <span className="label">{item.Address.Label}</span>}
              {item.PlaceId && <span className="place-id">PlaceId: {item.PlaceId}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
