<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxRoot,
  ComboboxViewport,
} from 'reka-ui'
import { Search } from 'lucide-vue-next'
import { search, type SearchEntry } from '@/search/search'
import { useDataStore } from '@/stores/data'
import { useViewStore } from '@/stores/view'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const view = useViewStore()
const ui = useUiStore()
const data = useDataStore()

const term = ref('')
const open = ref(false)
watch(term, (v) => (open.value = v.trim().length > 0))
const entries = shallowRef<SearchEntry[] | null>(null)
const loading = ref(false)

/** The index (~70 KB gzip) loads on first focus only. */
async function ensureIndex() {
  if (entries.value || loading.value) return
  loading.value = true
  try {
    entries.value = await data.load<SearchEntry[]>('search-index')
  } finally {
    loading.value = false
  }
}

const oblasts = computed(
  () => new Map((entries.value ?? []).filter((e) => e.level === 'oblasts').map((e) => [e.id, e])),
)
const hits = computed(() =>
  entries.value ? search(entries.value, term.value, view.state.ds).map((h) => h.entry) : [],
)

const name = (e: SearchEntry) => e[view.state.lang] || e.uk
function detail(e: SearchEntry): string {
  const lang = view.state.lang
  const parts: string[] = [t(`levelOne.${e.level}`)]
  if (e.oblast && e.level !== 'oblasts') {
    const o = oblasts.value.get(e.oblast)
    if (o) parts.push(o[lang] || o.uk)
  }
  if (e.parent) parts.push(e.parent[lang] || e.parent.uk)
  return parts.join(' · ')
}

/** Splits a name into parts with the matched text marked (apostrophes in any form match). */
function highlight(text: string): { s: string; hit: boolean }[] {
  const q = term.value.trim().replace(/['’ʼ`´‘]/g, '')
  if (!q) return [{ s: text, hit: false }]
  const pattern = [...q].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("['’ʼ`´‘]?")
  const m = new RegExp(pattern, 'iu').exec(text)
  if (!m) return [{ s: text, hit: false }]
  return [
    { s: text.slice(0, m.index), hit: false },
    { s: m[0], hit: true },
    { s: text.slice(m.index + m[0].length), hit: false },
  ]
}

function choose(e: SearchEntry | undefined) {
  if (!e) return
  // a station may only have series for the other variable
  const v = e.vars && !e.vars.includes(view.state.var) ? e.vars[0] : view.state.var
  view.set({ lvl: e.level, var: v, place: e.id })
  ui.zoomTarget = { id: e.id, bbox: e.bbox }
  ui.dialogOpen = false
  term.value = ''
}
</script>

<template>
  <ComboboxRoot
    v-model:open="open"
    :ignore-filter="true"
    :reset-search-term-on-blur="false"
    class="search"
    @update:model-value="(v) => choose(v as SearchEntry | undefined)"
  >
    <label for="territory-search" class="visually-hidden">{{ t('controls.search') }}</label>
    <ComboboxAnchor class="anchor">
      <Search :size="18" aria-hidden="true" class="icon" />
      <ComboboxInput
        id="territory-search"
        v-model="term"
        class="input"
        :placeholder="t('controls.searchPlaceholder')"
        autocomplete="off"
        @focus="ensureIndex"
      />
    </ComboboxAnchor>
    <ComboboxContent class="results" position="inline">
      <ComboboxViewport>
        <ComboboxEmpty class="empty">
          {{ loading ? t('controls.searchLoading') : t('controls.noResults') }}
        </ComboboxEmpty>
        <ComboboxItem
          v-for="e in hits"
          :key="`${e.level}:${e.id}`"
          :value="e"
          :text-value="name(e)"
          class="hit"
        >
          <span class="hit-name">
            <template v-for="(p, i) in highlight(name(e))" :key="i">
              <mark v-if="p.hit">{{ p.s }}</mark>
              <template v-else>{{ p.s }}</template>
            </template>
          </span>
          <span class="hit-detail">{{ detail(e) }}</span>
        </ComboboxItem>
      </ComboboxViewport>
    </ComboboxContent>
  </ComboboxRoot>
</template>

<style scoped>
.search {
  position: relative;
}
.anchor {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 var(--space-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
}
.anchor:focus-within {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 2px rgba(41, 75, 103, 0.2);
}
.icon {
  flex: none;
  color: var(--c-text-muted);
}
.input {
  flex: 1;
  min-width: 0;
  height: 42px;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 16px; /* no zoom-in on iOS */
}
.results {
  margin-top: var(--space-1);
  max-height: 320px;
  overflow: auto;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  box-shadow: var(--shadow-2);
}
.empty {
  padding: var(--space-3);
  color: var(--c-text-muted);
}
.hit {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 48px;
  padding: var(--space-1) var(--space-3);
  cursor: pointer;
}
.hit[data-highlighted] {
  background: rgba(41, 75, 103, 0.09);
}
.hit-name {
  font-size: 14px;
}
.hit-name mark {
  background: rgba(220, 230, 83, 0.6);
  color: inherit;
  border-radius: 2px;
}
.hit-detail {
  font-size: 12px;
  color: var(--c-text-muted);
}
</style>
