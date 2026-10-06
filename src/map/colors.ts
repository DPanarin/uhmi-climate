// Colour rule copied from the old site: not classed. Negative/positive colour with
// alpha = |v| / max(|fill.min|, |fill.max|); Leaflet drew it with fillOpacity 0.9, so the same factor here.
import type { ExpressionSpecification } from 'maplibre-gl'
import type { Scale } from '@/config/layers'

export const FILL_OPACITY = 0.9
export const NO_DATA = 'rgb(160, 160, 160)'
export const NO_DATA_OPACITY = 0.35

export const intensityMax = (s: Scale) => Math.max(Math.abs(s.fill.min), Math.abs(s.fill.max))

/** Alpha for a value, 0…FILL_OPACITY; 0 for exactly 0 (the old site left it transparent). */
export function alphaFor(v: number, s: Scale): number {
  return Math.min(1, Math.abs(v) / intensityMax(s)) * FILL_OPACITY
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
    ['*', FILL_OPACITY, ['min', 1, ['/', ['abs', V], intensityMax(s)]]],
    NO_DATA_OPACITY,
  ]
}

/** Legend ticks from start to end in steps (rounded against float drift). */
export function legendTicks(start: number, end: number, step: number): number[] {
  const out: number[] = []
  const n = Math.round((end - start) / step)
  for (let i = 0; i <= n; i++) out.push(Math.round((start + i * step) * 100) / 100)
  if (out[out.length - 1]! < end) out.push(Math.round((out[out.length - 1]! + step) * 100) / 100)
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
