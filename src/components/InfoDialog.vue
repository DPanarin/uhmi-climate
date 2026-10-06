<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { X } from 'lucide-vue-next'
import { useDataStore } from '@/stores/data'
import { useUiStore } from '@/stores/ui'
import { useViewStore } from '@/stores/view'

// "Additional information" from the old site: citation, data sources, model table, glossary.
// The HTML is produced by our extractor from a fixed tag whitelist (scripts/extract/info.ts).
const { t } = useI18n()
const ui = useUiStore()
const view = useViewStore()
const data = useDataStore()
const html = ref('')
const failed = ref(false)

async function load() {
  failed.value = false
  try {
    html.value = (await data.load<{ html: string }>(`content/info-${view.state.lang}`)).html
  } catch {
    failed.value = true
  }
}

watch(
  () => [ui.infoOpen, view.state.lang] as const,
  ([open]) => {
    if (open) void load()
  },
)
</script>

<template>
  <DialogRoot v-model:open="ui.infoOpen">
    <DialogPortal>
      <DialogOverlay class="info-overlay" />
      <DialogContent class="info-dialog">
        <header class="info-head">
          <DialogTitle class="info-title">{{ t('info.title') }}</DialogTitle>
          <DialogClose class="info-close" :aria-label="t('controls.close')"
            ><X :size="20"
          /></DialogClose>
        </header>
        <DialogDescription class="visually-hidden">{{ t('info.description') }}</DialogDescription>
        <div class="info-body">
          <p v-if="failed" class="info-status">{{ t('app.loadError') }}</p>
          <p v-else-if="!html" class="info-status">{{ t('app.loading') }}</p>
          <!-- eslint-disable-next-line vue/no-v-html -- whitelisted HTML built by scripts/extract/info.ts -->
          <article v-else class="info-content" v-html="html" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
.info-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(16, 24, 40, 0.4);
}
.info-dialog {
  position: fixed;
  z-index: 31;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(900px, calc(100vw - 2 * var(--space-4)));
  max-height: calc(100dvh - 2 * var(--space-6));
  display: flex;
  flex-direction: column;
  border-radius: var(--radius);
  background: var(--c-surface);
  box-shadow: var(--shadow-2);
  outline: none;
}
.info-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4) var(--space-2) var(--space-6);
  border-bottom: 1px solid var(--c-border);
}
.info-title {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
}
.info-close {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
}
.info-close:hover {
  background: rgba(0, 0, 0, 0.06);
}
.info-body {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--space-2) var(--space-6) var(--space-6);
}
.info-status {
  color: var(--c-text-muted);
}
.info-content {
  font-size: 15px;
  line-height: 1.55;
}
.info-content h3 {
  margin: var(--space-6) 0 var(--space-2);
  font-size: 17px;
}
.info-content p {
  margin: 0 0 var(--space-2);
}
.info-content a {
  color: var(--c-accent);
  overflow-wrap: anywhere;
}
.info-content em {
  font-weight: 600;
}
.info-content table {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  margin: var(--space-2) 0 var(--space-4);
  border-collapse: collapse;
  font-size: 13px;
}
.info-content th,
.info-content td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--c-border);
  text-align: left;
  white-space: nowrap;
}
.info-content th {
  background: rgba(31, 42, 51, 0.06);
}
@media (max-width: 599px) {
  .info-dialog {
    top: auto;
    bottom: 0;
    left: 0;
    transform: none;
    width: 100%;
    max-height: 90dvh;
    border-radius: var(--radius) var(--radius) 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .info-head,
  .info-body {
    padding-left: var(--space-4);
    padding-right: var(--space-4);
  }
}
</style>
