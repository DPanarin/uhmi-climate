<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useViewStore } from '@/stores/view'
import { legendGradient, legendTicks } from '@/map/colors'
import { formatTick } from '@/i18n/format'

const { t } = useI18n()
const view = useViewStore()
const expanded = ref(false) // phones: colour strip until tapped

const range = computed(() => view.scale.legend[view.scenarioKey])
const ticks = computed(() => legendTicks(range.value.start, range.value.end, view.scale.step))
const gradient = computed(() => legendGradient(ticks.value, view.scale))
// keep labels readable: at most ~9 labels
const labelEvery = computed(() => Math.ceil(ticks.value.length / 9))
const baseline = computed(() => view.dataset.baseline.replace('-', '–'))
const title = computed(() => t(`legend.${view.state.var}`, { baseline: baseline.value }))

// publish the legend height so the phone chip bar can sit above it (expanded legend is taller)
const box = ref<HTMLElement>()
const root = document.documentElement.style
const observer = new ResizeObserver(([e]) => {
  root.setProperty('--legend-h', `${Math.ceil(e!.borderBoxSize[0]?.blockSize ?? 0)}px`)
})
watch(box, (el, old) => {
  if (old) observer.unobserve(old)
  if (el) observer.observe(el)
})
onBeforeUnmount(() => {
  observer.disconnect()
  root.removeProperty('--legend-h')
})
</script>

<template>
  <section
    v-if="view.layer.kind === 'polygon'"
    ref="box"
    class="legend panel"
    :class="{ expanded }"
    :aria-label="title"
    @click="expanded = !expanded"
  >
    <p class="title">{{ title }}</p>
    <div class="scale" :style="{ background: gradient }" />
    <ol class="ticks" aria-hidden="true">
      <li
        v-for="(tick, i) in ticks"
        :key="tick"
        :style="{ left: `${(i / (ticks.length - 1)) * 100}%` }"
        :class="{ hidden: i % labelEvery !== 0 && i !== ticks.length - 1 }"
      >
        {{ formatTick(tick, view.state.lang) }}
      </li>
    </ol>
  </section>
  <section v-else ref="box" class="legend panel hint">{{ t('map.pointsHint') }}</section>
</template>

<style scoped>
.legend {
  position: absolute;
  left: var(--space-4);
  bottom: calc(var(--space-6) + env(safe-area-inset-bottom));
  z-index: 5;
  width: min(380px, calc(100vw - 2 * var(--space-4)));
  padding: var(--space-2) var(--space-3) var(--space-3);
  user-select: none;
}
.title {
  margin: 0 0 var(--space-2);
  font-size: 13px;
  font-weight: 600;
}
.scale {
  height: 12px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--c-border);
  /* transparent part of the scale over the basemap colour */
  background-color: #fff;
}
.ticks {
  position: relative;
  height: 18px;
  margin: 2px 6px 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #3a454e;
}
.ticks li {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}
.ticks li.hidden {
  visibility: hidden;
}
.hint {
  font-size: 13px;
  color: var(--c-text-muted);
}
/* tablets: narrower, leaving room for the chart card on the right */
@media (min-width: 600px) and (max-width: 1023px) {
  .legend {
    width: 260px;
  }
}
/* phones: a colour strip; tap for labels */
@media (max-width: 599px) {
  /* above the map attribution */
  .legend {
    left: var(--space-2);
    width: calc(100vw - 2 * var(--space-2));
    bottom: calc(30px + env(safe-area-inset-bottom));
  }
  .legend:not(.hint):not(.expanded) .title,
  .legend:not(.hint):not(.expanded) .ticks {
    display: none;
  }
  .legend:not(.hint):not(.expanded) {
    padding: var(--space-2);
  }
}
</style>
