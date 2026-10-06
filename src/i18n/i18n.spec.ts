import { describe, it, expect } from 'vitest'
import uk from './uk'
import en from './en'

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

describe('i18n dictionaries', () => {
  it('uk and en have the same keys', () => {
    expect(keys(en).sort()).toEqual(keys(uk).sort())
  })
})
