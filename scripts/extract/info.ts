// "Additional information" popup of the old site (citation, data sources, model table, glossary).
// The text is compiled Vue 2 render code: s(tag, data, children), t._v(text), t._m(i) (static trees).
// We interpret that AST into whitelisted HTML — nothing is executed.
import type { Node } from 'acorn'
import { walk, type AnyNode } from './ast-json.ts'

type Lang = 'uk' | 'en'

const TAGS: Record<string, string> = {
  h1: 'h3',
  h2: 'h3',
  p: 'p',
  br: 'br',
  a: 'a',
  b: 'strong',
  table: 'table',
  tr: 'tr',
  th: 'th',
  td: 'td',
  div: 'div',
  span: 'span',
}
const SKIP = new Set(['CloseIcon', 'svg', 'path'])

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

interface Ctx {
  lang: Lang
  statics: AnyNode[]
  unknown: Set<string>
}

const isMember = (n: AnyNode, prop: string) =>
  n.type === 'MemberExpression' && (n.property as AnyNode).name === prop

function stringOf(n: AnyNode): string | null {
  if (n.type === 'Literal' && typeof n.value === 'string') return n.value
  if (n.type === 'Literal' && typeof n.value === 'number') return String(n.value)
  if (n.type === 'TemplateLiteral' && (n.expressions as unknown[]).length === 0)
    return ((n.quasis as AnyNode[])[0]!.value as { cooked: string }).cooked
  if (n.type === 'BinaryExpression' && n.operator === '+') {
    const a = stringOf(n.left as AnyNode)
    const b = stringOf(n.right as AnyNode)
    return a !== null && b !== null ? a + b : null
  }
  return null
}

function prop(obj: AnyNode | undefined, name: string): AnyNode | undefined {
  if (obj?.type !== 'ObjectExpression') return undefined
  const p = (obj.properties as AnyNode[]).find((x) => {
    const k = x.key as AnyNode
    return (k.type === 'Identifier' ? k.name : k.value) === name
  })
  return p?.value as AnyNode | undefined
}

/** Static render function body: `function(){var t=this,s=t._self._c;return s(...)}` → the returned node. */
function returned(fn: AnyNode): AnyNode | null {
  const body = (fn.body as AnyNode).body as AnyNode[]
  const ret = body.find((st) => st.type === 'ReturnStatement')
  return (ret?.argument as AnyNode) ?? null
}

function render(n: AnyNode | null | undefined, ctx: Ctx): string {
  if (!n) return ''
  switch (n.type) {
    case 'ArrayExpression':
      return (n.elements as AnyNode[]).map((e) => render(e, ctx)).join('')
    case 'ConditionalExpression': {
      // "en"==t.lang ? [...] : [...]
      const test = n.test as AnyNode
      const isLang =
        test.type === 'BinaryExpression' &&
        [test.left, test.right].some(
          (x) => (x as AnyNode).type === 'Literal' && (x as AnyNode).value === 'en',
        )
      if (isLang) return render((ctx.lang === 'en' ? n.consequent : n.alternate) as AnyNode, ctx)
      return render(n.consequent as AnyNode, ctx) // t.popupShow ? popup : t._e()
    }
    case 'LogicalExpression':
      return render(n.right as AnyNode, ctx)
    case 'CallExpression': {
      const callee = n.callee as AnyNode
      const args = n.arguments as AnyNode[]
      if (isMember(callee, '_v')) return esc(stringOf(args[0]!) ?? '')
      if (isMember(callee, '_e')) return ''
      if (isMember(callee, '_m')) {
        const i = Number((args[0] as AnyNode).value)
        return render(returned(ctx.statics[i]!), ctx)
      }
      if (callee.type === 'Identifier') return element(args, ctx)
      ctx.unknown.add(`call ${callee.type}`)
      return ''
    }
    default:
      ctx.unknown.add(n.type)
      return ''
  }
}

function element(args: AnyNode[], ctx: Ctx): string {
  const [tagNode, second, third] = args
  const data = second?.type === 'ObjectExpression' ? second : undefined
  const children = second?.type === 'ArrayExpression' ? second : third
  const tag = tagNode?.type === 'Literal' ? String(tagNode.value) : null

  // component (e.g. the table spoiler): title slot + content → <details>
  if (!tag) {
    const slots = prop(data, 'scopedSlots')
    let title = ''
    if (slots?.type === 'CallExpression') {
      for (const s of ((slots.arguments as AnyNode[])[0]?.elements as AnyNode[]) ?? []) {
        const fn = prop(s, 'fn')
        if (fn) title += render(returned(fn), ctx)
      }
    }
    const inner = render(children, ctx)
    return title ? `<details><summary>${title}</summary>${inner}</details>` : inner
  }
  if (SKIP.has(tag)) return ''
  if (tag === 'transition') return render(children, ctx)
  const out = TAGS[tag]
  if (!out) {
    ctx.unknown.add(`tag ${tag}`)
    return render(children, ctx)
  }
  const cls = stringOf(prop(data, 'staticClass') ?? ({ type: 'x' } as AnyNode)) ?? ''
  if (out === 'br') return '<br>'
  const inner = render(children, ctx)
  if (out === 'span') return /italics|subtitle/.test(cls) ? `<em>${inner}</em>` : inner
  if (out === 'div') return /popup__wrapper|popup__body/.test(cls) ? inner : `<div>${inner}</div>`
  if (out === 'a') {
    const href = stringOf(prop(prop(data, 'attrs'), 'href') ?? ({ type: 'x' } as AnyNode)) ?? ''
    return /^https?:\/\//.test(href)
      ? `<a href="${esc(href)}" target="_blank" rel="noopener">${inner}</a>`
      : inner
  }
  if (out === 'p' && !inner.trim()) return ''
  return `<${out}>${inner}</${out}>`
}

/** Finds the popup's render function and static trees in the chunk and renders both languages. */
export function extractInfo(source: string): { uk: string; en: string; unknown: string[] } | null {
  let main: AnyNode | null = null
  let statics: AnyNode[] | null = null
  for (const n of walk(source)) {
    // var i=function(){...return t.popupShow?s("div",{staticClass:"popup__wrapper"...
    if (!main && n.type === 'ConditionalExpression' && isMember(n.test as AnyNode, 'popupShow'))
      main = n
    if (
      !statics &&
      n.type === 'ArrayExpression' &&
      (n.elements as AnyNode[]).length > 10 &&
      (n.elements as AnyNode[]).every((e) => e?.type === 'FunctionExpression')
    )
      statics = n.elements as AnyNode[]
  }
  if (!main || !statics) return null
  const unknown = new Set<string>()
  const html = (lang: Lang) =>
    render(main as Node as AnyNode, { lang, statics: statics!, unknown })
      .replace(/\s+/g, ' ')
      .replace(/> </g, '><')
      .replace(/<div><\/div>/g, '')
      .trim()
  return { uk: html('uk'), en: html('en'), unknown: [...unknown] }
}
