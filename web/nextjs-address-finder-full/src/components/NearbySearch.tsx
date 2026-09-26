'use client'

import { describeError } from '@/lib/address'
import { useTestbedMap } from '@/lib/map/useTestbedMap'
import { PLACE_CATEGORIES } from '@/lib/place-categories'
import { countryFilter, useCountry } from '@/lib/settings/country'
import { useMapSettings } from '@/lib/settings/map-settings'
import {
  SearchNearbyCommand,
  type SearchNearbyCommandInput,
  type SearchNearbyCommandOutput,
  SearchTextCommand,
  type SearchTextCommandInput,
  type SearchTextCommandOutput,
} from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'
import * as maplibregl from 'maplibre-gl'
import { useCallback, useRef, useState } from 'react'

type Mode = 'nearby' | 'text'

interface ResultRow {
  title: string
  label?: string
  position?: [number, number]
  categories?: string
  distance?: number
}

/**
 * AWS's own category list (src/lib/place-categories.ts), with an "any" entry
 * first — the select holds every ID SearchNearby accepts, nothing hand-picked.
 */
const CATEGORIES: { id: string; label: string }[] = [
  { id: '', label: 'Any category' },
  ...PLACE_CATEGORIES.map((c) => ({ id: c.id, label: c.name })),
]

/**
 * SearchNearby (radius + category) and SearchText (free text, biased) from a
 * query position: the last map click, else the map centre. Both send the
 * selected country as `Filter.IncludeCountries` and the selected language.
 */
export default function NearbySearch() {
  const container = useRef<HTMLDivElement>(null)
  const queryMarker = useRef<maplibregl.Marker | null>(null)
  const resultMarkers = useRef<maplibregl.Marker[]>([])

  const { client } = useLocationClient()
  const [{ language }] = useMapSettings()
  const { code: country } = useCountry()

  const [mode, setMode] = useState<Mode>('nearby')
  const [pinned, setPinned] = useState<[number, number] | null>(null)
  const [radius, setRadius] = useState(1000)
  const [category, setCategory] = useState('')
  const [queryText, setQueryText] = useState('coffee')
  const [maxResults, setMaxResults] = useState(10)
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState<ResultRow[]>([])
  const [raw, setRaw] = useState('')
  const [timing, setTiming] = useState('')
  const [error, setError] = useState<string | null>(null)

  const {
    map,
    ready,
    error: mapError,
  } = useTestbedMap(container, {
    cursor: 'crosshair',
    onClick: (lngLat) => {
      setPinned(lngLat)
      if (!map) return
      queryMarker.current?.remove()
      queryMarker.current = new maplibregl.Marker({ color: '#ef4444' })
        .setLngLat(lngLat)
        .addTo(map)
    },
  })

  const queryPosition = (): [number, number] | null => {
    if (pinned) return pinned
    const c = map?.getCenter()
    return c ? [c.lng, c.lat] : null
  }

  const run = useCallback(async () => {
    const position = queryPosition()
    if (!client || !position) return
    setBusy(true)
    setError(null)
    resultMarkers.current.forEach((m) => m.remove())
    resultMarkers.current = []
    const started = performance.now()
    try {
      let out: SearchNearbyCommandOutput | SearchTextCommandOutput
      if (mode === 'nearby') {
        const input: SearchNearbyCommandInput = {
          QueryPosition: position,
          QueryRadius: radius,
          MaxResults: maxResults,
          Language: language,
          Filter: {
            ...(category && { IncludeCategories: [category] }),
            ...countryFilter(country).Filter,
          },
        }
        out = await client.send(new SearchNearbyCommand(input))
      } else {
        const input: SearchTextCommandInput = {
          QueryText: queryText,
          BiasPosition: position,
          MaxResults: maxResults,
          Language: language,
          ...countryFilter(country),
        }
        out = await client.send(new SearchTextCommand(input))
      }
      setRaw(JSON.stringify(out, null, 2))
      const items: ResultRow[] = (out.ResultItems ?? []).map((r) => ({
        title: r.Title ?? '(untitled)',
        label: r.Address?.Label,
        position: r.Position as [number, number] | undefined,
        categories: r.Categories?.map((c) => c.Name).join(', '),
        distance: r.Distance,
      }))
      setRows(items)
      if (map) {
        for (const it of items) {
          if (!it.position) continue
          resultMarkers.current.push(
            new maplibregl.Marker({ color: '#2563eb' })
              .setLngLat(it.position)
              .setPopup(new maplibregl.Popup({ offset: 12 }).setText(it.title))
              .addTo(map),
          )
        }
      }
      setTiming(
        `${mode === 'nearby' ? 'SearchNearby' : 'SearchText'} · ${Math.round(performance.now() - started)} ms · ${items.length} result(s)`,
      )
    } catch (err) {
      setError(describeError(err))
      setRaw(JSON.stringify(err, Object.getOwnPropertyNames(err as object), 2))
    } finally {
      setBusy(false)
    }
    // queryPosition reads refs/state at call time on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    client,
    map,
    mode,
    pinned,
    radius,
    maxResults,
    category,
    queryText,
    language,
    country,
  ])

  const inputClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100'
  const displayError = error ?? mapError
  const position = queryPosition()

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {(['nearby', 'text'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  mode === m
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {m === 'nearby' ? 'SearchNearby' : 'SearchText'}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">
            {pinned
              ? `pinned ${pinned[1].toFixed(5)}, ${pinned[0].toFixed(5)}`
              : 'position = map centre'}{' '}
            — click the map to pin a query position
            {country ? ` · filtered to ${country}` : ''} · language {language}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {mode === 'nearby' ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Radius (m)
                </label>
                <input
                  type="number"
                  min={50}
                  max={50000}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Category filter
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Query text
              </label>
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                className={inputClass}
                placeholder="coffee, 'George St', a business name…"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Max results
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={run}
              disabled={busy || !client || !ready || !position}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>

        {timing && <p className="mt-2 text-xs text-gray-500">{timing}</p>}
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
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Results</h3>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">No results yet.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {rows.map((r, i) => (
                <li key={i} className="rounded-md border border-gray-100 p-2">
                  <div className="font-medium text-gray-900">{r.title}</div>
                  {r.label && <div className="text-gray-600">{r.label}</div>}
                  <div className="text-xs text-gray-500">
                    {r.categories}
                    {r.distance !== undefined && ` · ${r.distance} m`}
                  </div>
                </li>
              ))}
            </ol>
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
