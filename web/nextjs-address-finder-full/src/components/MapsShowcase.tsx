'use client'

import { describeError } from '@/lib/address'
import { useTestbedMap } from '@/lib/map/useTestbedMap'
import { descriptorOptions, useMapSettings } from '@/lib/settings/map-settings'
import {
  buildMapStyleUrl,
  fetchStaticMap,
  POI_CATEGORIES,
  type PoiCategory,
  setPoiVisibility,
} from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'
import { useCallback, useEffect, useRef, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_LOCATION_API_URL!

const POI_LABELS: Record<PoiCategory, string> = {
  food_drink: 'Food & drink',
  entertainment: 'Entertainment',
  sights: 'Sights & museums',
  transit: 'Transit',
  accommodations: 'Accommodation',
  leisure: 'Leisure & outdoor',
  shopping: 'Shopping',
  business: 'Business & services',
  facilities: 'Facilities',
  areas: 'Areas & buildings',
  parks: 'Parks',
}

interface StyleStats {
  layers: number
  symbolLayers: number
  sources: string[]
}

/**
 * The map itself as the thing under test: the descriptor the global settings
 * produce, the POI layers it carries (client-side visibility, no request),
 * and the static-map render of the current view (Enterprise tier).
 */
export default function MapsShowcase() {
  const container = useRef<HTMLDivElement>(null)
  const { getToken } = useLocationClient()
  const [settings] = useMapSettings()
  const { map, ready, error: mapError } = useTestbedMap(container)

  const [hidden, setHidden] = useState<ReadonlySet<PoiCategory>>(new Set())
  const [stats, setStats] = useState<StyleStats | null>(null)
  const [staticUrl, setStaticUrl] = useState<string | null>(null)
  const [staticError, setStaticError] = useState<string | null>(null)
  const [staticBusy, setStaticBusy] = useState(false)

  // `setStyle` resets every layer to what the descriptor says, so the POI
  // choice is re-applied after each style load. `setPoiVisibility` tolerates
  // a style that has not loaded yet (it checks getLayer first), so it also
  // runs right away.
  useEffect(() => {
    if (!map) return
    const apply = () => {
      for (const cat of Object.keys(POI_CATEGORIES) as PoiCategory[]) {
        setPoiVisibility(map, cat, !hidden.has(cat))
      }
    }
    apply()
    map.on('style.load', apply)
    return () => {
      map.off('style.load', apply)
    }
  }, [map, hidden])

  // Layer and source counts for the current descriptor: after every style
  // load, and once the first load is known to be done (`ready`) — via a
  // timer, so the state write is never synchronous inside the effect.
  useEffect(() => {
    if (!map) return
    const read = () => {
      const style = map.getStyle()
      if (!style?.layers) return
      setStats({
        layers: style.layers.length,
        symbolLayers: style.layers.filter((l) => l.type === 'symbol').length,
        sources: Object.keys(style.sources ?? {}),
      })
    }
    map.on('style.load', read)
    const timer = ready ? setTimeout(read, 0) : undefined
    return () => {
      map.off('style.load', read)
      if (timer) clearTimeout(timer)
    }
  }, [map, ready])

  const toggle = (cat: PoiCategory) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })

  const loadStatic = useCallback(async () => {
    if (!map) return
    setStaticBusy(true)
    setStaticError(null)
    try {
      const c = map.getCenter()
      // The static map takes only Standard and Satellite (STATIC_MAP_STYLES).
      const style = settings.style === 'Satellite' ? 'Satellite' : 'Standard'
      // The API accepts at most 14 decimals per coordinate and the library
      // sends the floats as-is, so a raw map centre (15+ decimals) is a 400
      // (location-service-client#29). Six decimals is ~10 cm.
      const round = (n: number) => Number(n.toFixed(6))
      const blob = await fetchStaticMap(
        API_URL,
        {
          width: 640,
          height: 400,
          center: [round(c.lng), round(c.lat)],
          zoom: Math.min(20, Math.max(0, Math.round(map.getZoom()))),
          style,
          ...(style === 'Standard' && { colorScheme: settings.colorScheme }),
        },
        getToken,
      )
      setStaticUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(blob)
      })
    } catch (err) {
      setStaticError(describeError(err))
    } finally {
      setStaticBusy(false)
    }
  }, [map, settings.style, settings.colorScheme, getToken])

  const descriptorUrl = buildMapStyleUrl(
    API_URL,
    settings.style,
    descriptorOptions(settings),
  )

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow">
        <h3 className="text-sm font-semibold text-gray-900">Descriptor</h3>
        <p className="mt-1 text-xs text-gray-500">
          What the current settings request (bearer token per request; language
          is applied client-side, not a query parameter):
        </p>
        <code className="mt-1 block rounded-md bg-gray-50 p-2 text-xs break-all">
          GET {descriptorUrl}
        </code>
        {stats && (
          <p className="mt-2 text-xs text-gray-500">
            {stats.layers} layers ({stats.symbolLayers} symbol) · sources:{' '}
            {stats.sources.join(', ')}
          </p>
        )}
        {mapError && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {mapError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="relative h-125 overflow-hidden rounded-lg bg-white shadow-lg lg:col-span-2">
          {!ready && !mapError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          )}
          <div ref={container} className="h-full w-full" />
        </div>

        <div className="h-125 space-y-4 overflow-auto rounded-lg bg-white p-4 shadow">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">POI layers</h3>
            <p className="mt-1 text-xs text-gray-500">
              <code>setPoiVisibility</code> — layer visibility only, no request.
              Not part of the raster styles.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-1 text-sm">
              {(Object.keys(POI_CATEGORIES) as PoiCategory[]).map((cat) => (
                <label key={cat} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!hidden.has(cat)}
                    onChange={() => toggle(cat)}
                    disabled={!ready}
                  />
                  {POI_LABELS[cat]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Static map</h3>
            <p className="mt-1 text-xs text-gray-500">
              <code>GET /maps/static/…</code> of the current centre and zoom,
              through <code>fetchStaticMap</code>. Enterprise tier; Standard or
              Satellite only.
            </p>
            <button
              type="button"
              onClick={loadStatic}
              disabled={!ready || staticBusy}
              className="mt-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {staticBusy ? 'Rendering…' : 'Render this view'}
            </button>
            {staticError && (
              <p className="mt-2 text-sm text-red-700">{staticError}</p>
            )}
          </div>
        </div>
      </div>

      {staticUrl && (
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            Static map
          </h3>
          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from an authenticated fetch */}
          <img
            src={staticUrl}
            alt="Static map of the current view"
            className="max-w-full rounded-md border"
          />
        </div>
      )}
    </div>
  )
}
