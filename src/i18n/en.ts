import type uk from './uk'

const en: typeof uk = {
  app: {
    title: 'Climate change in Ukraine',
    institute: 'Ukrainian Hydrometeorological Institute',
    instituteSub: '',
    lab: 'River Systems Modelling Laboratory',
    loading: 'Loading…',
    loadError: 'Could not load data',
  },
  view: {
    dataset: 'Data',
    variable: 'Variable',
    level: 'Territory',
    scenario: 'Scenario',
    season: 'Season',
    decade: 'Period',
    language: 'Language',
    exportPng: 'Save PNG',
  },
  scenarios: {
    rcp45: 'RCP4.5',
    rcp85: 'RCP8.5',
  },
  seasons: {
    annual: 'Year',
    winter: 'Winter',
    spring: 'Spring',
    summer: 'Summer',
    autumn: 'Autumn',
  },
  names: {
    hromada: '{name} territorial community',
    point: 'Latitude: {lat}, Longitude: {lon}',
  },
  map: {
    noData: 'no data',
    pointsHint: 'Tap a point to see its series',
    chartSoon: 'The chart will appear here',
    close: 'Close',
  },
  controls: {
    open: 'Map settings',
    title: 'Settings',
    search: 'Search territory',
    searchPlaceholder: 'Oblast, rayon, community…',
    searchLoading: 'Loading the list…',
    noResults: 'Nothing found',
    datasetShort: { proj: 'Projections', obs: 'Observations' },
    datasetHint: {
      proj: 'Euro-CORDEX climate projections, 1981–2100',
      obs: 'Historical observations, 1946–2020',
    },
    variableShort: { tas: 'Temperature', pr: 'Precipitation' },
    scenarioHint: {
      rcp45: 'RCP4.5 — medium emissions scenario',
      rcp85: 'RCP8.5 — high emissions scenario',
    },
    onlyProj: 'projections only',
    onlyObs: 'observations only',
    general: 'General',
    showStepper: 'Show the period stepper on the map',
    about: 'About',
    aboutText:
      'A prototype of a new interface for climate.uhmi.org.ua. The map shows the change in air temperature and precipitation relative to a baseline period: Euro-CORDEX climate projections under RCP4.5 and RCP8.5 (1981–2100) and historical observations (1946–2020). Click a territory to see its time series.',
    close: 'Close',
  },
  info: {
    open: 'Additional information',
    title: 'Additional information',
    description: 'Citation, data sources, climate models and glossary',
    link: 'Citation, data sources and glossary',
  },
  levels: {
    ukraine: 'Ukraine',
    oblasts: 'Oblasts',
    rayons: 'Rayons',
    hromady: 'Communities',
    basins: 'Basins',
    grid: 'Grid',
    stations: 'Weather stations',
  },
  levelOne: {
    oblasts: 'oblast',
    rayons: 'rayon',
    hromady: 'community',
    basins: 'basin',
    stations: 'weather station',
  },
  stepper: {
    label: 'Period',
    prev: 'Previous period',
    next: 'Next period',
    play: 'Play through the decades',
    pause: 'Pause',
  },
  datasets: {
    proj: 'Climate projections (Euro-CORDEX)',
    obs: 'Historical observations',
  },
  variables: {
    tas: 'Air temperature',
    pr: 'Precipitation',
  },
  charts: {
    tas: 'Air temperature, °С',
    pr: 'Precipitation, mm',
  },
  layers: {
    proj: {
      ukraine: 'Ukraine',
      oblasts: 'Administrative oblasts',
      rayons: 'Administrative rayons',
      hromady: 'Territorial communities',
      basins: 'River basins',
      grid: 'Grid 0.11x0.11°',
    },
    obs: {
      ukraine: 'Ukraine (1946-2020)',
      oblasts: 'Administrative oblasts (1946-2020)',
      rayons: 'Administrative rayons (1946-2020)',
      hromady: 'Territorial communities (1946-2020)',
      grid: 'Grid 0.1x0.1°',
      stations: 'Meteorological stations (1946-2020)',
    },
  },
  legend: {
    tas: 'Air temperature change over {baseline}, °C',
    pr: 'Precipitation change over {baseline}, %',
  },
}

export default en
