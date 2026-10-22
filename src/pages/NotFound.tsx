import { motion } from 'motion/react'
import { EMBLEM } from '../components/Brand'
import { ArchButton } from '../components/Cta'
import { Lines } from '../components/Lines'
import { useDict, useHref } from '../lib/i18n'
import { ease } from '../lib/motion'
import { useStageReady } from '../lib/stage'
import s from './NotFound.module.css'

export function NotFound() {
  const t = useDict()
  const href = useHref()
  const ready = useStageReady()
  const nf = t.pages.notFound

  return (
    <section className={s.page} data-theme="ink" aria-labelledby="nf-title">
      <svg viewBox={EMBLEM.viewBox} className={s.emblem} aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d={EMBLEM.base} strokeWidth={4} />
          <path d={EMBLEM.archOuter} strokeWidth={4} />
          <path d={EMBLEM.archInner} strokeWidth={1.6} />
          {/* Der Schlüssel versucht es, aber das Schloss gibt nicht nach. */}
          <motion.g
            style={{ transformOrigin: '271.5px 290px', transformBox: 'view-box' }}
            animate={ready ? { rotate: [0, -7, 5, -3, 0] } : undefined}
            transition={{ delay: 0.9, duration: 1.1, ease: ease.inOut, repeat: Infinity, repeatDelay: 2.4 }}
          >
            <path d={EMBLEM.bowOuter} strokeWidth={4} />
            <path d={EMBLEM.bowInner} strokeWidth={1.6} />
            <path d={EMBLEM.neck} strokeWidth={4} />
            <path d={EMBLEM.guard} strokeWidth={4} />
            <path d={EMBLEM.shaft} strokeWidth={4} />
            <path d={EMBLEM.bit} strokeWidth={4} />
          </motion.g>
        </g>
      </svg>
      <Lines as="h1" id="nf-title" text={nf.title} play={ready} className={s.title} />
      <p className={s.text}>{nf.text}</p>
      <ArchButton to={href('home')}>{nf.cta}</ArchButton>
    </section>
  )
}
