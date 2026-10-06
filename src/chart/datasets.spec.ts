import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseResponse } from '@/api/parse'
import { buildLines, toCsv, unitFor } from './datasets'

const fx = (n: string) =>
  parseResponse(
    JSON.parse(readFileSync(join(process.cwd(), 'src/api/__fixtures__', `${n}.json`), 'utf8')),
  )
const t = (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k)

describe('buildLines', () => {
  it('projections, absolute: band + mean per scenario, then observations', () => {
    const lines = buildLines({
      ds: 'proj',
      variable: 'tas',
      mode: 'absolute',
      smooth: false,
      responses: { tas: fx('proj-oblasts-tas') },
      t,
    })
    expect(lines.map((l) => l.id)).toEqual([
      'rcp45-q025',
      'rcp45-q975',
      'rcp45-mean',
      'rcp85-q025',
      'rcp85-q975',
      'rcp85-mean',
      'observed',
    ])
    // the upper band edge directly follows the lower one (Chart.js fill: '-1')
    expect(lines[1]!.band).toBe('high')
    expect(lines[0]!.hideInLegend).toBe(true)
    expect(lines[2]!.points[0]).toEqual({ year: 1981, value: 7.82 })
  })

  it('projections, anomalies: means only (no band, as on the old site); moving average switch', () => {
    const lines = buildLines({
      ds: 'proj',
      variable: 'tas',
      mode: 'anomaly',
      smooth: true,
      responses: { tas: fx('proj-oblasts-tas') },
      t,
    })
    expect(lines.map((l) => l.id)).toEqual(['rcp45-mean', 'rcp85-mean', 'observed'])
    expect(lines[1]!.points[0]!.value).toBe(-0.31) // moving_anomalies_rcp85
  })

  it('grid nodes have no observed line', () => {
    const lines = buildLines({
      ds: 'proj',
      variable: 'tas',
      mode: 'absolute',
      smooth: false,
      responses: { tas: fx('proj-nodes-tas') },
      t,
    })
    expect(lines.some((l) => l.id === 'observed')).toBe(false)
  })

  it('observations: mean, min, max temperature or precipitation', () => {
    const tm = fx('obs-ukraine-tm')
    const lines = buildLines({
      ds: 'obs',
      variable: 'tas',
      mode: 'anomaly',
      smooth: false,
      responses: { tm, tn: tm, tx: tm },
      t,
    })
    expect(lines.map((l) => l.id)).toEqual(['tm', 'tn', 'tx'])
    expect(lines[0]!.points[0]!.year).toBe(1946)
    const rr = buildLines({
      ds: 'obs',
      variable: 'pr',
      mode: 'absolute',
      smooth: false,
      responses: { rr: fx('obs-rayons-rr') },
      t,
    })
    expect(rr.map((l) => l.id)).toEqual(['rr'])
  })
})

describe('units and CSV', () => {
  it('chooses the axis unit', () => {
    expect(unitFor('proj', 'tas', 'anomaly', t)).toBe('°C')
    expect(unitFor('proj', 'pr', 'anomaly', t)).toBe('%')
    expect(unitFor('proj', 'pr', 'absolute', t)).toBe('chart.mm')
    expect(unitFor('obs', 'pr', 'anomaly', t)).toBe('chart.mm')
  })

  it('writes one row per year, empty cells for missing years', () => {
    const csv = toCsv(
      [
        {
          id: 'a',
          label: 'A, x',
          color: '',
          width: 1,
          points: [
            { year: 2000, value: 1.5 },
            { year: 2001, value: null },
          ],
        },
        { id: 'b', label: 'B', color: '', width: 1, points: [{ year: 2001, value: -2 }] },
      ],
      '°C',
    )
    expect(csv).toBe('year,"A, x (°C)",B (°C)\n2000,1.5,\n2001,,-2\n')
  })
})
