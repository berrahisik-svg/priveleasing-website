import { motion, useScroll } from 'motion/react'
import { useRef, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { Arrow, Star } from '../components/Brand'
import { Lines } from '../components/Lines'
import { Picture } from '../components/Picture'
import { categoryKeys, type CategoryKey } from '../content/routes'
import { useDict, useHref } from '../lib/i18n'
import { useRange } from '../lib/range'
import { useStageReady } from '../lib/stage'
import s from './Category.module.css'

const heroPos: Record<CategoryKey, string> = {
  fahrzeuge: '50% 62%',
  yachten: '50% 58%',
  aviation: '40% 62%',
  toys: '50% 45%',
  uhren: '42% 50%',
}

export function Category({ k }: { k: CategoryKey }) {
  const t = useDict()
  const href = useHref()
  const ready = useStageReady()
  const c = t.categories[k]
  const i = categoryKeys.indexOf(k)
  const nextKey = categoryKeys[(i + 1) % categoryKeys.length]
  const next = t.categories[nextKey]

  const hero = useRef<HTMLElement>(null)
  const { scrollYProgress: hp } = useScroll({ target: hero, offset: ['start start', 'end start'] })
  const imgY = useRange(hp, [0, 1], [0, 22], '%')
  const titleY = useRange(hp, [0, 1], [0, -18], 'vh')
  const heroFade = useRange(hp, [0.1, 0.7], [1, 0])

  const figure = useRef<HTMLDivElement>(null)
  const { scrollYProgress: fp } = useScroll({ target: figure, offset: ['start end', 'end start'] })
  const figScale = useRange(fp, [0, 1], [1.08, 1])
  const wordX = useRange(fp, [0, 1], [8, -14], 'vw')

  const nextRef = useRef<HTMLAnchorElement>(null)
  const { scrollYProgress: np } = useScroll({ target: nextRef, offset: ['start end', 'end end'] })
  const nextOpen = useRange(np, [0.1, 1], [0, 1])

  const found = `${href('einreichen')}?objekt=${encodeURIComponent(c.objekt)}`

  return (
    <>
      <section ref={hero} className={s.hero} data-theme="ink" aria-labelledby="cat-title">
        <motion.div className={s.heroImg} style={{ y: imgY }} data-ready={ready || undefined}>
          <Picture name={c.images[0]} alt={c.alt[0]} priority sizes="100vw" position={heroPos[k]} />
        </motion.div>
        <div className={s.heroShade} />
        <motion.div className={s.heroType} style={{ y: titleY, opacity: heroFade }}>
          <p className={`${s.index} tabular`} data-ready={ready || undefined}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            <span className={s.indexOf}>/ {String(categoryKeys.length).padStart(2, '0')}</span>
            <span className={s.indexWord}>{c.word}</span>
          </p>
          <Lines as="h1" id="cat-title" text={c.name} play={ready} unfold className={s.title} />
        </motion.div>
      </section>

      <section className={s.intro} data-theme="alu" aria-labelledby="cat-does">
        <div className={s.introGrid}>
          <Lines as="p" text={c.text} className={s.statement} stagger={70} />
          <div className={s.does}>
            <h2 id="cat-does" className={`label ${s.doesTitle}`}>
              {t.categoryPage.doesTitle}
            </h2>
            <ul>
              {c.does.map((d, j) => (
                <li key={d} style={{ '--j': j } as CSSProperties}>
                  <Star className={s.star} />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div ref={figure} className={s.figureRow}>
          <motion.span className={s.bigWord} style={{ x: wordX }} aria-hidden="true">
            {c.word}
          </motion.span>
          <figure className={s.figure}>
            <div className={s.figureFrame}>
              <motion.div className={s.figureImg} style={{ scale: figScale }}>
                <Picture name={c.images[1]} alt={c.alt[1]} sizes="(max-width: 900px) 92vw, 62vw" />
              </motion.div>
            </div>
          </figure>
        </div>
      </section>

      <section className={s.paths} data-theme="ink" aria-label={t.ui.services}>
        <Link to={found} className={s.door}>
          <span className={s.doorFill} aria-hidden="true" />
          <span className={s.doorBody}>
            <Lines as="h2" text={t.categoryPage.foundTitle} className={s.pathTitle} />
            <span className={s.pathText}>{t.categoryPage.foundText}</span>
            <span className={s.doorCta}>
              {t.categoryPage.foundCta}
              <Arrow className={s.doorArrow} />
            </span>
          </span>
        </Link>
        <Link to={href('sourcing')} className={`${s.door} ${s.doorAlt}`}>
          <span className={s.doorFill} aria-hidden="true" />
          <span className={s.doorBody}>
            <Lines as="h2" text={t.categoryPage.sourcingTitle} className={s.pathTitle} />
            <span className={s.pathText}>{t.categoryPage.sourcingText}</span>
            <span className={s.doorCta}>
              {t.categoryPage.sourcingCta}
              <Arrow className={s.doorArrow} />
            </span>
          </span>
        </Link>
      </section>

      <Link ref={nextRef} to={href(nextKey)} className={s.next} data-theme="ink">
        <motion.div className={s.nextImg} style={{ '--o': nextOpen } as unknown as CSSProperties}>
          <Picture name={next.images[0]} alt="" sizes="100vw" position={heroPos[nextKey]} />
        </motion.div>
        <div className={s.nextShade} />
        <div className={s.nextType}>
          <span className="label">{t.categoryPage.nextLabel}</span>
          <span className={s.nextName}>
            {next.name}
            <Arrow className={s.nextArrow} />
          </span>
        </div>
      </Link>
    </>
  )
}
