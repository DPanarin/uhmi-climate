<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CheckboxIndicator,
  CheckboxRoot,
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'
import { Check, ChevronDown, Download, SlidersHorizontal, X } from 'lucide-vue-next'
import {
  SCENARIOS,
  SEASONS,
  type DatasetId,
  type Scenario,
  type Season,
  type VariableId,
} from '@/config/layers'
import { useViewStore } from '@/stores/view'
import { useUiStore } from '@/stores/ui'
import type { Lang } from '@/stores/view-rules'
import { useExportPng } from '@/map/use-export'
import { BASEMAP_IDS, type BasemapId } from '@/config/map'
import SegmentedControl from './SegmentedControl.vue'
import LevelPicker from './LevelPicker.vue'
import DecadeSlider from './DecadeSlider.vue'
import TerritorySearch from './TerritorySearch.vue'
import DecadeStepper from './DecadeStepper.vue'

const { t } = useI18n()
const view = useViewStore()
const ui = useUiStore()
const exportPng = useExportPng()

function openInfo() {
  ui.dialogOpen = false
  ui.infoOpen = true
}

// The dialog writes to the store directly: changes apply at once, no "Apply" button.
const field = <K extends 'ds' | 'var' | 'rcp' | 'season' | 'lang'>(key: K) =>
  computed({
    get: () => view.state[key],
    set: (v) => view.set({ [key]: v }),
  })
const ds = field('ds')
const variable = field('var')
const rcp = field('rcp')
const season = field('season')
const lang = field('lang')
const bm = computed({
  get: () => view.state.bm,
  set: (v: BasemapId) => view.set({ bm: v }),
})
const basins = computed({
  get: () => view.state.basins,
  set: (v: boolean) => view.set({ basins: v }),
})
const basemapOptions = computed(() =>
  BASEMAP_IDS.map((b) => ({ value: b, label: t(`controls.basemaps.${b}`) })),
)

const datasetOptions = computed(() =>
  (['proj', 'obs'] as DatasetId[]).map((d) => ({
    value: d,
    label: t(`controls.datasetShort.${d}`),
  })),
)
const variableOptions = computed(() =>
  (['tas', 'pr'] as VariableId[]).map((v) => ({
    value: v,
    label: t(`controls.variableShort.${v}`),
  })),
)
const scenarioOptions = computed(() =>
  SCENARIOS.map((s): { value: Scenario; label: string } => ({
    value: s,
    label: t(`scenarios.${s}`),
  })),
)
const seasonOptions = computed(() =>
  SEASONS.map((s): { value: Season; label: string } => ({ value: s, label: t(`seasons.${s}`) })),
)
const langOptions: { value: Lang; label: string }[] = [
  { value: 'uk', label: 'UA' },
  { value: 'en', label: 'EN' },
]

/** Chip text: "Температура · RCP8.5 · Рік · Області" (full text in aria-label). */
const summary = computed(() => {
  const v = view.state
  return [
    t(`controls.variableShort.${v.var}`),
    ...(v.ds === 'proj' ? [t(`scenarios.${v.rcp}`)] : [t('controls.datasetShort.obs')]),
    t(`seasons.${v.season}`),
    t(`levels.${v.lvl}`),
  ].join(' · ')
})
const summaryFull = computed(
  () =>
    `${t('controls.open')}: ${t(`datasets.${view.state.ds}`)}, ${summary.value}, ${view.state.dec.replace('-', '–')}`,
)

const isPhone = () => window.matchMedia('(max-width: 599px)').matches

/** Focus search on open; on phones the title, so the keyboard doesn't pop up. */
function onOpenFocus(e: Event) {
  e.preventDefault()
  if (isPhone()) document.querySelector<HTMLElement>('.sheet .title')?.focus()
  else document.getElementById('territory-search')?.focus()
}

// phones: swipe the handle down to close the sheet
const drag = ref(0)
let startY: number | null = null
function dragStart(e: PointerEvent) {
  startY = e.clientY
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function dragMove(e: PointerEvent) {
  if (startY !== null) drag.value = Math.max(0, e.clientY - startY)
}
function dragEnd() {
  if (drag.value > 80) ui.dialogOpen = false
  drag.value = 0
  startY = null
}
</script>

<template>
  <DialogRoot v-model:open="ui.dialogOpen">
    <div class="bar" :class="{ hidden: ui.dialogOpen }">
      <DialogTrigger class="chip panel" :aria-label="summaryFull">
        <SlidersHorizontal :size="18" aria-hidden="true" />
        <span class="chip-text">{{ summary }}</span>
      </DialogTrigger>
      <DecadeStepper v-if="ui.stepperVisible" />
    </div>

    <DialogPortal>
      <DialogOverlay class="overlay" />
      <DialogContent
        class="sheet"
        :style="drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined"
        @open-auto-focus="onOpenFocus"
      >
        <div
          class="handle"
          aria-hidden="true"
          @pointerdown="dragStart"
          @pointermove="dragMove"
          @pointerup="dragEnd"
          @pointercancel="dragEnd"
        />
        <header class="head">
          <DialogTitle class="title" tabindex="-1">{{ t('controls.title') }}</DialogTitle>
          <DialogClose class="close" :aria-label="t('controls.close')"
            ><X :size="20"
          /></DialogClose>
        </header>
        <DialogDescription class="visually-hidden">{{ t('controls.open') }}</DialogDescription>

        <div class="body">
          <TerritorySearch />

          <fieldset>
            <legend>{{ t('view.dataset') }}</legend>
            <SegmentedControl v-model="ds" :options="datasetOptions" :label="t('view.dataset')" />
            <p class="hint">{{ t(`controls.datasetHint.${view.state.ds}`) }}</p>
          </fieldset>

          <fieldset>
            <legend>{{ t('view.variable') }}</legend>
            <SegmentedControl
              v-model="variable"
              :options="variableOptions"
              :label="t('view.variable')"
            />
          </fieldset>

          <fieldset>
            <legend>{{ t('view.level') }}</legend>
            <LevelPicker />
          </fieldset>

          <fieldset v-if="view.state.ds === 'proj'">
            <legend>{{ t('view.scenario') }}</legend>
            <SegmentedControl
              v-model="rcp"
              :options="scenarioOptions"
              :label="t('view.scenario')"
            />
            <p class="hint">{{ t(`controls.scenarioHint.${view.state.rcp}`) }}</p>
          </fieldset>

          <fieldset>
            <legend>{{ t('view.season') }}</legend>
            <SegmentedControl v-model="season" :options="seasonOptions" :label="t('view.season')" />
          </fieldset>

          <fieldset>
            <legend>{{ t('view.decade') }}</legend>
            <DecadeSlider />
          </fieldset>

          <fieldset>
            <legend>{{ t('controls.basemap') }}</legend>
            <SegmentedControl
              v-model="bm"
              :options="basemapOptions"
              :label="t('controls.basemap')"
            />
            <label class="check">
              <CheckboxRoot v-model="basins" class="box">
                <CheckboxIndicator><Check :size="16" /></CheckboxIndicator>
              </CheckboxRoot>
              {{ t('controls.basinOutlines') }}
            </label>
          </fieldset>

          <fieldset>
            <legend>{{ t('controls.general') }}</legend>
            <label class="check">
              <CheckboxRoot v-model="ui.stepperVisible" class="box">
                <CheckboxIndicator><Check :size="16" /></CheckboxIndicator>
              </CheckboxRoot>
              {{ t('controls.showStepper') }}
            </label>
            <div class="row">
              <SegmentedControl
                v-model="lang"
                :options="langOptions"
                :label="t('view.language')"
                class="lang"
              />
              <button type="button" class="action" @click="exportPng">
                <Download :size="18" aria-hidden="true" />{{ t('view.exportPng') }}
              </button>
            </div>
            <CollapsibleRoot class="about">
              <CollapsibleTrigger class="about-trigger">
                {{ t('controls.about') }} <ChevronDown :size="18" aria-hidden="true" class="chev" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p class="about-text">{{ t('controls.aboutText') }}</p>
                <button type="button" class="info-link" @click="openInfo">
                  {{ t('info.link') }}
                </button>
              </CollapsibleContent>
            </CollapsibleRoot>
          </fieldset>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
/* chip + stepper: top left; phones: bottom centre above the legend strip */
.bar {
  position: absolute;
  top: calc(var(--header-h) + var(--space-3));
  left: var(--space-4);
  z-index: 8;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  max-width: calc(100vw - 2 * var(--space-4) - 50px);
}
.bar.hidden {
  visibility: hidden;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 48px;
  max-width: 100%;
  padding: 0 var(--space-4);
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.chip:hover {
  box-shadow: var(--shadow-2);
}
.chip-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
@media (max-width: 599px) {
  .bar {
    top: auto;
    left: 50%;
    bottom: calc(64px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    justify-content: center;
    width: calc(100vw - 2 * var(--space-2));
    max-width: none;
  }
}

/* dialog: side panel on the right (desktop 400 px, tablet 360 px), bottom sheet on phones */
:global(.overlay) {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(16, 24, 40, 0.18);
}
:global(.sheet) {
  position: fixed;
  z-index: 21;
  top: var(--space-2);
  right: var(--space-2);
  bottom: var(--space-2);
  width: 400px;
  max-width: calc(100vw - 2 * var(--space-2));
  display: flex;
  flex-direction: column;
  border-radius: var(--radius);
  background: var(--c-surface);
  box-shadow: var(--shadow-2);
  outline: none;
  transition: transform 180ms ease;
}
@media (max-width: 1023px) {
  :global(.sheet) {
    width: 360px;
  }
}
@media (max-width: 599px) {
  :global(.sheet) {
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    width: auto;
    max-width: none;
    max-height: 75dvh;
    border-radius: var(--radius) var(--radius) 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
}
/* landscape phones and low windows: side panel instead of a sheet */
@media (max-width: 899px) and (max-height: 500px) {
  :global(.sheet) {
    top: 0;
    bottom: 0;
    left: auto;
    right: 0;
    width: 360px;
    max-height: none;
    border-radius: var(--radius) 0 0 var(--radius);
  }
}
.handle {
  display: none;
}
@media (max-width: 599px) {
  .handle {
    display: block;
    flex: none;
    width: 100%;
    height: 22px;
    touch-action: none;
    cursor: grab;
    background: linear-gradient(var(--c-border), var(--c-border)) center / 40px 4px no-repeat;
  }
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4) var(--space-2);
}
.title {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  outline: none;
}
.close {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
}
.close:hover {
  background: rgba(0, 0, 0, 0.06);
}
.body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 var(--space-4) var(--space-4);
  display: grid;
  gap: var(--space-4);
  align-content: start;
}
fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
legend {
  padding: 0;
  margin-bottom: var(--space-2);
  font-size: 13px;
  font-weight: 650;
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.hint {
  margin: var(--space-2) 0 0;
  font-size: 13px;
  color: var(--c-text-muted);
}
.check {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 44px;
  font-size: 14px;
  cursor: pointer;
}
.box {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  border: 1.5px solid var(--c-accent);
  border-radius: 5px;
  background: var(--c-surface);
  color: var(--c-surface);
  cursor: pointer;
}
.box[data-state='checked'] {
  background: var(--c-accent);
}
.row {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.lang {
  flex: 0 0 112px;
}
.action {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 46px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  font-size: 14px;
  cursor: pointer;
}
.action:hover {
  background: rgba(0, 0, 0, 0.04);
}
.about {
  margin-top: var(--space-3);
}
.about-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.about-trigger[data-state='open'] .chev {
  transform: rotate(180deg);
}
.info-link {
  margin-top: var(--space-2);
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--c-accent);
  font-size: 14px;
  text-decoration: underline;
  cursor: pointer;
}
.about-text {
  margin: 0;
  font-size: 14px;
  color: var(--c-text-muted);
}
</style>
