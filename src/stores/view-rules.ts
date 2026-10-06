// View state ↔ URL, and the rules that keep a view valid. Pure functions (unit-tested).
import {
  DATASETS,
  LEVELS,
  SEASONS,
  findLayer,
  type DatasetId,
  type LevelId,
  type Scenario,
  type Season,
  type VariableId,
} from '@/config/layers'
import { BASEMAP_IDS, type BasemapId } from '@/config/map'

export type Lang = 'uk' | 'en'

export interface ViewState {
  ds: DatasetId
  lvl: LevelId
  var: VariableId
  rcp: Scenario
  season: Season
  dec: string
  place: string | null
  lang: Lang
  /** Basemap. */
  bm: BasemapId
  /** River basin outlines over the map. */
  basins: boolean
}

/** Defaults as on the old site: temperature, RCP8.5, annual, 2011–2020; oblasts as the first layer. */
export const DEFAULT_VIEW: ViewState = {
  ds: 'proj',
  lvl: 'oblasts',
  var: 'tas',
  rcp: 'rcp85',
  season: 'annual',
  dec: '2011-2020',
  place: null,
  lang: 'uk',
  bm: 'carto',
  basins: false,
}

type Query = Record<string, string | null | (string | null)[] | undefined>

const first = (v: Query[string]) => (Array.isArray(v) ? v[0] : v) ?? undefined
const oneOf = <T extends string>(v: string | undefined, options: readonly T[]) =>
  options.includes(v as T) ? (v as T) : undefined

/** Reads known parameters; unknown or malformed values are dropped (defaults fill them in later). */
export function parseQuery(q: Query): Partial<ViewState> {
  const out: Partial<ViewState> = {}
  const ds = oneOf(first(q.ds), ['proj', 'obs'] as const)
  if (ds) out.ds = ds
  const lvl = oneOf(first(q.lvl), LEVELS)
  if (lvl) out.lvl = lvl
  const v = oneOf(first(q.var), ['tas', 'pr'] as const)
  if (v) out.var = v
  const rcp = oneOf(first(q.rcp), ['45', '85'] as const)
  if (rcp) out.rcp = `rcp${rcp}`
  const season = oneOf(first(q.season), SEASONS)
  if (season) out.season = season
  const dec = first(q.dec)
  if (dec && /^\d{4}-\d{4}$/.test(dec)) out.dec = dec
  const place = first(q.place)
  if (place) out.place = place
  const lang = oneOf(first(q.lang), ['uk', 'en'] as const)
  if (lang) out.lang = lang
  const bm = oneOf(first(q.bm), BASEMAP_IDS)
  if (bm) out.bm = bm
  if (first(q.basins) === '1') out.basins = true
  return out
}

export function toQuery(v: ViewState): Record<string, string> {
  const q: Record<string, string> = {
    ds: v.ds,
    lvl: v.lvl,
    var: v.var,
    rcp: v.rcp.slice(3),
    season: v.season,
    dec: v.dec,
  }
  if (v.place) q.place = v.place
  if (v.lang !== 'uk') q.lang = v.lang
  if (v.bm !== 'carto') q.bm = v.bm
  if (v.basins) q.basins = '1'
  return q
}

/** Nearest decade of a dataset by start year (e.g. 2041-2050 in observations → 2011-2020). */
export function nearestDecade(dec: string, ds: DatasetId): string {
  const decades = DATASETS[ds].decades
  if (decades.includes(dec)) return dec
  const year = Number(dec.slice(0, 4))
  return decades.reduce((best, d) =>
    Math.abs(Number(d.slice(0, 4)) - year) < Math.abs(Number(best.slice(0, 4)) - year) ? d : best,
  )
}

/**
 * Makes any combination valid: a level the dataset doesn't have becomes oblasts (basins exist only
 * in projections, stations only in observations); the decade moves to the nearest available one.
 * A place is dropped when the level changes, since ids differ between levels.
 */
export function normalizeView(next: ViewState, prev?: ViewState): ViewState {
  const v = { ...next }
  if (!findLayer(v.ds, v.lvl)) v.lvl = 'oblasts'
  v.dec = nearestDecade(v.dec, v.ds)
  if (prev && (prev.lvl !== v.lvl || (prev.lvl === 'stations' && prev.var !== v.var)))
    v.place = null
  return v
}

export function viewFromQuery(q: Query): ViewState {
  return normalizeView({ ...DEFAULT_VIEW, ...parseQuery(q) })
}
