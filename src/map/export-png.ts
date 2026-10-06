// PNG of the current map (replaces html2canvas): map canvas + title, legend and attribution on a 2D canvas.
import type { Map as MapLibreMap } from 'maplibre-gl'

export interface ExportInfo {
  title: string
  subtitle: string
  legendTitle?: string
  /** CSS linear-gradient stops are not drawable; pass colour stops instead. */
  legendStops?: { offset: number; color: string }[]
  legendLabels?: { offset: number; text: string }[]
  attribution: string
  fileName: string
}

const idle = (map: MapLibreMap) =>
  new Promise<void>((resolve) => (map.loaded() ? resolve() : map.once('idle', () => resolve())))

export async function exportPng(map: MapLibreMap, info: ExportInfo): Promise<void> {
  await idle(map)
  const src = map.getCanvas()
  const dpr = src.width / src.clientWidth || 1
  const pad = 16 * dpr
  const head = 56 * dpr
  const foot = (info.legendStops ? 64 : 24) * dpr
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height + head + foot
  const ctx = out.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(src, 0, head)

  const font = (size: number, weight = 400) =>
    `${weight} ${size * dpr}px system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif`
  ctx.fillStyle = '#1f2a33'
  ctx.font = font(18, 650)
  ctx.fillText(info.title, pad, 24 * dpr)
  ctx.font = font(13)
  ctx.fillStyle = '#5b6770'
  ctx.fillText(info.subtitle, pad, 44 * dpr)

  let y = head + src.height + 10 * dpr
  if (info.legendStops && info.legendLabels) {
    const w = Math.min(380 * dpr, out.width - 2 * pad)
    ctx.fillStyle = '#1f2a33'
    ctx.font = font(12, 600)
    ctx.fillText(info.legendTitle ?? '', pad, y + 10 * dpr)
    const barY = y + 16 * dpr
    const g = ctx.createLinearGradient(pad, 0, pad + w, 0)
    for (const s of info.legendStops) g.addColorStop(s.offset, s.color)
    ctx.fillStyle = '#fff'
    ctx.fillRect(pad, barY, w, 12 * dpr)
    ctx.fillStyle = g
    ctx.fillRect(pad, barY, w, 12 * dpr)
    ctx.strokeStyle = 'rgba(31, 42, 51, 0.25)'
    ctx.strokeRect(pad, barY, w, 12 * dpr)
    ctx.fillStyle = '#5b6770'
    ctx.font = font(11)
    ctx.textAlign = 'center'
    for (const l of info.legendLabels) ctx.fillText(l.text, pad + l.offset * w, barY + 26 * dpr)
    ctx.textAlign = 'left'
    y += 48 * dpr
  }
  ctx.font = font(11)
  ctx.fillStyle = '#5b6770'
  ctx.textAlign = 'right'
  ctx.fillText(info.attribution, out.width - pad, out.height - 8 * dpr)

  const url = out.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = info.fileName
  a.click()
}
