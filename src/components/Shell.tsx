import { animate, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, type Location } from 'react-router'
import { ease } from '../lib/motion'
import { scrollToTop, useLenis } from '../lib/scroll'
import { StageCtx } from '../lib/stage'
import { useDict } from '../lib/i18n'
import { image, type ImageName } from '../lib/images'
import { resolve } from '../content/routes'
import { de } from '../content/de'
import { Intro } from './Intro'
import { Header } from './Header'
import { Footer } from './Footer'
import { Consent } from './Consent'
import s from './Shell.module.css'

type Phase = 'idle' | 'cover' | 'reveal'

/* Das Hauptmotiv der Zielseite lädt, während die Kuppel steigt. */
function preload(pathname: string) {
  const hit = resolve(pathname)
  if (!hit) return
  const k = hit.key
  const name: ImageName | null =
    k === 'fahrzeuge' || k === 'yachten' || k === 'aviation' || k === 'toys' || k === 'uhren'
      ? de.categories[k].images[0]
      : k === 'home'
        ? 'hero'
        : k === 'leasing'
          ? 'arch-leasing'
          : null
  if (!name) return
  const i = image(name)
  const need = window.innerWidth * Math.min(2, window.devicePixelRatio || 1)
  const src = i.avif.split(', ').map((c) => c.split(' ')[0]).find((u, idx, all) => Number(u.match(/-(\d+)\.avif$/)?.[1]) >= need || idx === all.length - 1)
  if (src) new Image().src = src
}

/**
 * Rahmen jeder Seite. Beim Seitenwechsel steigt eine Graphitkuppel auf,
 * dahinter wird die neue Seite getauscht und öffnet sich als Bogen von unten.
 */
export function Shell({ render }: { render: (location: Location) => ReactNode }) {
  const location = useLocation()
  const lenis = useLenis()
  const still = useReducedMotion()
  const t = useDict()
  const [shown, setShown] = useState(location)
  const [phase, setPhase] = useState<Phase>('idle')
  const [ready, setReady] = useState(false)
  const [introOpen, setIntroOpen] = useState(false)
  const curtain = useRef<HTMLDivElement>(null)
  const page = useRef<HTMLDivElement>(null)
  const pending = useRef<Location | null>(null)

  useEffect(() => {
    if (location.pathname === shown.pathname) {
      if (location.search !== shown.search || location.key !== shown.key) setShown(location)
      return
    }
    if (still || !curtain.current) {
      setShown(location)
      scrollToTop(lenis)
      return
    }
    pending.current = location
    if (phase !== 'idle') return
    setReady(false)
    setPhase('cover')
    lenis?.stop()
    const el = curtain.current
    const old = page.current
    preload(location.pathname)
    if (old) animate(old, { y: '-7vh', opacity: 0.55 }, { duration: 0.72, ease: ease.door })
    animate(el, { y: ['100%', '0%'] }, { duration: 0.72, ease: ease.door }).then(() => {
      const next = pending.current ?? location
      pending.current = null
      scrollToTop(lenis)
      setShown(next)
      setPhase('reveal')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  // Titel, Sprache und Fokus folgen der gezeigten Seite.
  useEffect(() => {
    document.documentElement.lang = t.lang
    const main = document.getElementById('main')
    if (phase === 'reveal' && main) main.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.pathname])

  useEffect(() => {
    if (phase !== 'reveal') return
    const id = window.setTimeout(() => setReady(true), 260)
    return () => window.clearTimeout(id)
  }, [phase])

  useEffect(() => {
    if (introOpen && phase === 'idle') setReady(true)
  }, [introOpen, phase])

  const onRevealed = () => {
    if (phase !== 'reveal') return
    if (curtain.current) curtain.current.style.transform = 'translateY(100%)'
    if (page.current) page.current.style.clipPath = 'none'
    setPhase('idle')
    lenis?.start()
  }

  const closed = 'inset(100vh 0vw 0vh 0vw round 50vw 50vw 0vw 0vw)'
  const open = 'inset(0vh 0vw 0vh 0vw round 0vw 0vw 0vw 0vw)'

  return (
    <StageCtx.Provider value={ready}>
      <a className="skip" href="#main">
        {t.ui.skip}
      </a>
      <Header />
      <motion.div
        key={shown.pathname}
        ref={page}
        className={s.page}
        initial={phase === 'reveal' ? { clipPath: closed, y: '14vh' } : false}
        animate={phase === 'reveal' ? { clipPath: open, y: 0 } : undefined}
        transition={{ duration: 0.95, ease: ease.expo }}
        data-phase={phase}
        onAnimationComplete={onRevealed}
      >
        <main id="main" tabIndex={-1} className={s.main}>
          {render(shown)}
        </main>
        <Footer />
      </motion.div>
      <div ref={curtain} className={s.curtain} data-phase={phase} aria-hidden="true" />
      <Intro onOpen={() => setIntroOpen(true)} />
      <Consent />
      <div className="grain" aria-hidden="true" />
    </StageCtx.Provider>
  )
}
