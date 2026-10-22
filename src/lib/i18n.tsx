import { useLocation } from 'react-router'
import { de } from '../content/de'
import { en } from '../content/en'
import { langOf, paths, resolve, type Lang, type PageKey } from '../content/routes'

const dicts = { de, en }

export function useLang(): Lang {
  return langOf(useLocation().pathname)
}

export function useDict() {
  return dicts[useLang()]
}

export function useHref() {
  const lang = useLang()
  return (key: PageKey) => paths[key][lang]
}

/** Gegenstück der aktuellen Seite in der anderen Sprache. */
export function useAlternate() {
  const { pathname, search } = useLocation()
  const lang = langOf(pathname)
  const other: Lang = lang === 'de' ? 'en' : 'de'
  const hit = resolve(pathname)
  return { lang: other, href: (hit ? paths[hit.key][other] : paths.home[other]) + search }
}
