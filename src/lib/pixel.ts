/**
 * Meta-Pixel und Google Analytics 4, nur nach Einwilligung.
 * Entscheidung liegt in localStorage unter `prive:consent` ('ja' | 'nein').
 * Ohne 'ja' wird kein Skript geladen und nichts gesendet.
 */
export const PIXEL_ID = '1739942817113576'
export const GA_ID = 'G-3WHNXN1640'
const KEY = 'prive:consent'
const EVENT = 'prive:consent-change'

export type Consent = 'ja' | 'nein' | null

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...a: unknown[]) => void; push?: unknown }
    _fbq?: unknown
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function readConsent(): Consent {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'ja' || v === 'nein' ? v : null
  } catch {
    return null
  }
}

export function writeConsent(v: Consent) {
  try {
    if (v) localStorage.setItem(KEY, v)
    else localStorage.removeItem(KEY)
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: v }))
  if (v === 'ja') {
    loadPixel()
    loadAnalytics()
  } else {
    stopAnalytics()
  }
}

export function onConsentChange(fn: (v: Consent) => void) {
  const h = (e: Event) => fn((e as CustomEvent<Consent>).detail)
  window.addEventListener(EVENT, h)
  return () => window.removeEventListener(EVENT, h)
}

let loaded = false
/** Offizieller Pixel-Basiscode, einmalig eingefügt. */
export function loadPixel() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  const w = window
  if (!w.fbq) {
    const n = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args)
      else n.queue!.push(args)
    } as NonNullable<Window['fbq']>
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    w.fbq = n
    w._fbq = n
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(s)
  }
  w.fbq!('init', PIXEL_ID)
  w.fbq!('track', 'PageView')
}

/** Nur senden, wenn eingewilligt und geladen. */
export function track(event: 'PageView' | 'Lead' | 'Contact' | 'ViewContent', params?: Record<string, string>) {
  if (readConsent() !== 'ja') return
  loadPixel()
  window.fbq?.('track', event, params ?? {})
  /* Seitenaufrufe zählt Google Analytics selbst (auch bei Routenwechseln), hier nur die Anfrage. */
  if (event === 'Lead') {
    loadAnalytics()
    window.gtag?.('event', 'generate_lead', params ?? {})
  }
}

let gaLoaded = false
/** Offizieller Schalter von Google: window['ga-disable-<ID>'] = true stoppt das Senden. */
function gaFlag(aus: boolean) {
  ;(window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = aus
}

/** Offizieller gtag.js-Basiscode für Google Analytics 4, einmalig eingefügt. */
export function loadAnalytics() {
  if (typeof window === 'undefined') return
  const w = window
  /* Nach einem Widerruf und erneuter Zustimmung wieder senden. */
  gaFlag(false)
  if (gaLoaded) return
  gaLoaded = true
  const layer = (w.dataLayer = w.dataLayer || [])
  /* gtag muss die arguments-Objekte in den dataLayer legen, nicht Arrays. */
  const gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    layer.push(arguments)
  } as (...args: unknown[]) => void
  w.gtag = gtag
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
  gtag('js', new Date())
  gtag('config', GA_ID)
}

/** Widerruf: nichts mehr senden und die Analytics-Cookies löschen. */
function stopAnalytics() {
  if (typeof window === 'undefined') return
  gaFlag(true)
  try {
    const host = window.location.hostname
    const domains = ['', host, `.${host}`, `.${host.replace(/^www\./, '')}`]
    document.cookie
      .split(';')
      .map((c) => c.split('=')[0].trim())
      .filter((n) => n === '_ga' || n.startsWith('_ga_'))
      .forEach((n) => {
        domains.forEach((d) => {
          document.cookie = `${n}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`
        })
      })
  } catch {}
}
