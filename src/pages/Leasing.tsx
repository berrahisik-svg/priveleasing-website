import { motion, useScroll } from 'motion/react'
import { useRef, type CSSProperties } from 'react'
import { ArchButton, LineLink } from '../components/Cta'
import { Lines } from '../components/Lines'
import { Picture } from '../components/Picture'
import { useDict, useHref } from '../lib/i18n'
import { useRange } from '../lib/range'
import { useStageReady } from '../lib/stage'
import { Process } from '../sections/Process'
import s from './Leasing.module.css'

export function Leasing() {
  const t = useDict()
  const href = useHref()
  const ready = useStageReady()
  const L = t.leasing
  const hero = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: hero, offset: ['start start', 'end start'] })
  const imgScale = useRange(scrollYProgress, [0, 1], [1, 1.08])

  return (
    <>
      <section ref={hero} className={s.hero} data-theme="ink" aria-labelledby="leasing-title">
        <div className={s.heroText}>
          <Lines as="h1" id="leasing-title" text={L.title} play={ready} unfold className={s.title} />
          <p className={s.lead} data-ready={ready || undefined}>
            {L.text}
          </p>
          <div className={s.ctas} data-ready={ready || undefined}>
            <ArchButton to={href('anfrage')}>{L.ctaA}</ArchButton>
            <LineLink to={href('einreichen')}>{L.ctaB}</LineLink>
          </div>
        </div>
        <div className={s.heroArt} data-ready={ready || undefined}>
          <div className={s.box}>
            <span className={s.ring} aria-hidden="true" />
            <div className={s.arch}>
              <motion.div className={s.archImg} style={{ scale: imgScale }}>
                <Picture name="arch-leasing" alt={L.imageAlt} priority sizes="(max-width: 900px) 80vw, 36vw" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section className={s.specs} data-theme="alu" aria-labelledby="specs-title">
        <div className={s.specsGrid}>
          <div className={s.specsHead}>
            <h2 id="specs-title" className={`label ${s.specsLabel}`}>
              {L.specsTitle}
            </h2>
            <Lines as="p" text={L.note} className={s.note} />
          </div>
          <dl className={s.sheet}>
            {L.specs.map(([term, value], i) => (
              <div key={term} className={s.row} style={{ '--i': i } as CSSProperties}>
                <dt>
                  <span className={`${s.rowNum} tabular`}>{String(i + 1).padStart(2, '0')}</span>
                  {term}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Process />
    </>
  )
}
