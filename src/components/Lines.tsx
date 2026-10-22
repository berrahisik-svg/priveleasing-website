import { useInView } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ElementType } from 'react'
import s from './Lines.module.css'

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

type Props = {
  text: string
  as?: ElementType
  className?: string
  /** Verzögerung in ms */
  delay?: number
  /** Extern gesteuert (z. B. nach dem Intro). Ohne Angabe: sobald sichtbar. */
  play?: boolean
  /** Wörter falten sich beim Erscheinen von schmal auf breit auf. */
  unfold?: boolean
  stagger?: number
  id?: string
}

/**
 * Setzt Text Zeile für Zeile aus einer Maske frei. Die Zeilen werden nach dem
 * Layout gemessen, damit alle Wörter einer Zeile gemeinsam steigen.
 */
export function Lines({ text, as: Tag = 'span', className, delay = 0, play, unfold, stagger = 90, id }: Props) {
  const ref = useRef<HTMLElement>(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const [lines, setLines] = useState<number[]>([])
  // "|" markiert eine Trennstelle, die nur auf schmalen Bildschirmen umbricht (mit Trennstrich).
  const words = text.split(/\s+/).filter(Boolean).flatMap((w) => {
    const parts = w.split('|')
    return parts.map((p, i) => ({ p, hy: i < parts.length - 1, glue: i > 0 }))
  })
  const active = play ?? seen

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const items = Array.from(el.querySelectorAll<HTMLElement>('[data-w]'))
      let line = -1
      let top = -Infinity
      const next = items.map((w) => {
        if (w.offsetTop > top + 2) {
          line += 1
          top = w.offsetTop
        }
        return line
      })
      setLines((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [text])

  return (
    <Tag ref={ref} id={id} className={`${s.lines} ${unfold ? s.unfold : ''} ${className ?? ''}`} data-in={active || undefined}>
      {words.map(({ p: w, hy }, i) => (
        <span key={i}>
          <span data-w className={`${s.w} ${hy ? s.hy : ''}`} style={{ '--l': lines[i] ?? 0, '--d': `${delay}ms`, '--st': `${stagger}ms` } as CSSProperties}>
            {unfold ? (
              <>
                {/* Platzhalter in voller Breite, per CSS gesetzt, damit der Text nicht doppelt im Dokument steht */}
                <span className={s.ghost} data-text={w} aria-hidden="true" />
                <span className={`${s.i} ${s.abs}`}>{w}</span>
              </>
            ) : (
              <span className={s.i}>{w}</span>
            )}
          </span>
          {hy ? <br className={s.mbr} /> : i < words.length - 1 && !words[i + 1].glue ? ' ' : null}
        </span>
      ))}
    </Tag>
  )
}
