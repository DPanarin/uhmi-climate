<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { LoaderCircle } from 'lucide-vue-next'
import { LEVELS, findLayer, geometryFile, type LevelId } from '@/config/layers'
import { useDataStore } from '@/stores/data'
import { useViewStore } from '@/stores/view'

const { t } = useI18n()
const view = useViewStore()
const data = useDataStore()

const items = computed(() =>
  LEVELS.map((level) => {
    const layer = findLayer(view.state.ds, level)
    const reason = layer
      ? ''
      : t(view.state.ds === 'proj' ? 'controls.onlyObs' : 'controls.onlyProj')
    const loading = !!layer && data.loading.has(geometryFile(layer, view.state.var))
    return { level, disabled: !layer, reason, loading }
  }),
)

const model = computed({
  get: () => view.state.lvl,
  set: (lvl: LevelId) => view.set({ lvl }),
})

/** Radio-group convention: arrow keys select as they move (Reka only moves focus). */
function onArrow(e: KeyboardEvent) {
  if (!e.key.startsWith('Arrow')) return
  requestAnimationFrame(() => {
    const id = (document.activeElement as HTMLElement | null)?.id ?? ''
    if (id.startsWith('level-')) model.value = id.slice(6) as LevelId
  })
}
</script>

<template>
  <RadioGroupRoot v-model="model" class="levels" :aria-label="t('view.level')" @keydown="onArrow">
    <RadioGroupItem
      v-for="i in items"
      :id="`level-${i.level}`"
      :key="i.level"
      :value="i.level"
      :disabled="i.disabled"
      class="level"
    >
      <span class="dot"><RadioGroupIndicator class="dot-on" /></span>
      <span class="name">
        {{ t(`levels.${i.level}`) }}
        <small v-if="i.reason" class="reason">{{ i.reason }}</small>
      </span>
      <LoaderCircle v-if="i.loading" class="spin" :size="16" aria-hidden="true" />
    </RadioGroupItem>
  </RadioGroupRoot>
</template>

<style scoped>
.levels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.level {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 var(--space-2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  text-align: left;
  font-size: 14px;
  cursor: pointer;
}
.level[data-state='checked'] {
  border-color: var(--c-accent);
  box-shadow: inset 0 0 0 1px var(--c-accent);
  font-weight: 600;
}
.level[data-disabled] {
  cursor: not-allowed;
  color: var(--c-text-muted);
  background: transparent;
}
.dot {
  display: grid;
  place-items: center;
  flex: none;
  width: 16px;
  height: 16px;
  border: 1.5px solid currentColor;
  border-radius: 50%;
}
.dot-on {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-accent);
}
.name {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}
.reason {
  font-size: 12px;
  font-weight: 400;
}
.spin {
  margin-left: auto;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 359px) {
  .levels {
    grid-template-columns: 1fr;
  }
}
</style>
