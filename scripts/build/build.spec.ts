import { describe, expect, it } from 'vitest'
import { contentHash, hashedName } from './hash.ts'
import { bbox, pointInPolygon } from './geometry.ts'
import { fixLookalikes, hasMixedScript, oblastNames } from './names.ts'
import { buildValues, round2, sourceField } from './values.ts'

describe('names', () => {
  it('replaces Latin look-alikes only in Ukrainian strings', () => {
    expect(fixLookalikes('Вінницькa')).toBe('Вінницька')
    expect(fixLookalikes('Вopoнoвицькa')).toBe('Вороновицька')
    expect(fixLookalikes('Брoшнів-Oсадська')).toBe('Брошнів-Осадська')
    expect(hasMixedScript(fixLookalikes('Агpономічна'))).toBe(false)
    expect(fixLookalikes('Lvivska')).toBe('Lvivska')
  })

  it('names oblasts as the old site does', () => {
    expect(oblastNames({ NAME_LAT: 'Kyivska', NAME_UA: 'Київська' })).toEqual({
      uk: 'Київська область',
      en: 'Kyivska Oblast',
    })
    expect(oblastNames({ NAME_LAT: 'Zaporizka', NAME_UA: 'Запорізька' }).en).toBe(
      'Zaporizka Oblast',
    )
    expect(oblastNames({ NAME_LAT: 'Kyiv', NAME_UA: 'Київ' })).toEqual({ uk: 'Київ', en: 'Kyiv' })
  })
})

describe('values', () => {
  it('rounds to 0.01 and turns non-numbers into null', () => {
    expect(round2(1.234)).toBe(1.23)
    expect(round2(-0.005)).toBe(-0)
    expect(round2(2.675)).toBeCloseTo(2.68, 2)
    expect(round2(null)).toBeNull()
    expect(round2('1')).toBeNull()
    expect(round2(Number.NaN)).toBeNull()
  })

  it('maps view parameters to source field names', () => {
    expect(sourceField('proj', 'tas', 'rcp45', 'winter', 2041)).toBe(
      'tmp_rcp45_anom_winter_2041_2050',
    )
    expect(sourceField('proj', 'pr', 'rcp85', 'annual', 1981)).toBe('pcp_rcp85_anom_1981_1990')
    expect(sourceField('obs', 'tas', 'observed', 'summer', 1991)).toBe(
      'Tm_summer_observed_anom_1991_2000',
    )
    expect(sourceField('obs', 'pr', 'observed', 'annual', 2011)).toBe('RR_observed_anom_2011_2020')
  })

  it('builds columnar files aligned with ids', () => {
    const file = buildValues('obs', 'tas', [
      {
        id: 'a',
        props: { Tm_observed_anom_1951_1960: 0.123, Tm_winter_observed_anom_2011_2020: 2.4 },
      },
      { id: 'b', props: { Tm_observed_anom_1951_1960: null } },
    ])
    expect(file.ids).toEqual(['a', 'b'])
    expect(file.decades).toHaveLength(7)
    expect(Object.keys(file.values)).toEqual(['observed'])
    expect(file.values.observed!.annual!['1951-1960']).toEqual([0.12, null])
    expect(file.values.observed!.winter!['2011-2020']).toEqual([2.4, null])

    const proj = buildValues('proj', 'pr', [{ id: 'x', props: {} }])
    expect(Object.keys(proj.values)).toEqual(['rcp45', 'rcp85'])
    expect(proj.decades).toHaveLength(12)
  })
})

describe('file names', () => {
  it('hashes content into the name, stable for the same content', () => {
    const a = hashedName('geo/oblasts', '.topo.json', '{"a":1}')
    expect(a).toMatch(/^geo\/oblasts\.[0-9a-f]{8}\.topo\.json$/)
    expect(hashedName('geo/oblasts', '.topo.json', '{"a":1}')).toBe(a)
    expect(contentHash('{"a":2}')).not.toBe(contentHash('{"a":1}'))
  })
})

describe('geometry helpers', () => {
  const square = {
    type: 'Polygon',
    coordinates: [
      [
        [30, 50],
        [31, 50],
        [31, 51],
        [30, 51],
        [30, 50],
      ],
    ],
  }
  it('computes a bbox and point-in-polygon', () => {
    expect(bbox(square)).toEqual([30, 50, 31, 51])
    expect(pointInPolygon([30.5, 50.5], square)).toBe(true)
    expect(pointInPolygon([31.5, 50.5], square)).toBe(false)
  })
})
