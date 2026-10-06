import { describe, expect, it } from 'vitest'
import { extractInfo } from './info.ts'

// Minimal Vue 2 compiled popup: language switch, static trees (_m), text (_v), links, unknown tags.
const statics = Array.from(
  { length: 11 },
  (_, i) =>
    `function(){var t=this,s=t._self._c;return s("p",{staticClass:"info__text"},[t._v("static ${i}")])}`,
).join(',')
const chunk = `x({fa85:function(t,s,a){var i=function(){var t=this,s=t._self._c;return t.popupShow?s("div",{staticClass:"popup__wrapper"},[s("div",{staticClass:"popup__body"},[s("div",{on:{click:t.closePopup}},[s("CloseIcon",{attrs:{width:20/13.5+"rem"}})],1),"en"==t.lang?[s("h1",[t._v("Citation")]),s("p",[t._v(" see "),s("a",{attrs:{href:"https://doi.org/x"}},[t._v("doi")]),s("a",{attrs:{href:"javascript:alert(1)"}},[t._v("bad")])])]:[s("h1",[t._v("Цитування <b>")]),t._m(3),s(v,{scopedSlots:t._u([{key:"title",fn:function(){return[s("b",[t._v("Таблиця 1.")])]},proxy:!0}])},[s("table",[s("tr",[s("td",[t._v("CNRM-CM5")])])])]),s("span",{staticClass:"info__subtitle italics"},[t._v("RCP")])]],2)]):t._e()},e=[${statics}]}})`

describe('extractInfo', () => {
  const info = extractInfo(chunk)!

  it('renders each language branch with whitelisted tags', () => {
    expect(info.unknown).toEqual([])
    expect(info.en).toBe(
      '<h3>Citation</h3><p> see <a href="https://doi.org/x" target="_blank" rel="noopener">doi</a>bad</p>',
    )
  })

  it('escapes text, inlines static trees, turns spoilers into <details>', () => {
    expect(info.uk).toContain('<h3>Цитування &lt;b&gt;</h3>')
    expect(info.uk).toContain('<p>static 3</p>')
    expect(info.uk).toContain(
      '<details><summary><strong>Таблиця 1.</strong></summary><table><tr><td>CNRM-CM5</td></tr></table></details>',
    )
    expect(info.uk).toContain('<em>RCP</em>')
    expect(info.uk).not.toMatch(/CloseIcon|svg|on:|javascript:/)
  })

  it('returns null when the popup is not in the chunk', () => {
    expect(extractInfo('x={a:1}')).toBeNull()
  })
})
