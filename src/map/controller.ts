// MapLibre wrapper: one feature source at a time; colours, hover and selection via feature-state,
// so a decade/scenario/season change never rebuilds layers.
import * as maplibregl from 'maplibre-gl'
import {
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre 6 finds its worker next to its own module, which breaks once Vite bundles it: give the URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { FeatureCollection } from 'geojson'
import type { Scale } from '@/config/layers'
import {
  BASEMAPS,
  GLYPHS,
  LABEL_FONT,
  MAX_ZOOM,
  MIN_ZOOM,
  UKRAINE_BOUNDS,
  type BasemapId,
} from '@/config/map'
import { fillColor, fillOpacity } from './colors'

const SRC = 'features'
const SELECTED = '#dce653' // old site's highlight colour
const INK = '#294b67'

export interface HoverInfo {
  id: string
  properties: Record<string, unknown>
  point: { x: number; y: number }
  lngLat: [number, number]
}

export interface ShowOptions {
  kind: 'polygon' | 'point'
  data: FeatureCollection
  scale: Scale
  /** Point labels (stations) from zoom 7 with this property. */
  labelField?: string
}

function rasterSource(id: BasemapId): maplibregl.RasterSourceSpecification {
  const b = BASEMAPS[id]
  return {
    type: 'raster',
    tiles: b.tiles,
    tileSize: b.tileSize,
    scheme: b.scheme ?? 'xyz',
    attribution: b.attribution,
    maxzoom: b.maxzoom,
  }
}

function baseStyle(basemap: BasemapId): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: { basemap: rasterSource(basemap) },
    layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
  }
}

const OUTLINES = 'outlines'

maplibregl.setWorkerUrl(workerUrl)

/** A button under + − (same control group style) that fits the map to the data shown. */
class FitControl implements maplibregl.IControl {
  private el: HTMLDivElement | null = null
  private button: HTMLButtonElement | null = null
  private onClick: () => void
  private label: string
  constructor(onClick: () => void, label: string) {
    this.onClick = onClick
    this.label = label
  }
  onAdd() {
    this.el = document.createElement('div')
    this.el.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    this.button = document.createElement('button')
    this.button.type = 'button'
    this.button.className = 'fit-data'
    // lucide "maximize" icon
    this.button.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>'
    this.button.addEventListener('click', () => this.onClick())
    this.setLabel(this.label)
    this.el.appendChild(this.button)
    return this.el
  }
  onRemove() {
    this.el?.remove()
    this.el = null
  }
  setLabel(label: string) {
    this.label = label
    this.button?.setAttribute('aria-label', label)
    this.button?.setAttribute('title', label)
  }
}

export type Bounds = [number, number, number, number]

/** Bounding box of every coordinate in a FeatureCollection. */
export function boundsOf(fc: FeatureCollection): Bounds | null {
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity
  const visit = (c: unknown): void => {
    if (!Array.isArray(c)) return
    if (typeof c[0] === 'number') {
      const [x, y] = c as number[]
      if (x! < w) w = x!
      if (x! > e) e = x!
      if (y! < s) s = y!
      if (y! > n) n = y!
      return
    }
    for (const child of c) visit(child)
  }
  for (const f of fc.features)
    if (f.geometry && 'coordinates' in f.geometry) visit(f.geometry.coordinates)
  return Number.isFinite(w) ? [w, s, e, n] : null
}

export class MapController {
  readonly map: maplibregl.Map
  private kind: ShowOptions['kind'] | null = null
  private hoverId: string | null = null
  private selectedId: string | null = null
  private ids = new Set<string>()
  onHover: (info: HoverInfo | null) => void = () => {}
  onClick: (id: string | null) => void = () => {}
  /** The fit button was pressed. */
  onFit: () => void = () => {}
  private fitControl: FitControl

  private basemap: BasemapId

  constructor(container: HTMLElement, basemap: BasemapId = 'carto') {
    this.basemap = basemap
    this.map = new maplibregl.Map({
      container,
      style: baseStyle(basemap),
      bounds: UKRAINE_BOUNDS,
      fitBoundsOptions: { padding: 20 },
      minZoom: 3, // phones need ~3.6 to fit Ukraine; fitUkraine() raises it afterwards
      maxZoom: MAX_ZOOM,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
      // keep the drawing buffer for PNG export (map.getCanvas().toDataURL)
      canvasContextAttributes: { preserveDrawingBuffer: true },
    })
    this.map.touchZoomRotate.disableRotation()
    this.map.keyboard.disableRotation()
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    this.fitControl = new FitControl(() => this.onFit(), '')
    this.map.addControl(this.fitControl, 'top-right')
    this.map.on('mousemove', (e) => this.handleMove(e))
    this.map.on('mouseout', () => this.setHover(null))
    this.map.on('click', (e) => {
      const f = this.featureAt(e)
      this.onClick(f ? String(f.id) : null)
    })
  }

  /**
   * Resolves once the style is parsed. Not 'load' (waits for every basemap tile) and not isStyleLoaded()
   * (also false while tiles load, after 'style.load' may already have fired), so check the style itself.
   */
  ready(): Promise<void> {
    const parsed = () =>
      (this.map as unknown as { style?: { _loaded?: boolean } }).style?._loaded === true
    if (parsed()) return Promise.resolve()
    return new Promise((resolve) => {
      const timer = setInterval(() => parsed() && done(), 50)
      const done = () => {
        clearInterval(timer)
        resolve()
      }
      this.map.once('style.load', done)
    })
  }

  /** Fits Ukraine; `padding` leaves room for overlays (e.g. a bottom sheet on phones). */
  fitUkraine(
    padding: { top: number; bottom: number; left: number; right: number },
    animate = false,
  ) {
    this.map.fitBounds(UKRAINE_BOUNDS, { padding, animate })
    // phones can't show all of Ukraine at zoom 5, so allow a bit less
    this.map.setMinZoom(Math.min(MIN_ZOOM, Math.floor(this.map.getZoom() * 2) / 2 - 0.5))
  }

  /** Replaces the feature layer (on level/dataset change only). */
  show(opts: ShowOptions) {
    const m = this.map
    for (const id of ['fill', 'line', 'line-casing', 'circle', 'label'])
      if (m.getLayer(id)) m.removeLayer(id)
    if (m.getSource(SRC)) m.removeSource(SRC)
    this.hoverId = null
    this.ids = new Set(opts.data.features.map((f) => String(f.properties?.id)))
    this.kind = opts.kind
    m.addSource(SRC, { type: 'geojson', data: opts.data, promoteId: 'id' })

    const selected: maplibregl.ExpressionSpecification = [
      'boolean',
      ['feature-state', 'selected'],
      false,
    ]
    const hover: maplibregl.ExpressionSpecification = ['boolean', ['feature-state', 'hover'], false]

    if (opts.kind === 'polygon') {
      this.add({
        id: 'fill',
        type: 'fill',
        source: SRC,
        paint: { 'fill-color': fillColor(opts.scale), 'fill-opacity': fillOpacity(opts.scale) },
      })
      this.add({
        id: 'line-casing',
        type: 'line',
        source: SRC,
        paint: { 'line-color': INK, 'line-width': ['case', selected, 6, 0] },
      })
      this.add({
        id: 'line',
        type: 'line',
        source: SRC,
        paint: {
          'line-color': ['case', selected, SELECTED, hover, INK, 'rgba(33, 40, 46, 0.85)'],
          // zoom must be the top-level input; state decides the width at each stop
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            ['case', selected, 3.5, hover, 2.5, 0.6],
            8,
            ['case', selected, 3.5, hover, 2.5, 1.1],
            11,
            ['case', selected, 4, hover, 3, 1.6],
          ],
        },
      })
    } else {
      this.add({
        id: 'circle',
        type: 'circle',
        source: SRC,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            ['case', selected, 4.5, 2.5],
            8,
            ['case', selected, 6.5, 4.5],
            11,
            ['case', selected, 9, 7],
          ],
          'circle-color': ['case', selected, SELECTED, 'rgba(57, 61, 63, 0.25)'],
          'circle-stroke-color': INK,
          'circle-stroke-width': ['case', hover, 2, 1],
        },
      })
      if (opts.labelField) {
        this.add({
          id: 'label',
          type: 'symbol',
          source: SRC,
          minzoom: 7,
          layout: {
            'text-field': ['get', opts.labelField],
            'text-font': LABEL_FONT,
            'text-size': 12,
            'text-offset': [0, 0.9],
            'text-anchor': 'top',
            'text-optional': true,
          },
          paint: { 'text-color': '#1f2a33', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
        })
      }
    }
    if (this.selectedId && this.ids.has(this.selectedId))
      this.setState(this.selectedId, { selected: true })
  }

  /** Adds a feature layer below the basin outlines (they stay on top across level changes). */
  private add(layer: maplibregl.AddLayerObject) {
    this.map.addLayer(layer, this.map.getLayer(`${OUTLINES}-line`) ? `${OUTLINES}-line` : undefined)
  }

  /** Swaps the raster basemap in place, under everything else. */
  setBasemap(id: BasemapId) {
    if (id === this.basemap) return
    this.basemap = id
    const m = this.map
    m.removeLayer('basemap')
    m.removeSource('basemap')
    m.addSource('basemap', rasterSource(id))
    m.addLayer({ id: 'basemap', type: 'raster', source: 'basemap' }, m.getStyle().layers[0]?.id)
  }

  /** River basin outlines over the map (old site's "Річкові басейни"); null removes them. */
  setOutlines(data: FeatureCollection | null) {
    const m = this.map
    if (m.getLayer(`${OUTLINES}-line`)) m.removeLayer(`${OUTLINES}-line`)
    if (m.getSource(OUTLINES)) m.removeSource(OUTLINES)
    if (!data) return
    m.addSource(OUTLINES, { type: 'geojson', data })
    m.addLayer({
      id: `${OUTLINES}-line`,
      type: 'line',
      source: OUTLINES,
      paint: {
        'line-color': '#0b4f8a',
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.5, 9, 3],
        'line-dasharray': [3, 1.5],
      },
    })
  }

  setLabelField(field: string) {
    if (this.map.getLayer('label'))
      this.map.setLayoutProperty('label', 'text-field', ['get', field])
  }

  /** Changes the colour scale without touching the layers. */
  setScale(scale: Scale) {
    if (!this.map.getLayer('fill')) return
    this.map.setPaintProperty('fill', 'fill-color', fillColor(scale))
    this.map.setPaintProperty('fill', 'fill-opacity', fillOpacity(scale))
  }

  /** Writes one value per feature into feature-state; returns the time it took (ms). */
  setValues(ids: string[], values: (number | null)[]): number {
    const t = performance.now()
    for (let i = 0; i < ids.length; i++) {
      this.map.setFeatureState({ source: SRC, id: ids[i]! }, { v: values[i] ?? null })
    }
    return performance.now() - t
  }

  select(id: string | null) {
    if (this.selectedId && this.map.getSource(SRC))
      this.setState(this.selectedId, { selected: false })
    this.selectedId = id
    if (id && this.ids.has(id)) this.setState(id, { selected: true })
  }

  has(id: string) {
    return this.ids.has(id)
  }

  /** The value currently drawn for a feature (feature-state `v`). */
  valueOf(id: string): number | null {
    const s = this.map.getFeatureState({ source: SRC, id })
    return typeof s.v === 'number' ? s.v : null
  }

  setFitLabel(label: string) {
    this.fitControl.setLabel(label)
  }

  /** Fits the map to bounds, leaving `padding` free for overlays. */
  fitTo(bounds: Bounds, padding: maplibregl.PaddingOptions, animate = true) {
    this.map.fitBounds(bounds, { padding, animate, maxZoom: 9 })
  }

  zoomTo(
    bbox: [number, number, number, number],
    padding: maplibregl.PaddingOptions,
    animate = true,
  ) {
    const [w, s, e, n] = bbox
    if (w === e && s === n)
      this.map.easeTo({ center: [w, s], zoom: Math.max(this.map.getZoom(), 8), animate, padding })
    else this.map.fitBounds(bbox, { padding, maxZoom: 9, animate })
  }

  destroy() {
    this.map.remove()
  }

  private setState(id: string, state: Record<string, unknown>) {
    this.map.setFeatureState({ source: SRC, id }, state)
  }

  private featureAt(e: MapMouseEvent): MapGeoJSONFeature | undefined {
    const layers = this.kind === 'point' ? ['circle'] : ['fill']
    if (!layers.every((l) => this.map.getLayer(l))) return undefined
    // points are small: query a box around the cursor
    const pad = this.kind === 'point' ? 6 : 0
    const box: [maplibregl.PointLike, maplibregl.PointLike] = [
      [e.point.x - pad, e.point.y - pad],
      [e.point.x + pad, e.point.y + pad],
    ]
    return this.map.queryRenderedFeatures(box, { layers })[0]
  }

  private handleMove(e: MapMouseEvent) {
    const f = this.featureAt(e)
    this.map.getCanvas().style.cursor = f ? 'pointer' : ''
    if (!f) return this.setHover(null)
    const id = String(f.id)
    this.setHover(id)
    this.onHover({
      id,
      properties: f.properties,
      point: { x: e.point.x, y: e.point.y },
      lngLat: [e.lngLat.lng, e.lngLat.lat],
    })
  }

  private setHover(id: string | null) {
    if (id === this.hoverId) return
    if (this.hoverId && this.map.getSource(SRC)) this.setState(this.hoverId, { hover: false })
    this.hoverId = id
    if (id) this.setState(id, { hover: true })
    else this.onHover(null)
  }
}

export function getSource(map: maplibregl.Map): GeoJSONSource | undefined {
  return map.getSource(SRC) as GeoJSONSource | undefined
}
