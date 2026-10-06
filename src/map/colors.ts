// Colour rule based on the old site: not classed; negative/positive colour with an alpha that grows with |v|.
// Old site: alpha = |v| / max |range| (linear) × 0.9. Readability change (CP3): alpha = sqrt(|v| / max) × 0.9,
// so small anomalies (early decades, observed precipitation) stay visible; 0 stays transparent.
import type { ExpressionSpecification } from 'maplibre-gl'
import type { Scale } from '@/config/layers'

export const FILL_OPACITY = 0.9
export const NO_DATA = 'rgb(160, 160, 160)'
export const NO_DATA_OPACITY = 0.35

export const intensityMax = (s: Scale) => Math.max(Math.abs(s.fill.min), Math.abs(s.fill.max))

/** Alpha for a value, 0…FILL_OPACITY; 0 for exactly 0 (the old site left it transparent). */
export function alphaFor(v: number, s: Scale): number {
  return Math.sqrt(Math.min(1, Math.abs(v) / intensityMax(s))) * FILL_OPACITY
}

export function colorFor(v: number | null, s: Scale): string {
  if (v === null) return NO_DATA
  const base = v < 0 ? s.negative : s.positive
  return base.replace('rgb(', 'rgba(').replace(')', `, ${alphaFor(v, s).toFixed(3)})`)
}

const V: ExpressionSpecification = ['feature-state', 'v']
const HAS_V: ExpressionSpecification = ['==', ['typeof', V], 'number']

export function fillColor(s: Scale): ExpressionSpecification {
  return ['case', HAS_V, ['case', ['<', V, 0], s.negative, s.positive], NO_DATA]
}

export function fillOpacity(s: Scale): ExpressionSpecification {
  return [
    'case',
    HAS_V,
    ['*', FILL_OPACITY, ['sqrt', ['min', 1, ['/', ['abs', V], intensityMax(s)]]]],
    NO_DATA_OPACITY,
  ]
}

/** Legend ticks in steps, with the ends snapped outwards to whole steps (−1.4…2.7 by 0.5 → −1.5…3). */
export function legendTicks(start: number, end: number, step: number): number[] {
  const r = (v: number) => Math.round(v * 100) / 100
  const from = r(Math.floor(r(start / step)) * step)
  const to = r(Math.ceil(r(end / step)) * step)
  const out: number[] = []
  for (let i = 0; i <= Math.round((to - from) / step); i++) out.push(r(from + i * step))
  return out
}

/** CSS gradient for the legend bar, matching the map fill. */
export function legendGradient(ticks: number[], s: Scale): string {
  const first = ticks[0]!
  const span = ticks[ticks.length - 1]! - first || 1
  const stops = ticks.map((t) => `${colorFor(t, s)} ${(((t - first) / span) * 100).toFixed(2)}%`)
  // make the zero crossing exact (transparent at 0, colour switch)
  if (first < 0 && ticks[ticks.length - 1]! > 0)
    stops.push(`${colorFor(0, s)} ${((-first / span) * 100).toFixed(2)}%`)
  return `linear-gradient(to right, ${stops.sort((a, b) => parseFloat(a.split(' ').pop()!) - parseFloat(b.split(' ').pop()!)).join(', ')})`
}
