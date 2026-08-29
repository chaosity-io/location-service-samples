'use client'

import { useCountry } from '@/lib/settings/country'
import {
  DEFAULT_MAP_SETTINGS,
  isRasterStyle,
  LANGUAGES,
  POLITICAL_VIEWS,
  useMapSettings,
} from '@/lib/settings/map-settings'
import type {
  ColorScheme,
  ContourDensity,
  MapStyle,
  Terrain,
  TrafficMode,
  TravelMode,
} from '@chaosity/location-client'
import {
  COLOR_SCHEMES,
  CONTOUR_DENSITIES,
  MAP_STYLES,
  TERRAINS,
  TRAFFIC_MODES,
  TRAVEL_MODES,
} from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'

const selectClass =
  'rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400'

const RASTER_NOTE =
  'Satellite and Hybrid reject this, so it is disabled for raster styles'

/**
 * The global controls: which country the testbed works in, and how every map
 * is drawn. Both persist across pages and reloads (see lib/settings).
 */
export function SettingsBar() {
  const { loading, error } = useLocationClient()
  const country = useCountry()
  const [s, set] = useMapSettings()
  const raster = isRasterStyle(s.style)

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Country</span>
          <select
            value={country.code}
            onChange={(e) => country.setCode(e.target.value)}
            className={selectClass}
            disabled={loading || !!error}
            title={
              country.scoped
                ? `This application is scoped to ${country.scope.join(', ')} (from the token). Queries send the selected one as Filter.IncludeCountries; the map frames it.`
                : 'This application has no country scope; pick one to frame the map and filter queries, or leave it worldwide.'
            }
          >
            {!country.scoped && <option value="">Worldwide</option>}
            {country.options.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">
            {loading
              ? 'reading the token…'
              : country.scoped
                ? `scope from token: ${country.scope.join(', ')}`
                : 'no scope on this application'}
          </span>
        </label>

        <details className="group min-w-0 flex-1">
          <summary className="cursor-pointer text-sm text-gray-700 select-none">
            <span className="font-medium">Map</span>{' '}
            <span className="text-xs text-gray-500">
              {s.style}
              {!raster && ` · ${s.colorScheme}`}
              {s.terrain && ` · ${s.terrain}`}
              {s.buildings && ' · 3D buildings'}
              {s.contourDensity && ` · contours ${s.contourDensity}`}
              {s.traffic && ` · traffic ${s.traffic}`}
              {s.travelModes.length > 0 && ` · ${s.travelModes.join('+')}`}
              {s.politicalView && ` · view ${s.politicalView}`}
              {` · ${s.language}`}
              {s.globe && ' · globe'}
              <span className="ml-1 text-gray-400 group-open:hidden">
                (change)
              </span>
            </span>
          </summary>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Style</span>
              <select
                value={s.style}
                onChange={(e) => {
                  const style = e.target.value as MapStyle
                  set({
                    style,
                    // Satellite has no political view; raster styles no scheme.
                    ...(isRasterStyle(style) && { colorScheme: 'Light' }),
                    ...(style === 'Satellite' && { politicalView: '' }),
                  })
                }}
                className={selectClass}
              >
                {MAP_STYLES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">
                Colour scheme
              </span>
              <select
                value={s.colorScheme}
                onChange={(e) =>
                  set({ colorScheme: e.target.value as ColorScheme })
                }
                className={selectClass}
                disabled={raster}
                title={raster ? RASTER_NOTE : undefined}
              >
                {COLOR_SCHEMES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">
                Political view
              </span>
              <select
                value={s.politicalView}
                onChange={(e) => set({ politicalView: e.target.value })}
                className={selectClass}
                disabled={s.style === 'Satellite'}
                title={
                  s.style === 'Satellite'
                    ? 'Satellite has no political view'
                    : undefined
                }
              >
                {POLITICAL_VIEWS.map((v) => (
                  <option key={v.code} value={v.code}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Terrain</span>
              <select
                value={s.terrain}
                onChange={(e) =>
                  set({ terrain: e.target.value as Terrain | '' })
                }
                className={selectClass}
                disabled={raster}
                title={raster ? RASTER_NOTE : undefined}
              >
                <option value="">None</option>
                {TERRAINS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">
                Contours
              </span>
              <select
                value={s.contourDensity}
                onChange={(e) =>
                  set({ contourDensity: e.target.value as ContourDensity | '' })
                }
                className={selectClass}
                disabled={raster}
                title={raster ? RASTER_NOTE : undefined}
              >
                <option value="">None</option>
                {CONTOUR_DENSITIES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Traffic</span>
              <select
                value={s.traffic}
                onChange={(e) =>
                  set({ traffic: e.target.value as TrafficMode | '' })
                }
                className={selectClass}
                title="Not gated for raster styles on purpose: Satellite + All shows Amazon's own combination error forwarded by the API."
              >
                <option value="">None</option>
                {TRAFFIC_MODES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">
                Language
              </span>
              <select
                value={s.language}
                onChange={(e) => set({ language: e.target.value })}
                className={selectClass}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">
                Overlays
              </span>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <label
                  className={`flex items-center gap-1 ${raster ? 'text-gray-400' : ''}`}
                  title={raster ? RASTER_NOTE : undefined}
                >
                  <input
                    type="checkbox"
                    checked={s.buildings}
                    disabled={raster}
                    onChange={(e) => set({ buildings: e.target.checked })}
                  />
                  3D buildings
                </label>
                {TRAVEL_MODES.map((mode) => (
                  <label key={mode} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={s.travelModes.includes(mode)}
                      onChange={(e) =>
                        set({
                          travelModes: e.target.checked
                            ? [...s.travelModes, mode]
                            : s.travelModes.filter((m) => m !== mode),
                        })
                      }
                    />
                    {mode as TravelMode}
                  </label>
                ))}
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={s.globe}
                    onChange={(e) => set({ globe: e.target.checked })}
                  />
                  Globe
                </label>
              </div>
            </div>

            <div className="col-span-2 flex items-end justify-between gap-2 sm:col-span-3 lg:col-span-2">
              <p className="text-xs text-gray-500">
                Persisted in this browser and applied to every page. A style or
                overlay change re-fetches the descriptor on each open map (a
                billable map load); language and globe do not.
              </p>
              <button
                type="button"
                onClick={() => set(DEFAULT_MAP_SETTINGS)}
                className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                Reset to Standard
              </button>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
