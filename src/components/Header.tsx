import { useMotionValueEvent, useScroll } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { categoryKeys } from '../content/routes'
import { useAlternate, useDict, useHref } from '../lib/i18n'
import { Mark, Wordmark } from './Brand'
import { Menu } from './Menu'
import s from './Header.module.css'

export function Header() {
  const t = useDict()
  const href = useHref()
  const alt = useAlternate()
  const { pathname } = useLocation()
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [solid, setSolid] = useState(false)
  const [theme, setTheme] = useState<'ink' | 'alu'>('ink')
  const [open, setOpen] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setSolid(y > 40)
    if (y < 160) setHidden(false)
    else if (y > prev + 4) setHidden(true)
    else if (y < prev - 6) setHidden(false)
  })

  // Farbe der Kopfzeile folgt der Fläche, die gerade unter ihr liegt.
  useEffect(() => {
    let raf = 0
    const probe = () => {
      raf = 0
      const els = document.elementsFromPoint(window.innerWidth / 2, 36)
      const hit = els.find((el) => el instanceof HTMLElement && el.closest('[data-theme]') && !el.closest('header'))
      const zone = hit?.closest<HTMLElement>('[data-theme]')
      setTheme(zone?.dataset.theme === 'alu' ? 'alu' : 'ink')
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(probe)
    }
    const id = window.setTimeout(probe, 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [pathname])

  useEffect(() => setOpen(false), [pathname])

  return (
    <>
      <header className={s.header} data-theme-on={open ? 'ink' : theme} data-hidden={(hidden && !open) || undefined} data-solid={(solid && !open) || undefined}>
        <div className={s.bar}>
          <Link to={href('home')} className={s.brand} aria-label={t.ui.home}>
            <Mark className={s.mark} />
            <Wordmark className={s.word} aria-hidden="true" />
          </Link>

          <nav className={s.nav} aria-label={t.nav.categories}>
            <ul>
              {categoryKeys.map((k) => (
                <li key={k}>
                  <Link to={href(k)} className={s.link} aria-current={pathname === href(k) ? 'page' : undefined}>
                    <span>{t.categories[k].name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className={s.end}>
            <Link to={alt.href} className={s.lang} hrefLang={alt.lang} lang={alt.lang} aria-label={t.ui.otherLang}>
              <span aria-hidden="true" className={s.langOn}>
                {t.lang.toUpperCase()}
              </span>
              <span aria-hidden="true" className={s.langSep} />
              <span aria-hidden="true">{t.ui.otherLangShort}</span>
            </Link>
            <Link to={href('anfrage')} className={s.cta}>
              <span>{t.ui.enquire}</span>
            </Link>
            <button
              type="button"
              className={s.burger}
              aria-expanded={open}
              aria-controls="menu"
              aria-label={open ? t.ui.close : t.ui.menu}
              onClick={() => setOpen((v) => !v)}
            >
              <span className={s.burgerLabel}>{open ? t.ui.close : t.ui.menu}</span>
              <span className={s.burgerIcon} aria-hidden="true">
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>
      </header>
      <Menu open={open} onClose={() => setOpen(false)} />
    </>
  )
}
