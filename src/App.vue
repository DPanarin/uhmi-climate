<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppHeader from '@/components/AppHeader.vue'
import InfoDialog from '@/components/InfoDialog.vue'
import ControlsDialog from '@/components/controls/ControlsDialog.vue'
import MapLegend from '@/components/MapLegend.vue'
import MapView from '@/components/MapView.vue'
import { useUrlSync } from '@/stores/url-sync'
import { useViewStore } from '@/stores/view'

const view = useViewStore()
const { locale, t } = useI18n()
useUrlSync()

watch(
  () => view.state.lang,
  (lang) => {
    locale.value = lang
    document.documentElement.lang = lang
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
  <InfoDialog />
</template>

<style scoped>
.screen {
  position: relative;
  height: 100dvh;
}
</style>
