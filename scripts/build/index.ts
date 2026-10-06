// npm run data:build — data-raw/geojson → public/data (simplified geometry, values, points, search index).
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { feature as topoFeature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { Props } from '../extract/layers.ts'
import { hashedName } from './hash.ts'
import {
  bbox,
  dissolveAll,
  overlaySvg,
  pointInPolygon,
  positions,
  round4,
  toTopoJSON,
  type Feature,
  type FeatureCollection,
} from './geometry.ts'
import { fixLookalikes, hasMixedScript, oblastNames, type Names } from './names.ts'
import {
  buildValues,
  round2,
  sourceField,
  type Dataset,
  type ValueFile,
  type Variable,
} from './values.ts'

const RAW = 'data-raw'
const OUT = 'public/data'

/** Share of removable vertices kept per level, tuned by eye (CP2 overlays at zoom ~9). */
const KEEP = {
  ukraine: '100%',
  oblasts: '100%',
  rayons: '100%',
  hromady: '75%',
  basins: '100%',
} as const

/** Size targets from the plan, KB gzip. */
const TARGETS: Record<string, number> = {
  'geo/oblasts': 60,
  'geo/rayons': 250,
  'geo/hromady': 900,
  'values/proj/hromady/tas': 400,
  'values/proj/hromady/pr': 400,
  'values/obs/hromady/tas': 400,
  'values/obs/hromady/pr': 400,
  'points/proj-grid': 120,
  'points/obs-grid': 120,
}

type Level = 'ukraine' | 'oblasts' | 'rayons' | 'hromady' | 'basins'

interface Source {
  type: 'FeatureCollection'
  features: { type: 'Feature'; properties: Props; geometry: Feature['geometry'] }[]
}

const load = async (id: string) =>
  JSON.parse(await readFile(join(RAW, 'geojson', `${id}.geojson`), 'utf8')) as Source
const str = (v: unknown) =>
  typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v)
const txt = (v: unknown) => fixLookalikes(str(v).trim())

interface SearchEntry {
  id: string
  level: Level | 'stations'
  uk: string
  en: string
  oblast?: string
  /** Parent basin for subbasins */
  parent?: Names
  /** Variables a station has series for */
  vars?: Variable[]
  bbox: [number, number, number, number]
}

interface Output {
  logical: string
  ext: string
  content: string
}

async function main() {
  const outputs: Output[] = []
  const issues: string[] = []
  const notes: string[] = []
  const put = (logical: string, ext: string, data: unknown) =>
    outputs.push({ logical, ext, content: typeof data === 'string' ? data : JSON.stringify(data) })

  // ── polygons ───────────────────────────────────────────────────────────────
  const src = {
    oblasts: await load('proj-oblasts'),
    rayons: await load('proj-rayons'),
    hromady: await load('proj-hromady'),
    basins: await load('proj-basins'),
    basinNames: await load('basin-names'),
  }
  const oblastByUa = new Map(
    src.oblasts.features.map((f) => [txt(f.properties.NAME_UA), str(f.properties.NAME_LAT)]),
  )
  const oblastOf = (admin1: unknown) => {
    const name = txt(admin1).replace(/ область$/, '')
    const id = oblastByUa.get(name)
    if (!id) issues.push(`no oblast for "${txt(admin1)}"`)
    return id
  }
  const parentBasin = new Map(
    src.basinNames.features.map((f) => [
      f.properties.ID,
      { uk: txt(f.properties.Basin), en: txt(f.properties.Basin_eng) },
    ]),
  )

  // id = API place; names as on the old site's tooltip
  const levels: Record<
    Exclude<Level, 'ukraine'>,
    { source: Source; id: (p: Props) => string; names: (p: Props) => Names }
  > = {
    oblasts: { source: src.oblasts, id: (p) => str(p.NAME_LAT), names: oblastNames },
    rayons: {
      source: src.rayons,
      id: (p) => str(p.COD_2),
      names: (p) => ({ uk: txt(p.ADMIN_2), en: txt(p.ADMIN_2_eng) }),
    },
    hromady: {
      source: src.hromady,
      id: (p) => str(p.COD_3),
      names: (p) => ({ uk: txt(p.ADMIN_3), en: txt(p.ADMIN_3_eng) }),
    },
    basins: {
      source: src.basins,
      id: (p) => str(p.Subbasin_eng) || str(p.Basin),
      names: (p) => ({
        uk: txt(p.Subbasin) || txt(p.Basin),
        en: txt(p.Subbasin_eng) || txt(p.Basin),
      }),
    },
  }

  const slim: Partial<Record<Level, FeatureCollection>> = {}
  const search: SearchEntry[] = []
  for (const [level, def] of Object.entries(levels) as [
    Exclude<Level, 'ukraine'>,
    (typeof levels)['oblasts'],
  ][]) {
    const features: Feature[] = def.source.features.map((f) => {
      const names = def.names(f.properties)
      return {
        type: 'Feature',
        properties: { id: def.id(f.properties), ...names },
        geometry: f.geometry,
      }
    })
    slim[level] = { type: 'FeatureCollection', features }
    def.source.features.forEach((f) => {
      const p = f.properties
      const entry: SearchEntry = { id: def.id(p), level, ...def.names(p), bbox: bbox(f.geometry) }
      if (level === 'rayons' || level === 'hromady') entry.oblast = oblastOf(p.ADMIN_1)
      if (level === 'basins' && parentBasin.has(p.ID) && txt(p.Subbasin) !== txt(p.Basin))
        entry.parent = parentBasin.get(p.ID)
      search.push(entry)
    })
  }
  slim.ukraine = await dissolveAll(slim.oblasts!, { id: 'Ukraine', uk: 'Україна', en: 'Ukraine' })

  const simplified: Partial<Record<Level, Feature[]>> = {}
  for (const level of Object.keys(KEEP) as Level[]) {
    const topo = await toTopoJSON(slim[level]!, level, KEEP[level])
    put(`geo/${level}`, '.topo.json', topo)
    const t = JSON.parse(topo) as Topology
    const fc = topoFeature(t, t.objects[level]!) as unknown as FeatureCollection
    simplified[level] = fc.features
    const ids = fc.features.map((f) => str(f.properties.id))
    if (new Set(ids).size !== ids.length) issues.push(`geo/${level}: duplicate ids`)
    if (ids.length !== slim[level]!.features.length)
      issues.push(
        `geo/${level}: ${ids.length} features after simplify, ${slim[level]!.features.length} before`,
      )
  }

  // ── values ─────────────────────────────────────────────────────────────────
  let compared = 0
  let maxDiff = 0
  const joins: string[] = []
  for (const ds of ['proj', 'obs'] as Dataset[]) {
    for (const level of ['ukraine', 'oblasts', 'rayons', 'hromady', 'basins'] as Level[]) {
      if (ds === 'obs' && level === 'basins') continue
      const source = await load(`${ds}-${level}`)
      const idOf = level === 'ukraine' ? () => 'Ukraine' : levels[level].id
      const rows = source.features.map((f) => ({ id: idOf(f.properties), props: f.properties }))
      // join: every value id has geometry and vice versa
      const geoIds = new Set(simplified[level]!.map((f) => str(f.properties.id)))
      const valIds = new Set(rows.map((r) => r.id))
      const noGeo = [...valIds].filter((id) => !geoIds.has(id)).length
      const noVal = [...geoIds].filter((id) => !valIds.has(id)).length
      joins.push(`| ${ds}/${level} | ${valIds.size} | ${geoIds.size} | ${noGeo} | ${noVal} |`)
      if (noGeo || noVal)
        issues.push(
          `${ds}/${level}: ${noGeo} values without geometry, ${noVal} geometry without values`,
        )

      for (const v of ['tas', 'pr'] as Variable[]) {
        const file: ValueFile = buildValues(ds, v, rows)
        // parity with the source (rounding only)
        for (const [sc, seasons] of Object.entries(file.values))
          for (const [season, decs] of Object.entries(seasons))
            for (const [dec, arr] of Object.entries(decs))
              arr.forEach((val, i) => {
                const raw =
                  round2(
                    rows[i]!.props[sourceField(ds, v, sc, season, Number(dec.slice(0, 4)))],
                  ) === null
                    ? null
                    : (rows[i]!.props[
                        sourceField(ds, v, sc, season, Number(dec.slice(0, 4)))
                      ] as number)
                compared++
                if ((raw === null) !== (val === null))
                  issues.push(`${ds}/${level}/${v}: null mismatch`)
                else if (raw !== null && val !== null)
                  maxDiff = Math.max(maxDiff, Math.abs(raw - val))
              })
        put(`values/${ds}/${level}/${v}`, '.json', file)
      }
    }
  }
  if (maxDiff > 0.005) issues.push(`max value difference ${maxDiff} > 0.005`)

  // ── points ─────────────────────────────────────────────────────────────────
  for (const id of ['proj-grid', 'obs-grid']) {
    const s = await load(id)
    put(`points/${id}`, '.json', {
      type: 'FeatureCollection',
      features: s.features.map((f) => {
        const [x, y] = f.geometry.coordinates as number[]
        return {
          type: 'Feature',
          properties: { id: str(f.properties.id) },
          geometry: { type: 'Point', coordinates: [round4(x!), round4(y!)] },
        }
      }),
    })
  }

  // stations: unique id per location (two different stations are both called "Yampil"); `place` = API name
  const stationIds = new Map<string, string>()
  const stationEntries = new Map<string, SearchEntry>()
  for (const [setId, v] of [
    ['obs-stations-tm', 'tas'],
    ['obs-stations-rr', 'pr'],
  ] as const) {
    const s = await load(setId)
    const features = s.features.map((f) => {
      const p = f.properties
      const [x, y] = (f.geometry.coordinates as number[]).map(round4) as [number, number]
      const name = str(p.station)
      const loc = `${name}|${x.toFixed(2)}|${y.toFixed(2)}`
      let id = stationIds.get(loc)
      if (!id) {
        const taken = new Set(stationIds.values())
        id = name
        for (let k = 2; taken.has(id); k++) id = `${name}-${k}`
        stationIds.set(loc, id)
        if (id !== name)
          notes.push(`station "${name}" at ${y}, ${x} → id "${id}" (API place is still "${name}")`)
      }
      const names = { uk: txt(p.St_UA), en: name.replace(/_/g, ' ') }
      const entry = stationEntries.get(id) ?? {
        id,
        level: 'stations' as const,
        ...names,
        vars: [],
        bbox: [x, y, x, y] as [number, number, number, number],
      }
      entry.vars!.push(v)
      stationEntries.set(id, entry)
      return {
        type: 'Feature',
        properties: { id, place: name, ...names },
        geometry: { type: 'Point', coordinates: [x, y] },
      }
    })
    put(`points/${setId}`, '.json', { type: 'FeatureCollection', features })
  }
  for (const e of stationEntries.values()) {
    const pt = [e.bbox[0], e.bbox[1]]
    // coastal stations sit just outside the polygons → nearest oblast vertex
    const o =
      src.oblasts.features.find((f) => pointInPolygon(pt, f.geometry)) ??
      src.oblasts.features
        .map((f) => ({
          f,
          d: Math.min(
            ...[...positions(f.geometry)].map(([x, y]) => (x! - pt[0]!) ** 2 + (y! - pt[1]!) ** 2),
          ),
        }))
        .sort((a, b) => a.d - b.d)[0]!.f
    e.oblast = str(o.properties.NAME_LAT)
    search.push(e)
  }

  // ── search index ───────────────────────────────────────────────────────────
  const mixed = search.filter((e) => hasMixedScript(e.uk)).map((e) => e.uk)
  if (mixed.length)
    issues.push(
      `${mixed.length} names still mix Latin and Cyrillic: ${mixed.slice(0, 3).join(', ')}`,
    )
  put('search-index', '.json', search)

  // ── write ──────────────────────────────────────────────────────────────────
  await rm(OUT, { recursive: true, force: true })
  const index: Record<string, string> = {}
  const sizes: string[] = []
  let overTarget = 0
  for (const o of outputs) {
    const file = hashedName(o.logical, o.ext, o.content)
    index[o.logical] = file
    await mkdir(dirname(join(OUT, file)), { recursive: true })
    await writeFile(join(OUT, file), o.content)
    const gz = gzipSync(o.content, { level: 9 }).length / 1024
    const target = TARGETS[o.logical]
    if (target && gz > target) overTarget++
    sizes.push(
      `| ${o.logical} | ${(o.content.length / 1024).toFixed(0)} | ${gz.toFixed(0)} | ${target ? `≤ ${target}${gz > target ? ' **over**' : ''}` : ''} |`,
    )
  }
  await writeFile(join(OUT, 'index.json'), JSON.stringify({ files: index }, null, 2) + '\n')

  // ── overlays for the visual check ──────────────────────────────────────────
  const views: { name: string; level: Level; box: [number, number, number, number] }[] = [
    { name: 'hromady-lviv', level: 'hromady', box: [23.7, 49.65, 24.4, 50.0] },
    { name: 'hromady-odesa-coast', level: 'hromady', box: [30.35, 46.2, 31.05, 46.6] },
    { name: 'hromady-crimea', level: 'hromady', box: [32.4, 44.3, 36.7, 46.3] },
    { name: 'rayons-kyiv', level: 'rayons', box: [29.9, 50.2, 31.0, 50.7] },
  ]
  await mkdir(join(RAW, 'overlays'), { recursive: true })
  for (const v of views) {
    const svg = overlaySvg(`${v.level} · keep ${KEEP[v.level]}`, v.box, [
      { features: slim[v.level]!.features, color: '#e0242b', width: 2.2 },
      { features: simplified[v.level]!, color: '#1f5fd1', width: 1 },
    ])
    await writeFile(join(RAW, 'overlays', `${v.name}.svg`), svg)
  }

  // ── report ─────────────────────────────────────────────────────────────────
  const R: string[] = ['# Map data build report', '']
  R.push(
    `**Result: ${issues.length ? `${issues.length} issue(s)` : 'all checks passed'}**; ${overTarget} file(s) over target.`,
    '',
  )
  R.push(
    `Simplification (share of vertices kept): ${Object.entries(KEEP)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')}; TopoJSON quantization 1e5.`,
    '',
  )
  R.push(
    '## Sizes',
    '',
    '| File | Raw KB | Gzip KB | Target |',
    '| --- | --- | --- | --- |',
    ...sizes,
  )
  R.push(
    '',
    '## Value ↔ geometry join',
    '',
    '| Values | Value ids | Geometry ids | Values without geometry | Geometry without values |',
    '| --- | --- | --- | --- | --- |',
    ...joins,
  )
  R.push(
    '',
    `Values compared with the source: ${compared}, max difference ${maxDiff.toFixed(4)} (limit 0.005).`,
  )
  R.push('', '## Issues', '', ...(issues.length ? issues.map((i) => `- ${i}`) : ['- none']))
  R.push('', '## Notes', '', ...(notes.length ? notes.map((n) => `- ${n}`) : ['- none']))
  R.push('', '## Overlays', '', ...views.map((v) => `- \`overlays/${v.name}.svg\` (${v.level})`))
  await writeFile(join(RAW, 'build-report.md'), R.join('\n') + '\n')

  console.log(sizes.join('\n'))
  console.log(
    `values compared ${compared}, max diff ${maxDiff.toFixed(4)}; ${outputs.length} files → ${OUT}`,
  )
  for (const n of notes) console.log(`note: ${n}`)
  for (const i of issues) console.log(`ISSUE: ${i}`)
  process.exitCode = issues.length ? 1 : 0
}

await main()
