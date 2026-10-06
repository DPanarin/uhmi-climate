// Geometry: simplify polygons with mapshaper into TopoJSON, compact points, bounding boxes, overlay previews.
import mapshaper from 'mapshaper'

type Position = number[]
export interface Geometry {
  type: string
  coordinates: unknown
}
export interface Feature {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: Geometry
}
export interface FeatureCollection {
  type: 'FeatureCollection'
  features: Feature[]
}

const text = (out: Record<string, string | Uint8Array>, name: string) => {
  const v = out[name]
  if (v === undefined) throw new Error(`mapshaper produced no ${name}`)
  return typeof v === 'string' ? v : Buffer.from(v).toString('utf8')
}

/**
 * Cleans and simplifies polygons, writes TopoJSON (shared borders stored once, quantized).
 * `keep` is the share of removable vertices kept, e.g. "50%"; "100%" = no simplification.
 */
export async function toTopoJSON(
  fc: FeatureCollection,
  objectName: string,
  keep: string,
): Promise<string> {
  const simplify = keep === '100%' ? '' : `-simplify visvalingam weighted keep-shapes ${keep}`
  const out = await mapshaper.applyCommands(
    `-i ${objectName}.json -clean ${simplify} -o out.json format=topojson quantization=100000`,
    { [`${objectName}.json`]: fc },
  )
  return text(out, 'out.json')
}

/** Dissolves all polygons into one feature (Ukraine outline from oblasts). */
export async function dissolveAll(
  fc: FeatureCollection,
  properties: Record<string, unknown>,
): Promise<FeatureCollection> {
  const out = await mapshaper.applyCommands(
    '-i in.json -clean -dissolve -o out.json format=geojson',
    { 'in.json': fc },
  )
  const geo = JSON.parse(text(out, 'out.json')) as
    FeatureCollection | { type: 'GeometryCollection'; geometries: Geometry[] }
  const geometry = 'features' in geo ? geo.features[0]!.geometry : geo.geometries[0]!
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties, geometry }] }
}

export const round4 = (n: number) => Math.round(n * 1e4) / 1e4

/** Every [lon, lat] position of a Polygon / MultiPolygon / Point. */
export function* positions(g: Geometry): Generator<Position> {
  if (g.type === 'Point') {
    yield g.coordinates as Position
    return
  }
  const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as Position[][][]
  for (const poly of polys) for (const ring of poly) yield* ring
}

export function bbox(g: Geometry): [number, number, number, number] {
  let w = Infinity,
    s = Infinity,
    e = -Infinity,
    n = -Infinity
  for (const [x, y] of positions(g)) {
    w = Math.min(w, x!)
    e = Math.max(e, x!)
    s = Math.min(s, y!)
    n = Math.max(n, y!)
  }
  const r = (v: number) => Math.round(v * 1000) / 1000
  return [r(w), r(s), r(e), r(n)]
}

function inRing(x: number, y: number, ring: Position[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number]
    const [xj, yj] = ring[j] as [number, number]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function pointInPolygon([x, y]: Position, g: Geometry): boolean {
  const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as Position[][][]
  return polys.some(
    (poly) => inRing(x!, y!, poly[0]!) && !poly.slice(1).some((hole) => inRing(x!, y!, hole)),
  )
}

/** SVG with original borders (red) under simplified ones (blue) for a bbox — for the CP2 visual check. */
export function overlaySvg(
  title: string,
  box: [number, number, number, number],
  layers: { features: Feature[]; color: string; width: number }[],
  widthPx = 1400,
): string {
  const [w, s, e, n] = box
  const kx = Math.cos((((s + n) / 2) * Math.PI) / 180)
  const scale = widthPx / ((e - w) * kx)
  const heightPx = Math.round((n - s) * scale)
  const px = ([x, y]: Position) =>
    `${((x! - w) * kx * scale).toFixed(1)},${((n - y!) * scale).toFixed(1)}`
  const hit = (f: Feature) => {
    const [fw, fs, fe, fn] = bbox(f.geometry)
    return fe >= w && fw <= e && fn >= s && fs <= n
  }
  const paths = layers.map(({ features, color, width }) => {
    const d = features
      .filter(hit)
      .flatMap((f) => {
        const polys = (
          f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
        ) as Position[][][]
        return polys.flatMap((poly) => poly.map((ring) => `M${ring.map(px).join('L')}Z`))
      })
      .join('')
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round"/>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
<rect width="100%" height="100%" fill="#fff"/>${paths.join('\n')}
<text x="12" y="24" font-family="sans-serif" font-size="16">${title} — red: original, blue: simplified</text>
</svg>
`
}
