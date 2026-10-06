<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DialogRoot, DialogTrigger } from 'reka-ui'
import { SlidersHorizontal } from 'lucide-vue-next'
import { useViewStore } from '@/stores/view'
import { useUiStore } from '@/stores/ui'
import DecadeStepper from './DecadeStepper.vue'

// The chip and stepper are on screen from the start; the dialog content loads on first open.
const ControlsPanel = defineAsyncComponent(() => import('./ControlsPanel.vue'))

const { t } = useI18n()
const view = useViewStore()
const ui = useUiStore()
const opened = ref(ui.dialogOpen)
watch(
  () => ui.dialogOpen,
  (open) => {
    if (open) opened.value = true
  },
)

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
</script>

<template>
  <DialogRoot v-model:open="ui.dialogOpen">
    <div class="bar" :class="{ hidden: ui.dialogOpen, 'over-sheet': !!view.state.place }">
      <DialogTrigger class="chip panel" :aria-label="summaryFull">
        <SlidersHorizontal :size="18" aria-hidden="true" />
        <span class="chip-text">{{ summary }}</span>
      </DialogTrigger>
      <DecadeStepper v-if="ui.stepperVisible" />
    </div>
    <ControlsPanel v-if="opened" />
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
  border-radius: var(--radius);
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
/* low windows with a chart side panel (62vw): keep to the free area on the left */
@media (min-width: 600px) and (max-height: 500px) {
  .bar.over-sheet {
    max-width: calc(38vw - 2 * var(--space-4));
  }
}
@media (max-width: 599px) {
  .bar {
    top: auto;
    left: 50%;
    /* above the legend strip and the attribution */
    bottom: calc(72px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    justify-content: center;
    width: calc(100vw - 2 * var(--space-2));
    max-width: none;
  }
  /* a chart sheet (50 dvh) is open: sit just above it */
  .bar.over-sheet {
    bottom: calc(50dvh + var(--space-2));
  }
}
</style>
