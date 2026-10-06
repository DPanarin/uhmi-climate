<script setup lang="ts">
// TEMPORARY (P3–P4): plain selects to switch the view until the controls dialog arrives in P5.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { LAYERS, SEASONS, SCENARIOS, type DatasetId, type LevelId } from '@/config/layers'
import { useViewStore } from '@/stores/view'
import { useExportPng } from '@/map/use-export'

const { t } = useI18n()
const view = useViewStore()
const levels = computed(() => LAYERS.filter((l) => l.dataset === view.state.ds))
const field = <K extends keyof typeof view.state>(key: K) =>
  computed({
    get: () => view.state[key],
    set: (v) => view.set({ [key]: v }),
  })
const ds = field('ds')
const lvl = field('lvl')
const variable = field('var')
const rcp = field('rcp')
const season = field('season')
const dec = field('dec')
const lang = field('lang')
const exportPng = useExportPng()
</script>

<template>
  <form class="dev panel" :aria-label="t('dev.note')" @submit.prevent>
    <label
      >{{ t('view.dataset') }}
      <select v-model="ds">
        <option v-for="d in ['proj', 'obs'] as DatasetId[]" :key="d" :value="d">
          {{ t(`datasets.${d}`) }}
        </option>
      </select>
    </label>
    <label
      >{{ t('view.variable') }}
      <select v-model="variable">
        <option value="tas">{{ t('variables.tas') }}</option>
        <option value="pr">{{ t('variables.pr') }}</option>
      </select>
    </label>
    <label
      >{{ t('view.level') }}
      <select v-model="lvl">
        <option v-for="l in levels" :key="l.id" :value="l.level as LevelId">
          {{ t(l.labelKey) }}
        </option>
      </select>
    </label>
    <label v-if="view.state.ds === 'proj'"
      >{{ t('view.scenario') }}
      <select v-model="rcp">
        <option v-for="s in SCENARIOS" :key="s" :value="s">{{ t(`scenarios.${s}`) }}</option>
      </select>
    </label>
    <label
      >{{ t('view.season') }}
      <select v-model="season">
        <option v-for="s in SEASONS" :key="s" :value="s">{{ t(`seasons.${s}`) }}</option>
      </select>
    </label>
    <label
      >{{ t('view.decade') }}
      <select v-model="dec">
        <option v-for="d in view.dataset.decades" :key="d" :value="d">
          {{ d.replace('-', '–') }}
        </option>
      </select>
    </label>
    <label
      >{{ t('view.language') }}
      <select v-model="lang">
        <option value="uk">UA</option>
        <option value="en">EN</option>
      </select>
    </label>
    <button type="button" @click="exportPng">{{ t('view.exportPng') }}</button>
    <small>{{ t('dev.note') }}</small>
  </form>
</template>

<style scoped>
.dev {
  position: absolute;
  top: calc(var(--header-h) + var(--space-3));
  left: var(--space-4);
  z-index: 8;
  display: grid;
  gap: var(--space-1);
  width: 230px;
  max-height: calc(100dvh - var(--header-h) - 140px);
  overflow: auto;
  padding: var(--space-2) var(--space-3);
  font-size: 12px;
}
label {
  display: grid;
  gap: 2px;
}
select {
  min-height: 28px;
}
small {
  color: var(--c-text-muted);
}
@media (max-width: 599px) {
  .dev {
    width: 170px;
  }
}
</style>
