// Columnar value files: one per dataset × level × variable, all scenarios/seasons/decades inside.
import type { Props } from '../extract/layers.ts'

export type Dataset = 'proj' | 'obs'
export type Variable = 'tas' | 'pr'
export const SEASONS = ['annual', 'winter', 'spring', 'summer', 'autumn'] as const

export interface ValueFile {
  ids: string[]
  decades: string[]
  /** values[scenario][season][decade][i] belongs to ids[i]; scenario is rcp45/rcp85 or "observed". */
  values: Record<string, Record<string, Record<string, (number | null)[]>>>
}

export const round2 = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : null

const decadeList = (from: number, to: number) =>
  Array.from(
    { length: (to - from + 1) / 10 },
    (_, i) => [from + i * 10, from + i * 10 + 9] as const,
  )

/** Source field name for one value, e.g. tas/rcp45/winter/2041 → `tmp_rcp45_anom_winter_2041_2050`. */
export function sourceField(
  ds: Dataset,
  v: Variable,
  scenario: string,
  season: string,
  from: number,
): string {
  const d = `${from}_${from + 9}`
  if (ds === 'proj') {
    const s = season === 'annual' ? '' : `_${season}`
    return `${v === 'tas' ? 'tmp' : 'pcp'}_${scenario}_anom${s}_${d}`
  }
  const s = season === 'annual' ? '' : `_${season}`
  return `${v === 'tas' ? 'Tm' : 'RR'}${s}_observed_anom_${d}`
}

export function buildValues(
  ds: Dataset,
  v: Variable,
  features: { id: string; props: Props }[],
): ValueFile {
  const decades = ds === 'proj' ? decadeList(1981, 2100) : decadeList(1951, 2020)
  const scenarios = ds === 'proj' ? ['rcp45', 'rcp85'] : ['observed']
  const values: ValueFile['values'] = {}
  for (const sc of scenarios) {
    values[sc] = {}
    for (const season of SEASONS) {
      values[sc][season] = {}
      for (const [from, to] of decades) {
        const field = sourceField(ds, v, sc, season, from)
        values[sc][season][`${from}-${to}`] = features.map((f) => round2(f.props[field]))
      }
    }
  }
  return { ids: features.map((f) => f.id), decades: decades.map(([a, b]) => `${a}-${b}`), values }
}
