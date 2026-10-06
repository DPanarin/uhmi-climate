// Display name of a map feature, as on the old site's tooltips.
import type { LevelId } from '@/config/layers'
import type { Lang } from '@/stores/view-rules'

type Translate = (key: string, params?: Record<string, unknown>) => string

export function featureName(
  level: LevelId,
  props: Record<string, unknown>,
  lang: Lang,
  t: Translate,
  coords?: [number, number],
): string {
  const name = String(props[lang] ?? props.uk ?? props.id ?? '')
  if (level === 'hromady') return t('names.hromada', { name })
  if (level === 'grid' && coords) return t('names.point', { lat: coords[1], lon: coords[0] })
  return name
}
