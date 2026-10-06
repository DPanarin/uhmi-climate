import { describe, expect, it } from 'vitest'
import { analyticsEnabled, track } from './index'

describe('analytics hook', () => {
  it('is off without VITE_GA_ID and loads nothing', () => {
    expect(analyticsEnabled()).toBe(false)
    const scripts = document.scripts.length
    track('view_change', { lvl: 'oblasts' })
    expect(document.scripts.length).toBe(scripts)
    expect((window as unknown as { dataLayer?: unknown }).dataLayer).toBeUndefined()
  })
})
