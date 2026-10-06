// Builds API requests for one feature and view (path + params; the key is added by the client).
import { DATASETS, type Layer, type Season, type VariableId } from '@/config/layers'

export interface ApiRequest {
  path: 'projections' | 'historical_observations'
  /** Ordered params without the key; `rcp` repeats. */
  params: [string, string][]
  /** value_type of this request (observed temperature makes three: tm, tn, tx). */
  valueType: string
}

export interface RequestView {
  var: VariableId
  season: Season
}

/** One request per value type; projections ask for both scenarios at once. */
export function buildRequests(layer: Layer, place: string, view: RequestView): ApiRequest[] {
  const ds = DATASETS[layer.dataset]
  return ds.valueTypes[view.var].map((valueType) => {
    const params: [string, string][] = []
    if (ds.endpoint === 'projections') params.push(['rcp', 'rcp45'], ['rcp', 'rcp85'])
    params.push(['kind', layer.apiKind], ['place', place], ['value_type', valueType])
    if (view.season !== 'annual') params.push(['season', view.season])
    return { path: ds.endpoint, params, valueType }
  })
}

/** URL without the key: the cache key and what gets logged. */
export function requestKey(r: ApiRequest): string {
  return `${r.path}?${new URLSearchParams(r.params)}`
}
