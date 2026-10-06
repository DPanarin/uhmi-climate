// API client: cache (in-memory LRU + sessionStorage), merged in-flight requests, abort, timeout,
// one retry for network/502/503, and errors mapped to what the user should read.
import { parseResponse, type Parsed } from './parse'
import { requestKey, type ApiRequest } from './request'

export type ApiErrorKind = 'unavailable' | 'noSeries' | 'badRequest' | 'aborted'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  constructor(kind: ApiErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

const TIMEOUT_MS = 10_000
const RETRY_DELAY_MS = 1_000
const LRU_SIZE = 100
const SESSION_PREFIX = 'uhmi-climate:api:'

export interface ClientOptions {
  baseUrl: string
  key: string
  fetch?: typeof fetch
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'> | null
  sleep?: (ms: number) => Promise<void>
}

/** Maps an HTTP status to an error kind: 500 = unknown place (the API's way of saying 404). */
export function errorKindFor(status: number): ApiErrorKind | 'retry' {
  if (status === 502 || status === 503 || status === 504) return 'retry'
  if (status === 500 || status === 404) return 'noSeries'
  if (status === 400) return 'badRequest'
  return 'unavailable'
}

export function createClient(opts: ClientOptions) {
  const doFetch = opts.fetch ?? fetch.bind(globalThis)
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const storage = opts.storage === undefined ? safeSession() : opts.storage
  const lru = new Map<string, Parsed>()
  const inflight = new Map<string, Promise<Parsed>>()
  let networkRequests = 0

  function remember(key: string, value: Parsed, raw: string) {
    lru.delete(key)
    lru.set(key, value)
    if (lru.size > LRU_SIZE) lru.delete(lru.keys().next().value!)
    try {
      storage?.setItem(SESSION_PREFIX + key, raw)
    } catch {
      clearSession() // quota: start over rather than fail
    }
  }

  function clearSession() {
    if (!storage) return
    for (let i = storage.length - 1; i >= 0; i--) {
      const k = storage.key(i)
      if (k?.startsWith(SESSION_PREFIX)) storage.removeItem(k)
    }
  }

  function cached(key: string): Parsed | undefined {
    const hit = lru.get(key)
    if (hit) {
      lru.delete(key)
      lru.set(key, hit)
      return hit
    }
    const raw = storage?.getItem(SESSION_PREFIX + key)
    if (raw) {
      const parsed = parseResponse(JSON.parse(raw))
      lru.set(key, parsed)
      return parsed
    }
    return undefined
  }

  async function attempt(
    r: ApiRequest,
    signal: AbortSignal,
  ): Promise<{ parsed: Parsed; raw: string }> {
    const params = new URLSearchParams(r.params)
    params.append('key', opts.key)
    const timeout = AbortSignal.timeout(TIMEOUT_MS)
    const res = await doFetch(`${opts.baseUrl}${r.path}?${params}`, {
      signal: AbortSignal.any([signal, timeout]),
    })
    networkRequests++
    if (!res.ok) {
      const kind = errorKindFor(res.status)
      throw kind === 'retry'
        ? new RetryableError(`HTTP ${res.status}`)
        : new ApiError(kind, `HTTP ${res.status}`)
    }
    const raw = await res.text()
    return { parsed: parseResponse(JSON.parse(raw)), raw }
  }

  async function load(r: ApiRequest, signal: AbortSignal): Promise<Parsed> {
    const key = requestKey(r)
    for (let i = 0; ; i++) {
      try {
        const { parsed, raw } = await attempt(r, signal)
        remember(key, parsed, raw)
        return parsed
      } catch (e) {
        if (signal.aborted) throw new ApiError('aborted', 'aborted')
        if (e instanceof ApiError) {
          if (e.kind === 'badRequest') console.error(`[api] 400 for ${key}`) // params without the key
          throw e
        }
        // network error, timeout or 502/503: one retry after 1 s
        if (i >= 1) throw new ApiError('unavailable', (e as Error).message)
        await sleep(RETRY_DELAY_MS)
        if (signal.aborted) throw new ApiError('aborted', 'aborted')
      }
    }
  }

  /** Cached or fetched; identical requests in flight share one fetch. */
  function get(r: ApiRequest, signal: AbortSignal): Promise<Parsed> {
    const key = requestKey(r)
    const hit = cached(key)
    if (hit) return Promise.resolve(hit)
    let p = inflight.get(key)
    if (!p) {
      p = load(r, signal).finally(() => inflight.delete(key))
      inflight.set(key, p)
    }
    return p
  }

  return { get, stats: () => ({ networkRequests, cached: lru.size }) }
}

class RetryableError extends Error {}

function safeSession(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

export type ApiClient = ReturnType<typeof createClient>

let shared: ApiClient | null = null
/** The app's client, configured from .env.local (VITE_API_URL, VITE_API_KEY). */
export function apiClient(): ApiClient {
  shared ??= createClient({
    baseUrl: import.meta.env.VITE_API_URL || 'https://api.uhmi.org.ua/',
    key: import.meta.env.VITE_API_KEY ?? '',
  })
  return shared
}
