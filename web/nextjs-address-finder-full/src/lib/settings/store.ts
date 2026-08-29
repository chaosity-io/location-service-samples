'use client'

import { useSyncExternalStore } from 'react'

/**
 * A tiny persisted store: one value, kept in `localStorage`, read through
 * `useSyncExternalStore` so it is SSR-safe and every subscriber re-renders
 * when it changes — on this tab and, via the `storage` event, on any other.
 *
 * This is what makes a setting "stay changed" across the testbed's pages: the
 * map settings and the selected country live here rather than in a page's
 * component state, so leaving `/` for `/nearby` does not reset them.
 */

export interface PersistedStore<T extends object> {
  get: () => T
  getServer: () => T
  set: (patch: Partial<T> | ((prev: T) => Partial<T>)) => void
  reset: () => void
  subscribe: (listener: () => void) => () => void
}

function stripUndefined<T extends object>(obj: Partial<T>): Partial<T> {
  const out: Partial<T> = {}
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] !== undefined) out[k] = obj[k]
  }
  return out
}

export function createPersistedStore<T extends object>(
  key: string,
  defaults: T,
  /** Validate what came out of storage; anything undefined falls back to the default. */
  sanitize: (raw: unknown) => Partial<T> = () => ({}),
): PersistedStore<T> {
  let value: T | null = null
  const listeners = new Set<() => void>()

  const load = (): T => {
    if (typeof window === 'undefined') return defaults
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) return defaults
      return { ...defaults, ...stripUndefined(sanitize(JSON.parse(raw))) }
    } catch {
      return defaults
    }
  }

  const save = (next: T) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* private mode / quota — the in-memory value still works for this tab */
    }
  }

  const emit = () => listeners.forEach((l) => l())

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== key) return
      value = load()
      emit()
    })
  }

  return {
    get: () => {
      if (value === null) value = load()
      return value
    },
    getServer: () => defaults,
    set: (patch) => {
      const prev = value ?? load()
      const next = {
        ...prev,
        ...stripUndefined(typeof patch === 'function' ? patch(prev) : patch),
      }
      value = next
      save(next)
      emit()
    },
    reset: () => {
      value = defaults
      try {
        window.localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
      emit()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function usePersistedStore<T extends object>(
  store: PersistedStore<T>,
): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer)
}
