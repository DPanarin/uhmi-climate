<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppHeader from '@/components/AppHeader.vue'
import DevSwitcher from '@/components/DevSwitcher.vue'
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
    <DevSwitcher />
    <MapLegend />
  </main>
</template>

<style scoped>
.screen {
  position: relative;
  height: 100dvh;
}
</style>
