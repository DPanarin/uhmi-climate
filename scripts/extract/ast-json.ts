// Step 3: turn object literals from minified third-party JS into JSON without executing anything.
import { parse, type Node } from 'acorn'

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

interface AnyNode extends Node {
  [key: string]: unknown
}

export class AstJsonError extends Error {
  readonly offset: number
  constructor(message: string, offset: number) {
    super(`${message} at offset ${offset}`)
    this.offset = offset
  }
}

/** Converts a literal-only AST node (object, array, string, number, minified booleans/undefined) to JSON. */
export function astToJson(node: Node): Json {
  const n = node as AnyNode
  switch (n.type) {
    case 'ObjectExpression': {
      const out: { [key: string]: Json } = {}
      for (const p of n.properties as AnyNode[]) {
        if (p.type !== 'Property' || p.computed || p.kind !== 'init' || p.method) {
          throw new AstJsonError(`unsupported object member ${p.type}`, p.start)
        }
        const key = p.key as AnyNode
        const name =
          key.type === 'Identifier'
            ? (key.name as string)
            : key.type === 'Literal'
              ? String(key.value)
              : null
        if (name === null) throw new AstJsonError(`unsupported key ${key.type}`, key.start)
        out[name] = astToJson(p.value as Node)
      }
      return out
    }
    case 'ArrayExpression':
      return (n.elements as (AnyNode | null)[]).map((el) => {
        if (!el) throw new AstJsonError('array hole', n.start)
        return astToJson(el)
      })
    case 'Literal': {
      const v = n.value
      if (v === null || typeof v === 'string' || typeof v === 'boolean') return v
      if (typeof v === 'number') return v
      throw new AstJsonError('unsupported literal (regex/bigint)', n.start)
    }
    case 'TemplateLiteral': {
      const quasis = n.quasis as AnyNode[]
      if ((n.expressions as unknown[]).length === 0 && quasis.length === 1) {
        return (quasis[0]!.value as { cooked: string }).cooked
      }
      throw new AstJsonError('template literal with expressions', n.start)
    }
    case 'UnaryExpression': {
      const arg = n.argument as AnyNode
      const op = n.operator as string
      if (op === '-' || op === '+') {
        const v = astToJson(arg)
        if (typeof v !== 'number') throw new AstJsonError(`unary ${op} on non-number`, n.start)
        return op === '-' ? -v : v
      }
      if (op === '!' && arg.type === 'Literal' && typeof arg.value === 'number') return !arg.value
      if (op === 'void' && arg.type === 'Literal') return null
      throw new AstJsonError(`unsupported unary ${op}`, n.start)
    }
    default:
      throw new AstJsonError(`unsupported node ${n.type}`, n.start)
  }
}

/** Like astToJson, but any non-literal sub-expression becomes `{ $expr: "<source text>" }` (for config objects). */
export function astToJsonLoose(node: Node, source: string): Json {
  const n = node as AnyNode
  if (n.type === 'ObjectExpression') {
    const out: { [key: string]: Json } = {}
    for (const p of n.properties as AnyNode[]) {
      const key = p.key as AnyNode | undefined
      const name =
        !p.computed && key
          ? key.type === 'Identifier'
            ? (key.name as string)
            : String(key.value)
          : null
      if (p.type !== 'Property' || name === null) continue
      out[name] = p.method
        ? { $expr: source.slice(n.start, n.end) }
        : astToJsonLoose(p.value as Node, source)
    }
    return out
  }
  if (n.type === 'ArrayExpression') {
    return (n.elements as (AnyNode | null)[]).map((el) => (el ? astToJsonLoose(el, source) : null))
  }
  try {
    return astToJson(n)
  } catch {
    return { $expr: source.slice(n.start, n.end) }
  }
}

/** Parses a JS source and yields every AST node (iterative walk, no recursion limits). */
export function* walk(source: string): Generator<AnyNode> {
  const program = parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'script',
  }) as unknown as AnyNode
  const stack: unknown[] = [program]
  while (stack.length) {
    const cur = stack.pop()
    if (Array.isArray(cur)) {
      for (let i = cur.length - 1; i >= 0; i--) stack.push(cur[i])
      continue
    }
    if (!cur || typeof cur !== 'object' || typeof (cur as AnyNode).type !== 'string') continue
    const node = cur as AnyNode
    yield node
    for (const key in node) {
      if (key === 'loc' || key === 'type') continue
      const child = node[key]
      if (child && typeof child === 'object') stack.push(child)
    }
  }
}

export type { AnyNode }

/** Parses a JS expression source string (e.g. `{a:!0,b:-.5}`) to JSON. */
export function literalToJson(source: string): Json {
  const program = parse(`(${source})`, { ecmaVersion: 'latest' }) as unknown as AnyNode
  const stmt = (program.body as AnyNode[])[0]!
  return astToJson(stmt.expression as Node)
}

/** A data literal: `type:"FeatureCollection"` and `features:[…]` (library code like `{…,features:r}` is skipped). */
function isFeatureCollection(n: AnyNode): boolean {
  if (n.type !== 'ObjectExpression') return false
  const prop = (name: string) =>
    (n.properties as AnyNode[]).find((p) => {
      const key = p.key as AnyNode | undefined
      return (key?.type === 'Identifier' ? key.name : key?.value) === name
    })?.value as AnyNode | undefined
  const type = prop('type')
  return (
    type?.type === 'Literal' &&
    type.value === 'FeatureCollection' &&
    prop('features')?.type === 'ArrayExpression'
  )
}

export interface FoundCollection {
  offset: number
  value: { [key: string]: Json }
}

/** Parses a whole chunk and returns every `{type:"FeatureCollection",…}` object literal in it. */
export function findFeatureCollections(source: string): FoundCollection[] {
  const program = parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'script',
  }) as unknown as AnyNode
  const found: FoundCollection[] = []
  const stack: unknown[] = [program]
  while (stack.length) {
    const cur = stack.pop()
    if (Array.isArray(cur)) {
      for (let i = cur.length - 1; i >= 0; i--) stack.push(cur[i])
      continue
    }
    if (!cur || typeof cur !== 'object' || typeof (cur as AnyNode).type !== 'string') continue
    const node = cur as AnyNode
    if (isFeatureCollection(node)) {
      found.push({ offset: node.start, value: astToJson(node) as { [key: string]: Json } })
      continue
    }
    for (const key in node) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'type') continue
      const child = node[key]
      if (child && typeof child === 'object') stack.push(child)
    }
  }
  return found.sort((a, b) => a.offset - b.offset)
}
