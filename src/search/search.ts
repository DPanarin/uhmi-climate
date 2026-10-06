// Territory search over public/data search-index (~2.3k entries, so no library).
import type { DatasetId, LevelId, VariableId } from '@/config/layers'
import { findLayer } from '@/config/layers'

export interface SearchEntry {
  id: string
  level: Exclude<LevelId, 'ukraine' | 'grid'>
  uk: string
  en: string
  /** Oblast id (NAME_LAT) for rayons, hromady and stations. */
  oblast?: string
  /** Parent basin for subbasins. */
  parent?: { uk: string; en: string }
  /** Station: variables it has series for. */
  vars?: VariableId[]
  bbox: [number, number, number, number]
}

export interface SearchHit {
  entry: SearchEntry
  score: number
}

const APOSTROPHES = /['’ʼ`´‘]/g

/** Lower case, apostrophes unified and dropped, extra spaces removed: "Кам’янець" → "камянець". */
export function normalize(s: string): string {
  return s.toLowerCase().replace(APOSTROPHES, '').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
}

const LEVEL_ORDER: Record<SearchEntry['level'], number> = {
  oblasts: 0,
  rayons: 1,
  hromady: 2,
  basins: 3,
  stations: 4,
}

/** 3 = name starts with the query, 2 = a word starts with it, 1 = contains it, 0 = no match. */
function matchScore(name: string, q: string): number {
  const n = normalize(name)
  if (n.startsWith(q)) return 3
  if (n.split(/[\s\-–(]+/).some((w) => w.startsWith(q))) return 2
  return n.includes(q) ? 1 : 0
}

/** Levels the current dataset can show (search only offers those). */
export function searchableLevels(ds: DatasetId): SearchEntry['level'][] {
  return (Object.keys(LEVEL_ORDER) as SearchEntry['level'][]).filter((l) => findLayer(ds, l))
}

/** Best matches first: match quality, then level (oblasts before hromady), then shorter name. */
export function search(
  entries: SearchEntry[],
  query: string,
  ds: DatasetId,
  limit = 20,
): SearchHit[] {
  const q = normalize(query)
  if (q.length < 1) return []
  const levels = new Set(searchableLevels(ds))
  const hits: SearchHit[] = []
  for (const e of entries) {
    if (!levels.has(e.level)) continue
    const score = Math.max(matchScore(e.uk, q), matchScore(e.en, q))
    if (score) hits.push({ entry: e, score })
  }
  hits.sort(
    (a, b) =>
      b.score - a.score ||
      LEVEL_ORDER[a.entry.level] - LEVEL_ORDER[b.entry.level] ||
      a.entry.uk.length - b.entry.uk.length ||
      a.entry.uk.localeCompare(b.entry.uk, 'uk'),
  )
  return hits.slice(0, limit)
}
