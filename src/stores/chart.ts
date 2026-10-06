// Series of the selected feature from the API; a new selection aborts the previous request.
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { apiClient, ApiError, type ApiErrorKind } from '@/api/client'
import type { Parsed } from '@/api/parse'
import { buildRequests, type RequestView } from '@/api/request'
import type { Layer } from '@/config/layers'
import type { Mode } from '@/chart/datasets'

export const useChartStore = defineStore('chart', () => {
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const error = ref<ApiErrorKind | null>(null)
  /** Responses by value_type. */
  const responses = shallowRef<Record<string, Parsed>>({})
  const mode = ref<Mode>('absolute')
  const smooth = ref(false)
  let controller: AbortController | null = null
  let last: [Layer, string, RequestView] | null = null

  async function load(layer: Layer, place: string, view: RequestView) {
    controller?.abort()
    const ctl = (controller = new AbortController())
    last = [layer, place, { var: view.var, season: view.season }]
    status.value = 'loading'
    error.value = null
    const reqs = buildRequests(layer, place, view)
    try {
      const results = await Promise.all(reqs.map((r) => apiClient().get(r, ctl.signal)))
      if (ctl.signal.aborted) return
      responses.value = Object.fromEntries(reqs.map((r, i) => [r.valueType, results[i]!]))
      status.value = 'ready'
    } catch (e) {
      if (ctl.signal.aborted) return
      status.value = 'error'
      error.value = e instanceof ApiError ? e.kind : 'unavailable'
    }
  }

  function retry() {
    if (last) void load(...last)
  }

  function clear() {
    controller?.abort()
    status.value = 'idle'
    responses.value = {}
    last = null
  }

  return { status, error, responses, mode, smooth, load, retry, clear }
})
