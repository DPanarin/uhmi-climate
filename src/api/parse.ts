// API response → sorted numeric series grouped as { hist, rcp45, rcp85 }.
// The API returns `[date, "value"]` pairs (strings, sometimes numbers), dates as "1981-12-31" or "1946",
// observation series not always sorted, "nan" for gaps.
import { z } from 'zod'

export interface Point {
  year: number
  value: number | null
}
export type Series = Point[]

export type Stat =
  | 'mean'
  | 'anomaly'
  | 'q025'
  | 'q975'
  | 'movingMean'
  | 'movingAnomaly'
  | 'movingQ025'
  | 'movingQ975'
export type Group = 'hist' | 'rcp45' | 'rcp85'
export type Parsed = Partial<Record<Group, Partial<Record<Stat, Series>>>>

const cell = z.union([z.string(), z.number(), z.null()])
const schema = z.record(z.string(), z.array(z.tuple([cell, cell])))

const STAT_BY_NAME: Record<string, Stat> = {
  means: 'mean',
  anomalies_mean: 'anomaly',
  quantile025: 'q025',
  quantile975: 'q975',
  moving_mean: 'movingMean',
  moving_anomalies: 'movingAnomaly',
  moving_quantile025: 'movingQ025',
  moving_quantile975: 'movingQ975',
  // observations (and the observed part of projection responses)
  hist: 'mean',
  anomalies: 'anomaly',
  hist_anomalies: 'anomaly',
  hist_moving: 'movingMean',
  hist_moving_anomalies: 'movingAnomaly',
}

/** `means_rcp45` → rcp45/mean; `hist_moving` → hist/movingMean; unknown → null. */
export function classifyKey(key: string): { group: Group; stat: Stat } | null {
  const m = key.match(/^(.*)_(rcp45|rcp85)$/)
  const name = m ? m[1]! : key
  const group: Group = m ? (m[2] as Group) : 'hist'
  const stat = STAT_BY_NAME[name]
  if (!stat) return null
  if (
    !m &&
    !['hist', 'anomalies', 'hist_anomalies', 'hist_moving', 'hist_moving_anomalies'].includes(name)
  )
    return null
  if (m && name.startsWith('hist')) return null
  return { group, stat }
}

export function toNumber(v: string | number | null): number | null {
  if (v === null) return null
  const n = typeof v === 'number' ? v : Number(v.trim())
  return v === '' || !Number.isFinite(n) ? null : n
}

export function toSeries(pairs: [string | number | null, string | number | null][]): Series {
  return pairs
    .map(([d, v]) => ({ year: parseInt(String(d).slice(0, 4), 10), value: toNumber(v) }))
    .filter((p) => Number.isFinite(p.year))
    .sort((a, b) => a.year - b.year)
}

export class ParseError extends Error {}

export function parseResponse(json: unknown, warn: (msg: string) => void = console.warn): Parsed {
  const result = schema.safeParse(json)
  if (!result.success) throw new ParseError('unexpected response shape')
  const out: Parsed = {}
  for (const [key, pairs] of Object.entries(result.data)) {
    const c = classifyKey(key)
    if (!c) {
      warn(`[api] unknown series "${key}" ignored`)
      continue
    }
    ;(out[c.group] ??= {})[c.stat] = toSeries(pairs)
  }
  return out
}
