<script setup lang="ts" generic="T extends string">
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'

// 2–5 options instead of a dropdown; one is always selected.
defineProps<{ options: { value: T; label: string }[]; label: string }>()
const model = defineModel<T>({ required: true })

function update(v: unknown) {
  if (typeof v === 'string' && v) model.value = v as T // ignore "deselect"
}
</script>

<template>
  <ToggleGroupRoot
    type="single"
    :model-value="model"
    :aria-label="label"
    class="segmented"
    @update:model-value="update"
  >
    <ToggleGroupItem v-for="o in options" :key="o.value" :value="o.value" class="item">
      {{ o.label }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>

<style scoped>
.segmented {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-sm);
  background: rgba(31, 42, 51, 0.07);
}
.item {
  flex: 1 1 0;
  min-width: 0;
  min-height: 40px;
  padding: 0 var(--space-2);
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text);
  font-size: 14px;
  line-height: 1.2;
  cursor: pointer;
  transition:
    background var(--ease),
    box-shadow var(--ease);
}
.item:hover {
  background: rgba(255, 255, 255, 0.6);
}
.item[data-state='on'] {
  background: var(--c-surface);
  box-shadow: var(--shadow-1);
  font-weight: 600;
}
</style>
