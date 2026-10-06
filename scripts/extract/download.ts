// Step 1–2: find the old site's webpack chunks (no hardcoded hashes) and download them into data-raw/chunks/.
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const OLD_SITE = 'https://climate.uhmi.org.ua/'

export interface ManifestEntry {
  name: string
  url: string
  file: string
  bytes: number
  sha256: string
  fetchedAt: string
}

export interface Manifest {
  site: string
  updatedAt: string
  chunks: ManifestEntry[]
}

const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex')

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return res.text()
}

/** Parses the webpack runtime's `"js/"+…+{"chunk-xxxx":"hash",…}[e]+".js"` map. */
export function parseChunkMap(runtime: string): Record<string, string> {
  const m = runtime.match(/"js\/".{0,40}?\+(\{"chunk-[^}]+\})\[\w+\]\+"\.js"/)
  if (!m?.[1]) throw new Error('webpack chunk map not found in app.js')
  return JSON.parse(m[1]) as Record<string, string>
}

/** Lists every JS file of the old site: entry scripts from index.html + lazy chunks from the runtime. */
export async function listChunks(site = OLD_SITE): Promise<{ name: string; url: string }[]> {
  const html = await fetchText(site)
  const entries = [...html.matchAll(/src="\/?(js\/([\w-]+)\.[0-9a-f]+\.js)"/g)].map((m) => ({
    name: m[2]!,
    url: new URL(m[1]!, site).href,
  }))
  const app = entries.find((e) => e.name === 'app')
  if (!app) throw new Error('js/app.*.js not found in index.html')
  const map = parseChunkMap(await fetchText(app.url))
  const lazy = Object.entries(map).map(([name, hash]) => ({
    name,
    url: new URL(`js/${name}.${hash}.js`, site).href,
  }))
  return [...entries, ...lazy]
}

/** Downloads all chunks; files whose URL (content hash) and sha256 are unchanged are not fetched again. */
export async function downloadChunks(
  rawDir: string,
): Promise<{ manifest: Manifest; fetched: number }> {
  const chunkDir = join(rawDir, 'chunks')
  const manifestPath = join(rawDir, 'manifest.json')
  await mkdir(chunkDir, { recursive: true })
  const previous: Manifest | null = existsSync(manifestPath)
    ? (JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest)
    : null

  const chunks: ManifestEntry[] = []
  let fetched = 0
  for (const { name, url } of await listChunks()) {
    const file = join('chunks', url.split('/').pop()!)
    const path = join(rawDir, file)
    const old = previous?.chunks.find((c) => c.url === url)
    if (old && existsSync(path) && sha256(await readFile(path)) === old.sha256) {
      chunks.push(old)
      continue
    }
    const res = await fetch(url)
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(path, buf)
    fetched++
    chunks.push({
      name,
      url,
      file,
      bytes: buf.length,
      sha256: sha256(buf),
      fetchedAt: new Date().toISOString(),
    })
  }

  const unchanged =
    previous && JSON.stringify(previous.chunks) === JSON.stringify(chunks)
      ? previous.updatedAt
      : null
  const manifest: Manifest = {
    site: OLD_SITE,
    updatedAt: unchanged ?? new Date().toISOString(),
    chunks,
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  return { manifest, fetched }
}
