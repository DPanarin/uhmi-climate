<script setup lang="ts">
// Chart.js line chart (loaded lazily with this component): ensemble means, spread band, observations,
// and the decade selected on the map as a shaded band.
import { computed, ref } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import type { Line as ChartLine, Mode } from '@/chart/datasets'
import { formatNumber, formatValue } from '@/i18n/format'
import type { Lang } from '@/stores/view-rules'

Chart.register(LineElement, PointElement, LinearScale, Filler, Tooltip, Legend, annotationPlugin)

const props = defineProps<{
  lines: ChartLine[]
  unit: string
  mode: Mode
  decade: [number, number]
  lang: Lang
  decadeLabel: string
}>()

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const lineRef = ref<{ chart?: Chart } | null>(null)

const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

const data = computed<ChartData<'line', { x: number; y: number | null }[]>>(() => ({
  datasets: props.lines.map((l) => ({
    label: l.label,
    data: l.points.map((p) => ({ x: p.year, y: p.value })),
    borderColor: l.band ? 'transparent' : l.color,
    backgroundColor: l.band ? alpha(l.color, 0.16) : l.color,
    borderWidth: l.band ? 0 : l.width,
    pointRadius: 0,
    pointHoverRadius: l.band ? 0 : 3,
    fill: l.band === 'high' ? '-1' : false,
    tension: 0,
    spanGaps: false,
  })),
}))

const years = computed(() => {
  const all = props.lines.flatMap((l) => l.points.map((p) => p.year))
  return [Math.min(...all), Math.max(...all)] as const
})

const options = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: reduced ? false : { duration: 200 },
  parsing: false,
  normalized: true,
  interaction: { mode: 'index', intersect: false },
  scales: {
    x: {
      type: 'linear',
      min: years.value[0],
      max: years.value[1],
      ticks: { stepSize: 10, callback: (v) => String(v), maxRotation: 0 },
      grid: { color: 'rgba(31, 42, 51, 0.06)' },
    },
    y: {
      title: { display: true, text: props.unit },
      ticks: { callback: (v) => formatNumber(Number(v), props.lang, 1) },
      grid: {
        color: (c) =>
          c.tick?.value === 0 && props.mode === 'anomaly'
            ? 'rgba(31, 42, 51, 0.35)'
            : 'rgba(31, 42, 51, 0.06)',
      },
    },
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 14,
        boxHeight: 3,
        font: { size: 12 },
        filter: (item) => !props.lines[item.datasetIndex ?? 0]?.hideInLegend,
      },
    },
    tooltip: {
      callbacks: {
        title: (items) => String(items[0]?.parsed.x ?? ''),
        label: (item) => {
          const line = props.lines[item.datasetIndex]
          if (!line || line.band === 'low' || item.parsed.y === null) return ''
          const v = item.parsed.y
          const text =
            props.mode === 'anomaly'
              ? formatValue(v, props.unit, props.lang)
              : `${formatNumber(v, props.lang)} ${props.unit}`
          return `${line.label}: ${text}`
        },
      },
      filter: (item) => props.lines[item.datasetIndex]?.band !== 'low',
    },
    annotation: {
      annotations: {
        decade: {
          type: 'box',
          xMin: props.decade[0] - 0.5,
          xMax: props.decade[1] + 0.5,
          backgroundColor: 'rgba(220, 230, 83, 0.28)',
          borderWidth: 0,
          label: {
            display: true,
            content: props.decadeLabel,
            position: { x: 'center', y: 'start' },
            font: { size: 11 },
            color: '#5b6770',
          },
        },
      },
    },
  },
}))

/** Canvas of the rendered chart (for the PNG export). */
defineExpose({
  canvas: () => (lineRef.value?.chart?.canvas as HTMLCanvasElement | undefined) ?? null,
})
</script>

<template>
  <div class="chart-box">
    <Line ref="lineRef" :data="data" :options="options" />
  </div>
</template>

<style scoped>
.chart-box {
  position: relative;
  height: 100%;
  min-height: 180px;
}
</style>
