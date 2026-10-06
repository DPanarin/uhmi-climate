// Map settings: basemap (swappable), bounds and zoom limits.

const CARTO_KEY = import.meta.env.VITE_CARTO_KEY ?? ''

export const BASEMAP = {
  // Same basemap as the old site (CARTO light, no labels) with its key from .env.local; @2x for sharpness.
  tiles: ['a', 'b', 'c', 'd'].map(
    (s) => `https://${s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png?key=${CARTO_KEY}`,
  ),
  tileSize: 256,
  attribution:
    '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
}

/** Ukraine with a small margin: [west, south, east, north]. */
export const UKRAINE_BOUNDS: [number, number, number, number] = [22.1, 44.3, 40.3, 52.4]

export const MIN_ZOOM = 5
export const MAX_ZOOM = 11

/** Glyphs for point labels, self-hosted (Open Sans Semibold, Latin + Cyrillic ranges only). */
export const GLYPHS = `${location.origin}${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`
export const LABEL_FONT = ['Open Sans Semibold']
