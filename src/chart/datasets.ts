// Parsed API series → chart lines (pure; Chart.js-agnostic shapes) and CSV.
import type { DatasetId, VariableId } from '@/config/layers'
import type { Group, Parsed, Series, Stat } from '@/api/parse'

export type Mode = 'absolute' | 'anomaly'

export interface Line {
  id: string
  label: string
  color: string
  points: Series
  width: number
  /** Band edges: drawn without a line; the upper one fills down to the lower one. */
  band?: 'low' | 'high'
  hideInLegend?: boolean
  /** Column name in the CSV when it differs from the legend label (band edges). */
  csvLabel?: string
}

export interface ChartInput {
  ds: DatasetId
  variable: VariableId
  mode: Mode
  smooth: boolean
  /** Responses by value_type (tas | pr | tm | tn | tx | rr). */
  responses: Record<string, Parsed>
  t: (key: string, params?: Record<string, unknown>) => string
}

export const COLORS = {
  rcp45: '#2166ac',
  rcp85: '#b2182b',
  observed: '#1a1a1a',
  tn: '#3b6fb6',
  tx: '#c0392b',
}

const stat = (mode: Mode, smooth: boolean): Stat =>
  mode === 'absolute' ? (smooth ? 'movingMean' : 'mean') : smooth ? 'movingAnomaly' : 'anomaly'

/** Lines in drawing order. Projections: band (absolute mode only, as on the old site) + ensemble mean
 *  per scenario, plus the observed part when the API returns it. Observations: one line per value type. */
export function buildLines(input: ChartInput): Line[] {
  const { t, mode, smooth } = input
  const s = stat(mode, smooth)
  const lines: Line[] = []
  const get = (p: Parsed | undefined, g: Group, st: Stat) => p?.[g]?.[st]

  if (input.ds === 'proj') {
    const p = input.responses[input.variable]
    for (const sc of ['rcp45', 'rcp85'] as const) {
      const name = t(`scenarios.${sc}`)
      if (mode === 'absolute') {
        const low = get(p, sc, smooth ? 'movingQ025' : 'q025')
        const high = get(p, sc, smooth ? 'movingQ975' : 'q975')
        if (low && high) {
          lines.push({
            id: `${sc}-q025`,
            label: t('chart.bandLow', { scenario: name }),
            color: COLORS[sc],
            points: low,
            width: 0,
            band: 'low',
            hideInLegend: true,
          })
          lines.push({
            id: `${sc}-q975`,
            label: t('chart.band', { scenario: name }),
            color: COLORS[sc],
            points: high,
            width: 0,
            band: 'high',
            csvLabel: t('chart.bandHigh', { scenario: name }),
          })
        }
      }
      const mean = get(p, sc, s)
      if (mean)
        lines.push({
          id: `${sc}-mean`,
          label: t('chart.ensemble', { scenario: name }),
          color: COLORS[sc],
          points: mean,
          width: 2,
        })
    }
    const obs = get(p, 'hist', s)
    if (obs)
      lines.push({
        id: 'observed',
        label: t('chart.observed'),
        color: COLORS.observed,
        points: obs,
        width: 1.5,
      })
    return lines
  }

  const types = input.variable === 'tas' ? (['tm', 'tn', 'tx'] as const) : (['rr'] as const)
  for (const vt of types) {
    const series = get(input.responses[vt], 'hist', s)
    if (!series) continue
    const color = vt === 'tn' ? COLORS.tn : vt === 'tx' ? COLORS.tx : COLORS.observed
    lines.push({
      id: vt,
      label: t(`chart.series.${vt}`),
      color,
      points: series,
      width: vt === 'tm' || vt === 'rr' ? 2 : 1.25,
    })
  }
  return lines
}

/** Axis unit: temperature °C; precipitation mm, except projection anomalies (%). */
export function unitFor(
  ds: DatasetId,
  variable: VariableId,
  mode: Mode,
  t: ChartInput['t'],
): string {
  if (variable === 'tas') return '°C'
  return ds === 'proj' && mode === 'anomaly' ? '%' : t('chart.mm')
}

/** CSV with one row per year and one column per line (band edges included). */
export function toCsv(lines: Line[], unit: string): string {
  const years = [...new Set(lines.flatMap((l) => l.points.map((p) => p.year)))].sort(
    (a, b) => a - b,
  )
  const maps = lines.map((l) => new Map(l.points.map((p) => [p.year, p.value])))
  const quote = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  const head = ['year', ...lines.map((l) => `${l.csvLabel ?? l.label} (${unit})`)]
    .map(quote)
    .join(',')
  const rows = years.map((y) => [y, ...maps.map((m) => m.get(y) ?? '')].join(','))
  return [head, ...rows].join('\n') + '\n'
}
