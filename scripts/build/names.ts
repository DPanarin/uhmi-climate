// Display names for features (rules from the old site's getDefaultItemName), with source typos fixed.

// Latin letters that look like Cyrillic ones; the source mixes them into Ukrainian names (e.g. "Вінницькa").
const LOOKALIKES: Record<string, string> = {
  a: 'а',
  c: 'с',
  e: 'е',
  i: 'і',
  o: 'о',
  p: 'р',
  x: 'х',
  y: 'у',
  A: 'А',
  B: 'В',
  C: 'С',
  E: 'Е',
  H: 'Н',
  I: 'І',
  K: 'К',
  M: 'М',
  O: 'О',
  P: 'Р',
  T: 'Т',
  X: 'Х',
}
const CYRILLIC = /[а-яіїєґ]/i

/** Replaces Latin look-alike letters in a string that is otherwise Ukrainian; other strings are unchanged. */
export function fixLookalikes(s: string): string {
  if (!CYRILLIC.test(s)) return s
  return s.replace(/[A-Za-z]/g, (ch) => LOOKALIKES[ch] ?? ch)
}

export const hasMixedScript = (s: string) => CYRILLIC.test(s) && /[A-Za-z]/.test(s)

export interface Names {
  uk: string
  en: string
}

const text = (v: unknown) => (typeof v === 'string' ? fixLookalikes(v.trim()) : '')

/** Oblasts: "Kyivska" → "Kyivska Oblast" / "Київська область"; cities and Crimea keep their names. */
export function oblastNames(p: Record<string, unknown>): Names {
  const lat = text(p.NAME_LAT)
  const ua = text(p.NAME_UA)
  return /(ska|zka)$/.test(lat) ? { uk: `${ua} область`, en: `${lat} Oblast` } : { uk: ua, en: lat }
}
