import { animate, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useLenis } from '../lib/scroll'
import { ease, introKey } from '../lib/motion'
import { EMBLEM } from './Brand'
import s from './Intro.module.css'

/**
 * Erster Besuch: Das Emblem zeichnet sich, der Schlüssel dreht sich einmal,
 * dann öffnet sich der Bogen als Tür und gibt die Seite frei.
 */
export function Intro({ onOpen }: { onOpen: () => void }) {
  const lenis = useLenis()
  const [vp, setVp] = useState<{ w: number; h: number } | null>(null)
  const [gone, setGone] = useState(false)
  const holeRef = useRef<SVGPathElement>(null)
  const markRef = useRef<SVGGElement>(null)

  useEffect(() => {
    const html = document.documentElement
    if (!html.classList.contains('is-intro')) {
      onOpen()
      setGone(true)
      return
    }
    html.classList.add('intro-mounted')
    setVp({ w: window.innerWidth, h: window.innerHeight })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (vp) lenis?.stop()
  }, [vp, lenis])

  useEffect(() => {
    if (!vp || !holeRef.current || !markRef.current) return
    const hole = holeRef.current
    const mark = markRef.current
    const html = document.documentElement
    let cancelled = false
    const timers: number[] = []
    const later = (ms: number) => new Promise<void>((r) => timers.push(window.setTimeout(r, ms)))

    const run = async () => {
      await later(2250)
      if (cancelled) return
      // Das Innere des Bogens wird zum Fenster.
      await animate(hole, { opacity: [0, 1] }, { duration: 0.55, ease: ease.out })
      if (cancelled) return
      const reach = (Math.hypot(vp.w, vp.h) / (Math.min(vp.w, vp.h) * 0.3)) * 2.2
      animate(mark, { opacity: 0 }, { duration: 0.45, ease: ease.out })
      animate(mark, { scale: reach }, { duration: 1.5, ease: ease.door })
      timers.push(window.setTimeout(onOpen, 420))
      await animate(hole, { scale: reach }, { duration: 1.5, ease: ease.door })
      if (cancelled) return
      html.classList.remove('is-intro', 'intro-mounted')
      try {
        sessionStorage.setItem(introKey, '1')
      } catch {
        /* privater Modus: Intro kommt dann eben wieder */
      }
      lenis?.start()
      setGone(true)
    }
    run()
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp])

  if (gone || !vp) return null

  const size = Math.min(vp.w, vp.h) * 0.3
  const k = size / 380
  const tx = vp.w / 2 - 271.5 * k
  const ty = vp.h / 2 - 262 * k
  const drawn = (delay: number, duration = 1.1) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { pathLength: { delay, duration, ease: ease.inOut }, opacity: { delay, duration: 0.01 } },
  })

  return (
    <div className={s.intro} aria-hidden="true">
      <svg className={s.svg} width={vp.w} height={vp.h} viewBox={`0 0 ${vp.w} ${vp.h}`}>
        <defs>
          <mask id="intro-door" maskUnits="userSpaceOnUse" x="0" y="0" width={vp.w} height={vp.h}>
            <rect width={vp.w} height={vp.h} fill="white" />
            <g transform={`translate(${tx} ${ty}) scale(${k})`}>
              <path ref={holeRef} className={s.hole} d="M123 466 V240 A148.5 148.5 0 0 1 420 240 V466 Z" fill="black" />
            </g>
          </mask>
        </defs>
        <rect width={vp.w} height={vp.h} className={s.curtain} mask="url(#intro-door)" />
        <g transform={`translate(${tx} ${ty}) scale(${k})`}>
          <g ref={markRef} className={s.mark}>
            <motion.path d={EMBLEM.base} strokeWidth={6.5} {...drawn(0.05, 0.9)} />
            <motion.path d={EMBLEM.baseThin} strokeWidth={2.6} {...drawn(0.2, 0.9)} />
            <motion.path d={EMBLEM.archOuter} strokeWidth={6.5} {...drawn(0.15, 1.25)} />
            <motion.path d={EMBLEM.archInner} strokeWidth={2.6} {...drawn(0.35, 1.25)} />
            {EMBLEM.rays.map((d, i) => (
              <motion.path
                key={d}
                d={d}
                strokeWidth={2.6}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.85 + i * 0.045, duration: 0.35, ease: ease.out }}
              />
            ))}
            <motion.path
              d={EMBLEM.star}
              strokeWidth={4}
              className={s.star}
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.9, ease: ease.expo }}
            />
            <motion.g initial={{ y: -46, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7, duration: 1.1, ease: ease.expo }}>
              <path d={EMBLEM.bowOuter} strokeWidth={6.5} />
              <path d={EMBLEM.bowInner} strokeWidth={2.6} />
              <circle cx="271.5" cy="208" r="7" strokeWidth={2.6} />
              <path d={EMBLEM.neck} strokeWidth={6.5} />
              <path d={EMBLEM.guard} strokeWidth={6.5} />
              <path d={EMBLEM.shaft} strokeWidth={6.5} />
              {/* Der Bart dreht einmal um den Schaft: aufgeschlossen. */}
              <motion.path
                d={EMBLEM.bit}
                strokeWidth={6.5}
                className={s.bit}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: [1, -1, 1] }}
                transition={{ delay: 1.5, duration: 0.85, ease: ease.inOut, times: [0, 0.5, 1] }}
              />
            </motion.g>
          </g>
        </g>
      </svg>
    </div>
  )
}
