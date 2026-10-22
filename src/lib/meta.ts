import { de } from '../content/de'
import { en } from '../content/en'
import type { Lang, PageKey } from '../content/routes'

export function metaFor(key: PageKey | null, lang: Lang) {
  const t = lang === 'de' ? de : en
  const title = (name: string) => `${name} · ${t.site.suffix}`
  switch (key) {
    case 'home':
      return { title: t.site.title, description: t.site.description }
    case 'fahrzeuge':
    case 'yachten':
    case 'aviation':
    case 'toys':
    case 'uhren':
      return { title: title(t.categories[key].name), description: t.categories[key].text }
    case 'leasing':
      return { title: title(t.leasing.title), description: t.leasing.text }
    case 'anfrage':
      return { title: title(t.pages.anfrage.title), description: t.pages.anfrage.description }
    case 'einreichen':
      return { title: title(t.pages.einreichen.nav), description: t.pages.einreichen.text }
    case 'sourcing':
      return { title: title(t.pages.sourcing.title), description: t.pages.sourcing.text }
    case 'kontakt':
      return { title: title(t.pages.kontakt.title), description: t.pages.kontakt.text }
    case 'impressum':
      return { title: title(t.legal.impressum.title), description: t.legal.impressum.title }
    case 'datenschutz':
      return { title: title(t.legal.datenschutz.title), description: t.legal.datenschutz.title }
    case 'danke':
      return { title: title(t.pages.danke.title), description: t.pages.danke.description }
    default:
      return { title: title(t.pages.notFound.title), description: t.pages.notFound.text }
  }
}
