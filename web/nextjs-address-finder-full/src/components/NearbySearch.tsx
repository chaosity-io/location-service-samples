'use client'

import {
  SearchNearbyCommand,
  SearchNearbyCommandInput,
  SearchNearbyCommandOutput,
  SearchTextCommand,
  SearchTextCommandInput,
  SearchTextCommandOutput,
  createTransformRequest,
  fetchMapStyle,
} from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_LOCATION_API_URL!
const DEFAULT_POSITION: [number, number] = [151.2093, -33.8688] // Sydney CBD

type Mode = 'nearby' | 'text'

interface ResultRow {
  title: string
  label?: string
  position?: [number, number]
  categories?: string
  distance?: number
}

const CATEGORIES: { id: string; label: string }[] = [
  { id: '', label: 'Any category' },
  { id: 'restaurant', label: 'Restaurants' },
  { id: 'hospital', label: 'Hospitals' },
  { id: 'pharmacy', label: 'Pharmacies' },
  { id: 'petrol_station', label: 'Fuel' },
  { id: 'grocery', label: 'Grocery' },
  { id: 'hotel', label: 'Hotels' },
  { id: 'atm', label: 'ATMs' },
]

export default function NearbySearch() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const queryMarker = useRef<maplibregl.Marker | null>(null)
  const resultMarkers = useRef<maplibregl.Marker[]>([])
  const positionRef = useRef<[number, number]>(DEFAULT_POSITION)

  const {
    client,
    getToken,
    loading: clientLoading,
    error: clientError,
  } = useLocationClient()

  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('nearby')
  const [position, setPosition] = useState<[number, number]>(DEFAULT_POSITION)
  const [radius, setRadius] = useState(1000)
  const [category, setCategory] = useState('')
  const [queryText, setQueryText] = useState('coffee')
  const [maxResults, setMaxResults] = useState(10)
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState<ResultRow[]>([])
  const [raw, setRaw] = useState<string>('')
  const [timing, setTiming] = useState<string>('')
  const [staticUrl, setStaticUrl] = useState<string | null>(null)
  const [staticError, setStaticError] = useState<string | null>(null)

  const placeQueryMarker = useCallback((lngLat: [number, number]) => {
    if (!map.current) return
    if (queryMarker.current) queryMarker.current.remove()
    queryMarker.current = new maplibregl.Marker({ color: '#ef4444' })
      .setLngLat(lngLat)
      .addTo(map.current)
  }, [])

  // Map init (once the provider has a token)
  useEffect(() => {
    // A provider error is rendered directly (displayError below) — no state write here.
    if (!mapContainer.current || map.current || clientLoading || !client || clientError) return
    let cancelled = false
    ;(async () => {
      try {
        const style = await fetchMapStyle(API_URL, 'Standard', getToken, {
          colorScheme: 'Light',
        })
        if (cancelled) return
        const instance = new maplibregl.Map({
          container: mapContainer.current!,
          style,
          center: positionRef.current,
          zoom: 13,
          transformRequest: createTransformRequest(
            API_URL,
            getToken,
          ) as maplibregl.RequestTransformFunction,
        })
        instance.addControl(new maplibregl.NavigationControl(), 'top-right')
        instance.on('click', (e) => {
          const p: [number, number] = [e.lngLat.lng, e.lngLat.lat]
          positionRef.current = p
          setPosition(p)
          placeQueryMarker(p)
        })
        instance.getCanvas().style.cursor = 'crosshair'
        map.current = instance
        placeQueryMarker(positionRef.current)
        setMapReady(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize map')
      }
    })()
    return () => {
      cancelled = true
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientLoading, client, clientError])

  const clearResultMarkers = () => {
    resultMarkers.current.forEach((m) => m.remove())
    resultMarkers.current = []
  }

  const run = useCallback(async () => {
    if (!client) return
    setBusy(true)
    setError(null)
    clearResultMarkers()
    const started = performance.now()
    try {
      let items: ResultRow[] = []
      if (mode === 'nearby') {
        const input: SearchNearbyCommandInput = {
          QueryPosition: position,
          QueryRadius: radius,
          MaxResults: maxResults,
          ...(category && { Filter: { IncludeCategories: [category] } }),
        }
        const out: SearchNearbyCommandOutput = await client.send(
          new SearchNearbyCommand(input),
        )
        setRaw(JSON.stringify(out, null, 2))
        items = (out.ResultItems ?? []).map((r) => ({
          title: r.Title ?? '(untitled)',
          label: r.Address?.Label,
          position: r.Position as [number, number] | undefined,
          categories: r.Categories?.map((c) => c.Name).join(', '),
          distance: r.Distance,
        }))
      } else {
        const input: SearchTextCommandInput = {
          QueryText: queryText,
          BiasPosition: position,
          MaxResults: maxResults,
        }
        const out: SearchTextCommandOutput = await client.send(
          new SearchTextCommand(input),
        )
        setRaw(JSON.stringify(out, null, 2))
        items = (out.ResultItems ?? []).map((r) => ({
          title: r.Title ?? '(untitled)',
          label: r.Address?.Label,
          position: r.Position as [number, number] | undefined,
          categories: r.Categories?.map((c) => c.Name).join(', '),
          distance: r.Distance,
        }))
      }
      setRows(items)
      if (map.current) {
        for (const it of items) {
          if (!it.position) continue
          resultMarkers.current.push(
            new maplibregl.Marker({ color: '#2563eb' })
              .setLngLat(it.position)
              .setPopup(new maplibregl.Popup({ offset: 12 }).setText(it.title))
              .addTo(map.current),
          )
        }
      }
      setTiming(`${Math.round(performance.now() - started)} ms · ${items.length} result(s)`)
    } catch (err) {
      const e = err as { message?: string; code?: string; statusCode?: number }
      setError(`${e.code ?? 'Error'}${e.statusCode ? ` (${e.statusCode})` : ''}: ${e.message ?? String(err)}`)
      setRaw(JSON.stringify(err, Object.getOwnPropertyNames(err as object), 2))
    } finally {
      setBusy(false)
    }
  }, [client, mode, position, radius, maxResults, category, queryText])

  const fetchStaticMap = useCallback(async () => {
    setStaticError(null)
    const token = getToken()
    if (!token) {
      setStaticError('No token yet')
      return
    }
    const params = new URLSearchParams({
      width: '640',
      height: '400',
      center: `${position[0]},${position[1]}`,
      zoom: '14',
      style: 'Standard',
    })
    try {
      const res = await fetch(`${API_URL}/maps/static/testbed.png?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.text()
        setStaticError(`${res.status}: ${body.slice(0, 200)}`)
        return
      }
      const blob = await res.blob()
      setStaticUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(blob)
      })
    } catch (err) {
      setStaticError(err instanceof Error ? err.message : String(err))
    }
  }, [getToken, position])

  const inputClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100'
  const displayError = error ?? clientError

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
                  mode === m ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {m === 'nearby' ? 'SearchNearby' : 'SearchText'}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">
            position {position[1].toFixed(5)}, {position[0].toFixed(5)} (click the map to move it)
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {mode === 'nearby' ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Radius (m)</label>
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Category filter</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Query text</label>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Max results</label>
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
              disabled={busy || !client || !mapReady}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Searching…' : 'Search'}
            </button>
            <button
              type="button"
              onClick={fetchStaticMap}
              disabled={!mapReady}
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Static map
            </button>
          </div>
        </div>

        {timing && <p className="mt-2 text-xs text-gray-500">{timing}</p>}
        {displayError && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{displayError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="relative h-125 overflow-hidden rounded-lg bg-white shadow-lg lg:col-span-2">
          {!mapReady && !displayError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          )}
          <div ref={mapContainer} className="h-full w-full" />
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

      {(staticUrl || staticError) && (
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Static map</h3>
          {staticError ? (
            <p className="text-sm text-red-700">{staticError}</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL from an authenticated fetch
            <img src={staticUrl!} alt="Static map" className="max-w-full rounded-md border" />
          )}
        </div>
      )}

      {raw && (
        <details className="rounded-lg bg-white p-4 shadow">
          <summary className="cursor-pointer text-sm font-semibold text-gray-900">
            Raw response
          </summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-gray-50 p-3 text-xs">{raw}</pre>
        </details>
      )}
    </div>
  )
}
