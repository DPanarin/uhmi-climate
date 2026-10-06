<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ChevronUp, Download, LoaderCircle, RotateCw, X } from 'lucide-vue-next'
import { buildLines, toCsv, unitFor, type Mode } from '@/chart/datasets'
import { chartPng, download, downloadCsv } from '@/chart/export'
import { useChartStore } from '@/stores/chart'
import { useViewStore } from '@/stores/view'
import SegmentedControl from '@/components/controls/SegmentedControl.vue'
import { track } from '@/analytics'

// Chart.js loads with this chunk, on the first click only.
const ChartView = defineAsyncComponent(() => import('./ChartView.vue'))

const props = defineProps<{ name: string; value: string | null; place: string }>()
const emit = defineEmits<{ close: []; ready: [] }>()
onMounted(() => emit('ready')) // the map makes room for the panel

const { t } = useI18n()
const view = useViewStore()
const chart = useChartStore()
const chartView = ref<{ canvas: () => HTMLCanvasElement | null } | null>(null)
const expanded = ref(false)

// Re-fetch only when the series can change; scenario and decade are already in the response.
watch(
  () => [view.layer.id, props.place, view.state.var, view.state.season] as const,
  () => {
    void chart.load(view.layer, props.place, view.state)
    track('place_open', { layer: view.layer.id, place: props.place })
  },
  { immediate: true },
)
onBeforeUnmount(() => chart.clear())

const lines = computed(() =>
  chart.status === 'ready'
    ? buildLines({
        ds: view.state.ds,
        variable: view.state.var,
        mode: chart.mode,
        smooth: chart.smooth,
        responses: chart.responses,
        t,
      })
    : [],
)
const unit = computed(() => unitFor(view.state.ds, view.state.var, chart.mode, t))
const decade = computed(() => view.state.dec.split('-').map(Number) as [number, number])
const note = computed(() =>
  view.state.ds === 'proj'
    ? t(chart.mode === 'absolute' ? 'chart.noteDefault' : 'chart.noteAnomaly')
    : '',
)

const modeOptions = computed(() => [
  { value: 'absolute' as Mode, label: t('chart.absolute') },
  { value: 'anomaly' as Mode, label: t('chart.anomaly') },
])
const smoothOptions = computed(() => [
  { value: 'yearly', label: t('chart.yearly') },
  { value: 'moving', label: t('chart.moving') },
])
const smoothModel = computed({
  get: () => (chart.smooth ? 'moving' : 'yearly'),
  set: (v: string) => (chart.smooth = v === 'moving'),
})

const subtitle = computed(() =>
  [
    t(`charts.${view.state.var}`),
    t(`datasets.${view.state.ds}`),
    t(`seasons.${view.state.season}`),
    t(chart.mode === 'absolute' ? 'chart.absolute' : 'chart.anomaly'),
  ].join(' · '),
)
const fileBase = computed(() =>
  `uhmi-${props.place}-${view.state.var}-${view.state.season}-${chart.mode}${chart.smooth ? '-moving' : ''}`.replace(
    /[^\w.-]+/g,
    '_',
  ),
)

function exportCsv() {
  track('export', { kind: 'chart-csv' })
  downloadCsv(`${fileBase.value}.csv`, toCsv(lines.value, unit.value))
}
function exportPng() {
  track('export', { kind: 'chart-png' })
  const canvas = chartView.value?.canvas()
  if (canvas)
    download(
      `${fileBase.value}.png`,
      chartPng(canvas, props.name, subtitle.value, t('chart.source')),
    )
}

// phones: drag the handle up to expand, down to collapse
let startY: number | null = null
function dragStart(e: PointerEvent) {
  startY = e.clientY
}
function dragEnd(e: PointerEvent) {
  if (startY === null) return
  const dy = e.clientY - startY
  if (dy < -40) expanded.value = true
  else if (dy > 40) expanded.value = false
  startY = null
}
</script>

<template>
  <section class="panel chart-panel" :class="{ expanded }" :aria-label="name">
    <div class="handle" aria-hidden="true" @pointerdown="dragStart" @pointerup="dragEnd" />
    <header class="head">
      <div class="titles">
        <h2 class="name">{{ name }}</h2>
        <p class="sub">
          <span v-if="value" class="value">{{ value }}</span>
          <span>{{ subtitle }}</span>
        </p>
      </div>
      <button
        type="button"
        class="icon-btn expand"
        :aria-label="expanded ? t('chart.collapse') : t('chart.expand')"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <component :is="expanded ? ChevronDown : ChevronUp" :size="20" />
      </button>
      <button type="button" class="icon-btn" :aria-label="t('map.close')" @click="$emit('close')">
        <X :size="20" />
      </button>
    </header>

    <div class="toggles">
      <SegmentedControl v-model="chart.mode" :options="modeOptions" :label="t('chart.absolute')" />
      <SegmentedControl v-model="smoothModel" :options="smoothOptions" :label="t('chart.moving')" />
    </div>

    <div class="body">
      <div v-if="chart.status === 'loading'" class="loading" role="status">
        <LoaderCircle :size="28" class="spinner" aria-hidden="true" />
        <span>{{ t('chart.loading') }}</span>
      </div>
      <div v-else-if="chart.status === 'error'" class="error" role="alert">
        <p>{{ t(`chart.errors.${chart.error}`) }}</p>
        <button
          v-if="chart.error === 'unavailable'"
          type="button"
          class="action"
          @click="chart.retry()"
        >
          <RotateCw :size="16" aria-hidden="true" /> {{ t('chart.retry') }}
        </button>
      </div>
      <ChartView
        v-else-if="lines.length"
        ref="chartView"
        :lines="lines"
        :unit="unit"
        :mode="chart.mode"
        :decade="decade"
        :decade-label="t('chart.selectedDecade')"
        :lang="view.state.lang"
      />
    </div>

    <footer class="foot">
      <p class="note">{{ note }}</p>
      <div class="exports">
        <button type="button" class="action" :disabled="!lines.length" @click="exportCsv">
          <Download :size="16" aria-hidden="true" /> {{ t('chart.csv') }}
        </button>
        <button type="button" class="action" :disabled="!lines.length" @click="exportPng">
          <Download :size="16" aria-hidden="true" /> {{ t('chart.png') }}
        </button>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.chart-panel {
  position: absolute;
  right: var(--space-4);
  bottom: var(--space-6);
  z-index: 7;
  width: min(560px, calc(100vw - 2 * var(--space-4)));
  height: min(440px, calc(100dvh - 160px));
  display: flex;
  flex-direction: column;
  padding: var(--space-2) var(--space-3) var(--space-2);
  background: var(--c-surface);
}
.handle {
  display: none;
}
.head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-1);
}
.titles {
  flex: 1;
  min-width: 0;
}
.name {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-2);
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--c-text-muted);
}
.value {
  color: var(--c-text);
  font-weight: 650;
}
.icon-btn {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
}
.icon-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}
.expand {
  display: none;
}
.toggles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  margin: var(--space-2) 0;
}
.toggles :deep(.item) {
  min-height: 32px;
  font-size: 13px;
}
.body {
  flex: 1;
  min-height: 0;
}
.loading {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: var(--space-2);
  height: 100%;
  border-radius: var(--radius-sm);
  background: rgba(31, 42, 51, 0.03);
  color: var(--c-text-muted);
  font-size: 13px;
  /* fast (cached) series: no flash */
  opacity: 0;
  animation: appear 150ms ease 150ms forwards;
}
.spinner {
  color: var(--c-accent);
  animation: spin 0.9s linear infinite;
}
@keyframes appear {
  to {
    opacity: 1;
  }
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
.error {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: var(--space-2);
  height: 100%;
  text-align: center;
  color: var(--c-danger);
}
.error p {
  margin: 0;
}
.foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: var(--space-1);
}
.note {
  margin: 0;
  font-size: 12px;
  color: var(--c-text-muted);
}
.exports {
  display: flex;
  gap: var(--space-1);
  flex: none;
}
.action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  padding: 0 var(--space-2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: 13px;
  cursor: pointer;
}
.action:disabled {
  opacity: 0.4;
  cursor: default;
}
/* tablets: beside the legend (260 px) */
@media (min-width: 600px) and (max-width: 1023px) {
  .chart-panel {
    width: calc(100vw - 260px - 3 * var(--space-4));
  }
}
/* low windows and landscape phones: a full-height side panel on the right */
@media (min-width: 600px) and (max-height: 500px) {
  .chart-panel {
    top: calc(var(--header-h) + var(--space-2));
    bottom: var(--space-2);
    right: var(--space-2);
    width: min(520px, 62vw);
    height: auto;
  }
  .note {
    display: none;
  }
  .toggles {
    margin: var(--space-1) 0;
  }
}
/* phones: bottom sheet at half height, expands to 90 dvh */
@media (max-width: 599px) {
  .chart-panel {
    left: 0;
    right: 0;
    bottom: 0;
    width: auto;
    height: 50dvh;
    padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom));
    border-radius: var(--radius) var(--radius) 0 0;
    transition: height var(--ease);
  }
  .chart-panel.expanded {
    height: 90dvh;
  }
  .handle {
    display: block;
    height: 18px;
    margin: -4px 0 0;
    touch-action: none;
    background: linear-gradient(var(--c-border), var(--c-border)) center / 40px 4px no-repeat;
  }
  .expand {
    display: grid;
  }
  .note {
    display: none;
  }
}
</style>
