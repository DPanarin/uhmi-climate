// npm run data:check — value parity: built files in public/data vs the extracted source (data-raw/geojson).
// 50 random features × 5 random parameter combinations; every value must match to 0.005.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { sourceField, type Dataset, type ValueFile, type Variable } from '../build/values.ts'

const OUT = 'public/data'
const RAW = 'data-raw/geojson'
const FEATURES = 50
const COMBOS = 5
const TOLERANCE = 0.005

type Props = Record<string, unknown>
const json = async <T>(path: string) => JSON.parse(await readFile(path, 'utf8')) as T

// feature id → API place, as in scripts/build (Ukraine is one feature)
const ID: Record<string, (p: Props) => string> = {
  ukraine: () => 'Ukraine',
  oblasts: (p) => String(p.NAME_LAT),
  rayons: (p) => String(p.COD_2),
  hromady: (p) => String(p.COD_3),
  basins: (p) => String(p.Subbasin_eng || p.Basin),
}

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

async function main() {
  const index = (await json<{ files: Record<string, string> }>(join(OUT, 'index.json'))).files
  const valueFiles = Object.keys(index).filter((k) => k.startsWith('values/'))
  const sources = new Map<string, Map<string, Props>>()
  const random = rng(20261006)

  // 50 features spread round-robin over all 18 value files, so every dataset × level × variable is covered
  const picks = Array.from({ length: FEATURES }, (_, k) => valueFiles[k % valueFiles.length]!)

  let compared = 0
  let bothNull = 0
  const failures: string[] = []
  for (const logical of picks) {
    const [, ds, level, variable] = logical.split('/') as [string, Dataset, string, Variable]
    const file = await json<ValueFile>(join(OUT, index[logical]!))
    const srcKey = `${ds}-${level}`
    if (!sources.has(srcKey)) {
      const fc = await json<{ features: { properties: Props }[] }>(join(RAW, `${srcKey}.geojson`))
      sources.set(srcKey, new Map(fc.features.map((f) => [ID[level]!(f.properties), f.properties])))
    }
    const i = Math.floor(random() * file.ids.length)
    const id = file.ids[i]!
    const props = sources.get(srcKey)!.get(id)
    if (!props) {
      failures.push(`${logical}: ${id} missing in source`)
      continue
    }
    for (let c = 0; c < COMBOS; c++) {
      const scenarios = Object.keys(file.values)
      const sc = scenarios[Math.floor(random() * scenarios.length)]!
      const seasons = Object.keys(file.values[sc]!)
      const season = seasons[Math.floor(random() * seasons.length)]!
      const dec = file.decades[Math.floor(random() * file.decades.length)]!
      const built = file.values[sc]![season]![dec]![i] ?? null
      const raw = props[sourceField(ds, variable, sc, season, Number(dec.slice(0, 4)))]
      const src = typeof raw === 'number' && Number.isFinite(raw) ? raw : null
      compared++
      if (built === null && src === null) bothNull++
      const ok = built === null || src === null ? built === src : Math.abs(built - src) <= TOLERANCE
      if (!ok)
        failures.push(`${logical} ${id} ${sc}/${season}/${dec}: built ${built}, source ${src}`)
    }
  }

  const files = new Set(picks)
  const levels = new Set(picks.map((p) => p.split('/')[2]))
  console.log(
    `data:check — ${picks.length} features × ${COMBOS} combinations = ${compared} values ` +
      `(${bothNull} empty in both), tolerance ${TOLERANCE}`,
  )
  console.log(
    `  sampled ${files.size} of ${valueFiles.length} value files; levels: ${[...levels].join(', ')}`,
  )
  if (failures.length) {
    for (const f of failures.slice(0, 20)) console.log(`  MISMATCH ${f}`)
    console.log(`${failures.length} mismatch(es)`)
    process.exitCode = 1
  } else console.log('all values match')
}

await main()
