import type { CategoryKey } from './routes'
import type { ImageName } from '../lib/images'

export type FieldName =
  | 'suche'
  | 'name'
  | 'telefon'
  | 'email'
  | 'budget'
  | 'land'
  | 'zeitraum'
  | 'link'
  | 'datei'
  | 'objektart'
  | 'kaufpreis'
  | 'verkaeufer'
  | 'firma'
  | 'kundenart'

export type FormKey = 'kurz' | 'anfrage' | 'einreichen' | 'sourcing'

export type Category = {
  name: string
  word: string
  text: string
  does: string[]
  images: [ImageName, ImageName]
  alt: [string, string]
  /** Hochformat für Bogenrahmen (Menü) */
  arch: ImageName
  objekt: string
}

export type LegalBlock = { heading: string; body: string; link?: { text: string; to: 'anfrage' } }

export type Dict = {
  lang: 'de' | 'en'
  site: { title: string; description: string; suffix: string }
  ui: {
    call: string
    whatsapp: string
    skip: string
    menu: string
    close: string
    home: string
    langName: string
    otherLang: string
    otherLangShort: string
    enquire: string
    leasing: string
    discover: string
    next: string
    back: string
    scroll: string
    categories: string
    services: string
    legal: string
    company: string
    location: string
    rights: string
  }
  nav: { categories: string; services: string }
  home: {
    heroA: string
    heroB: string
    heroLead: string
    worldsTitle: string
    worldsLead: string
    waysTitle: string
    ways: { title: string; text: string; cta: string; to: 'leasing' | 'einreichen' | 'sourcing'; alt?: { cta: string; to: 'einreichen' } }[]
    formTitle: string
    formLead: string
  }
  categories: Record<CategoryKey, Category>
  categoryPage: { doesTitle: string; foundTitle: string; foundText: string; foundCta: string; sourcingTitle: string; sourcingText: string; sourcingCta: string; nextLabel: string }
  leasing: {
    title: string
    text: string
    specs: [string, string][]
    specsTitle: string
    note: string
    ctaA: string
    ctaB: string
    processTitle: string
    steps: { title: string; text: string }[]
    imageAlt: string
  }
  pages: {
    anfrage: { title: string; text: string; description: string }
    einreichen: { title: string; text: string; nav: string }
    sourcing: { title: string; text: string }
    kontakt: { title: string; text: string; companyTitle: string; firm: string; firmLabel: string; seat: string; seatLabel: string; whatsappLabel: string; phoneLabel: string; mailLabel: string; note: string; ctaTitle: string }
    notFound: { title: string; text: string; cta: string }
    danke: { title: string; text: string; cta: string; description: string }
  }
  form: {
    labels: Record<FieldName, string>
    objektarten: string[]
    kundenarten: string[]
    nurGewerblich: string
    landObjekt: string
    choose: string
    fileHint: string
    fileChange: string
    fileRemove: string
    auftrag: string
    consentA: string
    consentLink: string
    consentB: string
    docsNote: string
    submit: string
    required: string
    optional: string
    msg: { required: string; mail: string; contact: string; sending: string; ok: string; err: string; off: string }
    okTitle: string
    again: string
    subjects: Record<FormKey, string>
  }
  consent: { title: string; text: string; more: string; accept: string; decline: string; settings: string }
  legal: {
    impressum: { title: string; blocks: LegalBlock[] }
    datenschutz: { title: string; blocks: LegalBlock[] }
    impressumShort: string
    datenschutzShort: string
  }
}
