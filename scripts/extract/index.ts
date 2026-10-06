// npm run data:extract — old site chunks → data-raw/ (GeoJSON, config, report). Never executes downloaded JS.
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findFeatureCollections, type Json } from './ast-json.ts'
import { classify, propertyKeys } from './classify.ts'
import { extractConfig, type OldSiteConfig } from './config.ts'
import { extractInfo } from './info.ts'
import { downloadChunks, type Manifest } from './download.ts'
import { SOURCES, type SourceId } from './layers.ts'
import { smoke, type SmokeResult } from './smoke.ts'
import { validate, type Check, type Feature, type VariableStats } from './validate.ts'

const RAW = 'data-raw'
const ENV = '.env.local'
const skipSmoke = process.argv.includes('--no-smoke')

interface Found {
  id: SourceId
  chunk: string
  offset: number
  name: string | null
  features: Feature[]
  keys: number
}

function readEnv(text: string): Record<string, string> {
  return Object.fromEntries(
    text
      .split('\n')
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1]!, m[2]!]),
  )
}

/** Puts the key into .env.local only when VITE_API_KEY is empty there; never prints it. */
async function storeKey(key: string | null): Promise<string> {
  if (!key) return 'not found in the bundle'
  const text = existsSync(ENV) ? await readFile(ENV, 'utf8') : ''
  const current = readEnv(text).VITE_API_KEY ?? ''
  if (current === key) return 'found; same as VITE_API_KEY in .env.local'
  if (current) return 'found; DIFFERS from VITE_API_KEY in .env.local (left unchanged)'
  const next = /^VITE_API_KEY=.*$/m.test(text)
    ? text.replace(/^VITE_API_KEY=.*$/m, `VITE_API_KEY=${key}`)
    : `${text.trimEnd()}\nVITE_API_KEY=${key}\n`
  await writeFile(ENV, next)
  return 'found; written to .env.local (VITE_API_KEY was empty)'
}

async function main() {
  // 1–2. download
  const { manifest, fetched } = await downloadChunks(RAW)
  console.log(`chunks: ${manifest.chunks.length}, downloaded ${fetched}`)

  // 3–4. parse + classify
  const found: Found[] = []
  const errors: string[] = []
  let configChunk: { name: string; source: string } | null = null
  let infoFound = false
  for (const c of manifest.chunks) {
    const source = await readFile(join(RAW, c.file), 'utf8')
    if (source.includes('serverKey') && source.includes('getServerParams'))
      configChunk = { name: c.name, source }
    // "Additional information" popup (citation, sources, model table, glossary)
    if (!infoFound && source.includes('popupShow') && source.includes('info__block')) {
      const info = extractInfo(source)
      if (info) {
        infoFound = true
        await mkdir(join(RAW, 'info'), { recursive: true })
        for (const lang of ['uk', 'en'] as const)
          await writeFile(join(RAW, 'info', `${lang}.html`), info[lang] + '\n')
        if (info.unknown.length)
          errors.push(`${c.name}: info popup has unknown nodes: ${info.unknown.join(', ')}`)
        console.log(`info popup       ← ${c.name}`)
      }
    }
    if (!source.includes('FeatureCollection')) continue
    let collections
    try {
      collections = findFeatureCollections(source)
    } catch (e) {
      errors.push(`${c.name}: ${(e as Error).message}`)
      continue
    }
    for (const col of collections) {
      const id = classify(col.value)
      const name = typeof col.value.name === 'string' ? col.value.name : null
      if (!id) {
        errors.push(
          `${c.name} @${col.offset}: unknown signature [${[...propertyKeys(col.value)].slice(0, 8).join(', ')}]`,
        )
        continue
      }
      if (found.some((f) => f.id === id)) {
        errors.push(`${c.name} @${col.offset}: second collection classified as ${id}`)
        continue
      }
      found.push({
        id,
        chunk: c.name,
        offset: col.offset,
        name,
        features: col.value.features as unknown as Feature[],
        keys: propertyKeys(col.value).size,
      })
      await mkdir(join(RAW, 'geojson'), { recursive: true })
      await writeFile(join(RAW, 'geojson', `${id}.geojson`), JSON.stringify(col.value))
      console.log(
        `${id.padEnd(16)} ← ${c.name} (${col.value.features && (col.value.features as Json[]).length} features)`,
      )
    }
  }

  // 5. config + key
  let config: OldSiteConfig | null = null
  let keyStatus = 'config chunk not found'
  let extractedKey: string | null = null
  if (configChunk) {
    const r = extractConfig(configChunk.source)
    config = r.config
    extractedKey = r.serverKey
    keyStatus = await storeKey(r.serverKey)
    await writeFile(
      join(RAW, 'config.json'),
      JSON.stringify({ chunk: configChunk.name, ...config }, null, 2) + '\n',
    )
  } else errors.push('config chunk (serverKey + getServerParams) not found')
  if (!infoFound) errors.push('"Additional information" popup not found')
  console.log(`API key: ${keyStatus}`)

  // 6. validate
  const collections = new Map(found.map((f) => [f.id, f.features]))
  const { checks, stats } = validate(collections)
  for (const e of errors) checks.unshift({ name: 'parse/classify', ok: false, detail: e })
  if (config) {
    checks.push({
      name: 'config: vizItem found',
      ok: !!config.vizItem,
      detail: config.vizItem ? 'yes' : 'no',
    })
    checks.push({
      name: 'config: ranges obs / rcp45 / rcp85 identified',
      ok: !!(config.ranges.obs && config.ranges.rcp45 && config.ranges.rcp85),
      detail: `${config.ranges.all.length} distinct range modules`,
    })
    checks.push({
      name: 'config: getServerParams rules',
      ok: config.serverParams.length === 12,
      detail: `${config.serverParams.length} / 12`,
    })
  }

  // 7. smoke
  let smokeResults: SmokeResult[] = []
  if (!skipSmoke) {
    const env = existsSync(ENV) ? readEnv(await readFile(ENV, 'utf8')) : {}
    const key = env.VITE_API_KEY || extractedKey
    const apiUrl = env.VITE_API_URL || config?.serverUrl || 'https://api.uhmi.org.ua/'
    if (!key) checks.push({ name: 'API smoke', ok: false, detail: 'no key' })
    else {
      smokeResults = await smoke(apiUrl, key, SOURCES, collections)
      for (const spec of SOURCES.filter((s) => s.apiKind)) {
        const rs = smokeResults.filter((r) => r.source === spec.id)
        const ok = rs.filter((r) => r.status === 200).length
        checks.push({
          name: `${spec.id}: API smoke`,
          ok: rs.length > 0 && ok === rs.length,
          detail: `${ok} / ${rs.length} → 200`,
        })
      }
    }
  }

  await writeFile(
    join(RAW, 'report.md'),
    report(manifest, found, checks, stats, smokeResults, config, keyStatus),
  )
  const failed = checks.filter((c) => !c.ok)
  console.log(
    `checks: ${checks.length - failed.length} passed, ${failed.length} failed → ${RAW}/report.md`,
  )
  for (const f of failed) console.log(`  FAIL ${f.name}: ${f.detail}`)
  for (const w of checks.filter((c) => c.warn)) console.log(`  warn ${w.name}: ${w.detail}`)
  process.exitCode = failed.length ? 1 : 0
}

const CONTROLS = [
  {
    source: 'proj-oblasts',
    key: 'NAME_LAT',
    value: 'Kyivska',
    label: 'Київська область',
    field: 'tmp_rcp85_anom_2041_2050',
    view: 'Air temperature → Administrative oblasts, RCP8.5, Annual, 2041–2050',
  },
  {
    source: 'proj-rayons',
    key: 'COD_2',
    value: 'UA46060000000042587',
    label: 'Львівський район',
    field: 'pcp_rcp45_anom_summer_2071_2080',
    view: 'Precipitation → Administrative rayons, RCP4.5, Summer, 2071–2080',
  },
  {
    source: 'obs-hromady',
    key: 'COD_3',
    value: 'UA46060250000025047',
    label: 'Львівська громада',
    field: 'Tm_winter_observed_anom_2011_2020',
    view: 'Air temperature → Territorial communities (1946–2020), Winter, 2011–2020',
  },
] as const

const fmt = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 1000) / 1000) : '—')

function report(
  manifest: Manifest,
  found: Found[],
  checks: Check[],
  stats: VariableStats[],
  smokeResults: SmokeResult[],
  config: OldSiteConfig | null,
  keyStatus: string,
): string {
  const mb = manifest.chunks.reduce((s, c) => s + c.bytes, 0) / 1048576
  const failed = checks.filter((c) => !c.ok).length
  const L: string[] = []
  L.push('# Data extraction report', '')
  L.push(
    `Source: ${manifest.site} · chunks fetched ${manifest.updatedAt} · ${manifest.chunks.length} files, ${mb.toFixed(1)} MiB`,
    '',
  )
  L.push(
    `**Result: ${failed ? `${failed} check(s) FAILED` : 'all checks passed'}** (${checks.length} checks)`,
    '',
  )

  L.push(
    '## Collections',
    '',
    '| File | Chunk | Offset | Name | Features | Fields |',
    '| --- | --- | --- | --- | --- | --- |',
  )
  for (const f of found)
    L.push(
      `| \`geojson/${f.id}.geojson\` | ${f.chunk} | ${f.offset} | ${f.name ?? ''} | ${f.features.length} | ${f.keys} |`,
    )

  L.push('', '## Checks', '', '| Check | Result | Detail |', '| --- | --- | --- |')
  for (const c of checks)
    L.push(
      `| ${c.name} | ${!c.ok ? '**FAIL**' : c.warn ? '**warn**' : 'ok'} | ${c.detail.replace(/\|/g, '\\|')} |`,
    )

  L.push(
    '',
    '## Value ranges (anomaly vs baseline)',
    '',
    '| Source | Variable | Min | Max | Values | Empty / NaN |',
    '| --- | --- | --- | --- | --- | --- |',
  )
  for (const s of stats)
    L.push(
      `| ${s.source} | ${s.variable} | ${fmt(s.min)} | ${fmt(s.max)} | ${s.values} | ${s.empty} |`,
    )

  L.push(
    '',
    '## API `place` mapping',
    '',
    '| Source | Endpoint | kind | place field | value_type (T / P) |',
    '| --- | --- | --- | --- | --- |',
  )
  for (const s of SOURCES.filter((x) => x.apiKind))
    L.push(
      `| ${s.id} | ${s.endpoint} | ${s.apiKind} | ${s.placeField} | ${s.valueTypes.temperature ?? '—'} / ${s.valueTypes.precipitation ?? '—'} |`,
    )

  if (smokeResults.length) {
    const ok = smokeResults.filter((r) => r.status === 200).length
    L.push(
      '',
      `## API smoke check (${ok} / ${smokeResults.length} → 200, key omitted)`,
      '',
      '| Source | place | Status | ms | KB | Fields | Request |',
      '| --- | --- | --- | --- | --- | --- | --- |',
    )
    for (const r of smokeResults)
      L.push(
        `| ${r.source} | ${r.place} | ${r.status} | ${r.ms} | ${r.kb} | ${r.series} | \`${r.query}\` |`,
      )
  }

  L.push(
    '',
    '## Control values for CP1',
    '',
    'Compare with the tooltip on climate.uhmi.org.ua (same layer, scenario, season, decade).',
    '',
  )
  L.push('| Old site view | Feature | Field | Value |', '| --- | --- | --- | --- |')
  for (const c of CONTROLS) {
    const f = found
      .find((x) => x.id === c.source)
      ?.features.find((x) => x.properties[c.key] === c.value)
    L.push(
      `| ${c.view} | ${c.label} | \`${c.field}\` | ${f ? String(f.properties[c.field]) : 'not found'} |`,
    )
  }

  if (config) {
    L.push('', '## Config from the old site (full dump: `config.json`)', '')
    L.push(`- API: ${config.serverUrl}; key: ${keyStatus}.`)
    for (const [k, r] of [
      ['observations', config.ranges.obs],
      ['RCP4.5', config.ranges.rcp45],
      ['RCP8.5 / fill', config.ranges.rcp85],
    ] as const)
      if (r)
        L.push(
          `- Range ${k} (module ${r.module}): T ${r.result.minTemperature}…${r.result.maxTemperature} °C, P ${r.result.minPrecipitation}…${r.result.maxPrecipitation} %.`,
        )
    L.push(
      `- Legends: ${config.legends.length} definitions; decade timelines: ${config.timelines.length}; getServerParams rules: ${config.serverParams.length}.`,
    )
  }
  return L.join('\n') + '\n'
}

await main()
