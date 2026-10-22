/**
 * Meta-Pixel, nur nach Einwilligung.
 * Entscheidung liegt in localStorage unter `prive:consent` ('ja' | 'nein').
 * Ohne 'ja' wird kein Skript geladen und nichts gesendet.
 */
export const PIXEL_ID = '1739942817113576'
const KEY = 'prive:consent'
const EVENT = 'prive:consent-change'

export type Consent = 'ja' | 'nein' | null

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...a: unknown[]) => void; push?: unknown }
    _fbq?: unknown
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
  if (v === 'ja') loadPixel()
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
}
