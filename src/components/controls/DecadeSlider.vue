<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { useViewStore } from '@/stores/view'

const { t } = useI18n()
const view = useViewStore()
const decades = computed(() => view.dataset.decades)
const label = (d: string) => d.replace('-', '–')

const model = computed({
  get: () => [Math.max(0, decades.value.indexOf(view.state.dec))],
  set: (v: number[] | undefined) => {
    const d = decades.value[v?.[0] ?? 0]
    if (d) view.set({ dec: d })
  },
})
</script>

<template>
  <div class="slider">
    <output class="current" aria-hidden="true">{{ label(view.state.dec) }}</output>
    <SliderRoot
      v-model="model"
      :min="0"
      :max="decades.length - 1"
      :step="1"
      class="root"
      :aria-label="t('view.decade')"
    >
      <SliderTrack class="track"><SliderRange class="range" /></SliderTrack>
      <SliderThumb
        class="thumb"
        :aria-label="t('view.decade')"
        :aria-valuetext="label(view.state.dec)"
      />
    </SliderRoot>
    <div class="ends" aria-hidden="true">
      <span>{{ label(decades[0]!) }}</span>
      <span>{{ label(decades[decades.length - 1]!) }}</span>
    </div>
  </div>
</template>

<style scoped>
.current {
  display: block;
  margin-bottom: var(--space-1);
  font-size: 16px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.root {
  position: relative;
  display: flex;
  align-items: center;
  height: 44px;
  touch-action: none;
  user-select: none;
}
.track {
  position: relative;
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(31, 42, 51, 0.15);
}
.range {
  position: absolute;
  height: 100%;
  border-radius: 3px;
  background: var(--c-accent);
}
.thumb {
  display: block;
  width: 24px;
  height: 24px;
  border: 2px solid var(--c-accent);
  border-radius: 50%;
  background: var(--c-surface);
  box-shadow: var(--shadow-1);
  cursor: grab;
}
.ends {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--c-text-muted);
}
</style>
