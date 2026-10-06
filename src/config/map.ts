// Map settings: basemaps, bounds and zoom limits.

const CARTO_KEY = import.meta.env.VITE_CARTO_KEY ?? ''

export type BasemapId = 'carto' | 'visicom' | 'topo'

export interface Basemap {
  id: BasemapId
  tiles: string[]
  tileSize: number
  scheme?: 'xyz' | 'tms'
  maxzoom: number
  /** HTML for the map's attribution control. */
  attribution: string
  /** Plain text for PNG exports. */
  credit: string
}

const link = (href: string, text: string) =>
  `<a href="${href}" target="_blank" rel="noopener">${text}</a>`

/** The old site's three basemaps. CARTO (light, no labels) is the default; its key is in .env.local. */
export const BASEMAPS: Record<BasemapId, Basemap> = {
  carto: {
    id: 'carto',
    tiles: ['a', 'b', 'c', 'd'].map(
      (s) =>
        `https://${s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png?key=${CARTO_KEY}`,
    ),
    tileSize: 256,
    maxzoom: 19,
    attribution: `© ${link('https://www.openstreetmap.org/copyright', 'OpenStreetMap')} contributors © ${link('https://carto.com/attributions', 'CARTO')}`,
    credit: '© OpenStreetMap contributors © CARTO',
  },
  visicom: {
    id: 'visicom',
    // TMS tiles (y from the bottom), subdomains tms1–tms3; answers without a key
    tiles: ['1', '2', '3'].map(
      (s) => `https://tms${s}.visicom.ua/2.0.0/planet3/base_uk/{z}/{x}/{y}.png`,
    ),
    tileSize: 256,
    scheme: 'tms',
    maxzoom: 19,
    attribution: `Дані карт © ПрАТ «${link('https://api.visicom.ua/', 'Візіком')}»`,
    credit: 'Дані карт © ПрАТ «Візіком»',
  },
  topo: {
    id: 'topo',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    ],
    tileSize: 256,
    maxzoom: 19,
    attribution: `Tiles © ${link('https://www.esri.com/', 'Esri')} — Esri and the GIS User Community`,
    credit: 'Tiles © Esri — Esri and the GIS User Community',
  },
}
export const BASEMAP_IDS = Object.keys(BASEMAPS) as BasemapId[]

/** Ukraine with a small margin: [west, south, east, north]. */
export const UKRAINE_BOUNDS: [number, number, number, number] = [22.1, 44.3, 40.3, 52.4]

export const MIN_ZOOM = 5
export const MAX_ZOOM = 11

/** Glyphs for point labels, self-hosted (Open Sans Semibold, Latin + Cyrillic ranges only). */
export const GLYPHS = `${location.origin}${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`
export const LABEL_FONT = ['Open Sans Semibold']
