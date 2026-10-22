import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useDict, useHref } from '../lib/i18n'
import { ease } from '../lib/motion'
import { useStageReady } from '../lib/stage'
import { loadPixel, onConsentChange, readConsent, track, writeConsent, type Consent as ConsentValue } from '../lib/pixel'
import s from './Consent.module.css'

const OPEN = 'prive:consent-open'

/** Öffnet das Banner erneut, z. B. aus dem Footer. */
export function openConsent() {
  window.dispatchEvent(new Event(OPEN))
}

/**
 * Einwilligung für den Meta-Pixel. Erscheint nach dem Intro als schmale Leiste
 * unten, in der Form des Bogens. Vorher wird nichts geladen.
 */
export function Consent() {
  const t = useDict()
  const href = useHref()
  const ready = useStageReady()
  const { pathname } = useLocation()
  const [value, setValue] = useState<ConsentValue | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const first = useRef(true)

  useEffect(() => {
    const v = readConsent()
    setValue(v)
    if (v === 'ja') loadPixel()
    if (v === null) setOpen(true)
    const offA = onConsentChange((n) => {
      setValue(n)
      setOpen(false)
    })
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN, onOpen)
    return () => {
      offA()
      window.removeEventListener(OPEN, onOpen)
    }
  }, [])

  /* Seitenaufrufe bei Routenwechsel, der erste kommt aus loadPixel. */
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    track('PageView')
  }, [pathname])

  const decide = (v: ConsentValue) => writeConsent(v)
  const show = open && ready && value !== undefined

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          key="consent"
          className={s.bar}
          role="dialog"
          aria-live="polite"
          aria-label={t.consent.title}
          initial={{ y: '120%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '120%', opacity: 0 }}
          transition={{ duration: 0.8, ease: ease.expo }}
        >
          <p className={s.text}>
            <strong>{t.consent.title}</strong> {t.consent.text}{' '}
            <Link to={href('datenschutz')} className={s.more}>
              {t.consent.more}
            </Link>
          </p>
          <div className={s.actions}>
            <button type="button" className={s.ghost} onClick={() => decide('nein')}>
              {t.consent.decline}
            </button>
            <button type="button" className={s.solid} onClick={() => decide('ja')}>
              {t.consent.accept}
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
