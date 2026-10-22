import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { categoryKeys, type CategoryKey } from '../content/routes'
import { useAlternate, useDict, useHref } from '../lib/i18n'
import { ease } from '../lib/motion'
import { useLenis } from '../lib/scroll'
import { Arrow } from './Brand'
import { Picture } from './Picture'
import s from './Menu.module.css'

export function Menu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useDict()
  const href = useHref()
  const alt = useAlternate()
  const lenis = useLenis()
  const panel = useRef<HTMLDivElement>(null)
  const [peek, setPeek] = useState<CategoryKey>('fahrzeuge')

  useEffect(() => {
    if (!open) return
    lenis?.stop()
    const prev = document.activeElement as HTMLElement | null
    const id = window.setTimeout(() => panel.current?.querySelector<HTMLElement>('a')?.focus(), 350)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !panel.current) return
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>('a, button'))
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('keydown', onKey)
      lenis?.start()
      prev?.focus?.()
    }
  }, [open, lenis, onClose])

  const services = [
    { to: href('leasing'), label: t.leasing.title },
    { to: href('einreichen'), label: t.pages.einreichen.nav },
    { to: href('sourcing'), label: t.pages.sourcing.title },
    { to: href('kontakt'), label: t.pages.kontakt.title },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="menu"
          ref={panel}
          className={s.menu}
          role="dialog"
          aria-modal="true"
          aria-label={t.ui.menu}
          initial={{ clipPath: 'inset(0% 0% 100% 0% round 0vw 0vw 50vw 50vw)' }}
          animate={{ clipPath: 'inset(0% 0% 0% 0% round 0vw 0vw 0vw 0vw)' }}
          exit={{ clipPath: 'inset(0% 0% 100% 0% round 0vw 0vw 50vw 50vw)', transition: { duration: 0.6, ease: ease.door } }}
          transition={{ duration: 0.85, ease: ease.door }}
          data-lenis-prevent
        >
          <div className={s.grid}>
            <nav className={s.primary} aria-label={t.ui.categories}>
              <p className={`label ${s.kicker}`}>{t.ui.categories}</p>
              <ol>
                {categoryKeys.map((k, i) => (
                  <motion.li
                    key={k}
                    initial={{ y: '110%' }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.28 + i * 0.06, duration: 0.9, ease: ease.expo }}
                  >
                    <Link to={href(k)} className={s.cat} onMouseEnter={() => setPeek(k)} onFocus={() => setPeek(k)} onClick={onClose}>
                      <span className={`${s.num} tabular`}>{String(i + 1).padStart(2, '0')}</span>
                      <span className={s.catName}>{t.categories[k].name}</span>
                    </Link>
                  </motion.li>
                ))}
              </ol>
            </nav>

            <div className={s.side}>
              <div className={s.peek} aria-hidden="true">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={peek}
                    className={s.peekImg}
                    initial={{ clipPath: 'inset(100% 0% 0% 0% round 50% 50% 0% 0%)' }}
                    animate={{ clipPath: 'inset(0% 0% 0% 0% round 50% 50% 0% 0%)' }}
                    exit={{ opacity: 0, transition: { duration: 0.6, delay: 0.3 } }}
                    transition={{ duration: 0.9, ease: ease.expo }}
                  >
                    <Picture name={t.categories[peek].arch} alt="" sizes="(max-width: 860px) 1px, 22rem" />
                  </motion.div>
                </AnimatePresence>
                <span className={s.peekWord}>{t.categories[peek].word}</span>
              </div>

              <nav aria-label={t.ui.services} className={s.secondary}>
                <p className={`label ${s.kicker}`}>{t.ui.services}</p>
                <ul>
                  {services.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className={s.svc} onClick={onClose}>
                        <span>{l.label}</span>
                        <Arrow className={s.arrow} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className={s.foot}>
                <Link to={href('anfrage')} className={s.cta} onClick={onClose}>
                  {t.ui.enquire}
                </Link>
                <Link to={alt.href} className={s.lang} hrefLang={alt.lang} lang={alt.lang} onClick={onClose}>
                  {t.ui.otherLang}
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
