// What the extractor expects to find: one entry per source GeoJSON file, with its signature, counts and API mapping.
import type { Json } from './ast-json.ts'

export type Props = { [key: string]: Json }

export type SourceId =
  | 'proj-ukraine'
  | 'proj-oblasts'
  | 'proj-rayons'
  | 'proj-hromady'
  | 'proj-basins'
  | 'proj-grid'
  | 'obs-ukraine'
  | 'obs-oblasts'
  | 'obs-rayons'
  | 'obs-hromady'
  | 'obs-grid'
  | 'obs-stations-tm'
  | 'obs-stations-rr'
  | 'basin-names'

export interface SourceSpec {
  id: SourceId
  /** Expected feature count; null = count is recorded, not checked. */
  count: number | null
  values: 'proj' | 'obs' | null
  endpoint: 'projections' | 'historical_observations' | null
  apiKind: string | null
  /** Field(s) that feed the API `place` (from the old site's getGaugeObj + getServerParams). */
  placeField: string
  place: (p: Props) => string
  /** value_type per variable; null = this source has no series of that variable. */
  valueTypes: { temperature: string | null; precipitation: string | null }
}

const str = (v: Json | undefined) => (v === null || v === undefined ? '' : String(v))

const PROJ = { temperature: 'tas', precipitation: 'pr' }
const OBS = { temperature: 'tm', precipitation: 'rr' }

export const SOURCES: SourceSpec[] = [
  {
    id: 'proj-ukraine',
    count: 1,
    values: 'proj',
    endpoint: 'projections',
    apiKind: 'Ukraine',
    placeField: 'name_EN',
    place: (p) => str(p.name_EN),
    valueTypes: PROJ,
  },
  {
    id: 'proj-oblasts',
    count: 27,
    values: 'proj',
    endpoint: 'projections',
    apiKind: 'oblasts',
    placeField: 'NAME_LAT',
    place: (p) => str(p.NAME_LAT),
    valueTypes: PROJ,
  },
  {
    id: 'proj-rayons',
    count: 136,
    values: 'proj',
    endpoint: 'projections',
    apiKind: 'rayons',
    placeField: 'COD_2',
    place: (p) => str(p.COD_2),
    valueTypes: PROJ,
  },
  {
    id: 'proj-hromady',
    count: 1779,
    values: 'proj',
    endpoint: 'projections',
    apiKind: 'terhromads',
    placeField: 'COD_3',
    place: (p) => str(p.COD_3),
    valueTypes: PROJ,
  },
  {
    id: 'proj-basins',
    count: 13,
    values: 'proj',
    endpoint: 'projections',
    apiKind: 'basins',
    placeField: 'Subbasin_eng || Basin',
    place: (p) => str(p.Subbasin_eng) || str(p.Basin),
    valueTypes: PROJ,
  },
  {
    id: 'proj-grid',
    count: 6221,
    values: null,
    endpoint: 'projections',
    apiKind: 'nodes',
    placeField: 'id',
    place: (p) => str(p.id),
    valueTypes: PROJ,
  },
  {
    id: 'obs-ukraine',
    count: 1,
    values: 'obs',
    endpoint: 'historical_observations',
    apiKind: 'Ukraine',
    placeField: '"Ukraine" (constant)',
    place: () => 'Ukraine',
    valueTypes: OBS,
  },
  {
    id: 'obs-oblasts',
    count: 27,
    values: 'obs',
    endpoint: 'historical_observations',
    apiKind: 'oblasts',
    placeField: 'NAME_LAT',
    place: (p) => str(p.NAME_LAT),
    valueTypes: OBS,
  },
  {
    id: 'obs-rayons',
    count: 136,
    values: 'obs',
    endpoint: 'historical_observations',
    apiKind: 'rayons',
    placeField: 'COD_2',
    place: (p) => str(p.COD_2),
    valueTypes: OBS,
  },
  {
    id: 'obs-hromady',
    count: 1779,
    values: 'obs',
    endpoint: 'historical_observations',
    apiKind: 'terhromads',
    placeField: 'COD_3',
    place: (p) => str(p.COD_3),
    valueTypes: OBS,
  },
  {
    id: 'obs-grid',
    count: 7364,
    values: null,
    endpoint: 'historical_observations',
    apiKind: 'nodes',
    placeField: 'id',
    place: (p) => str(p.id),
    valueTypes: OBS,
  },
  {
    id: 'obs-stations-tm',
    count: null,
    values: null,
    endpoint: 'historical_observations',
    apiKind: 'meteostations',
    placeField: 'station',
    place: (p) => str(p.station),
    valueTypes: { temperature: 'tm', precipitation: null },
  },
  {
    id: 'obs-stations-rr',
    count: null,
    values: null,
    endpoint: 'historical_observations',
    apiKind: 'meteostations',
    placeField: 'station',
    place: (p) => str(p.station),
    valueTypes: { temperature: null, precipitation: 'rr' },
  },
  {
    id: 'basin-names',
    count: 13,
    values: null,
    endpoint: null,
    apiKind: null,
    placeField: '—',
    place: () => '',
    valueTypes: { temperature: null, precipitation: null },
  },
]

export const SEASONS = ['winter', 'spring', 'summer', 'autumn'] as const

export function decades(from: number, to: number): string[] {
  const out: string[] = []
  for (let y = from; y < to; y += 10) out.push(`${y}_${y + 9}`)
  return out
}

/** All 240 projection value fields, e.g. `tmp_rcp45_anom_winter_2041_2050`. */
export function projectionFields(): string[] {
  const out: string[] = []
  for (const v of ['tmp', 'pcp'])
    for (const rcp of ['rcp45', 'rcp85'])
      for (const s of ['', ...SEASONS])
        for (const d of decades(1981, 2100)) out.push(`${v}_${rcp}_anom${s ? `_${s}` : ''}_${d}`)
  return out
}

/** All 70 observation value fields, e.g. `Tm_summer_observed_anom_1991_2000`. */
export function observationFields(): string[] {
  const out: string[] = []
  for (const v of ['Tm', 'RR'])
    for (const s of ['', ...SEASONS])
      for (const d of decades(1951, 2020)) out.push(`${v}${s ? `_${s}` : ''}_observed_anom_${d}`)
  return out
}
