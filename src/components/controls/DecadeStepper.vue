<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-vue-next'
import { useViewStore } from '@/stores/view'

// On-map copy of the decade slider: writes the same store field. Arrow keys work when focused.
const { t } = useI18n()
const view = useViewStore()
const decades = computed(() => view.dataset.decades)
const index = computed(() => decades.value.indexOf(view.state.dec))
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function go(delta: number) {
  const d = decades.value[index.value + delta]
  if (d) view.set({ dec: d })
}

const playing = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
function stop() {
  playing.value = false
  clearInterval(timer)
}
function toggle() {
  if (playing.value) return stop()
  if (index.value >= decades.value.length - 1) view.set({ dec: decades.value[0]! })
  playing.value = true
  timer = setInterval(() => {
    if (index.value >= decades.value.length - 1) stop()
    else go(1)
  }, 1200)
}
watch(() => view.state.ds, stop)
onBeforeUnmount(stop)

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') go(-1)
  else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') go(1)
  else return
  e.preventDefault()
}
</script>

<template>
  <div class="stepper panel" role="group" :aria-label="t('stepper.label')" @keydown="onKey">
    <button
      type="button"
      class="btn"
      :disabled="index <= 0"
      :aria-label="t('stepper.prev')"
      @click="go(-1)"
    >
      <ChevronLeft :size="20" />
    </button>
    <output class="value" aria-live="polite">{{ view.state.dec.replace('-', '–') }}</output>
    <button
      type="button"
      class="btn"
      :disabled="index >= decades.length - 1"
      :aria-label="t('stepper.next')"
      @click="go(1)"
    >
      <ChevronRight :size="20" />
    </button>
    <button
      v-if="!reducedMotion"
      type="button"
      class="btn play"
      :aria-label="playing ? t('stepper.pause') : t('stepper.play')"
      :aria-pressed="playing"
      @click="toggle"
    >
      <component :is="playing ? Pause : Play" :size="18" />
    </button>
  </div>
</template>

<style scoped>
.stepper {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
}
.btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
}
.btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
}
.btn:disabled {
  opacity: 0.35;
  cursor: default;
}
/* nested in the 12 px box with 2 px padding */
.btn {
  border-radius: calc(var(--radius) - 2px);
}
.value {
  min-width: 92px;
  text-align: center;
  font-size: 15px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
</style>
