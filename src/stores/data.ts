// Loaded map data: files from public/data by logical name, loaded on demand, de-duplicated,
// stale loads cancelled. No prefetch — the next level loads only when chosen.
import { defineStore } from 'pinia'
import { shallowReactive, ref } from 'vue'

const BASE = `${import.meta.env.BASE_URL}data/`

export const useDataStore = defineStore('data', () => {
  let index: Promise<Record<string, string>> | null = null
  const files = shallowReactive(new Map<string, unknown>())
  const loading = shallowReactive(new Set<string>())
  const error = ref<string | null>(null)
  const inflight = new Map<string, { promise: Promise<unknown>; controller: AbortController }>()

  function loadIndex(): Promise<Record<string, string>> {
    // index.json has no hash in its name, so it must not come from the HTTP cache
    index ??= fetch(`${BASE}index.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`index.json → ${r.status}`)
        return r.json() as Promise<{ files: Record<string, string> }>
      })
      .then((j) => j.files)
      .catch((e) => {
        index = null
        throw e
      })
    return index
  }

  /** Loads one file by logical name (e.g. `geo/oblasts`); concurrent calls share one request. */
  async function load<T>(logical: string): Promise<T> {
    if (files.has(logical)) return files.get(logical) as T
    const running = inflight.get(logical)
    if (running) return running.promise as Promise<T>
    const controller = new AbortController()
    const promise = (async () => {
      const name = (await loadIndex())[logical]
      if (!name) throw new Error(`unknown data file: ${logical}`)
      const res = await fetch(`${BASE}${name}`, { signal: controller.signal })
      if (!res.ok) throw new Error(`${name} → ${res.status}`)
      const json: unknown = await res.json()
      files.set(logical, json)
      return json
    })()
    inflight.set(logical, { promise, controller })
    loading.add(logical)
    try {
      return (await promise) as T
    } finally {
      inflight.delete(logical)
      loading.delete(logical)
    }
  }

  /** Loads what the current view needs and cancels other loads still running (the user moved on). */
  async function loadForView<T extends unknown[]>(logicals: string[]): Promise<T> {
    for (const [name, { controller }] of inflight) if (!logicals.includes(name)) controller.abort()
    error.value = null
    try {
      return (await Promise.all(logicals.map((l) => load(l)))) as T
    } catch (e) {
      if ((e as Error).name !== 'AbortError') error.value = (e as Error).message
      throw e
    }
  }

  return { files, loading, error, load, loadForView }
})
