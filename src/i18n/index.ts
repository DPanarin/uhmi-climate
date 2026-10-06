import { createI18n } from 'vue-i18n'
import uk from './uk'
import type { Lang } from '@/stores/view-rules'

// Ukrainian is the default and ships with the app; English loads when chosen.
export const i18n = createI18n({
  legacy: false,
  locale: 'uk',
  fallbackLocale: 'uk',
  messages: { uk } as Record<Lang, typeof uk>,
})

const loaded = new Set<Lang>(['uk'])

export async function setLanguage(lang: Lang): Promise<void> {
  if (!loaded.has(lang)) {
    const messages = (await import('./en')).default
    i18n.global.setLocaleMessage(lang, messages)
    loaded.add(lang)
  }
  i18n.global.locale.value = lang
  document.documentElement.lang = lang
}
