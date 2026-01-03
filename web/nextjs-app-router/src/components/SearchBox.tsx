'use client'

import { useLocationClient } from '@chaosity/location-client-react'
import { SearchTextCommand, SearchTextResponse } from '@chaosity/location-client'
import { useState } from 'react'

export function SearchBox() {
  const { client, loading } = useLocationClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client || !query) return

    setSearching(true)
    try {
      const result = await client.send<SearchTextCommand, SearchTextResponse>(new SearchTextCommand({
        QueryText: query,
        MaxResults: 5
      }))
      setResults(result.ResultItems || [])
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="search-box">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for places..."
          disabled={searching}
        />
        <button type="submit" disabled={searching || !query}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {results.length > 0 && (
        <ul className="results">
          {results.map((item, i) => (
            <li key={i}>
              <strong>{item.Title}</strong>
              <br />
              <small>{item.Address?.Label}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
