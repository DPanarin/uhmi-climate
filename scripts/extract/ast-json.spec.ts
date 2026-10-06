import { describe, expect, it } from 'vitest'
import { AstJsonError, astToJsonLoose, findFeatureCollections, literalToJson } from './ast-json.ts'
import { parse, type Node } from 'acorn'

describe('literalToJson (minified literals)', () => {
  it('handles booleans, undefined, unary minus and short numbers', () => {
    expect(literalToJson('{a:!0,b:!1,c:void 0,d:-1.5,e:.5,f:1e-3,g:-.25,h:+2}')).toEqual({
      a: true,
      b: false,
      c: null,
      d: -1.5,
      e: 0.5,
      f: 0.001,
      g: -0.25,
      h: 2,
    })
  })

  it('handles quoted and numeric keys, nested arrays, strings and templates', () => {
    expect(literalToJson('{"COD_3":"UA01",1:[[30.5,-.1],[]],t:`x`,n:null}')).toEqual({
      COD_3: 'UA01',
      1: [[30.5, -0.1], []],
      t: 'x',
      n: null,
    })
  })

  it.each([
    ['identifier', '{a:b}'],
    ['function', '{a:function(){}}'],
    ['call', '{a:f()}'],
    ['computed key', '{[k]:1}'],
    ['spread', '{...o}'],
    ['template with expression', '{a:`${x}`}'],
  ])('rejects %s with an offset', (_, src) => {
    expect(() => literalToJson(src)).toThrow(AstJsonError)
  })
})

describe('findFeatureCollections', () => {
  const chunk = `(window.w=window.w||[]).push([["c"],{ab12:function(t,e){t.exports={type:"FeatureCollection",name:"x",features:[{type:"Feature",properties:{id:1,v:-.5,ok:!0},geometry:{type:"Point",coordinates:[30,50]}}]}},cd34:function(t,e,o){var r=function(n){return{type:"FeatureCollection",features:n}}}}]);`

  it('finds data literals and skips library code that builds collections at runtime', () => {
    const found = findFeatureCollections(chunk)
    expect(found).toHaveLength(1)
    expect(found[0]!.value).toEqual({
      type: 'FeatureCollection',
      name: 'x',
      features: [
        {
          type: 'Feature',
          properties: { id: 1, v: -0.5, ok: true },
          geometry: { type: 'Point', coordinates: [30, 50] },
        },
      ],
    })
  })

  it('reports non-literal values inside a data literal', () => {
    expect(() =>
      findFeatureCollections('x={type:"FeatureCollection",features:[{properties:{a:b}}]}'),
    ).toThrow(/unsupported node Identifier at offset \d+/)
  })
})

describe('astToJsonLoose', () => {
  it('keeps literals and records other expressions as source text', () => {
    const src = '({kind:"oblasts",place:e.nameEng,rcp:["rcp45","rcp85"]})'
    const program = parse(src, { ecmaVersion: 'latest' }) as unknown as {
      body: { expression: Node }[]
    }
    expect(astToJsonLoose(program.body[0]!.expression, src)).toEqual({
      kind: 'oblasts',
      place: { $expr: 'e.nameEng' },
      rcp: ['rcp45', 'rcp85'],
    })
  })
})
