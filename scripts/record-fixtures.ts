// Records real API responses once for unit tests (src/api/__fixtures__). ~15 sequential requests.
// The key comes from .env.local and is never written to the fixtures.
import { readFileSync, writeFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => [m[1], m[2]]),
)
const API = env.VITE_API_URL || 'https://api.uhmi.org.ua/'
const KEY = env.VITE_API_KEY
if (!KEY) throw new Error('VITE_API_KEY missing in .env.local')

const cases: { name: string; path: string; q: [string, string][] }[] = [
  {
    name: 'proj-ukraine-tas',
    path: 'projections',
    q: [
      ['kind', 'Ukraine'],
      ['place', 'Ukraine'],
      ['value_type', 'tas'],
    ],
  },
  {
    name: 'proj-oblasts-tas',
    path: 'projections',
    q: [
      ['kind', 'oblasts'],
      ['place', 'Kyivska'],
      ['value_type', 'tas'],
    ],
  },
  {
    name: 'proj-rayons-pr-summer',
    path: 'projections',
    q: [
      ['kind', 'rayons'],
      ['place', 'UA46060000000042587'],
      ['value_type', 'pr'],
      ['season', 'summer'],
    ],
  },
  {
    name: 'proj-terhromads-tas',
    path: 'projections',
    q: [
      ['kind', 'terhromads'],
      ['place', 'UA46060250000025047'],
      ['value_type', 'tas'],
    ],
  },
  {
    name: 'proj-basins-pr',
    path: 'projections',
    q: [
      ['kind', 'basins'],
      ['place', 'Desna River Basin'],
      ['value_type', 'pr'],
    ],
  },
  {
    name: 'proj-nodes-tas',
    path: 'projections',
    q: [
      ['kind', 'nodes'],
      ['place', '3458'],
      ['value_type', 'tas'],
    ],
  },
  {
    name: 'obs-ukraine-tm',
    path: 'historical_observations',
    q: [
      ['kind', 'Ukraine'],
      ['place', 'Ukraine'],
      ['value_type', 'tm'],
    ],
  },
  {
    name: 'obs-oblasts-tx-winter',
    path: 'historical_observations',
    q: [
      ['kind', 'oblasts'],
      ['place', 'Kyivska'],
      ['value_type', 'tx'],
      ['season', 'winter'],
    ],
  },
  {
    name: 'obs-rayons-rr',
    path: 'historical_observations',
    q: [
      ['kind', 'rayons'],
      ['place', 'UA46060000000042587'],
      ['value_type', 'rr'],
    ],
  },
  {
    name: 'obs-terhromads-tn',
    path: 'historical_observations',
    q: [
      ['kind', 'terhromads'],
      ['place', 'UA46060250000025047'],
      ['value_type', 'tn'],
    ],
  },
  {
    name: 'obs-nodes-rr-summer',
    path: 'historical_observations',
    q: [
      ['kind', 'nodes'],
      ['place', '7076'],
      ['value_type', 'rr'],
      ['season', 'summer'],
    ],
  },
  {
    name: 'obs-meteostations-tm',
    path: 'historical_observations',
    q: [
      ['kind', 'meteostations'],
      ['place', 'Kyiv'],
      ['value_type', 'tm'],
    ],
  },
]

for (const c of cases) {
  const q = new URLSearchParams()
  if (c.path === 'projections') {
    q.append('rcp', 'rcp45')
    q.append('rcp', 'rcp85')
  }
  for (const [k, v] of c.q) q.append(k, v)
  const res = await fetch(`${API}${c.path}?${q}&key=${encodeURIComponent(KEY)}`)
  const text = await res.text()
  if (!res.ok) {
    console.log(`${c.name}: ${res.status}`)
    continue
  }
  writeFileSync(`src/api/__fixtures__/${c.name}.json`, text.trim() + '\n')
  console.log(`${c.name}: ${res.status} ${(text.length / 1024).toFixed(0)} KB`)
}

// error shapes (no key in the output)
for (const [name, path, q] of [
  ['error-unknown-place', 'projections', 'rcp=rcp45&kind=oblasts&place=Atlantis&value_type=tas'],
  ['error-bad-arg', 'projections', 'rcp=rcp26&kind=oblasts&place=Kyivska&value_type=tas'],
] as const) {
  const res = await fetch(`${API}${path}?${q}&key=${encodeURIComponent(KEY)}`)
  const text = await res.text()
  console.log(
    `${name}: ${res.status} ${res.headers.get('content-type')} ${JSON.stringify(text.slice(0, 120))}`,
  )
}
