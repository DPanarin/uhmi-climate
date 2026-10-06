// Builds the PNG export from the current view (used by the controls; title, legend, attribution).
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { useViewStore } from '@/stores/view'
import { colorFor, legendTicks } from './colors'
import { formatTick } from '@/i18n/format'
import { BASEMAPS } from '@/config/map'
import { track } from '@/analytics'

/** The map on screen (set by MapView). */
export const activeMap = shallowRef<MapLibreMap | null>(null)

export function useExportPng() {
  const view = useViewStore()
  const { t } = useI18n()

  return async function exportCurrent() {
    const map = activeMap.value
    if (!map) return
    track('export', { kind: 'map-png' })
    const v = view.state
    const parts = [
      t(`datasets.${v.ds}`),
      t(view.layer.labelKey),
      ...(v.ds === 'proj' ? [t(`scenarios.${v.rcp}`)] : []),
      t(`seasons.${v.season}`),
      v.dec.replace('-', '–'),
    ]
    const polygon = view.layer.kind === 'polygon'
    const range = view.scale.legend[view.scenarioKey]
    const ticks = legendTicks(range.start, range.end, view.scale.step)
    const span = ticks[ticks.length - 1]! - ticks[0]!
    const pos = (x: number) => (x - ticks[0]!) / span
    const every = Math.ceil(ticks.length / 9)
    // the drawing code loads only when someone exports
    const { exportPng } = await import('./export-png')
    await exportPng(map, {
      title: `${t(`variables.${v.var}`)} — ${t('app.title')}`,
      subtitle: parts.join(' · '),
      ...(polygon && {
        legendTitle: t(`legend.${v.var}`, { baseline: view.dataset.baseline.replace('-', '–') }),
        legendStops: [...ticks, ...(ticks[0]! < 0 ? [0] : [])]
          .sort((a, b) => a - b)
          .map((x) => ({ offset: pos(x), color: colorFor(x, view.scale) })),
        legendLabels: ticks
          .filter((_, i) => i % every === 0 || i === ticks.length - 1)
          .map((x) => ({ offset: pos(x), text: formatTick(x, v.lang) })),
      }),
      attribution: `${t('app.institute')} · ${BASEMAPS[v.bm].credit}`,
      fileName: `uhmi-${v.ds}-${v.lvl}-${v.var}-${v.ds === 'proj' ? `${v.rcp}-` : ''}${v.season}-${v.dec}.png`,
    })
  }
}
