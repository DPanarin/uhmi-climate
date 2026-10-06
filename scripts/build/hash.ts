// Content-hashed file names: GitHub Pages can't set cache headers, so a new name is what invalidates caches.
import { createHash } from 'node:crypto'

export function contentHash(content: string | Uint8Array, length = 8): string {
  return createHash('sha256').update(content).digest('hex').slice(0, length)
}

/** `geo/hromady` + `.topo.json` → `geo/hromady.1a2b3c4d.topo.json` */
export function hashedName(logical: string, ext: string, content: string | Uint8Array): string {
  return `${logical}.${contentHash(content)}${ext}`
}
