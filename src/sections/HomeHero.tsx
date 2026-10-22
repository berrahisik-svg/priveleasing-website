import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef, type CSSProperties } from 'react'
import { ArchButton, LineLink } from '../components/Cta'
import { Lines } from '../components/Lines'
import { Picture } from '../components/Picture'
import { useDict, useHref } from '../lib/i18n'
import { useRange } from '../lib/range'
import { useStageReady } from '../lib/stage'
import s from './HomeHero.module.css'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Die Tür: Das Motiv steht zuerst in einem Bogen, beim Scrollen öffnet sich der
 * Bogen zur vollen Fläche. Die Geometrie liegt in CSS, JS liefert nur den Fortschritt.
 */
export function HomeHero() {
  const t = useDict()
  const href = useHref()
  const ready = useStageReady()
  const still = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  const open = useTransform(p, (v) => (still ? 1 : inOut(clamp01(v / 0.62))))
  const imgScale = useRange(p, [0, 0.7], [1.12, 1])
  const typeY = useRange(p, [0, 0.5], [0, -24], 'vh')
  const typeO = useRange(p, [0.08, 0.42], [1, 0])
  const leadO = useRange(p, [0, 0.16], [1, 0])
  const shade = useTransform(p, (v) => (v < 0.55 ? 0.34 - 0.14 * (v / 0.55) : 0.2 + 0.42 * Math.min(1, (v - 0.55) / 0.45)))
  const sayO = useRange(p, [0.66, 0.84], [0, 1])
  const sayY = useRange(p, [0.66, 0.9], [6, 0], 'vh')

  return (
    <section ref={ref} className={s.hero} data-theme="ink" aria-labelledby="hero-title">
      <div className={s.stage}>
        <motion.div className={s.door} style={{ '--e': open } as unknown as CSSProperties} data-ready={ready || undefined}>
          <motion.div className={s.img} style={{ scale: imgScale }}>
            <Picture name="hero" portrait="hero-portrait" alt="" priority sizes="100vw" />
          </motion.div>
          <motion.div className={s.shade} style={{ opacity: shade }} />
          <div className={s.vignette} />
        </motion.div>

        <motion.div className={s.frame} style={{ opacity: leadO }} data-ready={ready || undefined} aria-hidden="true" />
        <motion.div className={s.ground} style={{ opacity: leadO }} data-ready={ready || undefined} aria-hidden="true" />

        <motion.h1 id="hero-title" className={s.title} style={{ y: typeY, opacity: typeO }}>
          <Lines text={t.home.heroA} play={ready} unfold className={s.a} stagger={120} />{' '}
          <Lines text={t.home.heroB} play={ready} unfold delay={260} className={s.b} />
        </motion.h1>

        <motion.div className={s.foot} style={{ opacity: leadO }}>
          <p className={s.lead} data-ready={ready || undefined}>
            {t.home.heroLead}
          </p>
          <div className={s.ctas} data-ready={ready || undefined}>
            <ArchButton to={href('anfrage')}>{t.ui.enquire}</ArchButton>
            <LineLink to={href('leasing')}>{t.ui.leasing}</LineLink>
          </div>
        </motion.div>

        <motion.div className={s.cue} style={{ opacity: leadO }} aria-hidden="true" data-ready={ready || undefined}>
          <span>{t.ui.scroll}</span>
          <i />
        </motion.div>

        <motion.div className={s.say} style={{ opacity: sayO, y: sayY }}>
          <h2 className={s.sayTitle}>{t.home.worldsTitle}</h2>
          <p className={s.sayLead}>{t.home.worldsLead}</p>
        </motion.div>
      </div>
    </section>
  )
}
