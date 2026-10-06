// Two-way sync view store ↔ URL query. Uses router.replace (never push), debounced, so slider moves
// don't flood the Back button; a pasted link restores the same view.
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useViewStore } from './view'
import { toQuery, viewFromQuery } from './view-rules'

const DEBOUNCE_MS = 150

const same = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort())

export function useUrlSync() {
  const view = useViewStore()
  const route = useRoute()
  const router = useRouter()
  let timer: ReturnType<typeof setTimeout> | undefined

  // URL → store (initial load, Back/Forward, edited address bar)
  watch(
    () => route.query,
    (q) => {
      const next = viewFromQuery(q)
      if (!same(toQuery(next), toQuery(view.state))) view.replace(next)
    },
    { immediate: true },
  )

  // store → URL
  watch(
    () => toQuery(view.state),
    (q) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (!same(q, route.query as Record<string, unknown>)) void router.replace({ query: q })
      }, DEBOUNCE_MS)
    },
  )
}
