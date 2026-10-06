// Numbers in the UI language (decimal comma in Ukrainian), with an explicit sign for anomalies.
import type { Lang } from '@/stores/view-rules'

const cache = new Map<string, Intl.NumberFormat>()

function nf(lang: Lang, digits: number): Intl.NumberFormat {
  const key = `${lang}:${digits}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', {
      maximumFractionDigits: digits,
      signDisplay: 'exceptZero',
    })
    cache.set(key, f)
  }
  return f
}

export function formatValue(v: number, unit: string, lang: Lang, digits = 2): string {
  return `${nf(lang, digits).format(v)} ${unit}`
}

/** Legend tick labels: sign only for negatives, as on the old site. */
export function formatTick(v: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', {
    maximumFractionDigits: 1,
  }).format(v)
}
