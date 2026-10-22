import { AnimatePresence, motion, useInView } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { ArchButton, LineLink } from '../components/Cta'
import { Lines } from '../components/Lines'
import { Picture } from '../components/Picture'
import type { ImageName } from '../lib/images'
import { useDict, useHref } from '../lib/i18n'
import { ease } from '../lib/motion'
import s from './Ways.module.css'

const images: ImageName[] = ['arch-leasing', 'arch-aviation', 'arch-yacht-aerial']
const positions = ['50% 50%', '50% 50%', '50% 50%']

function Way({ i, onActive }: { i: number; onActive: (i: number) => void }) {
  const t = useDict()
  const href = useHref()
  const w = t.home.ways[i]
  const ref = useRef<HTMLDivElement>(null)
  const mid = useInView(ref, { margin: '-45% 0px -45% 0px' })

  useEffect(() => {
    if (mid) onActive(i)
  }, [mid, i, onActive])

  return (
    <div ref={ref} className={s.way} data-active={mid || undefined}>
      <p className={`${s.num} tabular`} aria-hidden="true">
        {String(i + 1).padStart(2, '0')}
      </p>
      <div className={s.mobileImg} aria-hidden="true">
        <Picture name={images[i]} alt="" sizes="(max-width: 900px) 90vw, 1px" position={positions[i]} />
      </div>
      <Lines as="h3" text={w.title} className={s.title} />
      <p className={s.text}>{w.text}</p>
      <div className={s.ctas}>
        <ArchButton to={href(w.to)} tone="alu">
          {w.cta}
        </ArchButton>
        {w.alt && (
          <LineLink to={href(w.alt.to)} tone="alu">
            {w.alt.cta}
          </LineLink>
        )}
      </div>
    </div>
  )
}

export function Ways() {
  const t = useDict()
  const [active, setActive] = useState(0)

  return (
    <section className={s.ways} data-theme="alu" aria-labelledby="ways-title">
      <div className={s.grid}>
        <div className={s.side} aria-hidden="true">
          <div className={s.sticky}>
            <div className={s.frame}>
              <AnimatePresence initial={false}>
                <motion.div
                  key={active}
                  className={s.img}
                  initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
                  animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
                  exit={{ opacity: 1, transition: { duration: 1.1 } }}
                  transition={{ duration: 1.1, ease: ease.expo }}
                >
                  <motion.div
                    className={s.imgIn}
                    initial={{ scale: 1.12 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 1.6, ease: ease.expo }}
                  >
                    <Picture name={images[active]} alt="" sizes="(max-width: 900px) 90vw, 40vw" position={positions[active]} />
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className={s.dots}>
              {t.home.ways.map((w, i) => (
                <span key={w.title} data-on={i === active || undefined} />
              ))}
            </div>
          </div>
        </div>

        <div className={s.main}>
          <Lines as="h2" id="ways-title" text={t.home.waysTitle} className={s.heading} />
          {t.home.ways.map((w, i) => (
            <Way key={w.title} i={i} onActive={setActive} />
          ))}
        </div>
      </div>
    </section>
  )
}
