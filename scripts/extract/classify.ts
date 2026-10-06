// Step 4: identify a FeatureCollection by its field signature (never by chunk name or hash).
import type { Json } from './ast-json.ts'
import type { SourceId } from './layers.ts'

interface Collection {
  name?: Json
  features?: Json
}

export function propertyKeys(collection: Collection): Set<string> {
  const keys = new Set<string>()
  const features = Array.isArray(collection.features) ? collection.features : []
  for (const f of features) {
    const props = f && typeof f === 'object' && !Array.isArray(f) ? f.properties : null
    if (props && typeof props === 'object' && !Array.isArray(props))
      for (const k of Object.keys(props)) keys.add(k)
  }
  return keys
}

export function classify(collection: Collection): SourceId | null {
  const keys = propertyKeys(collection)
  const all = [...keys]
  const proj = all.some((k) => /^(tmp|pcp)_rcp\d\d_anom_/.test(k))
  const obs = all.some((k) => /^(Tm|RR)(_[a-z]+)?_observed_anom_/.test(k))
  const ds = proj && !obs ? 'proj' : obs && !proj ? 'obs' : null
  const count = Array.isArray(collection.features) ? collection.features.length : 0

  if (keys.has('COD_3')) return ds && `${ds}-hromady`
  if (keys.has('COD_2')) return ds && `${ds}-rayons`
  if (keys.has('NAME_UA')) return ds && `${ds}-oblasts`
  if (keys.has('Basin')) return proj ? 'proj-basins' : obs ? null : 'basin-names'
  if (keys.has('Elevation')) return 'proj-grid'
  if (keys.has('index_right')) return 'obs-grid'
  if (keys.has('station')) {
    // Two station sets differ only by the collection name: …_Tm_Tn_Tx (temperature) and …_RR (precipitation).
    const name = typeof collection.name === 'string' ? collection.name : ''
    if (name.endsWith('_RR')) return 'obs-stations-rr'
    if (/_Tm(_|$)/.test(name)) return 'obs-stations-tm'
    return null
  }
  if (count === 1) return ds && `${ds}-ukraine`
  return null
}
