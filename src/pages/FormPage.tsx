import { InquiryForm } from '../components/InquiryForm'
import { Lines } from '../components/Lines'
import { Picture } from '../components/Picture'
import type { ImageName } from '../lib/images'
import { useDict } from '../lib/i18n'
import { useStageReady } from '../lib/stage'
import s from './FormPage.module.css'

type K = 'anfrage' | 'einreichen' | 'sourcing'

/* Jedes Motiv ist für genau dieses Bogenformat komponiert. */
const art: Record<K, { img: ImageName; ratio: string }> = {
  anfrage: { img: 'arch-movement', ratio: '3 / 4' },
  einreichen: { img: 'arch-car-night', ratio: '4 / 5' },
  sourcing: { img: 'arch-yacht-aerial', ratio: '4 / 5' },
}

export function FormPage({ k }: { k: K }) {
  const t = useDict()
  const ready = useStageReady()
  const page = t.pages[k]

  return (
    <section className={s.page} data-theme="alu" aria-labelledby="form-title">
      <div className={s.grid}>
        <div className={s.side}>
          <div className={s.sticky}>
            <Lines as="h1" id="form-title" text={page.title} play={ready} unfold className={s.title} />
            <p className={s.text} data-ready={ready || undefined}>
              {page.text}
            </p>
            <div className={s.arch} data-ready={ready || undefined} aria-hidden="true" style={{ aspectRatio: art[k].ratio }}>
              <Picture name={art[k].img} alt="" sizes="(max-width: 900px) 1px, 18rem" />
            </div>
          </div>
        </div>
        <div className={s.form} data-ready={ready || undefined}>
          <InquiryForm k={k} tone="alu" />
        </div>
      </div>
    </section>
  )
}
