import { motion } from 'motion/react'
import { ArchButton, LineLink } from '../components/Cta'
import { Lines } from '../components/Lines'
import { useDict, useHref } from '../lib/i18n'
import { ease } from '../lib/motion'
import { useStageReady } from '../lib/stage'
import { useEffect, useState } from 'react'
import { track } from '../lib/pixel'
import s from './NotFound.module.css'

/** Ziel nach einer Anfrage: Online-Selbstauskunft (eigene Seite, der persönliche Link liegt im Cookie). */
const SELBSTAUSKUNFT = '/selbstauskunft?von=anfrage'
const WEITER_NACH_MS = 5000

/**
 * Landet man nach dem Absenden. Mit ?weiter=1 (Unternehmen mit E-Mail) geht es nach ein paar Sekunden
 * automatisch zur Selbstauskunft weiter – der Lead wird vorher hier gezählt.
 * Das Signet zeichnet sich: Bogen, Grundlinie, Raute, Schlüssel — aufgeschlossen.
 */
export function Thanks() {
  const t = useDict()
  const href = useHref()
  const ready = useStageReady()
  const d = t.pages.danke
  const [weiter, setWeiter] = useState(false)
  const [spaeter, setSpaeter] = useState(false)

  /* Abgeschlossene Anfrage als Lead an Meta, nur mit Einwilligung. */
  useEffect(() => {
    track('Lead', { content_name: 'Anfrage' })
    try {
      setWeiter(new URLSearchParams(window.location.search).get('weiter') === '1')
    } catch {}
  }, [])

  // Zeit läuft erst, wenn die Seite sichtbar ist (nach einem eventuellen Intro)
  useEffect(() => {
    if (!weiter || spaeter || !ready) return
    const id = window.setTimeout(() => window.location.assign(SELBSTAUSKUNFT), WEITER_NACH_MS)
    return () => window.clearTimeout(id)
  }, [weiter, spaeter, ready])

  const draw = (delay: number, duration = 1.2) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: ready ? { pathLength: 1, opacity: 1 } : undefined,
    transition: { pathLength: { delay, duration, ease: ease.inOut }, opacity: { delay, duration: 0.01 } },
  })

  return (
    <section className={s.page} data-theme="ink" aria-labelledby="thanks-title">
      <svg viewBox="9 14 46 43" className={s.emblem} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <motion.path d="M16 54 V27 A16 16 0 0 1 48 27 V54" {...draw(0.1)} />
        <motion.path d="M11 54 H53" {...draw(0.3, 0.8)} />
        <motion.path d="M32 17 L38 25 L32 33 L26 25 Z" {...draw(0.8, 0.8)} />
        <motion.path d="M32 33 V47 M32 42 H37 V46 H32" {...draw(1.1, 0.8)} />
      </svg>
      <Lines as="h1" id="thanks-title" text={d.title} play={ready} className={s.title} />
      {weiter ? (
        <>
          <p className={s.text}>{spaeter ? d.spaeterText : d.weiterText}</p>
          <div className={s.weiter}>
            <ArchButton href={SELBSTAUSKUNFT}>{d.weiterCta}</ArchButton>
            {spaeter ? (
              <LineLink to={href('home')}>{d.cta}</LineLink>
            ) : (
              <button type="button" className={s.spaeter} onClick={() => setSpaeter(true)}>
                {d.spaeter}
              </button>
            )}
          </div>
          {!spaeter && (
            <p className={s.hinweis} aria-live="polite">
              {d.weiterHinweis}
            </p>
          )}
        </>
      ) : (
        <>
          <p className={s.text}>{d.text}</p>
          <ArchButton to={href('home')}>{d.cta}</ArchButton>
        </>
      )}
    </section>
  )
}
