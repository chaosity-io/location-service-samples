'use client'

import { useLocationClient } from '@chaosity/location-client-react'
import { useMemo } from 'react'
import { COUNTRIES, type CountryInfo, countryInfo } from '../countries'
import { createPersistedStore, usePersistedStore } from './store'

/**
 * The selected country — one value for the whole testbed.
 *
 * WHERE THE LIST COMES FROM
 *
 * The access token carries the application's country scope
 * (`client.getAppConfig().countries`, alpha-2). When the application is scoped
 * the selector offers exactly those countries, because the API narrows every
 * Places request to that scope anyway: a country outside it is a 400 naming
 * the allowed set, so offering it would only demonstrate the refusal.
 * Unscoped applications get the whole table and a "worldwide" option.
 *
 * WHAT IT DRIVES
 *
 * Every map opens on the country's bounds and refits when it changes, and the
 * queries that take a country send it: `Filter.IncludeCountries` on
 * Autocomplete / Geocode / Suggest / SearchText / SearchNearby, the geocoder
 * control's `setCountries`, the address form's default. Sending a country that
 * is inside the scope is honoured as-is by the API ("narrowing within scope is
 * fine"), so this is safe to act on — unlike blindly injecting the WHOLE scope
 * from a possibly stale token, which the client library rightly warns against.
 */

export interface CountryOption {
  code: string
  name: string
  bbox?: CountryInfo['bbox']
}

interface CountryState {
  /** alpha-2, or '' for worldwide / no preference. */
  code: string
}

const countryStore = createPersistedStore<CountryState>(
  'testbed.country.v1',
  { code: '' },
  (raw) => {
    const code = (raw as { code?: unknown } | null)?.code
    return {
      code:
        typeof code === 'string' && (code === '' || /^[A-Za-z]{2}$/.test(code))
          ? code.toUpperCase()
          : undefined,
    }
  },
)

const WORLDWIDE: CountryOption[] = COUNTRIES.map(({ code, name, bbox }) => ({
  code,
  name,
  bbox,
}))

export interface CountrySelection {
  /** Effective selection: '' = worldwide. Always one of `options` (or ''). */
  code: string
  /** Name + bbox for the effective selection, when the table knows it. */
  info: CountryOption | null
  options: CountryOption[]
  /** True when the application's token carries a country scope. */
  scoped: boolean
  /** The scope itself, alpha-2 — what the API would inject if nothing is sent. */
  scope: string[]
  setCode: (code: string) => void
}

export function useCountry(): CountrySelection {
  const { client } = useLocationClient()
  const stored = usePersistedStore(countryStore).code

  const scope = useMemo(
    () => client?.getAppConfig().countries?.map((c) => c.toUpperCase()) ?? [],
    [client],
  )

  const options = useMemo<CountryOption[]>(
    () =>
      scope.length
        ? scope.map((code) => {
            const known = countryInfo(code)
            return known
              ? { code, name: known.name, bbox: known.bbox }
              : { code, name: code }
          })
        : WORLDWIDE,
    [scope],
  )

  // A stored code that is no longer offered (the scope changed in the portal,
  // or the token has not loaded yet) must not leak into requests.
  const code = options.some((o) => o.code === stored)
    ? stored
    : (scope[0] ?? '')
  const info = options.find((o) => o.code === code) ?? null

  return {
    code,
    info,
    options,
    scoped: scope.length > 0,
    scope,
    setCode: (next) => countryStore.set({ code: next.toUpperCase() }),
  }
}

/** The `Filter` fragment for a Places call, or nothing when worldwide. */
export function countryFilter(
  code: string,
): { Filter: { IncludeCountries: string[] } } | Record<string, never> {
  return code ? { Filter: { IncludeCountries: [code] } } : {}
}
