import { describe, expect, it } from 'vitest'
import type { Json } from './ast-json.ts'
import { classify } from './classify.ts'
import { observationFields, projectionFields } from './layers.ts'

const fc = (props: Record<string, Json>, n = 2, name?: string) => ({
  name,
  features: Array.from({ length: n }, () => ({
    type: 'Feature',
    properties: props,
    geometry: null,
  })),
})
const proj = { tmp_rcp45_anom_1981_1990: 0.1, pcp_rcp85_anom_winter_2091_2100: 3 }
const obs = { Tm_observed_anom_1951_1960: 0.2, RR_summer_observed_anom_2011_2020: -4 }

describe('classify by field signature', () => {
  it.each([
    [{ COD_3: 'UA1', ADMIN_3: 'x', ...proj }, 'proj-hromady'],
    [{ COD_3: 'UA1', ...obs }, 'obs-hromady'],
    [{ COD_2: 'UA2', ...proj }, 'proj-rayons'],
    [{ COD_2: 'UA2', ...obs }, 'obs-rayons'],
    [{ NAME_UA: 'Київська', NAME_LAT: 'Kyivska', ...proj }, 'proj-oblasts'],
    [{ NAME_UA: 'Київська', ...obs }, 'obs-oblasts'],
    [{ Basin: 'Дніпро', Subbasin_eng: 'Upper Dnipro', ...proj }, 'proj-basins'],
    [{ Basin: 'Дніпро', Basin_eng: 'Dnipro' }, 'basin-names'],
    [{ id: 1, lat: 50, lon: 30, Elevation: 120 }, 'proj-grid'],
    [{ id: 1, lat: 50, lon: 30, index_right: 0 }, 'obs-grid'],
  ])('%j → %s', (props, id) => {
    expect(classify(fc(props))).toBe(id)
  })

  it('treats a single feature with values and no level keys as Ukraine', () => {
    expect(classify(fc({ name_EN: 'Ukraine', ...proj }, 1))).toBe('proj-ukraine')
    expect(classify(fc({ name_EN: 'Ukraine', ...obs }, 1))).toBe('obs-ukraine')
  })

  it('tells the two station sets apart by collection name', () => {
    const st = { station: 'Kyiv', lat: 50, lon: 30, St_UA: 'Київ' }
    expect(classify(fc(st, 2, 'meteostations_homogen_Tm_Tn_Tx'))).toBe('obs-stations-tm')
    expect(classify(fc(st, 2, 'meteostations_homogen_RR'))).toBe('obs-stations-rr')
    expect(classify(fc(st, 2, 'meteostations'))).toBeNull()
  })

  it('returns null for unknown or ambiguous signatures', () => {
    expect(classify(fc({ foo: 1 }))).toBeNull()
    expect(classify(fc({ COD_3: 'UA1' }))).toBeNull() // no values → unknown dataset
    expect(classify(fc({ COD_3: 'UA1', ...proj, ...obs }))).toBeNull()
  })
})

describe('expected value fields', () => {
  it('has 240 projection and 70 observation fields', () => {
    expect(projectionFields()).toHaveLength(240)
    expect(new Set(projectionFields()).size).toBe(240)
    expect(projectionFields()).toContain('tmp_rcp45_anom_winter_2041_2050')
    expect(observationFields()).toHaveLength(70)
    expect(observationFields()).toContain('Tm_summer_observed_anom_1991_2000')
  })
})
