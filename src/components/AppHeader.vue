<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Info } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import climateIcon from '@/assets/logos/climate.svg'
import uhmiLogo from '@/assets/logos/uhmi.svg'
import labLogo from '@/assets/logos/lab.svg'
import labTextUk from '@/assets/logos/lab-text-uk.svg'
import labTextEn from '@/assets/logos/lab-text-en.svg'

const { t, locale } = useI18n()
const ui = useUiStore()
</script>

<template>
  <header class="header">
    <div class="brand">
      <img :src="climateIcon" alt="" class="icon" width="28" height="28" />
      <h1 class="title">{{ t('app.title') }}</h1>
    </div>
    <div class="logos">
      <button
        type="button"
        class="info"
        :aria-label="t('info.open')"
        :title="t('info.open')"
        @click="ui.infoOpen = true"
      >
        <Info :size="20" aria-hidden="true" />
      </button>
      <img
        :src="uhmiLogo"
        :alt="t('app.institute')"
        :title="t('app.institute')"
        class="logo"
        height="32"
      />
      <span class="lab">
        <img :src="labLogo" alt="" class="logo" height="32" />
        <img
          :src="locale === 'en' ? labTextEn : labTextUk"
          :alt="t('app.lab')"
          class="lab-text"
          height="22"
        />
      </span>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: absolute;
  inset: 0 0 auto 0;
  z-index: 10;
  height: var(--header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 0 var(--space-4);
  background: var(--c-surface-glass);
  border-bottom: 1px solid var(--c-border);
  backdrop-filter: var(--blur);
}
.brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}
.title {
  margin: 0;
  font-size: clamp(15px, 2.2vw, 18px);
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.logos {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-shrink: 0;
}
.info {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--c-border);
  border-radius: 50%;
  background: var(--c-surface);
  color: var(--c-text);
  cursor: pointer;
}
.info:hover {
  box-shadow: var(--shadow-1);
}
.lab {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.logo {
  height: 32px;
  width: auto;
}
.lab-text {
  height: 22px;
  width: auto;
}
/* tablet: logos without captions; phone: institute icon only */
@media (max-width: 1023px) {
  .lab-text {
    display: none;
  }
}
@media (max-width: 599px) {
  .lab {
    display: none;
  }
  .logo {
    height: 28px;
  }
  .icon {
    width: 24px;
    height: 24px;
  }
}
</style>
