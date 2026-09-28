'use client'

import {
  GetPlaceCommand,
  type GetPlaceCommandInput,
  type GetPlaceCommandOutput,
  type GetPlaceResponse,
} from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'
import { useState } from 'react'

/**
 * GetPlace — Retrieve full details for a place by its PlaceId.
 *
 * Use when: a user selects a result from Autocomplete, Suggest, or
 * SearchText and you need the full address, position and categories.
 *
 * Key params:
 *  - PlaceId (required): ID from a previous search/autocomplete result
 *  - AdditionalFeatures (not sent here): 'Contact' adds Contacts and
 *    OpeningHours, 'Access' AccessPoints, 'TimeZone' TimeZone. These are rich
 *    place data, a plan feature: an application whose plan lacks it is refused
 *    403 FeatureNotEntitledException, so this sample does not ask.
 *
 * Returns: Title, Address, Position, Categories, PlaceType, and FoodTypes for
 *          a restaurant. Contacts, OpeningHours, AccessPoints and TimeZone
 *          come back only when AdditionalFeatures asks for them.
 *
 * Common flow: Autocomplete → user picks suggestion → GetPlace for details.
 *
 * @see https://docs.chaosity.cloud/docs/client-libraries
 */
export function GetPlaceBox() {
  const { client, loading } = useLocationClient()
  const [placeId, setPlaceId] = useState('')
  const [result, setResult] = useState<GetPlaceResponse | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client || !placeId) return

    setSearching(true)
    setError(null)
    try {
      const input: GetPlaceCommandInput = {
        PlaceId: placeId,
      }
      const response: GetPlaceCommandOutput = await client.send(
        new GetPlaceCommand(input),
      )
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GetPlace failed')
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
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          placeholder="Paste a PlaceId from Search or Autocomplete results"
          disabled={searching}
        />
        <button type="submit" disabled={searching || !placeId}>
          {searching ? 'Loading...' : 'Get Place'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <ul className="results">
          <li>
            <strong>{result.Title}</strong>
            {result.Address?.Label && (
              <span className="label">{result.Address.Label}</span>
            )}
            {result.Position && (
              <span className="coords">
                {result.Position[1]?.toFixed(6)},{' '}
                {result.Position[0]?.toFixed(6)}
              </span>
            )}
            {result.Categories && result.Categories.length > 0 && (
              <span className="tags">
                {result.Categories.map((c) => c.Name)
                  .filter(Boolean)
                  .join(', ')}
              </span>
            )}
          </li>
        </ul>
      )}
    </div>
  )
}
