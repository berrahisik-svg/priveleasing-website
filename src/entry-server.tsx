import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { App } from './App'
import { allPaths, langOf, noIndex, paths, resolve } from './content/routes'
import { metaFor } from './lib/meta'
import { de } from './content/de'
import { en } from './content/en'

export { allPaths }
export const noIndexPaths = noIndex.flatMap((k) => [paths[k].de, paths[k].en])

/* Strukturierte Daten als ein Graph: Organisation, Website, Seite, Brotkrumen.
   Bewusst ohne Telefon, Öffnungszeiten, Bewertungen oder Preise — erfundene
   Angaben verstoßen gegen Googles Richtlinien. */
export function jsonLd(url: string, site: string) {
  const hit = resolve(url)
  const lang = langOf(url)
  const t = lang === 'de' ? de : en
  const meta = metaFor(hit?.key ?? null, lang)
  const abs = (p: string) => site + p
  const org = {
    '@type': 'Organization',
    '@id': abs('/#org'),
    name: 'PRIVÉ',
    legalName: 'Lead Lab Consulting FZCO',
    url: abs('/'),
    logo: abs('/brand/prive-luxury-leasing-logo-white.svg'),
    address: { '@type': 'PostalAddress', addressLocality: 'Dubai', addressCountry: 'AE' },
    telephone: '+49 89 41616310',
    email: 'info@priveleasing.de',
  }
  const web = { '@type': 'WebSite', '@id': abs('/#site'), url: abs('/'), name: 'PRIVÉ', inLanguage: lang, publisher: { '@id': abs('/#org') } }
  const page = {
    '@type': 'WebPage',
    '@id': abs(url) + '#page',
    url: abs(url),
    name: meta.title,
    description: meta.description,
    inLanguage: lang,
    isPartOf: { '@id': abs('/#site') },
    primaryImageOfPage: abs('/img/og.jpg'),
  }
  const graph: unknown[] = [org, web, page]
  if (hit && hit.key !== 'home') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t.site.suffix, item: abs(paths.home[lang]) },
        { '@type': 'ListItem', position: 2, name: meta.title.replace(/ · PRIVÉ$/, ''), item: abs(url) },
      ],
    })
  }
  const services = new Set(['leasing', 'sourcing', 'einreichen', 'fahrzeuge', 'yachten', 'aviation', 'toys', 'uhren'])
  if (hit && services.has(hit.key)) {
    graph.push({ '@type': 'Service', name: meta.title.replace(/ · PRIVÉ$/, ''), description: meta.description, provider: { '@id': abs('/#org') }, url: abs(url) })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

export function render(url: string) {
  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  )
  const hit = resolve(url)
  const lang = langOf(url)
  const meta = metaFor(hit?.key ?? null, lang)
  const alternates = hit ? { de: paths[hit.key].de, en: paths[hit.key].en } : null
  return { html, lang, meta, alternates }
}
