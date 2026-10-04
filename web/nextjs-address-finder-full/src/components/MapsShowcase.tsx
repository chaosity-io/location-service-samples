'use client'

import { describeError } from '@/lib/address'
import { useTestbedMap } from '@/lib/map/useTestbedMap'
import { descriptorOptions, useMapSettings } from '@/lib/settings/map-settings'
import {
  buildMapStyleUrl,
  buildStaticMapUrl,
  fetchStaticMap,
  POI_CATEGORIES,
  type PoiCategory,
  setPoiVisibility,
  type StaticMapOptions,
} from '@chaosity/location-client'
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
 *
 * POIs are two different things on the two maps, and the page says so. On the
 * interactive map they are tile layers, toggled per category for free. The
 * static map is rendered by Amazon, which takes ONE switch — `PointsOfInterests`
 * Enabled | Disabled, all categories or none (Enabled is Amazon's default) —
 * and draws icons only at street zooms. A render of a country-wide view shows
 * none, whatever the switch says.
 */
export default function MapsShowcase() {
  const container = useRef<HTMLDivElement>(null)
  const [settings] = useMapSettings()
  // The map's own token source: a static map the API refuses asks the provider
  // for a new token once, under the same hold as the map's requests.
  const { map, ready, error: mapError, tokens } = useTestbedMap(container)

  const [hidden, setHidden] = useState<ReadonlySet<PoiCategory>>(new Set())
  const [stats, setStats] = useState<StyleStats | null>(null)
  const [staticUrl, setStaticUrl] = useState<string | null>(null)
  const [staticError, setStaticError] = useState<string | null>(null)
  const [staticBusy, setStaticBusy] = useState(false)
  const [staticPois, setStaticPois] = useState(true)
  /** The last static-map request, so what went on the wire is visible. */
  const [staticRequest, setStaticRequest] = useState<string | null>(null)

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
      // The raw centre is fine: location-client ≥ 0.5.1 rounds coordinates to
      // the six decimals the API accepts (location-service-client#29).
      const options: StaticMapOptions = {
        width: 640,
        height: 400,
        center: [c.lng, c.lat],
        zoom: Math.min(20, Math.max(0, Math.round(map.getZoom()))),
        style,
        ...(style === 'Standard' && { colorScheme: settings.colorScheme }),
        // A MODE, not a category list — the only POI control a static map has.
        pointsOfInterests: staticPois ? 'Enabled' : 'Disabled',
      }
      setStaticRequest(buildStaticMapUrl(API_URL, options))
      const blob = await fetchStaticMap(API_URL, options, tokens)
      setStaticUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(blob)
      })
    } catch (err) {
      setStaticError(describeError(err))
    } finally {
      setStaticBusy(false)
    }
  }, [map, settings.style, settings.colorScheme, staticPois, tokens])

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
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={staticPois}
                onChange={(e) => setStaticPois(e.target.checked)}
              />
              Points of interest
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Rendered by Amazon: one switch for <em>all</em> POI categories (
              <code>pointsOfInterests</code>), none of the per-category toggles
              above — those are interactive-map layers. Icons are drawn at
              street zooms only; a country-wide view has none either way.
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
          {staticRequest && (
            <code className="mb-2 block rounded-md bg-gray-50 p-2 text-xs break-all">
              GET {staticRequest}
            </code>
          )}
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
