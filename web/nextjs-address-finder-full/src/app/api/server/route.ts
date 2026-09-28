import {
  AutocompleteCommand,
  GeocodeCommand,
  GetPlaceCommand,
  ReverseGeocodeCommand,
  SearchNearbyCommand,
  SearchTextCommand,
  SuggestCommand,
} from '@chaosity/location-client'
import { LocationServiceConnector } from '@chaosity/location-client/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Op =
  | 'searchText'
  | 'suggest'
  | 'autocomplete'
  | 'geocode'
  | 'reverseGeocode'
  | 'searchNearby'
  | 'getPlace'

const PATHS: Record<Op, string> = {
  searchText: '/address/search/text',
  suggest: '/address/suggestion',
  autocomplete: '/address/autocomplete',
  geocode: '/address/geocode',
  reverseGeocode: '/address/search/reverse-geocode',
  searchNearby: '/address/search/nearby',
  getPlace: '/address/place',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- command inputs are validated upstream by the API
function buildCommand(op: Op, input: any) {
  switch (op) {
    case 'searchText':
      return new SearchTextCommand(input)
    case 'suggest':
      return new SuggestCommand(input)
    case 'autocomplete':
      return new AutocompleteCommand(input)
    case 'geocode':
      return new GeocodeCommand(input)
    case 'reverseGeocode':
      return new ReverseGeocodeCommand(input)
    case 'searchNearby':
      return new SearchNearbyCommand(input)
    case 'getPlace':
      return new GetPlaceCommand(input)
  }
}

// One connector per server process: it caches the bearer token and refreshes it
// before expiry. Created lazily so a build without env vars does not throw.
declare global {
  var __locationConnector: LocationServiceConnector | undefined
}
function connector(): LocationServiceConnector {
  if (!globalThis.__locationConnector) {
    globalThis.__locationConnector = new LocationServiceConnector()
  }
  return globalThis.__locationConnector
}

export async function POST(req: Request) {
  const started = performance.now()
  const { auth, op, input } = (await req.json()) as {
    auth: 'bearer' | 'basic'
    op: Op
    input: unknown
  }
  if (!(op in PATHS)) {
    return NextResponse.json(
      { status: 400, ms: 0, auth, op, error: `Unknown op ${op}` },
      { status: 400 },
    )
  }

  // The API requires an Origin on every data request; forward the browser's,
  // fall back to the configured one for non-browser callers (curl).
  const origin =
    req.headers.get('origin') ?? process.env.LOCATION_ALLOWED_ORIGIN ?? ''

  try {
    if (auth === 'basic') {
      const apiUrl = process.env.LOCATION_API_URL
      const id = process.env.LOCATION_CLIENT_ID
      const secret = process.env.LOCATION_CLIENT_SECRET
      if (!apiUrl || !id || !secret)
        throw new Error(
          'LOCATION_API_URL / LOCATION_CLIENT_ID / LOCATION_CLIENT_SECRET are not set',
        )
      const res = await fetch(`${apiUrl}${PATHS[op]}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
          ...(origin && { Origin: origin }),
        },
        body: JSON.stringify(input),
      })
      const text = await res.text()
      let body: unknown = text
      try {
        body = JSON.parse(text)
      } catch {
        /* keep text */
      }
      return NextResponse.json({
        status: res.status,
        ms: Math.round(performance.now() - started),
        auth,
        op,
        body,
        ...(!res.ok && { error: `API returned ${res.status}` }),
      })
    }

    // Bearer via the connector: token from client credentials, cached + refreshed.
    const body = await connector().send(buildCommand(op, input), {
      headers: origin ? { Origin: origin } : {},
    })
    return NextResponse.json({
      status: 200,
      ms: Math.round(performance.now() - started),
      auth,
      op,
      body,
    })
  } catch (err) {
    const e = err as {
      statusCode?: number
      code?: string
      message?: string
      requestId?: string
    }
    const status = e.statusCode && e.statusCode >= 400 ? e.statusCode : 500
    return NextResponse.json(
      {
        status,
        ms: Math.round(performance.now() - started),
        auth,
        op,
        error: `${e.code ?? 'Error'}: ${e.message ?? String(err)}${e.requestId ? ` (requestId ${e.requestId})` : ''}`,
      },
      { status },
    )
  }
}
