// Step 7: a few real API requests per source (sequential, < 100 per run) to prove the `place` mapping.
import type { Feature } from './validate.ts'
import type { SourceId, SourceSpec } from './layers.ts'

export interface SmokeResult {
  source: SourceId
  place: string
  query: string // URL without the key
  status: number | string
  ms: number
  kb: number
  series: number // fields in the JSON response
}

/** Deterministic PRNG, so a repeat run picks the same features. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pickSample<T>(items: T[], n: number, seed: number): T[] {
  const rnd = mulberry32(seed)
  const idx = new Set<number>()
  while (idx.size < Math.min(n, items.length)) idx.add(Math.floor(rnd() * items.length))
  return [...idx].map((i) => items[i]!)
}

export function buildQuery(
  spec: SourceSpec,
  place: string,
  valueType: string,
  season?: string,
): URLSearchParams {
  const q = new URLSearchParams()
  if (spec.endpoint === 'projections') {
    q.append('rcp', 'rcp45')
    q.append('rcp', 'rcp85')
  }
  q.append('kind', spec.apiKind!)
  q.append('place', place)
  q.append('value_type', valueType)
  if (season) q.append('season', season)
  return q
}

export async function smoke(
  apiUrl: string,
  key: string,
  specs: SourceSpec[],
  collections: Map<SourceId, Feature[]>,
  perSource = 5,
): Promise<SmokeResult[]> {
  const results: SmokeResult[] = []
  for (const spec of specs) {
    if (!spec.endpoint || !spec.apiKind) continue
    const features = collections.get(spec.id) ?? []
    pickSample(features, perSource, 20261006).forEach((f, i) => {
      // alternate variables where both exist; the last sample asks for a season
      const wantPrecip = i % 2 === 1
      const valueType =
        (wantPrecip ? spec.valueTypes.precipitation : spec.valueTypes.temperature) ??
        spec.valueTypes.temperature ??
        spec.valueTypes.precipitation!
      const q = buildQuery(
        spec,
        spec.place(f.properties),
        valueType,
        i === perSource - 1 ? 'summer' : undefined,
      )
      results.push({
        source: spec.id,
        place: q.get('place')!,
        query: `${spec.endpoint}?${q}`,
        status: 0,
        ms: 0,
        kb: 0,
        series: 0,
      })
    })
  }
  for (const r of results) {
    const t = performance.now()
    try {
      const res = await fetch(`${apiUrl}${r.query}&key=${encodeURIComponent(key)}`, {
        signal: AbortSignal.timeout(20000),
      })
      const text = await res.text()
      r.status = res.status
      r.kb = Math.round(text.length / 1024)
      if (res.ok) r.series = Object.keys(JSON.parse(text) as object).length
    } catch (e) {
      r.status = (e as Error).name
    }
    r.ms = Math.round(performance.now() - t)
  }
  return results
}
