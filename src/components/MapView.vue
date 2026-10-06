<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { feature as topoFeature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { MapController, boundsOf, type Bounds, type HoverInfo } from '@/map/controller'
import { UKRAINE_BOUNDS } from '@/config/map'
import { activeMap } from '@/map/use-export'
import { featureName } from '@/map/feature-name'
import { useDataStore } from '@/stores/data'
import { useViewStore } from '@/stores/view'
import { useUiStore } from '@/stores/ui'
import { DEBUG } from '@/debug'
import { formatValue } from '@/i18n/format'
import type { ValueFile } from '@/map/types'
// Chart panel, Chart.js, the API client and zod load on the first click only
const ChartPanel = defineAsyncComponent(() => import('./chart/ChartPanel.vue'))

const { t } = useI18n()
const view = useViewStore()
const data = useDataStore()
const ui = useUiStore()
const router = useRouter()

const el = ref<HTMLElement>()
const hover = ref<HoverInfo | null>(null)
/** Features of the current layer by id (names for tooltip and card). */
const features = shallowRef(new Map<string, Feature>())
let ctl: MapController | null = null
let renderToken = 0
const geojsonCache = new Map<string, FeatureCollection>()

const isPhone = () => window.matchMedia('(max-width: 599px)').matches

function padding() {
  const header = isPhone() ? 48 : 60
  const pad = { top: header + 16, bottom: isPhone() ? 96 : 32, left: 16, right: 16 }
  // keep the data out from under an open chart panel (a card on the right, a sheet on phones)
  const panel = document.querySelector('.chart-panel')?.getBoundingClientRect()
  if (panel && panel.width && el.value) {
    const box = el.value.getBoundingClientRect()
    if (isPhone() || panel.width > box.width * 0.8) {
      // phones: everything stacked at the bottom (sheet, and the chip bar sitting on it)
      const bar = document.querySelector('.bar')?.getBoundingClientRect()
      const top = Math.min(panel.top, bar?.height ? bar.top : Infinity)
      pad.bottom = Math.max(pad.bottom, box.bottom - top + 8)
    } else pad.right = Math.max(pad.right, box.right - panel.left + 16)
  }
  return pad
}

/** Bounds of the data on screen (basins and the grid reach beyond Ukraine). */
const dataBounds = shallowRef<Bounds | null>(null)

// A link that opens with a chart: fit once more when the panel is on screen (it loads lazily).
// Panels opened by a click keep the map where it is.
let fitWithPanel = false // set from the initial URL in onMounted
function onPanelReady() {
  if (!fitWithPanel) return
  fitWithPanel = false
  ctl?.fitTo(dataBounds.value ?? UKRAINE_BOUNDS, padding(), false)
}

function fitToData() {
  if (!ctl) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ctl.fitTo(dataBounds.value ?? UKRAINE_BOUNDS, padding(), !reduced)
}

function toGeoJSON(logical: string, raw: unknown): FeatureCollection {
  let fc = geojsonCache.get(logical)
  if (!fc) {
    const r = raw as { type: string; objects?: Topology['objects'] }
    if (r.type === 'Topology') {
      const topo = raw as Topology
      const name = Object.keys(topo.objects)[0]!
      fc = topoFeature(topo, topo.objects[name]!) as FeatureCollection
    } else fc = raw as FeatureCollection
    geojsonCache.set(logical, fc)
  }
  return fc
}

/** Level / dataset / variable changed: load files and replace the layer. */
async function render() {
  if (!ctl) return
  const token = ++renderToken
  const files = [view.geometry, ...(view.values ? [view.values] : [])]
  let loaded: unknown[]
  try {
    loaded = await data.loadForView(files)
  } catch {
    return // error shown by the store; aborted loads are expected
  }
  if (token !== renderToken) return // a newer view won
  const fc = toGeoJSON(view.geometry, loaded[0])
  features.value = new Map(fc.features.map((f) => [String(f.properties?.id), f]))
  dataBounds.value = boundsOf(fc)
  ctl.show({
    kind: view.layer.kind,
    data: fc,
    scale: view.scale,
    labelField: view.layer.level === 'stations' ? view.state.lang : undefined,
  })
  recolor()
  ctl.select(view.state.place)
  applyZoom()
}

/** River basin outlines (loaded on first use, kept above the climate layer). */
async function showOutlines(on: boolean) {
  if (!on) return ctl?.setOutlines(null)
  try {
    const raw = await data.load('geo/basin-outlines')
    if (view.state.basins) ctl?.setOutlines(toGeoJSON('geo/basin-outlines', raw))
  } catch {
    // shown by the data store's error state
  }
}

/** Zoom requested by search: done once the feature's layer is on the map. */
function applyZoom() {
  const target = ui.zoomTarget
  if (!ctl || !target || !ctl.has(target.id)) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ctl.zoomTo(target.bbox, padding(), !reduced)
  ui.zoomTarget = null
}

const valueFile = computed(() =>
  view.values ? (data.files.get(view.values) as ValueFile | undefined) : undefined,
)

function currentValues(): (number | null)[] | undefined {
  return valueFile.value?.values[view.scenarioKey]?.[view.state.season]?.[view.state.dec]
}

/** Scenario / season / decade changed: only feature-state changes. */
function recolor() {
  const file = valueFile.value
  const values = currentValues()
  if (!ctl || !file || !values || !ctl.has(file.ids[0]!)) return
  const ms = ctl.setValues(file.ids, values)
  if (import.meta.env.DEV)
    console.info(`[map] recolour ${file.ids.length} features: ${ms.toFixed(1)} ms`)
}

function valueOf(id: string): number | null | undefined {
  const file = valueFile.value
  if (!file || view.layer.kind !== 'polygon') return undefined
  const i = file.ids.indexOf(id)
  return i < 0 ? undefined : (currentValues()?.[i] ?? null)
}

function nameOf(id: string): string {
  const f = features.value.get(id)
  if (!f) return id
  const coords =
    f.geometry?.type === 'Point'
      ? ((f.geometry as Point).coordinates as [number, number])
      : undefined
  return featureName(view.layer.level, f.properties ?? {}, view.state.lang, t, coords)
}

function valueText(id: string): string | null {
  const v = valueOf(id)
  if (v === undefined) return null
  return v === null ? t('map.noData') : formatValue(v, view.scale.unit, view.state.lang)
}

const tooltip = computed(() => {
  const h = hover.value
  if (!h) return null
  return { x: h.point.x, y: h.point.y, name: nameOf(h.id), value: valueText(h.id) }
})

const selected = computed(() => {
  const id = view.state.place
  if (!id || !features.value.has(id)) return null
  // stations carry the API name in `place` (ids are unique per location); others use the id
  const place = String(features.value.get(id)?.properties?.place ?? id)
  return { id, name: nameOf(id), value: valueText(id), place }
})

onMounted(async () => {
  ctl = new MapController(el.value!, view.state.bm)
  ctl.onHover = (h) => (hover.value = h)
  ctl.onClick = (id) => view.set({ place: id })
  ctl.onFit = fitToData
  await router.isReady() // the initial URL is in the store from here on
  fitWithPanel = !!view.state.place
  await ctl.ready()
  activeMap.value = ctl.map
  // dev, or ?debug=1: inspect the map from the browser console (performance checks)
  if (DEBUG) (window as unknown as { __map: unknown }).__map = ctl.map
  ctl.fitUkraine(padding())
  watch([() => view.geometry, () => view.values], render, { immediate: true })
  watch([() => view.scenarioKey, () => view.state.season, () => view.state.dec], recolor)
  watch(
    () => view.scale,
    (s) => ctl?.setScale(s),
  )
  watch(
    () => view.state.place,
    (id) => ctl?.select(id),
  )
  watch(() => ui.zoomTarget, applyZoom)
  watch(
    () => view.state.bm,
    (bm) => ctl?.setBasemap(bm),
    { immediate: true },
  )
  watch(() => view.state.basins, showOutlines, { immediate: true })
  watch(
    () => view.state.lang,
    (lang) => {
      ctl?.setLabelField(lang)
      // the canvas is announced as an image with this description
      ctl?.map.getCanvas().setAttribute('aria-label', t('map.label'))
      ctl?.setFitLabel(t('map.fit'))
    },
    { immediate: true },
  )
})

onBeforeUnmount(() => {
  activeMap.value = null
  ctl?.destroy()
})
</script>

<template>
  <div class="map-wrap">
    <div ref="el" class="map" />
    <div
      v-if="tooltip"
      class="tooltip panel"
      :style="{ transform: `translate(${tooltip.x + 14}px, ${tooltip.y + 14}px)` }"
      role="status"
    >
      <strong>{{ tooltip.name }}</strong>
      <span v-if="tooltip.value">{{ tooltip.value }}</span>
    </div>
    <p v-if="data.loading.size" class="status panel">{{ t('app.loading') }}</p>
    <p v-else-if="data.error" class="status panel error" role="alert">{{ t('app.loadError') }}</p>
    <ChartPanel
      v-if="selected"
      v-show="!ui.dialogOpen"
      :name="selected.name"
      :value="selected.value"
      :place="selected.place"
      @close="view.set({ place: null })"
      @ready="onPanelReady"
    />
  </div>
</template>

<style scoped>
.map-wrap,
.map {
  position: absolute;
  inset: 0;
}
.tooltip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 280px;
  padding: var(--space-2) var(--space-3);
  pointer-events: none;
  font-size: 13px;
}
.status {
  position: absolute;
  top: calc(var(--header-h) + var(--space-3));
  left: 50%;
  transform: translateX(-50%);
  z-index: 6;
  margin: 0;
  padding: var(--space-1) var(--space-3);
  font-size: 13px;
}
.error {
  color: var(--c-danger);
}
:deep(.maplibregl-ctrl-top-right) {
  margin-top: calc(var(--header-h) + 4px);
}
:deep(.maplibregl-ctrl-bottom-right) {
  margin-bottom: env(safe-area-inset-bottom);
}
</style>
