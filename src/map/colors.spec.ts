import { describe, expect, it } from 'vitest'
import { SCALES } from '@/config/layers'
import { alphaFor, colorFor, FILL_OPACITY, intensityMax, legendTicks, NO_DATA } from './colors'

const projT = SCALES.proj.tas
const projP = SCALES.proj.pr

describe('colour rule (old site, continuous)', () => {
  it('scales alpha by |value| / max |range|', () => {
    expect(intensityMax(projT)).toBe(6.4)
    expect(alphaFor(3.2, projT)).toBeCloseTo(0.5 * FILL_OPACITY)
    expect(alphaFor(-6.4, projT)).toBeCloseTo(FILL_OPACITY)
    expect(alphaFor(10, projT)).toBeCloseTo(FILL_OPACITY) // capped
    expect(alphaFor(0, projT)).toBe(0)
  })

  it('uses red for warming and blue for cooling; precipitation swaps them', () => {
    expect(colorFor(1, projT)).toMatch(/^rgba\(105, 0, 33, /)
    expect(colorFor(-1, projT)).toMatch(/^rgba\(7, 47, 97, /)
    expect(colorFor(10, projP)).toMatch(/^rgba\(7, 47, 97, /)
    expect(colorFor(-10, projP)).toMatch(/^rgba\(105, 0, 33, /)
    expect(colorFor(null, projT)).toBe(NO_DATA)
  })

  it('observations use their own range (CP1 decision)', () => {
    expect(intensityMax(SCALES.obs.tas)).toBe(2.7)
    expect(intensityMax(SCALES.obs.pr)).toBe(109)
  })
})

describe('legendTicks', () => {
  it('steps from start to end and covers the end', () => {
    expect(legendTicks(-1, 3.5, 0.5)).toEqual([-1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5])
    const t = legendTicks(-1, 6.4, 0.5)
    expect(t[0]).toBe(-1)
    expect(t[t.length - 1]).toBe(6.5)
    expect(legendTicks(-35, 109, 10)).toHaveLength(16)
  })
})
