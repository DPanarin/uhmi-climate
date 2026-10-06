<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <main class="placeholder">
    <h1>{{ t('app.title') }}</h1>
    <p>{{ t('app.placeholder') }}</p>
  </main>
</template>

<style scoped>
.placeholder {
  display: grid;
  place-content: center;
  min-height: 100dvh;
  padding: 16px;
  text-align: center;
  font-family: system-ui, sans-serif;
}
</style>
