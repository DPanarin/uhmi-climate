// Step 6: checks on the extracted collections; every failed check makes the script exit non-zero.
import type { Json } from './ast-json.ts'
import {
  observationFields,
  projectionFields,
  SOURCES,
  type Props,
  type SourceId,
} from './layers.ts'

export interface Feature {
  type: string
  properties: Props
  geometry: { type: string; coordinates: Json } | null
}

export interface Check {
  name: string
  ok: boolean
  detail: string
  /** Passes, but needs a decision (shown as "warn" in the report). */
  warn?: boolean
}

export interface VariableStats {
  source: SourceId
  variable: string
  min: number
  max: number
  values: number
  empty: number
}

// Generous bounding box around Ukraine (lon, lat); the Dnipro/Desna basins and the projection grid reach ~55.9°N.
const BBOX = { minLon: 20, maxLon: 42, minLat: 43, maxLat: 56.5 }

export function variableOf(field: string): string {
  const m = field.match(/^(tmp|pcp)_(rcp\d\d)_/) ?? field.match(/^(Tm|RR)_/)
  return m ? m.slice(1).join('_') : '?'
}

export function valueStats(id: SourceId, features: Feature[], fields: string[]): VariableStats[] {
  const stats = new Map<string, VariableStats>()
  for (const f of features) {
    for (const field of fields) {
      const variable = variableOf(field)
      let s = stats.get(variable)
      if (!s)
        stats.set(
          variable,
          (s = { source: id, variable, min: Infinity, max: -Infinity, values: 0, empty: 0 }),
        )
      const v = f.properties[field]
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        s.empty++
        continue
      }
      s.values++
      s.min = Math.min(s.min, v)
      s.max = Math.max(s.max, v)
    }
  }
  return [...stats.values()]
}

/** Structural geometry check: known type, finite coordinates inside the bbox, rings closed with ≥ 4 points. */
export function geometryProblems(features: Feature[]): string[] {
  const problems: string[] = []
  const pointOk = (p: Json) =>
    Array.isArray(p) &&
    p.length >= 2 &&
    typeof p[0] === 'number' &&
    typeof p[1] === 'number' &&
    p[0] >= BBOX.minLon &&
    p[0] <= BBOX.maxLon &&
    p[1] >= BBOX.minLat &&
    p[1] <= BBOX.maxLat
  const ringOk = (ring: Json) => {
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every(pointOk)) return false
    const a = ring[0] as number[]
    const b = ring[ring.length - 1] as number[]
    return a[0] === b[0] && a[1] === b[1]
  }
  features.forEach((f, i) => {
    const g = f.geometry
    const c = g?.coordinates
    let ok = false
    if (g?.type === 'Point') ok = pointOk(c ?? null)
    else if (g?.type === 'Polygon') ok = Array.isArray(c) && c.length > 0 && c.every(ringOk)
    else if (g?.type === 'MultiPolygon')
      ok =
        Array.isArray(c) &&
        c.length > 0 &&
        c.every((poly) => Array.isArray(poly) && poly.length > 0 && poly.every(ringOk))
    if (!ok) problems.push(`feature #${i} (${g?.type ?? 'no geometry'})`)
  })
  return problems
}

export function validate(collections: Map<SourceId, Feature[]>): {
  checks: Check[]
  stats: VariableStats[]
} {
  const checks: Check[] = []
  const stats: VariableStats[] = []
  const proj = projectionFields()
  const obs = observationFields()

  for (const spec of SOURCES) {
    const features = collections.get(spec.id)
    if (!features) {
      checks.push({
        name: `${spec.id}: found`,
        ok: false,
        detail: 'collection not found in any chunk',
      })
      continue
    }
    checks.push({
      name: `${spec.id}: feature count`,
      ok: spec.count === null || features.length === spec.count,
      detail:
        spec.count === null
          ? `${features.length} (recorded)`
          : `${features.length} / expected ${spec.count}`,
    })

    if (spec.values) {
      const fields = spec.values === 'proj' ? proj : obs
      const missing = features.filter((f) => fields.some((k) => !(k in f.properties))).length
      checks.push({
        name: `${spec.id}: all ${fields.length} value fields present`,
        ok: missing === 0,
        detail: missing ? `${missing} features miss fields` : 'yes',
      })
      stats.push(...valueStats(spec.id, features, fields))
    }

    const places = features.map((f) => spec.place(f.properties))
    if (spec.apiKind) {
      const empty = places.filter((p) => !p).length
      const dupes = [...new Set(places.filter((p, i) => places.indexOf(p) !== i))]
      // Stations are keyed by name in the API; a repeated name is a known source issue, not an extraction error.
      const tolerated = spec.apiKind === 'meteostations'
      checks.push({
        name: `${spec.id}: place key (${spec.placeField}) set and unique`,
        ok: empty === 0 && (dupes.length === 0 || tolerated),
        warn: dupes.length > 0 && tolerated,
        detail: `${empty} empty, ${dupes.length} duplicated${dupes.length ? `: ${dupes.join(', ')}` : ''}`,
      })
    }

    const bad = geometryProblems(features)
    checks.push({
      name: `${spec.id}: geometry valid`,
      ok: bad.length === 0,
      detail: bad.length ? `${bad.length} bad: ${bad.slice(0, 3).join('; ')}` : 'yes',
    })
  }

  // Ukrainian names written with Latin look-alike letters (а/a, о/o, р/p, е/e) break search; fixed in P2.
  const nameFields = [
    'ADMIN_1',
    'ADMIN_2',
    'ADMIN_3',
    'NAME_UA',
    'St_UA',
    'Basin',
    'Subbasin',
    'name_UA',
  ]
  for (const spec of SOURCES) {
    const features = collections.get(spec.id) ?? []
    const mixed = features.filter((f) =>
      nameFields.some((k) => {
        const v = f.properties[k]
        return typeof v === 'string' && /[а-яіїєґ]/i.test(v) && /[a-z]/i.test(v)
      }),
    ).length
    if (mixed) {
      checks.push({
        name: `${spec.id}: Ukrainian names use Cyrillic only`,
        ok: true,
        warn: true,
        detail: `${mixed} features have Latin look-alike letters in Ukrainian names`,
      })
    }
  }

  // Projections and observations should share geometry, so P2 can store each level once.
  const keyOf: Record<string, (p: Props) => string> = {
    ukraine: () => 'UA',
    oblasts: (p) => String(p.NAME_LAT),
    rayons: (p) => String(p.COD_2),
    hromady: (p) => String(p.COD_3),
  }
  for (const [level, key] of Object.entries(keyOf)) {
    const a = collections.get(`proj-${level}` as SourceId)
    const b = collections.get(`obs-${level}` as SourceId)
    if (!a || !b) continue
    const other = new Map(b.map((f) => [key(f.properties), JSON.stringify(f.geometry)]))
    const same = a.filter((f) => other.get(key(f.properties)) === JSON.stringify(f.geometry)).length
    const unmatched = a.filter((f) => !other.has(key(f.properties))).length
    checks.push({
      name: `${level}: identical geometry in projections and observations`,
      ok: same === a.length && a.length === b.length,
      detail: `${same} / ${a.length} identical, ${unmatched} without a match`,
    })
  }

  return { checks, stats }
}
