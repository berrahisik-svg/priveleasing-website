import Lenis from 'lenis'
import { cancelFrame, frame, useReducedMotion } from 'motion/react'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const Ctx = createContext<Lenis | null>(null)

export function useLenis() {
  return useContext(Ctx)
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const still = useReducedMotion()
  const [lenis, setLenis] = useState<Lenis | null>(null)

  useEffect(() => {
    if (still) return
    const l = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: { offset: -80 } })
    /* Lenis läuft im selben Takt wie Motion, damit Scroll und Animation nie auseinanderlaufen. */
    const tick = ({ timestamp }: { timestamp: number }) => l.raf(timestamp)
    frame.update(tick, true)
    setLenis(l)
    if (document.documentElement.classList.contains('is-intro')) l.stop()
    return () => {
      cancelFrame(tick)
      l.destroy()
      setLenis(null)
    }
  }, [still])

  return <Ctx.Provider value={lenis}>{children}</Ctx.Provider>
}

export function scrollToTop(lenis: Lenis | null) {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  else window.scrollTo(0, 0)
}
