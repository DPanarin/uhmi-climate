import { describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { LAYERS, findLayer } from '@/config/layers'
import { buildRequests, requestKey } from './request'
import { classifyKey, parseResponse, toNumber } from './parse'
import { ApiError, createClient, errorKindFor } from './client'

const dir = join(process.cwd(), 'src/api/__fixtures__/')
const fixture = (name: string) => JSON.parse(readFileSync(`${dir}${name}.json`, 'utf8')) as unknown

describe('buildRequests', () => {
  it('builds a request for every layer', () => {
    for (const layer of LAYERS) {
      const reqs = buildRequests(layer, 'X', { var: 'tas', season: 'annual' })
      expect(reqs.length, layer.id).toBeGreaterThan(0)
      for (const r of reqs) {
        const q = new URLSearchParams(r.params)
        expect(q.get('kind')).toBe(layer.apiKind)
        expect(q.get('place')).toBe('X')
        expect(q.has('season')).toBe(false)
        expect(q.has('key')).toBe(false)
        expect(r.path).toBe(layer.dataset === 'proj' ? 'projections' : 'historical_observations')
      }
    }
  })

  it('asks for both scenarios in one projection request', () => {
    const [r] = buildRequests(findLayer('proj', 'oblasts')!, 'Kyivska', {
      var: 'pr',
      season: 'winter',
    })
    expect(requestKey(r!)).toBe(
      'projections?rcp=rcp45&rcp=rcp85&kind=oblasts&place=Kyivska&value_type=pr&season=winter',
    )
  })

  it('asks for mean, min and max for observed temperature, rr for precipitation', () => {
    const st = findLayer('obs', 'stations')!
    expect(
      buildRequests(st, 'Kyiv', { var: 'tas', season: 'annual' }).map((r) => r.valueType),
    ).toEqual(['tm', 'tn', 'tx'])
    expect(
      buildRequests(st, 'Kyiv', { var: 'pr', season: 'summer' }).map((r) => r.valueType),
    ).toEqual(['rr'])
  })
})

describe('parseResponse', () => {
  it('reads every recorded fixture without unknown keys', () => {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
    expect(files.length).toBeGreaterThanOrEqual(12)
    for (const f of files) {
      const warn = vi.fn<(msg: string) => void>()
      const parsed = parseResponse(fixture(f.replace('.json', '')), warn)
      expect(warn, f).not.toHaveBeenCalled()
      for (const group of Object.values(parsed))
        for (const series of Object.values(group)) {
          const years = series.map((p) => p.year)
          expect(
            [...years].sort((a, b) => a - b),
            f,
          ).toEqual(years)
        }
    }
  })

  it('reshapes projections into rcp45 / rcp85 / hist with numbers', () => {
    const p = parseResponse(fixture('proj-oblasts-tas'))
    expect(Object.keys(p).sort()).toEqual(['hist', 'rcp45', 'rcp85'])
    expect(Object.keys(p.rcp85!).sort()).toEqual(
      [
        'anomaly',
        'mean',
        'movingAnomaly',
        'movingMean',
        'movingQ025',
        'movingQ975',
        'q025',
        'q975',
      ].sort(),
    )
    expect(p.rcp85!.mean).toHaveLength(120)
    expect(p.rcp85!.mean![0]).toEqual({ year: 1981, value: 7.83 })
    expect(p.hist!.mean).toHaveLength(40)
    // grid nodes have no observed part
    expect(parseResponse(fixture('proj-nodes-tas')).hist).toBeUndefined()
  })

  it('sorts unsorted observation series', () => {
    const p = parseResponse(fixture('obs-ukraine-tm'))
    const years = p.hist!.anomaly!.map((x) => x.year)
    expect(years[0]).toBe(1946)
    expect(years[years.length - 1]).toBe(2020)
    expect(p.hist!.mean![0]!.value).toBe(8.05)
  })

  it('classifies keys and turns gaps into null', () => {
    expect(classifyKey('moving_quantile975_rcp45')).toEqual({ group: 'rcp45', stat: 'movingQ975' })
    expect(classifyKey('hist_moving_anomalies')).toEqual({ group: 'hist', stat: 'movingAnomaly' })
    expect(classifyKey('something_new')).toBeNull()
    expect(toNumber('nan')).toBeNull()
    expect(toNumber('')).toBeNull()
    expect(toNumber('-0.55')).toBe(-0.55)
    const warn = vi.fn<(msg: string) => void>()
    expect(parseResponse({ mystery: [['2000', '1']] }, warn)).toEqual({})
    expect(warn).toHaveBeenCalledOnce()
    expect(() => parseResponse('<html>')).toThrow('unexpected response shape')
  })
})

type Fetch = (url: string) => Promise<Response>

describe('client', () => {
  const req = buildRequests(findLayer('proj', 'oblasts')!, 'Kyivska', {
    var: 'tas',
    season: 'annual',
  })[0]!
  const body = JSON.stringify(fixture('proj-oblasts-tas'))
  const ok = () => new Response(body, { status: 200 })
  const make = (fetchImpl: (url: string) => Promise<Response>) =>
    createClient({
      baseUrl: 'https://api.test/',
      key: 'SECRET',
      fetch: ((url: string) => fetchImpl(url)) as unknown as typeof fetch,
      storage: null,
      sleep: () => Promise.resolve(),
    })

  it('caches: a repeat request makes no network call; identical requests in flight share one', async () => {
    const f = vi.fn<Fetch>((_url) => Promise.resolve(ok()))
    const c = make(f)
    const ctl = new AbortController()
    await Promise.all([c.get(req, ctl.signal), c.get(req, ctl.signal)])
    await c.get(req, ctl.signal)
    expect(f).toHaveBeenCalledTimes(1)
    expect(String(f.mock.calls[0]![0])).toContain('key=SECRET')
  })

  it('retries once after 502/503 or a network error', async () => {
    const f = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(ok())
    await expect(make(f).get(req, new AbortController().signal)).resolves.toHaveProperty('rcp45')
    expect(f).toHaveBeenCalledTimes(2)

    const down = vi.fn<Fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(make(down).get(req, new AbortController().signal)).rejects.toMatchObject({
      kind: 'unavailable',
    })
    expect(down).toHaveBeenCalledTimes(2)
  })

  it('maps 500 to "no series" without retry and 400 to "bad request"', async () => {
    const f500 = vi.fn<Fetch>(() =>
      Promise.resolve(new Response('<html>500</html>', { status: 500 })),
    )
    await expect(make(f500).get(req, new AbortController().signal)).rejects.toMatchObject({
      kind: 'noSeries',
    })
    expect(f500).toHaveBeenCalledTimes(1)

    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const f400 = vi.fn<Fetch>(() =>
      Promise.resolve(new Response('invalid arguments', { status: 400 })),
    )
    await expect(make(f400).get(req, new AbortController().signal)).rejects.toBeInstanceOf(ApiError)
    expect(String(err.mock.calls[0]![0])).not.toContain('SECRET')
    err.mockRestore()

    expect(errorKindFor(502)).toBe('retry')
    expect(errorKindFor(418)).toBe('unavailable')
  })

  it('reports an aborted request as aborted', async () => {
    const ctl = new AbortController()
    const f = vi.fn<Fetch>(
      () =>
        new Promise<Response>((_, reject) =>
          ctl.signal.addEventListener('abort', () => reject(new DOMException('x', 'AbortError'))),
        ),
    )
    const p = make(f).get(req, ctl.signal)
    ctl.abort()
    await expect(p).rejects.toMatchObject({ kind: 'aborted' })
  })
})
