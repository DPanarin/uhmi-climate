import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VIEW,
  nearestDecade,
  normalizeView,
  parseQuery,
  toQuery,
  viewFromQuery,
  type ViewState,
} from './view-rules'

describe('URL ↔ view', () => {
  it('round-trips a full view', () => {
    const v: ViewState = {
      ds: 'proj',
      lvl: 'hromady',
      var: 'pr',
      rcp: 'rcp45',
      season: 'winter',
      dec: '2041-2050',
      place: 'UA46060250000025047',
      lang: 'en',
      bm: 'topo',
      basins: true,
    }
    const q = toQuery(v)
    expect(q).toEqual({
      ds: 'proj',
      lvl: 'hromady',
      var: 'pr',
      rcp: '45',
      season: 'winter',
      dec: '2041-2050',
      place: 'UA46060250000025047',
      lang: 'en',
      bm: 'topo',
      basins: '1',
    })
    expect(viewFromQuery(q)).toEqual(v)
  })

  it('omits empty place and the default language', () => {
    expect(toQuery(DEFAULT_VIEW)).not.toHaveProperty('place')
    expect(toQuery(DEFAULT_VIEW)).not.toHaveProperty('lang')
    expect(toQuery(DEFAULT_VIEW)).not.toHaveProperty('bm')
    expect(toQuery(DEFAULT_VIEW)).not.toHaveProperty('basins')
    expect(parseQuery({ bm: 'satellite', basins: 'yes' })).toEqual({})
  })

  it('ignores unknown and malformed values', () => {
    expect(
      parseQuery({ ds: 'x', lvl: 'planet', rcp: '26', dec: '2041', season: 'monsoon', foo: '1' }),
    ).toEqual({})
    expect(viewFromQuery({})).toEqual(DEFAULT_VIEW)
  })

  it('takes the first value of repeated parameters', () => {
    expect(parseQuery({ var: ['pr', 'tas'] })).toEqual({ var: 'pr' })
  })
})

describe('normalizeView', () => {
  it('replaces levels the dataset does not have with oblasts', () => {
    expect(normalizeView({ ...DEFAULT_VIEW, ds: 'obs', lvl: 'basins' }).lvl).toBe('oblasts')
    expect(normalizeView({ ...DEFAULT_VIEW, ds: 'proj', lvl: 'stations' }).lvl).toBe('oblasts')
    expect(normalizeView({ ...DEFAULT_VIEW, ds: 'obs', lvl: 'grid' }).lvl).toBe('grid')
  })

  it('moves the decade to the nearest one in the dataset', () => {
    expect(nearestDecade('2041-2050', 'obs')).toBe('2011-2020')
    expect(nearestDecade('1951-1960', 'proj')).toBe('1981-1990')
    expect(nearestDecade('1991-2000', 'obs')).toBe('1991-2000')
    expect(normalizeView({ ...DEFAULT_VIEW, ds: 'obs', dec: '2091-2100' }).dec).toBe('2011-2020')
  })

  it('drops the place when the level changes, keeps it otherwise', () => {
    const prev = { ...DEFAULT_VIEW, place: 'Kyivska' }
    expect(normalizeView({ ...prev, season: 'summer' }, prev).place).toBe('Kyivska')
    expect(normalizeView({ ...prev, lvl: 'rayons' }, prev).place).toBeNull()
    // dataset switch keeps the same level, so the place survives
    expect(normalizeView({ ...prev, ds: 'obs' }, prev).place).toBe('Kyivska')
  })

  it('drops a station when the variable switches the station set', () => {
    const prev: ViewState = { ...DEFAULT_VIEW, ds: 'obs', lvl: 'stations', place: 'Kyiv' }
    expect(normalizeView({ ...prev, var: 'pr' }, prev).place).toBeNull()
  })
})
