export type Lang = 'de' | 'en'

export type PageKey =
  | 'home'
  | 'fahrzeuge'
  | 'yachten'
  | 'aviation'
  | 'toys'
  | 'uhren'
  | 'leasing'
  | 'anfrage'
  | 'einreichen'
  | 'sourcing'
  | 'kontakt'
  | 'impressum'
  | 'datenschutz'
  | 'danke'

export const paths: Record<PageKey, Record<Lang, string>> = {
  home: { de: '/', en: '/en' },
  fahrzeuge: { de: '/fahrzeuge', en: '/en/vehicles' },
  yachten: { de: '/yachten-boote', en: '/en/yachts-boats' },
  aviation: { de: '/aviation', en: '/en/aviation' },
  toys: { de: '/luxury-toys', en: '/en/luxury-toys' },
  uhren: { de: '/uhren', en: '/en/watches' },
  leasing: { de: '/leasing', en: '/en/leasing' },
  anfrage: { de: '/anfrage', en: '/en/enquiry' },
  einreichen: { de: '/objekt-einreichen', en: '/en/submit-object' },
  sourcing: { de: '/private-sourcing', en: '/en/private-sourcing' },
  kontakt: { de: '/kontakt', en: '/en/contact' },
  impressum: { de: '/impressum', en: '/en/imprint' },
  datenschutz: { de: '/datenschutz', en: '/en/privacy' },
  danke: { de: '/danke', en: '/en/thank-you' },
}

export const categoryKeys = ['fahrzeuge', 'yachten', 'aviation', 'toys', 'uhren'] as const
export type CategoryKey = (typeof categoryKeys)[number]

const byPath = new Map<string, { key: PageKey; lang: Lang }>()
for (const [key, p] of Object.entries(paths) as [PageKey, Record<Lang, string>][]) {
  byPath.set(p.de, { key, lang: 'de' })
  byPath.set(p.en, { key, lang: 'en' })
}

export function normalize(pathname: string) {
  const clean = pathname.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/+$/, '')
  return clean === '' ? '/' : clean
}

export function resolve(pathname: string) {
  return byPath.get(normalize(pathname)) ?? null
}

export function langOf(pathname: string): Lang {
  const p = normalize(pathname)
  return p === '/en' || p.startsWith('/en/') ? 'en' : 'de'
}

export const allPaths = [...byPath.keys()]

/** Seiten, die nicht in die Sitemap und nicht in den Index gehören. */
export const noIndex: PageKey[] = ['danke']
