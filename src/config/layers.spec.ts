import { describe, expect, it } from 'vitest'
import uk from '@/i18n/uk'
import { DATASETS, LAYERS } from './layers'

describe('layer catalogue', () => {
  it('has the 12 layers of the old site with unique ids', () => {
    expect(LAYERS).toHaveLength(12)
    expect(new Set(LAYERS.map((l) => l.id)).size).toBe(12)
  })

  it('has 12 projected and 7 observed decades', () => {
    expect(DATASETS.proj.decades).toHaveLength(12)
    expect(DATASETS.proj.decades[11]).toBe('2091-2100')
    expect(DATASETS.obs.decades).toEqual([
      '1951-1960',
      '1961-1970',
      '1971-1980',
      '1981-1990',
      '1991-2000',
      '2001-2010',
      '2011-2020',
    ])
  })

  it('has a label for every layer', () => {
    for (const l of LAYERS) {
      const label = (uk.layers as Record<string, Record<string, string>>)[l.dataset]?.[l.level]
      expect(typeof label === 'string' && label.length > 0 ? l.id : `missing: ${l.id}`).toBe(l.id)
    }
  })
})
