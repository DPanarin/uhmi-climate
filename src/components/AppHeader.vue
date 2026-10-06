<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Info } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import climateIcon from '@/assets/logos/climate.svg'
import uhmiLogo from '@/assets/logos/uhmi.svg'
import labLogo from '@/assets/logos/lab.svg'
import labTextUk from '@/assets/logos/lab-text-uk.svg'
import labTextEn from '@/assets/logos/lab-text-en.svg'

// App title on the left; both organisations on the right, divided by a vertical line; info button last.
const { t, locale } = useI18n()
const ui = useUiStore()
</script>

<template>
  <header class="header">
    <div class="brand">
      <img :src="climateIcon" alt="" class="icon" width="28" height="28" />
      <h1 class="title">{{ t('app.title') }}</h1>
    </div>

    <div class="end">
      <div class="orgs">
        <div class="org">
          <img :src="uhmiLogo" alt="" class="logo" width="31" height="36" />
          <span class="org-name">
            <span>{{ t('app.institute') }}</span>
            <span>{{ t('app.instituteSub') }}</span>
          </span>
        </div>
        <span class="divider" aria-hidden="true" />
        <div class="org lab">
          <img :src="labLogo" alt="" class="logo" width="28" height="36" />
          <img
            :src="locale === 'en' ? labTextEn : labTextUk"
            :alt="t('app.lab')"
            class="lab-text"
            height="22"
          />
        </div>
      </div>
      <button
        type="button"
        class="info"
        :aria-label="t('info.open')"
        :title="t('info.open')"
        @click="ui.infoOpen = true"
      >
        <Info :size="20" aria-hidden="true" />
      </button>
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
  gap: var(--space-4);
  padding: 0 var(--space-4);
  background: var(--c-surface-glass);
  border-bottom: 1px solid var(--c-border);
  backdrop-filter: var(--blur);
}
.orgs {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
}
.org {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}
.org-name {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  color: #404040;
}
.divider {
  flex: none;
  width: 1px;
  height: 34px;
  background: rgba(31, 42, 51, 0.35);
}
.logo {
  height: 34px;
  width: auto;
  flex: none;
}
.lab-text {
  height: 22px;
  width: auto;
}
.end {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}
.title {
  margin: 0;
  font-size: clamp(15px, 1.8vw, 18px);
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.info {
  display: grid;
  place-items: center;
  flex: none;
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
/* narrow desktop: institute name only on one line */
@media (max-width: 1279px) {
  .org-name span + span {
    display: none;
  }
}
/* tablet: logos without captions */
@media (max-width: 1023px) {
  .org-name,
  .lab-text {
    display: none;
  }
}
/* phone: institute emblem + title */
@media (max-width: 599px) {
  .header {
    gap: var(--space-2);
    padding: 0 var(--space-2) 0 var(--space-3);
  }
  .divider,
  .lab {
    display: none;
  }
  .logo {
    height: 28px;
  }
  .icon {
    display: none;
  }
}
</style>
