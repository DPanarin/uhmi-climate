import type uk from './uk'

const en: typeof uk = {
  app: {
    title: 'Climate change in Ukraine',
    placeholder: 'Prototype in progress',
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
