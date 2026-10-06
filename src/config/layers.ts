// Layer catalogue — the only module that knows individual layers.
// P1: facts extracted from climate.uhmi.org.ua (data-raw/config.json, report.md) and checked by hand.
// P3 extends it with geometry/value file names from public/data/index.json.

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
  /** Map values come from the extracted files; point layers have values only via the API. */
  hasMapValues: boolean
  apiKind: string
  /** Source GeoJSON field that becomes the feature id and the API `place`. */
  placeField: string
  /** Source file(s) in data-raw/geojson; stations use a different point set per variable. */
  source: string | Record<VariableId, string>
  /** i18n key of the layer name (strings from the old site's vizItem config). */
  labelKey: string
}

const layer = (l: Omit<Layer, 'id' | 'labelKey'>): Layer => ({
  ...l,
  id: `${l.dataset}-${l.level}`,
  labelKey: `layers.${l.dataset}.${l.level}`,
})

export const LAYERS: Layer[] = [
  layer({
    dataset: 'proj',
    level: 'ukraine',
    kind: 'polygon',
    hasMapValues: true,
    apiKind: 'Ukraine',
    placeField: 'name_EN',
    source: 'proj-ukraine',
  }),
  layer({
    dataset: 'proj',
    level: 'oblasts',
    kind: 'polygon',
    hasMapValues: true,
    apiKind: 'oblasts',
    placeField: 'NAME_LAT',
    source: 'proj-oblasts',
  }),
  layer({
    dataset: 'proj',
    level: 'rayons',
    kind: 'polygon',
    hasMapValues: true,
    apiKind: 'rayons',
    placeField: 'COD_2',
    source: 'proj-rayons',
  }),
  layer({
    dataset: 'proj',
    level: 'hromady',
    kind: 'polygon',
    hasMapValues: true,
    apiKind: 'terhromads',
    placeField: 'COD_3',
    source: 'proj-hromady',
  }),
  layer({
    dataset: 'proj',
    level: 'basins',
    kind: 'polygon',
    hasMapValues: true,
    apiKind: 'basins',
    placeField: 'Subbasin_eng || Basin',
    source: 'proj-basins',
  }),
  layer({
    dataset: 'proj',
    level: 'grid',
    kind: 'point',
    hasMapValues: false,
    apiKind: 'nodes',
    placeField: 'id',
    source: 'proj-grid',
  }),
  layer({
    dataset: 'obs',
    level: 'ukraine',
    kind: 'polygon',
    hasMapValues: true,
    apiKind: 'Ukraine',
    placeField: '"Ukraine"',
    source: 'obs-ukraine',
  }),
  layer({
    dataset: 'obs',
    level: 'oblasts',
    kind: 'polygon',
    hasMapValues: true,
    apiKind: 'oblasts',
    placeField: 'NAME_LAT',
    source: 'obs-oblasts',
  }),
  layer({
    dataset: 'obs',
    level: 'rayons',
    kind: 'polygon',
    hasMapValues: true,
    apiKind: 'rayons',
    placeField: 'COD_2',
    source: 'obs-rayons',
  }),
  layer({
    dataset: 'obs',
    level: 'hromady',
    kind: 'polygon',
    hasMapValues: true,
    apiKind: 'terhromads',
    placeField: 'COD_3',
    source: 'obs-hromady',
  }),
  layer({
    dataset: 'obs',
    level: 'grid',
    kind: 'point',
    hasMapValues: false,
    apiKind: 'nodes',
    placeField: 'id',
    source: 'obs-grid',
  }),
  layer({
    dataset: 'obs',
    level: 'stations',
    kind: 'point',
    hasMapValues: false,
    apiKind: 'meteostations',
    placeField: 'station',
    source: { tas: 'obs-stations-tm', pr: 'obs-stations-rr' },
  }),
]

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
  // Old site: observation polygons are tinted with the projection fill range, while their legend uses the
  // observation range — so map and legend disagree there. Kept 1:1 until decided at CP1.
  obs: {
    tas: {
      step: 0.5,
      unit: '°C',
      negative: BLUE,
      positive: RED,
      fill: { min: -1, max: 6.4 },
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
      fill: { min: -42, max: 50 },
      legend: {
        rcp45: { start: -35, end: 109 },
        rcp85: { start: -35, end: 109 },
        observed: { start: -35, end: 109 },
      },
    },
  },
}
