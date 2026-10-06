import { describe, expect, it } from 'vitest'
import { normalize, search, searchableLevels, type SearchEntry } from './search'

const box: SearchEntry['bbox'] = [30, 50, 31, 51]
const entries: SearchEntry[] = [
  { id: 'Lvivska', level: 'oblasts', uk: 'Львівська область', en: 'Lvivska Oblast', bbox: box },
  {
    id: 'UA46060000000042587',
    level: 'rayons',
    uk: 'Львівський район',
    en: 'Lvivskyi raion',
    oblast: 'Lvivska',
    bbox: box,
  },
  {
    id: 'UA46060250000025047',
    level: 'hromady',
    uk: 'Львівська',
    en: 'Lvivska',
    oblast: 'Lvivska',
    bbox: box,
  },
  {
    id: 'UA68040000000000001',
    level: 'hromady',
    uk: 'Кам’янець-Подільська',
    en: "Kam'yanets-Podilska",
    oblast: 'Khmelnytska',
    bbox: box,
  },
  {
    id: 'UA05000000000000001',
    level: 'hromady',
    uk: 'Новий Львів',
    en: 'Novyi Lviv',
    oblast: 'Vinnytska',
    bbox: box,
  },
  {
    id: 'Upper Dnipro Subbasin',
    level: 'basins',
    uk: 'Суббасейн Верхнього Дніпра',
    en: 'Upper Dnipro Subbasin',
    bbox: box,
  },
  {
    id: 'Lviv',
    level: 'stations',
    uk: 'Львів',
    en: 'Lviv',
    vars: ['tas', 'pr'],
    oblast: 'Lvivska',
    bbox: box,
  },
]

describe('normalize', () => {
  it('ignores case and all apostrophe forms', () => {
    expect(normalize('Кам’янець')).toBe('камянець')
    expect(normalize("КАМ'ЯНЕЦЬ")).toBe('камянець')
    expect(normalize('камʼянець')).toBe('камянець')
    expect(normalize('  Нова   Ушиця ')).toBe('нова ушиця')
  })
})

describe('search', () => {
  it('finds a hromada from its first 3 letters', () => {
    const ids = search(entries, 'кам', 'proj').map((h) => h.entry.id)
    expect(ids).toEqual(['UA68040000000000001'])
  })

  it('matches apostrophes in any form and English names', () => {
    expect(search(entries, 'камʼян', 'proj')).toHaveLength(1)
    expect(search(entries, "kam'yan", 'proj')).toHaveLength(1)
    expect(search(entries, 'kamyan', 'proj')).toHaveLength(1)
  })

  it('ranks name starts, then word starts, then level order', () => {
    const ids = search(entries, 'льв', 'obs').map((h) => h.entry.id)
    // obs: no basins; stations included; "Новий Львів" matches at a word start only → last
    expect(ids).toEqual([
      'Lvivska',
      'UA46060000000042587',
      'UA46060250000025047',
      'Lviv',
      'UA05000000000000001',
    ])
  })

  it('only offers levels of the current dataset', () => {
    expect(searchableLevels('proj')).toEqual(['oblasts', 'rayons', 'hromady', 'basins'])
    expect(searchableLevels('obs')).toEqual(['oblasts', 'rayons', 'hromady', 'stations'])
    expect(search(entries, 'дніпр', 'obs')).toHaveLength(0)
    expect(search(entries, 'дніпр', 'proj')).toHaveLength(1)
  })

  it('caps the number of results and ignores empty queries', () => {
    const many = Array.from({ length: 50 }, (_, i): SearchEntry => ({
      id: `h${i}`,
      level: 'hromady',
      uk: `Тест ${i}`,
      en: `Test ${i}`,
      bbox: box,
    }))
    expect(search(many, 'тест', 'proj')).toHaveLength(20)
    expect(search(many, '  ', 'proj')).toHaveLength(0)
  })
})
