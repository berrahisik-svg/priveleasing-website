import { motion } from 'motion/react'
import { ArchButton } from '../components/Cta'
import { Lines } from '../components/Lines'
import { useDict, useHref } from '../lib/i18n'
import { ease } from '../lib/motion'
import { useStageReady } from '../lib/stage'
import { useEffect } from 'react'
import { track } from '../lib/pixel'
import s from './NotFound.module.css'

/**
 * Landet man nach dem Absenden (FormSubmit leitet per _next hierher).
 * Das Signet zeichnet sich: Bogen, Grundlinie, Raute, Schlüssel — aufgeschlossen.
 */
export function Thanks() {
  const t = useDict()
  const href = useHref()
  const ready = useStageReady()
  const d = t.pages.danke
  /* Abgeschlossene Anfrage als Lead an Meta, nur mit Einwilligung. */
  useEffect(() => {
    track('Lead', { content_name: 'Anfrage' })
  }, [])
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
      <p className={s.text}>{d.text}</p>
      <ArchButton to={href('home')}>{d.cta}</ArchButton>
    </section>
  )
}
