import type { SVGProps } from 'react'
import { WORDMARK_PATHS } from './wordmarkPaths'

type P = SVGProps<SVGSVGElement> & { title?: string }

export function Wordmark({ title = 'PRIVÉ', ...rest }: P) {
  return (
    <svg viewBox="0 512 1115 348" fill="currentColor" role="img" aria-label={title} {...rest}>
      {WORDMARK_PATHS.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

/** Kleines Signet: Bogen, Raute, Schlüssel. Für Kopfzeile und Favicon-Größen. */
export function Mark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="9 14 46 43" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M16 54 V27 A16 16 0 0 1 48 27 V54" />
      <path d="M11 54 H53" />
      <path d="M32 17 L38 25 L32 33 L26 25 Z" />
      <path d="M32 33 V47" />
      <path d="M32 42 H37 V46 H32" />
    </svg>
  )
}

/** Geometrie des großen Emblems, einzeln adressierbar für Animationen. */
export const EMBLEM = {
  viewBox: '60 -6 423 500',
  archOuter: 'M104 466 V240 A167.5 167.5 0 0 1 439 240 V466',
  archInner: 'M123 466 V240 A148.5 148.5 0 0 1 420 240 V466',
  base: 'M78 466 H465',
  baseThin: 'M100 484 H443',
  rays: [
    'M188.4 185.7 L167.2 180.0',
    'M197.0 165.0 L178.0 154.0',
    'M210.7 147.2 L195.1 131.6',
    'M228.5 133.5 L217.5 114.5',
    'M249.2 124.9 L243.5 103.7',
    'M271.5 122.0 L271.5 100.0',
    'M293.8 124.9 L299.5 103.7',
    'M314.5 133.5 L325.5 114.5',
    'M332.3 147.2 L347.9 131.6',
    'M346.0 165.0 L365.0 154.0',
    'M354.6 185.7 L375.8 180.0',
  ],
  star: 'M271.5 4 L278.5 26 L300.5 33 L278.5 40 L271.5 62 L264.5 40 L242.5 33 L264.5 26 Z',
  bowOuter: 'M271.5 138 L327.5 208 L271.5 278 L215.5 208 Z',
  bowInner: 'M271.5 162 L308.5 208 L271.5 254 L234.5 208 Z',
  neck: 'M271.5 278 V292',
  guard: 'M249.5 292 H293.5',
  shaft: 'M263.5 292 V432 Q271.5 443 279.5 432 V292',
  bit: 'M279.5 362 H317.5 V384 H297.5 V398 H317.5 V420 H279.5',
} as const

/** Vierzackiger Stern aus dem Emblem, als Aufzählungszeichen. */
export function Star(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M8 0 L9.8 6.2 L16 8 L9.8 9.8 L8 16 L6.2 9.8 L0 8 L6.2 6.2 Z" fill="currentColor" />
    </svg>
  )
}

export function Arrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 28 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M1 6 H26.5" />
      <path d="M21.5 1 L26.8 6 L21.5 11" />
    </svg>
  )
}
