// Layer catalogue — the only module that knows individual layers.
// P1: facts extracted from climate.uhmi.org.ua (data-raw/config.json, report.md) and checked by hand.

export type DatasetId = 'proj' | 'obs'
export type LevelId = 'ukraine' | 'oblasts' | 'rayons' | 'hromady' | 'basins' | 'grid' | 'stations'
export type VariableId = 'tas' | 'pr'
export type Scenario = 'rcp45' | 'rcp85'
export type Season = 'annual' | 'winter' | 'spring' | 'summer' | 'autumn'

export const SEASONS: Season[] = ['annual', 'winter', 'spring', 'summer', 'autumn']
export const SCENARIOS: Scenario[] = ['rcp45', 'rcp85']
export const VARIABLES: VariableId[] = ['tas', 'pr']

const decadesFrom = (from: number, to: number) =>
  Array.from({ length: (to - from + 1) / 10 }, (_, i) => `${from + i * 10}-${from + i * 10 + 9}`)

export interface Dataset {
  id: DatasetId
  endpoint: 'projections' | 'historical_observations'
  decades: string[]
  /** Anomaly baseline shown in the legend title (old site: projections 1981–2010, observations 1961–1990). */
  baseline: string
  /** API value_type per variable; observed temperature asks for mean, min and max, as the old site does. */
  valueTypes: Record<VariableId, string[]>
}

export const DATASETS: Record<DatasetId, Dataset> = {
  proj: {
    id: 'proj',
    endpoint: 'projections',
    decades: decadesFrom(1981, 2100), // 12
    baseline: '1981-2010',
    valueTypes: { tas: ['tas'], pr: ['pr'] },
  },
  obs: {
    id: 'obs',
    endpoint: 'historical_observations',
    decades: decadesFrom(1951, 2020), // 7
    baseline: '1961-1990',
    valueTypes: { tas: ['tm', 'tn', 'tx'], pr: ['rr'] },
  },
}

export interface Layer {
  id: `${DatasetId}-${LevelId}`
  dataset: DatasetId
  level: LevelId
  kind: 'polygon' | 'point'
  /** API `kind`; the feature id is the API `place` (except stations, which carry `place`). */
  apiKind: string
  /** Logical file name in public/data/index.json; stations use a different point set per variable. */
  geometry: string | Record<VariableId, string>
  /** Polygons have map values in `values/<dataset>/<level>/<variable>`; points only via the API. */
  hasValues: boolean
  /** i18n key of the layer name (strings from the old site's vizItem config). */
  labelKey: string
}

const polygon = (dataset: DatasetId, level: LevelId, apiKind: string): Layer => ({
  id: `${dataset}-${level}`,
  dataset,
  level,
  kind: 'polygon',
  apiKind,
  geometry: `geo/${level}`,
  hasValues: true,
  labelKey: `layers.${dataset}.${level}`,
})

const point = (
  dataset: DatasetId,
  level: LevelId,
  apiKind: string,
  geometry: Layer['geometry'],
): Layer => ({
  id: `${dataset}-${level}`,
  dataset,
  level,
  kind: 'point',
  apiKind,
  geometry,
  hasValues: false,
  labelKey: `layers.${dataset}.${level}`,
})

// place fields (P1 report): Ukraine "Ukraine", oblasts NAME_LAT, rayons COD_2, hromady COD_3,
// basins Subbasin_eng || Basin, grid id, stations station name.
export const LAYERS: Layer[] = [
  polygon('proj', 'ukraine', 'Ukraine'),
  polygon('proj', 'oblasts', 'oblasts'),
  polygon('proj', 'rayons', 'rayons'),
  polygon('proj', 'hromady', 'terhromads'),
  polygon('proj', 'basins', 'basins'),
  point('proj', 'grid', 'nodes', 'points/proj-grid'),
  polygon('obs', 'ukraine', 'Ukraine'),
  polygon('obs', 'oblasts', 'oblasts'),
  polygon('obs', 'rayons', 'rayons'),
  polygon('obs', 'hromady', 'terhromads'),
  point('obs', 'grid', 'nodes', 'points/obs-grid'),
  point('obs', 'stations', 'meteostations', {
    tas: 'points/obs-stations-tm',
    pr: 'points/obs-stations-rr',
  }),
]

export const LEVELS: LevelId[] = [
  'ukraine',
  'oblasts',
  'rayons',
  'hromady',
  'basins',
  'grid',
  'stations',
]

export function findLayer(dataset: DatasetId, level: LevelId): Layer | undefined {
  return LAYERS.find((l) => l.dataset === dataset && l.level === level)
}

export const geometryFile = (layer: Layer, variable: VariableId) =>
  typeof layer.geometry === 'string' ? layer.geometry : layer.geometry[variable]

export const valuesFile = (layer: Layer, variable: VariableId) =>
  layer.hasValues ? `values/${layer.dataset}/${layer.level}/${variable}` : null

/**
 * Colour scale as on the old site: not classed. A value gets the "negative" or "positive" colour
 * with alpha = |value| / max(|min|, |max|) of `fill`. The legend shows labels from `legend.start`
 * to `legend.end` in `step`s, coloured the same way. Precipitation swaps the colours (dry = red).
 */
export interface Scale {
  step: number
  unit: '°C' | '%'
  negative: string
  positive: string
  /** Range that sets the colour intensity on the map. */
  fill: { min: number; max: number }
  /** Range of legend labels, per scenario for projections. */
  legend: Record<Scenario | 'observed', { start: number; end: number }>
}

const BLUE = 'rgb(7, 47, 97)'
const RED = 'rgb(105, 0, 33)'

// Ranges from the old site's range modules (report.md → "Config from the old site").
export const SCALES: Record<DatasetId, Record<VariableId, Scale>> = {
  proj: {
    tas: {
      step: 0.5,
      unit: '°C',
      negative: BLUE,
      positive: RED,
      fill: { min: -1, max: 6.4 },
      legend: {
        rcp45: { start: -1, end: 3.5 },
        rcp85: { start: -1, end: 6.4 },
        observed: { start: -1, end: 6.4 },
      },
    },
    pr: {
      step: 5,
      unit: '%',
      negative: RED,
      positive: BLUE,
      fill: { min: -42, max: 50 },
      legend: {
        rcp45: { start: -42, end: 25 },
        rcp85: { start: -42, end: 50 },
        observed: { start: -42, end: 50 },
      },
    },
  },
  // Old site tints observation polygons with the projection range, so map and legend disagree.
  // Decided at CP1: observations use their own range for the fill too.
  obs: {
    tas: {
      step: 0.5,
      unit: '°C',
      negative: BLUE,
      positive: RED,
      fill: { min: -1.4, max: 2.7 },
      legend: {
        rcp45: { start: -1.4, end: 2.7 },
        rcp85: { start: -1.4, end: 2.7 },
        observed: { start: -1.4, end: 2.7 },
      },
    },
    pr: {
      step: 10,
      unit: '%',
      negative: RED,
      positive: BLUE,
      fill: { min: -35, max: 109 },
      legend: {
        rcp45: { start: -35, end: 109 },
        rcp85: { start: -35, end: 109 },
        observed: { start: -35, end: 109 },
      },
    },
  },
}
