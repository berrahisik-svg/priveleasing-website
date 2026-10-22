import { Fragment } from 'react'
import { Link } from 'react-router'
import { Lines } from '../components/Lines'
import { useDict, useHref } from '../lib/i18n'
import { useStageReady } from '../lib/stage'
import s from './Legal.module.css'

export function Legal({ k }: { k: 'impressum' | 'datenschutz' }) {
  const t = useDict()
  const href = useHref()
  const ready = useStageReady()
  const doc = t.legal[k]

  return (
    <article className={s.page} data-theme="alu" aria-labelledby="legal-title">
      <header className={s.head}>
        <Lines as="h1" id="legal-title" text={doc.title} play={ready} unfold className={s.title} />
      </header>
      <div className={s.body} data-ready={ready || undefined}>
        {doc.blocks.map((b) => (
          <section key={b.heading} className={s.block}>
            <h2 className={s.h}>{b.heading}</h2>
            <div className={s.text}>
              {b.body.split('\n\n').map((para, i) => (
                <p key={i}>
                  {para.split('{link}').map((part, j, arr) => (
                    <Fragment key={j}>
                      {part.split('\n').map((line, n, lines) => (
                        <Fragment key={n}>
                          {line}
                          {n < lines.length - 1 && <br />}
                        </Fragment>
                      ))}
                      {j < arr.length - 1 && b.link && (
                        <Link to={href(b.link.to)} className={s.link}>
                          {b.link.text}
                        </Link>
                      )}
                    </Fragment>
                  ))}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  )
}
