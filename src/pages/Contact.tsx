import { motion } from 'motion/react'
import { EMBLEM, Wordmark } from '../components/Brand'
import { ArchButton } from '../components/Cta'
import { Lines } from '../components/Lines'
import { useDict, useHref } from '../lib/i18n'
import { ease } from '../lib/motion'
import { useStageReady } from '../lib/stage'
import { MailLink, PhoneLink, WhatsAppLink } from '../components/ContactLinks'
import s from './Contact.module.css'

export function Contact() {
  const t = useDict()
  const href = useHref()
  const ready = useStageReady()
  const K = t.pages.kontakt
  const draw = (delay: number, duration = 1.4) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { pathLength: { delay, duration, ease: ease.inOut }, opacity: { delay, duration: 0.01 } },
  })

  return (
    <section className={s.page} data-theme="ink" aria-labelledby="contact-title">
      <div className={s.grid}>
        <div className={s.text}>
          <Lines as="h1" id="contact-title" text={K.title} play={ready} unfold className={s.title} />
          <p className={s.lead} data-ready={ready || undefined}>
            {K.text}
          </p>

          <div className={s.company} data-ready={ready || undefined}>
            <h2 className={`label ${s.h}`}>{K.companyTitle}</h2>
            <dl className={s.dl}>
              <div>
                <dt>{K.firmLabel}</dt>
                <dd>{K.firm}</dd>
              </div>
              <div>
                <dt>{K.seatLabel}</dt>
                <dd>{K.seat}</dd>
              </div>
              <div>
                <dt>{K.phoneLabel}</dt>
                <dd>
                  <PhoneLink />
                </dd>
              </div>
              <div>
                <dt>{K.whatsappLabel}</dt>
                <dd>
                  <WhatsAppLink />
                </dd>
              </div>
              <div>
                <dt>{K.mailLabel}</dt>
                <dd>
                  <MailLink />
                </dd>
              </div>
            </dl>
            <p className={s.note}>{K.note}</p>
          </div>

          <div className={s.cta} data-ready={ready || undefined}>
            <h2 className={`label ${s.h}`}>{K.ctaTitle}</h2>
            <ArchButton to={href('anfrage')}>{t.ui.enquire}</ArchButton>
          </div>
        </div>

        <div className={s.art} aria-hidden="true">
          <svg viewBox={EMBLEM.viewBox} className={s.emblem}>
            {ready && (
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <motion.path d={EMBLEM.base} strokeWidth={4} {...draw(0.1, 1)} />
              <motion.path d={EMBLEM.baseThin} strokeWidth={1.6} {...draw(0.25, 1)} />
              <motion.path d={EMBLEM.archOuter} strokeWidth={4} {...draw(0.2)} />
              <motion.path d={EMBLEM.archInner} strokeWidth={1.6} {...draw(0.4)} />
              {EMBLEM.rays.map((d, i) => (
                <motion.path key={d} d={d} strokeWidth={1.6} {...draw(0.9 + i * 0.04, 0.4)} />
              ))}
              <motion.path d={EMBLEM.star} strokeWidth={2.4} {...draw(1.3, 0.8)} />
              <motion.path d={EMBLEM.bowOuter} strokeWidth={4} {...draw(0.8, 1)} />
              <motion.path d={EMBLEM.bowInner} strokeWidth={1.6} {...draw(1, 1)} />
              <motion.path d={EMBLEM.neck} strokeWidth={4} {...draw(1.2, 0.3)} />
              <motion.path d={EMBLEM.guard} strokeWidth={4} {...draw(1.25, 0.4)} />
              <motion.path d={EMBLEM.shaft} strokeWidth={4} {...draw(1.3, 0.8)} />
              <motion.path d={EMBLEM.bit} strokeWidth={4} {...draw(1.6, 0.7)} />
            </g>
            )}
          </svg>
          <Wordmark className={s.word} aria-hidden="true" />
          <p className={s.tag}>Luxury Leasing</p>
        </div>
      </div>
    </section>
  )
}
