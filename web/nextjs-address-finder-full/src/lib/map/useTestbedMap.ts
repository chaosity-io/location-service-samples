'use client'

import {
  createTransformRequest,
  fetchMapStyle,
} from '@chaosity/location-client'
import {
  useLocationClient,
  useMapLanguage,
} from '@chaosity/location-client-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { useCountry } from '../settings/country'
import { descriptorOptions, useMapSettings } from '../settings/map-settings'

const API_URL = process.env.NEXT_PUBLIC_LOCATION_API_URL!

/** Padding around a country's bbox when the map frames it. */
const FIT_PADDING = 24

export interface TestbedMapOptions {
  /** Map click, as [lng, lat]. Read through a ref, so a new closure never rebuilds the map. */
  onClick?: (lngLat: [number, number]) => void
  /** CSS cursor over the map — 'crosshair' for pages where a click means something. */
  cursor?: string
  /** Add the GeolocateControl (default true). */
  geolocate?: boolean
}

export interface TestbedMap {
  map: maplibregl.Map | null
  /** The first style has loaded; safe to add markers. */
  ready: boolean
  error: string | null
}

function explain(err: unknown, fallback: string): string {
  const e = err as { code?: string; statusCode?: number; message?: string }
  if (!e?.message) return fallback
  return `${e.code ?? 'Error'}${e.statusCode ? ` (${e.statusCode})` : ''}: ${e.message}`
}

/**
 * One map, built the same way on every page.
 *
 * - Style, overlays, language and projection come from the shared map
 *   settings; a change re-fetches the descriptor (one billable map load per
 *   open map — a language change does not, it rewrites labels in place).
 * - The initial view is the selected country's bounds; changing the country
 *   refits every open map.
 * - Language goes into the descriptor fetch (no flash on first paint) and to
 *   `useMapLanguage` for in-place changes. Both need location-client ≥ 0.5.1:
 *   earlier versions rewrote every symbol layer and blanked house numbers and
 *   road shields (location-service-client#28).
 *
 * `map.current`-style init code used to be copied into each component with
 * different defaults — which is exactly how one page ended up over Kansas at
 * zoom 4 and another over Sydney at zoom 13.
 */
export function useTestbedMap(
  container: RefObject<HTMLDivElement | null>,
  options: TestbedMapOptions = {},
): TestbedMap {
  const {
    client,
    getToken,
    loading: clientLoading,
    error: clientError,
  } = useLocationClient()
  const [settings] = useMapSettings()
  const { code: countryCode, info: country } = useCountry()

  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Everything the INIT effect reads without re-running on: the latest
  // settings, country and callbacks. Init runs once per client.
  const optionsRef = useRef(options)
  const settingsRef = useRef(settings)
  const countryRef = useRef(country)
  const terrainControl = useRef<maplibregl.TerrainControl | null>(null)
  const appliedStyleKey = useRef<string>('')
  const appliedCountry = useRef<string>('')
  useEffect(() => {
    optionsRef.current = options
  })
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])
  useEffect(() => {
    countryRef.current = country
  }, [country])

  // A style change that swaps the DEM source out while terrain is on makes
  // MapLibre throw; the terrain control is rebuilt from whatever the new style
  // declares, so the button matches the descriptor rather than the last one.
  const syncTerrainControl = (instance: maplibregl.Map) => {
    if (terrainControl.current) {
      try {
        instance.removeControl(terrainControl.current)
      } catch {
        /* already gone */
      }
      terrainControl.current = null
    }
    const dem = Object.entries(instance.getStyle().sources ?? {}).find(
      ([, src]) => src.type === 'raster-dem',
    )?.[0]
    if (dem) {
      const ctrl = new maplibregl.TerrainControl({
        source: dem,
        exaggeration: 1,
      })
      instance.addControl(ctrl, 'top-right')
      terrainControl.current = ctrl
    }
  }

  // ---- init, once the provider has a token -------------------------------
  useEffect(() => {
    const el = container.current
    if (!el || clientLoading || !client || clientError) return
    let cancelled = false
    let instance: maplibregl.Map | null = null

    ;(async () => {
      try {
        const s = settingsRef.current
        const key = `${s.style}|${JSON.stringify(descriptorOptions(s))}`
        const style = await fetchMapStyle(API_URL, s.style, getToken, {
          ...descriptorOptions(s),
          language: s.language,
        })
        if (cancelled) return
        appliedStyleKey.current = key

        const c = countryRef.current
        appliedCountry.current = c?.code ?? ''
        instance = new maplibregl.Map({
          container: el,
          style,
          ...(c?.bbox
            ? { bounds: c.bbox, fitBoundsOptions: { padding: FIT_PADDING } }
            : { center: [0, 20], zoom: 1.4 }),
          maxPitch: 85,
          transformRequest: createTransformRequest(
            API_URL,
            getToken,
          ) as maplibregl.RequestTransformFunction,
        })
        instance.addControl(
          new maplibregl.NavigationControl({ visualizePitch: true }),
          'top-right',
        )
        instance.addControl(new maplibregl.ScaleControl())
        if (optionsRef.current.geolocate !== false) {
          instance.addControl(
            new maplibregl.GeolocateControl({
              showUserLocation: true,
              trackUserLocation: true,
              positionOptions: { enableHighAccuracy: true },
            }),
          )
        }
        instance.on('style.load', () => {
          if (!instance) return
          instance.setProjection({
            type: settingsRef.current.globe ? 'globe' : 'mercator',
          })
          syncTerrainControl(instance)
        })
        instance.on('click', (e) =>
          optionsRef.current.onClick?.([e.lngLat.lng, e.lngLat.lat]),
        )
        if (optionsRef.current.cursor) {
          instance.getCanvas().style.cursor = optionsRef.current.cursor
        }
        instance.once('load', () => {
          if (!cancelled) setReady(true)
        })
        setMap(instance)
        setError(null)
        // A handle for QA runs (Playwright / the console): read layer state,
        // centre and zoom without reaching into React. Dev only.
        if (process.env.NODE_ENV !== 'production') {
          ;(
            window as unknown as { __testbedMap?: maplibregl.Map }
          ).__testbedMap = instance
        }
      } catch (err) {
        if (!cancelled) setError(explain(err, 'Failed to load the map'))
      }
    })()

    return () => {
      cancelled = true
      instance?.remove()
      terrainControl.current = null
      setMap(null)
      setReady(false)
    }
  }, [container, client, clientLoading, clientError, getToken])

  // ---- style settings changed → re-fetch the descriptor -------------------
  const styleKey = `${settings.style}|${JSON.stringify(descriptorOptions(settings))}`
  useEffect(() => {
    if (!map || appliedStyleKey.current === styleKey) return
    let cancelled = false
    fetchMapStyle(API_URL, settings.style, getToken, {
      ...descriptorOptions(settings),
      language: settingsRef.current.language,
    })
      .then((style) => {
        if (cancelled) return
        appliedStyleKey.current = styleKey
        // Terrain on a source the next style may not have → detach first.
        map.setTerrain(null)
        map.setStyle(style)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(explain(err, 'Failed to load the map style'))
      })
    return () => {
      cancelled = true
    }
    // settings is folded into styleKey; listing it too would double-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, styleKey, getToken])

  // ---- language changed → rewrite labels in place --------------------------
  // The library hook re-applies on every style.load too, which is harmless
  // on a descriptor that was already fetched with the language.
  useMapLanguage(map, settings.language)

  // ---- projection ----------------------------------------------------------
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return
    map.setProjection({ type: settings.globe ? 'globe' : 'mercator' })
  }, [map, settings.globe])

  // ---- country changed → frame it -----------------------------------------
  useEffect(() => {
    if (!map || appliedCountry.current === countryCode) return
    appliedCountry.current = countryCode
    if (country?.bbox) {
      map.fitBounds(country.bbox, { padding: FIT_PADDING, duration: 900 })
    }
  }, [map, countryCode, country])

  return { map, ready, error: error ?? clientError }
}
