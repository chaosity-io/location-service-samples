'use client'

import { bboxCenter } from '@/lib/countries'
import { useCountry } from '@/lib/settings/country'
import { useState } from 'react'

type Auth = 'bearer' | 'basic'
type Op =
  | 'searchText'
  | 'suggest'
  | 'autocomplete'
  | 'geocode'
  | 'reverseGeocode'
  | 'searchNearby'
  | 'getPlace'

const OPS: Op[] = [
  'searchText',
  'suggest',
  'autocomplete',
  'geocode',
  'reverseGeocode',
  'searchNearby',
  'getPlace',
]

/** Sydney, when no country is selected — a position the samples are written for. */
const FALLBACK_BIAS: [number, number] = [151.2093, -33.8688]

/**
 * A starting body per operation, shaped by the global country: the bias
 * position is the country's centre and the country goes in
 * `Filter.IncludeCountries` where the operation takes one. Edit freely — the
 * point of this page is sending a precise body.
 */
function sampleInput(op: Op, country: string, bias: [number, number]): object {
  const filter = country ? { Filter: { IncludeCountries: [country] } } : {}
  switch (op) {
    case 'searchText':
      return {
        QueryText: 'coffee',
        BiasPosition: bias,
        MaxResults: 5,
        ...filter,
      }
    case 'suggest':
      return {
        QueryText: '1 Martin Pl',
        BiasPosition: bias,
        MaxResults: 5,
        ...filter,
      }
    case 'autocomplete':
      return {
        QueryText: '1 Martin Pl',
        BiasPosition: bias,
        MaxResults: 5,
        ...filter,
      }
    case 'geocode':
      return {
        QueryText: '1 Martin Place, Sydney NSW',
        MaxResults: 3,
        ...filter,
      }
    case 'reverseGeocode':
      return { QueryPosition: bias }
    case 'searchNearby':
      return {
        QueryPosition: bias,
        QueryRadius: 500,
        MaxResults: 5,
        Filter: { IncludeCategories: ['restaurant'], ...filter.Filter },
      }
    case 'getPlace':
      return { PlaceId: '<paste a PlaceId from another call>' }
  }
}

interface Reply {
  status: number
  ms: number
  auth: Auth
  op: Op
  body?: unknown
  error?: string
}

export default function ServerPlayground() {
  const { code: country, info } = useCountry()
  const bias = info?.bbox ? bboxCenter(info.bbox) : FALLBACK_BIAS

  const [auth, setAuth] = useState<Auth>('bearer')
  const [op, setOp] = useState<Op>('searchText')
  // The body is derived from op + country until the user edits it; an edit
  // is kept only for the op/country it was made under, so switching either
  // gives a fresh sample rather than a stale one.
  const [edited, setEdited] = useState<{ key: string; text: string } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [reply, setReply] = useState<Reply | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const key = `${op}|${country}`
  const input =
    edited?.key === key
      ? edited.text
      : JSON.stringify(sampleInput(op, country, bias), null, 2)

  const run = async () => {
    setParseError(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(input)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth, op, input: parsed }),
      })
      const data = (await res.json()) as Reply
      setReply(data)
    } catch (e) {
      setReply({
        status: 0,
        ms: 0,
        auth,
        op,
        error: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Auth mode
            </label>
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {(['bearer', 'basic'] as Auth[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAuth(a)}
                  className={`flex-1 rounded-md px-3 py-1 text-xs font-medium ${
                    auth === a
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {a === 'bearer' ? 'Bearer (connector)' : 'Basic (direct)'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Operation
            </label>
            <select
              value={op}
              onChange={(e) => setOp(e.target.value as Op)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {OPS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={run}
              disabled={busy}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Calling…' : 'Call from the server'}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Request input (JSON)
            <span className="ml-2 text-xs font-normal text-gray-500">
              sample for {country || 'worldwide'} · bias {bias[1].toFixed(2)},{' '}
              {bias[0].toFixed(2)}
            </span>
          </label>
          <textarea
            rows={9}
            value={input}
            onChange={(e) => setEdited({ key, text: e.target.value })}
            className={inputClass}
            spellCheck={false}
          />
          {parseError && (
            <p className="mt-1 text-sm text-red-700">{parseError}</p>
          )}
        </div>
      </div>

      {reply && (
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
            <span
              className={`rounded px-2 py-0.5 font-mono ${
                reply.status >= 200 && reply.status < 300
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              HTTP {reply.status}
            </span>
            <span className="text-gray-500">{reply.ms} ms</span>
            <span className="text-gray-500">
              {reply.op} via {reply.auth}
            </span>
          </div>
          {reply.error && (
            <p className="mb-2 text-sm text-red-700">{reply.error}</p>
          )}
          <pre className="max-h-96 overflow-auto rounded-md bg-gray-50 p-3 text-xs">
            {JSON.stringify(reply.body ?? reply, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
