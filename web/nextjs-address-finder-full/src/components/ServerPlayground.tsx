'use client'

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

const SAMPLE_INPUT: Record<Op, object> = {
  searchText: { QueryText: 'coffee', BiasPosition: [151.2093, -33.8688], MaxResults: 5 },
  suggest: { QueryText: '1 Martin Pl', BiasPosition: [151.2093, -33.8688], MaxResults: 5 },
  autocomplete: { QueryText: '1 Martin Pl', BiasPosition: [151.2093, -33.8688], MaxResults: 5 },
  geocode: { QueryText: '1 Martin Place, Sydney NSW', MaxResults: 3 },
  reverseGeocode: { QueryPosition: [151.2093, -33.8688] },
  searchNearby: {
    QueryPosition: [151.2093, -33.8688],
    QueryRadius: 500,
    MaxResults: 5,
    Filter: { IncludeCategories: ['restaurant'] },
  },
  getPlace: { PlaceId: '<paste a PlaceId from another call>' },
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
  const [auth, setAuth] = useState<Auth>('bearer')
  const [op, setOp] = useState<Op>('searchText')
  const [input, setInput] = useState(JSON.stringify(SAMPLE_INPUT.searchText, null, 2))
  const [busy, setBusy] = useState(false)
  const [reply, setReply] = useState<Reply | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const changeOp = (next: Op) => {
    setOp(next)
    setInput(JSON.stringify(SAMPLE_INPUT[next], null, 2))
  }

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
      setReply({ status: 0, ms: 0, auth, op, error: e instanceof Error ? e.message : String(e) })
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Auth mode</label>
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {(['bearer', 'basic'] as Auth[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAuth(a)}
                  className={`flex-1 rounded-md px-3 py-1 text-xs font-medium ${
                    auth === a ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {a === 'bearer' ? 'Bearer (connector)' : 'Basic (direct)'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Operation</label>
            <select
              value={op}
              onChange={(e) => changeOp(e.target.value as Op)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {(Object.keys(SAMPLE_INPUT) as Op[]).map((o) => (
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
          <label className="mb-1 block text-sm font-medium text-gray-700">Request input (JSON)</label>
          <textarea
            rows={7}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={inputClass}
            spellCheck={false}
          />
          {parseError && <p className="mt-1 text-sm text-red-700">{parseError}</p>}
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
          {reply.error && <p className="mb-2 text-sm text-red-700">{reply.error}</p>}
          <pre className="max-h-96 overflow-auto rounded-md bg-gray-50 p-3 text-xs">
            {JSON.stringify(reply.body ?? reply, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
