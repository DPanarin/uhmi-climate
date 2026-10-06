// Analytics hook, off by default: without VITE_GA_ID every call is a no-op and no Google script loads.
// With it, a gtag adapter loads lazily. Switching it on also needs a cookie-consent banner (out of scope).

export type AnalyticsEvent = 'view_change' | 'place_open' | 'search_select' | 'export'

const GA_ID = import.meta.env.VITE_GA_ID

type Sender = (event: AnalyticsEvent, params: Record<string, string | number | boolean>) => void
let sender: Promise<Sender> | null = null

export function analyticsEnabled(): boolean {
  return !!GA_ID
}

export function track(
  event: AnalyticsEvent,
  params: Record<string, string | number | boolean> = {},
): void {
  if (!GA_ID) return
  sender ??= import('./gtag').then((m) => m.createGtagSender(GA_ID))
  void sender.then((send) => send(event, params)).catch(() => {})
}
