import { useEffect } from 'react'
import type { Location } from 'react-router'
import { langOf, resolve } from './content/routes'
import { Shell } from './components/Shell'
import { SmoothScroll } from './lib/scroll'
import { metaFor } from './lib/meta'
import { Home } from './pages/Home'
import { Category } from './pages/Category'
import { Leasing } from './pages/Leasing'
import { FormPage } from './pages/FormPage'
import { Contact } from './pages/Contact'
import { Legal } from './pages/Legal'
import { NotFound } from './pages/NotFound'
import { Thanks } from './pages/Thanks'

function Page({ location }: { location: Location }) {
  const hit = resolve(location.pathname)
  const lang = langOf(location.pathname)

  useEffect(() => {
    const m = metaFor(hit?.key ?? null, lang)
    document.title = m.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', m.description)
  }, [hit?.key, lang])

  switch (hit?.key) {
    case 'home':
      return <Home />
    case 'fahrzeuge':
    case 'yachten':
    case 'aviation':
    case 'toys':
    case 'uhren':
      return <Category k={hit.key} />
    case 'leasing':
      return <Leasing />
    case 'anfrage':
    case 'einreichen':
    case 'sourcing':
      return <FormPage k={hit.key} />
    case 'kontakt':
      return <Contact />
    case 'impressum':
    case 'datenschutz':
      return <Legal k={hit.key} />
    case 'danke':
      return <Thanks />
    default:
      return <NotFound />
  }
}

export function App() {
  return (
    <SmoothScroll>
      <Shell render={(location) => <Page location={location} />} />
    </SmoothScroll>
  )
}
