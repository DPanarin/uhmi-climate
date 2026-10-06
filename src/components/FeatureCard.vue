<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

// Placeholder for the chart panel (P6): selected feature name and current value.
defineProps<{ name: string; value: string | null }>()
defineEmits<{ close: [] }>()
const { t } = useI18n()
</script>

<template>
  <section class="card panel" :aria-label="name">
    <header class="head">
      <h2 class="name">{{ name }}</h2>
      <button class="close" type="button" :aria-label="t('map.close')" @click="$emit('close')">
        <X :size="18" />
      </button>
    </header>
    <p v-if="value" class="value">{{ value }}</p>
    <p class="soon">{{ t('map.chartSoon') }}</p>
  </section>
</template>

<style scoped>
.card {
  position: absolute;
  right: var(--space-4);
  bottom: calc(var(--space-6) + 72px);
  z-index: 7;
  width: min(360px, calc(100vw - 2 * var(--space-4)));
  padding: var(--space-3) var(--space-4);
}
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}
.name {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}
.close {
  display: grid;
  place-items: center;
  min-width: 32px;
  min-height: 32px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
}
.close:hover {
  background: rgba(0, 0, 0, 0.06);
}
.value {
  margin: var(--space-1) 0 0;
  font-size: 20px;
  font-weight: 600;
}
.soon {
  margin: var(--space-2) 0 0;
  color: var(--c-text-muted);
  font-size: 12px;
}
@media (max-width: 599px) {
  .card {
    left: var(--space-2);
    right: var(--space-2);
    width: auto;
    /* above the legend strip */
    bottom: calc(56px + env(safe-area-inset-bottom));
  }
}
</style>
