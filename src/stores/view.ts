// The user's selection (dataset, level, variable, scenario, season, decade, place, language).
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { DATASETS, SCALES, findLayer, geometryFile, valuesFile } from '@/config/layers'
import { DEFAULT_VIEW, normalizeView, type ViewState } from './view-rules'

export const useViewStore = defineStore('view', () => {
  const state = ref<ViewState>({ ...DEFAULT_VIEW })

  /** Applies a change and keeps the view valid (see normalizeView). A place given in the same change
   *  (e.g. from search: level + place together) is kept. */
  function set(change: Partial<ViewState>) {
    const next = normalizeView({ ...state.value, ...change }, state.value)
    if ('place' in change) next.place = change.place ?? null
    state.value = next
  }

  /** Replaces the whole view, e.g. from the URL; no "previous" rules apply. */
  function replace(next: ViewState) {
    state.value = normalizeView(next)
  }

  const layer = computed(() => findLayer(state.value.ds, state.value.lvl)!)
  const dataset = computed(() => DATASETS[state.value.ds])
  const scale = computed(() => SCALES[state.value.ds][state.value.var])
  const geometry = computed(() => geometryFile(layer.value, state.value.var))
  const values = computed(() => valuesFile(layer.value, state.value.var))
  /** Key inside a value file: scenario for projections, "observed" for observations. */
  const scenarioKey = computed(() => (state.value.ds === 'proj' ? state.value.rcp : 'observed'))

  return { state, set, replace, layer, dataset, scale, geometry, values, scenarioKey }
})
