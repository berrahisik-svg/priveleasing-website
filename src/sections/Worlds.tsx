import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { Arrow } from '../components/Brand'
import { Picture } from '../components/Picture'
import { categoryKeys, type CategoryKey } from '../content/routes'
import { useDict, useHref } from '../lib/i18n'
import { ease } from '../lib/motion'
import { useLenis } from '../lib/scroll'
import s from './Worlds.module.css'

const N = categoryKeys.length
const SPAN = 0.55
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Aufdeckfortschritt von Welt i bei Fortschritt u (0..N). */
const reveal = (u: number, i: number) => (i === 0 ? 1 : inOut(clamp01((u - (i - SPAN)) / SPAN)))

const positions: Record<CategoryKey, string> = {
  fahrzeuge: '50% 60%',
  yachten: '50% 55%',
  aviation: '42% 60%',
  toys: '50% 45%',
  uhren: '40% 50%',
}

function Layer({ u, i, k, entry }: { u: MotionValue<number>; i: number; k: CategoryKey; entry: MotionValue<number> }) {
  const t = useDict()
  const still = useReducedMotion()
  const own = useTransform(u, (v) => reveal(v, i))
  // Die erste Welt öffnet sich schon, während der Abschnitt hereinscrollt.
  const r = i === 0 ? entry : own
  const leave = useTransform(u, (v) => (i < N - 1 ? reveal(v, i + 1) : 0))
  // Ohne Bewegung: nur Überblenden, keine Wege.
  const y = useTransform(r, (v) => (still ? '0vh' : `${(1 - v) * 14}vh`))
  const scale = useTransform(leave, (v) => (still ? 1 : 1 + v * 0.08))
  const lift = useTransform(leave, (v) => (still ? '0vh' : `${v * -8}vh`))
  const dim = useTransform(leave, (v) => v * 0.7)

  return (
    <motion.div className={s.layer} style={{ '--r': r, zIndex: i } as unknown as CSSProperties}>
      <motion.div className={s.move} style={{ y: lift, scale }}>
        <motion.div className={s.inner} style={{ y }}>
          <Picture name={t.categories[k].images[0]} alt={t.categories[k].alt[0]} sizes="100vw" position={positions[k]} />
        </motion.div>
      </motion.div>
      <motion.div className={s.dim} style={{ opacity: dim }} />
    </motion.div>
  )
}

export function Worlds() {
  const t = useDict()
  const href = useHref()
  const lenis = useLenis()
  const still = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const u = useTransform(scrollYProgress, (v) => v * N)
  const { scrollYProgress: into } = useScroll({ target: ref, offset: ['start end', 'start start'] })
  const entry = useTransform(into, (v) => inOut(clamp01(v * 1.15)))
  const [active, setActive] = useState(0)
  const bar = useTransform(scrollYProgress, (v) => clamp01(v))

  useMotionValueEvent(u, 'change', (v) => {
    let a = 0
    for (let i = 1; i < N; i++) if (reveal(v, i) > 0.5) a = i
    setActive(a)
  })

  const goTo = (i: number) => {
    const el = ref.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    const range = el.offsetHeight - window.innerHeight
    const target = top + (range * (i === 0 ? 0 : i + 0.02)) / N
    if (lenis) lenis.scrollTo(target, { duration: 1.6 })
    else window.scrollTo({ top: target, behavior: still ? 'auto' : 'smooth' })
  }

  const k = categoryKeys[active]
  const c = t.categories[k]

  return (
    <section ref={ref} className={s.worlds} data-theme="ink" data-still={still || undefined} aria-label={t.ui.categories} style={{ '--n': N } as CSSProperties}>
      <div className={s.stage}>
        <div className={s.layers}>
          {categoryKeys.map((key, i) => (
            <Layer key={key} u={u} i={i} k={key} entry={entry} />
          ))}
          <div className={s.shade} />
        </div>

        <div className={s.word} aria-hidden="true">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={k}
              className={s.wordIn}
              initial={{ y: '105%' }}
              animate={{ y: '0%' }}
              exit={{ y: '-105%' }}
              transition={{ duration: 1.1, ease: ease.expo }}
            >
              {c.word}
            </motion.span>
          </AnimatePresence>
        </div>

        <nav className={s.rail} aria-label={t.ui.categories}>
          <ol>
            {categoryKeys.map((key, i) => (
              <li key={key}>
                <button type="button" className={s.tick} aria-current={i === active ? 'true' : undefined} onClick={() => goTo(i)}>
                  <span className={`${s.tickNum} tabular`}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={s.tickName}>{t.categories[key].name}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className={s.track} aria-hidden="true">
            <motion.i style={{ scaleY: bar }} />
          </div>
        </nav>

        <div className={s.panel}>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={k}
              className={s.panelIn}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.9, ease: ease.expo, delay: 0.1 } }}
              exit={{ opacity: 0, y: -16, transition: { duration: 0.35, ease: ease.in } }}
            >
              <p className={`${s.count} tabular`}>
                <span>{String(active + 1).padStart(2, '0')}</span>
                <span className={s.of}>/ {String(N).padStart(2, '0')}</span>
              </p>
              <h3 className={s.name}>
                <Link to={href(k)}>{c.name}</Link>
              </h3>
              <p className={s.text}>{c.text}</p>
              <Link to={href(k)} className={s.go} aria-label={`${t.ui.discover}: ${c.name}`}>
                <span>{t.ui.discover}</span>
                <Arrow className={s.goArrow} />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
