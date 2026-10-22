import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import { useRef, useState, type CSSProperties } from 'react'
import { EMBLEM } from '../components/Brand'
import { Lines } from '../components/Lines'
import { useDict } from '../lib/i18n'
import s from './Process.module.css'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Ablauf in drei Schritten. Der Schlüssel aus dem Emblem wandert beim Scrollen
 * über die Linie und schließt am letzten Schritt auf.
 */
export function Process({ title }: { title?: string }) {
  const t = useDict()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.75', 'end 0.55'] })
  const p = useTransform(scrollYProgress, (v) => clamp01(v))
  const [reached, setReached] = useState(0)
  const turn = useTransform(p, (v) => (v > 0.94 ? -1 : 1))

  useMotionValueEvent(p, 'change', (v) => {
    setReached(v >= 0.94 ? 3 : v >= 0.48 ? 2 : v > 0.02 ? 1 : 0)
  })

  const steps = t.leasing.steps

  return (
    <section ref={ref} className={s.process} data-theme="ink" aria-labelledby="process-title">
      <div className={s.head}>
        <Lines as="h2" id="process-title" text={title ?? t.leasing.processTitle} className={s.title} />
      </div>

      <div className={s.track}>
        <div className={s.rail} aria-hidden="true">
          <motion.i className={s.fill} style={{ '--p': p } as unknown as CSSProperties} />
          <motion.div className={s.key} style={{ '--p': p } as unknown as CSSProperties}>
            <svg viewBox="200 130 130 320" className={s.keySvg}>
              <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d={EMBLEM.bowOuter} strokeWidth={9} />
                <path d={EMBLEM.bowInner} strokeWidth={4} />
                <circle cx="271.5" cy="208" r="8" strokeWidth={4} />
                <path d={EMBLEM.neck} strokeWidth={9} />
                <path d={EMBLEM.guard} strokeWidth={9} />
                <path d={EMBLEM.shaft} strokeWidth={9} />
                <motion.path d={EMBLEM.bit} strokeWidth={9} className={s.bit} style={{ scaleX: turn }} />
              </g>
            </svg>
          </motion.div>
        </div>

        <ol className={s.steps}>
          {steps.map((st, i) => (
            <li key={st.title} className={s.step} data-on={reached > i || undefined} data-last={i === steps.length - 1 || undefined}>
              <span className={s.node} aria-hidden="true" />
              <p className={`${s.num} tabular`}>{String(i + 1).padStart(2, '0')}</p>
              <h3 className={s.stepTitle}>{st.title}</h3>
              <p className={s.stepText}>{st.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
