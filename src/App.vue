<script setup lang="ts">
import { defineAsyncComponent, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppHeader from '@/components/AppHeader.vue'
import ControlsDialog from '@/components/controls/ControlsDialog.vue'
import MapLegend from '@/components/MapLegend.vue'
import MapView from '@/components/MapView.vue'
import { useUrlSync } from '@/stores/url-sync'
import { useViewStore } from '@/stores/view'
import { useUiStore } from '@/stores/ui'
import { setLanguage } from '@/i18n'

// Loaded on first use
const InfoDialog = defineAsyncComponent(() => import('@/components/InfoDialog.vue'))

const view = useViewStore()
const { t } = useI18n()
const ui = useUiStore()
const infoUsed = ref(false)
watch(
  () => ui.infoOpen,
  (open) => {
    if (open) infoUsed.value = true
  },
)
useUrlSync()

watch(
  () => view.state.lang,
  async (lang) => {
    await setLanguage(lang)
    document.title = t('app.title')
  },
  { immediate: true },
)
</script>

<template>
  <AppHeader />
  <main class="screen">
    <MapView />
    <ControlsDialog />
    <MapLegend />
  </main>
  <InfoDialog v-if="infoUsed" />
</template>

<style scoped>
.screen {
  position: relative;
  height: 100dvh;
}
</style>
