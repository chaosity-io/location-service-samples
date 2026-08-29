'use client'

import type {
  ColorScheme,
  ContourDensity,
  MapStyle,
  MapStyleOptions,
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
import { createPersistedStore, usePersistedStore } from './store'

/**
 * The one set of map settings every page's map is built from.
 *
 * Before this each page carried its own copy: `/` started over the United
 * States with Terrain3D + Buildings3D + contours, `/geocoder` over Sydney with
 * terrain and buildings baked in, `/nearby` over Sydney with nothing. Changing
 * a style on one page changed nothing on the next. Now there is one value,
 * persisted, and the defaults are the plain Standard map — no 3D, no overlays —
 * which is also the one that shows house numbers and road shields best.
 */
export interface MapSettings {
  style: MapStyle
  colorScheme: ColorScheme
  /** ISO 3166-1 alpha-3, or '' for the default view. */
  politicalView: string
  terrain: Terrain | ''
  buildings: boolean
  contourDensity: ContourDensity | ''
  traffic: TrafficMode | ''
  travelModes: TravelMode[]
  /** ISO 639-1 label language. */
  language: string
  globe: boolean
}

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  style: 'Standard',
  colorScheme: 'Light',
  politicalView: '',
  terrain: '',
  buildings: false,
  contourDensity: '',
  traffic: '',
  travelModes: [],
  language: 'en',
  globe: false,
}

/** Satellite and Hybrid reject colour scheme, terrain, buildings and contours. */
export function isRasterStyle(style: MapStyle): boolean {
  return style === 'Satellite' || style === 'Hybrid'
}

/**
 * The descriptor query for these settings.
 *
 * The Standard-only parameters are dropped for raster styles — sending them is
 * a guaranteed 400 naming a style the caller did not choose. `traffic` is
 * deliberately NOT gated: Satellite + All is the control that shows the API
 * forwarding Amazon's own combination error rather than swallowing it.
 */
export function descriptorOptions(s: MapSettings): MapStyleOptions {
  const raster = isRasterStyle(s.style)
  return {
    ...(!raster && {
      colorScheme: s.colorScheme,
      ...(s.terrain && { terrain: s.terrain }),
      ...(s.buildings && { buildings: 'Buildings3D' as const }),
      ...(s.contourDensity && { contourDensity: s.contourDensity }),
    }),
    ...(s.traffic && { traffic: s.traffic }),
    ...(s.travelModes.length && { travelModes: s.travelModes }),
    ...(s.politicalView && { politicalView: s.politicalView }),
  }
}

const oneOf = <T extends string>(
  v: unknown,
  allowed: readonly T[],
): T | undefined =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : undefined

const oneOfOrEmpty = <T extends string>(
  v: unknown,
  allowed: readonly T[],
): T | '' | undefined => (v === '' ? '' : oneOf(v, allowed))

/**
 * Whatever is in storage is validated against the accepted values, so a stale
 * entry from an older version of this app cannot turn into a 400 on every map.
 */
function sanitize(raw: unknown): Partial<MapSettings> {
  if (!raw || typeof raw !== 'object') return {}
  const r = raw as Record<string, unknown>
  return {
    style: oneOf(r.style, MAP_STYLES),
    colorScheme: oneOf(r.colorScheme, COLOR_SCHEMES),
    politicalView:
      typeof r.politicalView === 'string' &&
      (r.politicalView === '' || /^[A-Z]{3}$/.test(r.politicalView))
        ? r.politicalView
        : undefined,
    terrain: oneOfOrEmpty(r.terrain, TERRAINS),
    buildings: typeof r.buildings === 'boolean' ? r.buildings : undefined,
    contourDensity: oneOfOrEmpty(r.contourDensity, CONTOUR_DENSITIES),
    traffic: oneOfOrEmpty(r.traffic, TRAFFIC_MODES),
    travelModes: Array.isArray(r.travelModes)
      ? (r.travelModes.filter((m) =>
          (TRAVEL_MODES as readonly string[]).includes(m as string),
        ) as TravelMode[])
      : undefined,
    language:
      typeof r.language === 'string' && /^[a-z]{2}$/.test(r.language)
        ? r.language
        : undefined,
    globe: typeof r.globe === 'boolean' ? r.globe : undefined,
  }
}

export const mapSettingsStore = createPersistedStore<MapSettings>(
  'testbed.map-settings.v1',
  DEFAULT_MAP_SETTINGS,
  sanitize,
)

export function useMapSettings(): [
  MapSettings,
  (patch: Partial<MapSettings>) => void,
] {
  const settings = usePersistedStore(mapSettingsStore)
  return [settings, mapSettingsStore.set]
}

/** Political views Amazon Location renders; alpha-3 as the descriptor wants. */
export const POLITICAL_VIEWS: { code: string; label: string }[] = [
  { code: '', label: 'Default' },
  { code: 'ARG', label: 'Argentina' },
  { code: 'EGY', label: 'Egypt' },
  { code: 'IND', label: 'India' },
  { code: 'MAR', label: 'Morocco' },
  { code: 'RUS', label: 'Russia' },
  { code: 'SDN', label: 'Sudan' },
  { code: 'SRB', label: 'Serbia' },
  { code: 'SYR', label: 'Syria' },
  { code: 'TUR', label: 'Turkey' },
]

/** Label languages the AWS tiles carry as `name:<code>`; also sent as `Language` on Places calls. */
export const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'es', label: 'Spanish' },
]
