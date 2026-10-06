// Google Analytics 4 adapter; loaded only when VITE_GA_ID is set.
import type { AnalyticsEvent } from './index'

type Gtag = (...args: unknown[]) => void

export function createGtagSender(id: string) {
  const w = window as unknown as { dataLayer: unknown[]; gtag: Gtag }
  w.dataLayer = w.dataLayer || []
  w.gtag = function gtag() {
    // gtag expects the arguments object itself
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments)
  }
  w.gtag('js', new Date())
  w.gtag('config', id, { anonymize_ip: true })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(s)
  return (event: AnalyticsEvent, params: Record<string, string | number | boolean>) =>
    w.gtag('event', event, params)
}
