import { motion, useScroll } from 'motion/react'
import { useRange } from '../lib/range'
import { useRef } from 'react'
import { Link } from 'react-router'
import { categoryKeys } from '../content/routes'
import { useAlternate, useDict, useHref } from '../lib/i18n'
import { Arrow, Wordmark } from './Brand'
import { Lines } from './Lines'
import { openConsent } from './Consent'
import { MailLink, PhoneLink, WhatsAppLink } from './ContactLinks'
import s from './Footer.module.css'

export function Footer() {
  const t = useDict()
  const href = useHref()
  const alt = useAlternate()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const y = useRange(scrollYProgress, [0.35, 1], [42, 0], '%')

  return (
    <footer ref={ref} className={s.footer} data-theme="ink">
      <div className={s.top}>
        <Lines as="p" text={t.pages.kontakt.text} className={s.statement} />
        <Link to={href('anfrage')} className={s.big}>
          <span>{t.ui.enquire}</span>
          <Arrow className={s.bigArrow} />
        </Link>
      </div>

      <div className={s.cols}>
        <nav aria-label={t.ui.categories}>
          <h2 className={`label ${s.h}`}>{t.ui.categories}</h2>
          <ul>
            {categoryKeys.map((k) => (
              <li key={k}>
                <Link to={href(k)}>{t.categories[k].name}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t.ui.services}>
          <h2 className={`label ${s.h}`}>{t.ui.services}</h2>
          <ul>
            <li>
              <Link to={href('leasing')}>{t.ui.leasing}</Link>
            </li>
            <li>
              <Link to={href('einreichen')}>{t.pages.einreichen.nav}</Link>
            </li>
            <li>
              <Link to={href('sourcing')}>{t.pages.sourcing.title}</Link>
            </li>
            <li>
              <Link to={href('kontakt')}>{t.pages.kontakt.title}</Link>
            </li>
          </ul>
        </nav>
        <nav aria-label={t.ui.legal}>
          <h2 className={`label ${s.h}`}>{t.ui.legal}</h2>
          <ul>
            <li>
              <Link to={href('impressum')}>{t.legal.impressumShort}</Link>
            </li>
            <li>
              <Link to={href('datenschutz')}>{t.legal.datenschutzShort}</Link>
            </li>
            <li>
              <button type="button" className={s.linkBtn} onClick={openConsent}>
                {t.consent.settings}
              </button>
            </li>
            <li>
              <Link to={alt.href} hrefLang={alt.lang} lang={alt.lang}>
                {t.ui.otherLang}
              </Link>
            </li>
          </ul>
        </nav>
        <div className={s.company}>
          <p>{t.ui.company}</p>
          <p>{t.ui.location}</p>
          <div className={s.contact}>
            <PhoneLink />
            <WhatsAppLink />
          </div>
          <p>
            <MailLink />
          </p>
          <p className={s.rights}>{t.ui.rights}</p>
        </div>
      </div>

      <div className={s.markWrap} aria-hidden="true">
        <motion.div style={{ y }} className={s.markInner}>
          <Wordmark className={s.mark} />
        </motion.div>
      </div>
    </footer>
  )
}
