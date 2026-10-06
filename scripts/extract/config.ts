// Step 5: pull the old site's layer config, legend ranges and API rules out of the app chunk (AST only).
import { astToJsonLoose, walk, type AnyNode, type Json } from './ast-json.ts'

type Obj = { [key: string]: Json }

export interface Ranges {
  module: string
  values: Obj
  result: {
    minTemperature: number
    maxTemperature: number
    minPrecipitation: number
    maxPrecipitation: number
  }
}

export interface OldSiteConfig {
  vizItem: Json
  /** Legend/fill ranges: observations, RCP4.5, RCP8.5 (the RCP8.5 range is also the old site's fill range). */
  ranges: { obs: Ranges | null; rcp45: Ranges | null; rcp85: Ranges | null; all: Ranges[] }
  /** Legend definitions from `getScaleObj` (mode, step, colours, titles). */
  legends: Json[]
  /** Decade slider labels: projected (12) and historical (7). */
  timelines: Json[]
  /** `getServerParams` return objects: kind / place / rcp / endpoint per layer. */
  serverParams: Json[]
  /** `getGaugeObj` return objects: which GeoJSON field becomes nameEng / cod / id. */
  gaugeFields: Json[]
  serverUrl: string | null
}

const keyName = (p: AnyNode) => {
  const k = p.key as AnyNode | undefined
  return k ? (k.type === 'Identifier' ? (k.name as string) : String(k.value)) : ''
}
const objKeys = (n: AnyNode) => (n.properties as AnyNode[]).map(keyName)

/** Module id of a webpack module literal that starts right before `offset` (`"bc51":function(e){e.exports=`). */
function moduleIdBefore(source: string, offset: number): string {
  const m = source
    .slice(Math.max(0, offset - 80), offset)
    .match(/["']?([\w$]+)["']?:function\(\w\)\{\w\.exports=$/)
  return m?.[1] ?? '?'
}

export function extractConfig(source: string): { config: OldSiteConfig; serverKey: string | null } {
  const config: OldSiteConfig = {
    vizItem: null,
    ranges: { obs: null, rcp45: null, rcp85: null, all: [] },
    legends: [],
    timelines: [],
    serverParams: [],
    gaugeFields: [],
    serverUrl: null,
  }
  let serverKey: string | null = null

  for (const n of walk(source)) {
    // JSON.parse('…') module bodies
    if (n.type === 'CallExpression') {
      const callee = n.callee as AnyNode
      const arg = (n.arguments as AnyNode[])[0]
      if (
        callee.type === 'MemberExpression' &&
        (callee.object as AnyNode).name === 'JSON' &&
        (callee.property as AnyNode).name === 'parse' &&
        arg?.type === 'Literal' &&
        typeof arg.value === 'string'
      ) {
        let json: Obj
        try {
          json = JSON.parse(arg.value) as Obj
        } catch {
          continue
        }
        const viz = json.vizItem as Obj | undefined
        if (viz && 'twoLvlAccordionData' in viz) config.vizItem = viz
        if (json.values && json.result) {
          config.ranges.all.push({
            module: moduleIdBefore(source, n.start),
            values: json.values as Obj,
            result: json.result as Ranges['result'],
          })
        }
      }
      continue
    }
    if (
      n.type === 'Property' &&
      keyName(n) === 'serverKey' &&
      (n.value as AnyNode).type === 'Literal'
    ) {
      serverKey = String((n.value as AnyNode).value)
      continue
    }
    if (
      n.type === 'Property' &&
      keyName(n) === 'serverUrl' &&
      (n.value as AnyNode).type === 'Literal'
    ) {
      config.serverUrl = String((n.value as AnyNode).value)
      continue
    }
    if (n.type !== 'ObjectExpression') continue
    const keys = objKeys(n)
    if (keys.includes('mode') && keys.includes('rgbaColors') && keys.includes('stepSize')) {
      const legend = astToJsonLoose(n, source) as Obj
      if (typeof legend.mode === 'string') config.legends.push(legend) // skip template bindings
    } else if (keys.includes('tooltipMode') && keys.includes('allTimelineValues')) {
      config.timelines.push(astToJsonLoose(n, source))
    } else if (keys.includes('kind') && keys.includes('place') && keys.includes('type')) {
      config.serverParams.push(astToJsonLoose(n, source))
    } else if (
      keys.includes('getGaugeName') &&
      keys.some((k) => ['nameEng', 'cod', 'id', 'basin'].includes(k))
    ) {
      const loose = astToJsonLoose(n, source) as Obj
      delete loose.getGaugeName
      delete loose.overlay
      config.gaugeFields.push(loose)
    }
  }

  // Identify ranges by content: observations have an `observed` key; RCP4.5 has the smaller projected maximum.
  const uniq = new Map<string, Ranges>()
  for (const r of config.ranges.all) {
    const sig = JSON.stringify([r.values, r.result])
    if (uniq.has(sig)) uniq.get(sig)!.module += `, ${r.module}`
    else uniq.set(sig, { ...r })
  }
  const list = [...uniq.values()]
  config.ranges.all = list
  config.ranges.obs = list.find((r) => 'observed' in (r.values.min_tmp as Obj)) ?? null
  const proj = list
    .filter((r) => r !== config.ranges.obs)
    .sort((a, b) => a.result.maxTemperature - b.result.maxTemperature)
  if (proj.length === 2) [config.ranges.rcp45, config.ranges.rcp85] = proj as [Ranges, Ranges]

  return { config, serverKey }
}
