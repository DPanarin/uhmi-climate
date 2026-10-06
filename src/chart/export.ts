// Chart downloads: CSV of the shown series, PNG with title and source drawn around the chart.

export function download(fileName: string, href: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = fileName
  a.click()
}

/** UTF-8 with BOM so spreadsheet apps read Cyrillic headers correctly. */
export function downloadCsv(fileName: string, csv: string) {
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
  download(fileName, url)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function chartPng(
  chartCanvas: HTMLCanvasElement,
  title: string,
  subtitle: string,
  source: string,
): string {
  const dpr = chartCanvas.width / chartCanvas.clientWidth || 1
  const pad = 16 * dpr
  const head = 52 * dpr
  const foot = 28 * dpr
  const out = document.createElement('canvas')
  out.width = chartCanvas.width + 2 * pad
  out.height = chartCanvas.height + head + foot
  const ctx = out.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, out.width, out.height)
  const font = (px: number, w = 400) =>
    `${w} ${px * dpr}px system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif`
  ctx.fillStyle = '#1f2a33'
  ctx.font = font(16, 650)
  ctx.fillText(title, pad, 22 * dpr)
  ctx.fillStyle = '#5b6770'
  ctx.font = font(12)
  ctx.fillText(subtitle, pad, 40 * dpr)
  ctx.drawImage(chartCanvas, pad, head)
  ctx.font = font(11)
  ctx.fillText(source, pad, out.height - 10 * dpr)
  return out.toDataURL('image/png')
}
