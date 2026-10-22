import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import type { FieldName, FormKey } from '../content/types'
import { useDict, useHref, useLang } from '../lib/i18n'
import { FORM_ACTION } from '../content/form'
import { ease } from '../lib/motion'
import { Arrow, Mark } from './Brand'
import s from './InquiryForm.module.css'

/* Kanonische Werte der Objektart: so kommen sie beim Empfänger an, egal in welcher Sprache gesendet wurde. */
const OBJEKTARTEN = ['Fahrzeug', 'Yacht oder Boot', 'Aviation', 'Luxury Toy', 'Uhr', 'Sonstiges']
const KUNDENARTEN = ['Unternehmen', 'Selbstständig / Freiberufler', 'Privatperson']

type Spec = { name: FieldName; required?: boolean; wide?: boolean }

const forms: Record<FormKey, Spec[]> = {
  kurz: [{ name: 'suche', required: true, wide: true }, { name: 'name', required: true, wide: true }, { name: 'kundenart', required: true }, { name: 'firma' }, { name: 'telefon' }, { name: 'email' }],
  anfrage: [
    { name: 'suche', required: true, wide: true },
    { name: 'name', required: true, wide: true },
    { name: 'kundenart', required: true },
    { name: 'firma' },
    { name: 'telefon' },
    { name: 'email' },
    { name: 'budget' },
    { name: 'land' },
    { name: 'zeitraum' },
    { name: 'link' },
    { name: 'datei', wide: true },
  ],
  einreichen: [
    { name: 'objektart', required: true },
    { name: 'kaufpreis', required: true },
    { name: 'link' },
    { name: 'verkaeufer' },
    { name: 'land', required: true },
    { name: 'datei', wide: true },
    { name: 'name', required: true, wide: true },
    { name: 'kundenart', required: true },
    { name: 'firma' },
    { name: 'telefon' },
    { name: 'email' },
  ],
  sourcing: [
    { name: 'suche', required: true, wide: true },
    { name: 'budget' },
    { name: 'zeitraum' },
    { name: 'name', required: true, wide: true },
    { name: 'kundenart', required: true },
    { name: 'firma' },
    { name: 'telefon' },
    { name: 'email' },
    { name: 'land' },
  ],
}

type Status = 'idle' | 'sending'
type Msg = { kind: 'err' | 'info'; text: string } | null

const inputType: Partial<Record<FieldName, string>> = { email: 'email', link: 'url', telefon: 'tel' }
const autoComplete: Partial<Record<FieldName, string>> = { name: 'name', email: 'email', telefon: 'tel', land: 'country-name', firma: 'organization' }

export function InquiryForm({ k, tone = 'ink' }: { k: FormKey; tone?: 'ink' | 'alu' }) {
  const t = useDict()
  const href = useHref()
  const { search } = useLocation()
  const lang = useLang()
  const uid = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [msg, setMsg] = useState<Msg>(null)
  const [bad, setBad] = useState<Set<string>>(new Set())
  const [file, setFile] = useState<File | null>(null)
  const [drag, setDrag] = useState(false)
  const [objekt, setObjekt] = useState('')
  const [kundenart, setKundenart] = useState('')
  const [betreff, setBetreff] = useState('')
  const fields = forms[k]
  const id = (n: string) => `${uid}-${n}`

  // ?objekt=Fahrzeug belegt die Objektart vor
  useEffect(() => {
    const q = new URLSearchParams(search).get('objekt')
    if (!q) return
    const hit = OBJEKTARTEN.find((o) => o.toLowerCase() === q.toLowerCase())
    if (hit) setObjekt(hit)
  }, [search])

  const clear = (name: string) => {
    if (bad.has(name) || msg) {
      const next = new Set(bad)
      next.delete(name)
      if (name === 'telefon' || name === 'email') {
        next.delete('telefon')
        next.delete('email')
      }
      setBad(next)
      setMsg(null)
    }
  }

  /* Das Skript prüft nur und setzt den Betreff. Geht alles durch, läuft das
     Ereignis weiter und der Browser schickt das Formular selbst an FormSubmit
     (action im <form>). preventDefault nur bei einem Fehler. */
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget
    const data = new FormData(form)
    const stopp = () => e.preventDefault()
    if (String(data.get('_honey') ?? '')) {
      stopp()
      return
    }

    const get = (n: string) => String(data.get(n) ?? '').trim()
    const missing = new Set<string>()
    for (const f of fields) if (f.required && f.name !== 'datei' && !get(f.name)) missing.add(f.name)
    if (!data.get('datenschutz')) missing.add('datenschutz')
    const focusFirst = (names: Set<string>) => {
      const first = [...fields.map((f) => f.name as string), 'datenschutz'].find((n) => names.has(n))
      if (first) form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
    }
    if (missing.size) {
      stopp()
      setBad(missing)
      setMsg({ kind: 'err', text: t.form.msg.required })
      focusFirst(missing)
      return
    }
    const mail = get('email')
    if (mail && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(mail)) {
      stopp()
      setBad(new Set(['email']))
      setMsg({ kind: 'err', text: t.form.msg.mail })
      focusFirst(new Set(['email']))
      return
    }
    if (!get('telefon') && !mail) {
      stopp()
      setBad(new Set(['telefon', 'email']))
      setMsg({ kind: 'err', text: t.form.msg.contact })
      focusFirst(new Set(['telefon']))
      return
    }

    // Betreff: Formularname · Objekt oder Suchtext · Name. In Trello wird das der Kartentitel.
    const teile = [t.form.subjects[k]]
    const wonach = get('objektart') || get('suche')
    if (wonach) teile.push(wonach.replace(/\s+/g, ' ').length > 48 ? wonach.replace(/\s+/g, ' ').slice(0, 45) + '…' : wonach.replace(/\s+/g, ' '))
    if (get('name')) teile.push(get('name'))
    // Als React-Zustand, nicht per DOM: React spielt sonst beim folgenden
    // Rendern den alten Wert zurück, bevor der Browser absendet.
    setBetreff(teile.join(' · '))

    setStatus('sending')
    setMsg({ kind: 'info', text: t.form.msg.sending })
    // kein stopp() — der Browser sendet jetzt ab und landet auf der Dankeseite
  }

  const label = (f: Spec, extra?: ReactNode) => (
    <span className={s.labelRow}>
      <span className={s.labelText}>{k === 'einreichen' && f.name === 'land' ? t.form.landObjekt : t.form.labels[f.name]}</span>
      {!f.required && f.name !== 'telefon' && f.name !== 'email' && <span className={s.opt}>{t.form.optional}</span>}
      {extra}
    </span>
  )

  const renderField = (f: Spec) => {
    const invalid = bad.has(f.name)
    const common = {
      id: id(f.name),
      name: f.name,
      'aria-invalid': invalid || undefined,
      'aria-describedby': invalid ? `${uid}-msg` : undefined,
      onInput: () => clear(f.name),
    }

    if (f.name === 'datei') {
      return (
        <div key={f.name} className={`${s.field} ${s.wide}`}>
          <label
            htmlFor={id(f.name)}
            className={s.drop}
            data-drag={drag || undefined}
            data-has={file ? true : undefined}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              const dropped = e.dataTransfer.files?.[0]
              const input = formRef.current?.querySelector<HTMLInputElement>(`#${CSS.escape(id(f.name))}`)
              if (dropped && input) {
                const dt = new DataTransfer()
                dt.items.add(dropped)
                input.files = dt.files
                setFile(dropped)
              }
            }}
          >
            {label(f)}
            <span className={s.dropBody}>
              <span className={s.dropIcon} aria-hidden="true">
                <Mark />
              </span>
              <span className={s.dropText}>{file ? file.name : t.form.fileHint}</span>
              {file && <span className={s.dropSize}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
            </span>
            <input {...common} type="file" accept=".pdf,image/*" className={s.fileInput} onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)} />
          </label>
          {file && (
            <button
              type="button"
              className={s.remove}
              onClick={() => {
                const input = formRef.current?.querySelector<HTMLInputElement>(`#${CSS.escape(id(f.name))}`)
                if (input) input.value = ''
                setFile(null)
              }}
            >
              {t.form.fileRemove}
            </button>
          )}
        </div>
      )
    }

    if (f.name === 'objektart' || f.name === 'kundenart') {
      const isObjekt = f.name === 'objektart'
      const val = isObjekt ? objekt : kundenart
      const setVal = isObjekt ? setObjekt : setKundenart
      const opts = isObjekt ? OBJEKTARTEN : KUNDENARTEN
      const names = isObjekt ? t.form.objektarten : t.form.kundenarten
      return (
        <div key={f.name} className={`${s.field} ${f.wide ? s.wide : ''}`} data-invalid={invalid || undefined} data-filled={val ? true : undefined}>
          <label htmlFor={id(f.name)}>{label(f)}</label>
          <div className={s.selectWrap}>
            <select {...common} required value={val} onChange={(e) => (setVal(e.currentTarget.value), clear(f.name))} className={s.control}>
              <option value="" disabled>
                {t.form.choose}
              </option>
              {opts.map((o, i) => (
                <option key={o} value={o}>
                  {names[i]}
                </option>
              ))}
            </select>
            <svg className={s.chev} viewBox="0 0 12 8" aria-hidden="true">
              <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )
    }

    return (
      <div key={f.name} className={`${s.field} ${f.wide ? s.wide : ''}`} data-invalid={invalid || undefined}>
        <label htmlFor={id(f.name)}>{label(f)}</label>
        {f.name === 'suche' ? (
          <textarea {...common} required={f.required} rows={3} className={`${s.control} ${s.area}`} />
        ) : (
          <input
            {...common}
            type={inputType[f.name] ?? 'text'}
            required={f.required}
            autoComplete={autoComplete[f.name] ?? 'off'}
            className={s.control}
            onBlur={
              f.name === 'link'
                ? (ev) => {
                    const v = ev.currentTarget.value.trim()
                    if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v)) ev.currentTarget.value = 'https://' + v.replace(/^\/+/, '')
                  }
                : undefined
            }
          />
        )}
      </div>
    )
  }

  return (
    <div ref={wrapRef} className={s.wrap} data-tone={tone}>
      <AnimatePresence mode="wait" initial={false}>
        {(
          <motion.form
            key="form"
            ref={formRef}
            className={s.form}
            noValidate
            method="post"
            action={FORM_ACTION}
            encType="multipart/form-data"
            acceptCharset="UTF-8"
            onSubmit={onSubmit}
            aria-busy={status === 'sending'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: ease.out }}
          >
            {/* Steuerfelder für FormSubmit */}
            <input type="hidden" name="_subject" value={betreff || t.form.subjects[k]} readOnly />
            <input type="hidden" name="_sprache" value={lang} />

            <div className={s.grid}>{fields.map(renderField)}</div>

            <div className={s.checks}>
              <label className={s.check}>
                <input type="checkbox" name="im_auftrag" value="ja" />
                <span className={s.box} aria-hidden="true" />
                <span>{t.form.auftrag}</span>
              </label>
              <label className={s.check} data-invalid={bad.has('datenschutz') || undefined}>
                <input type="checkbox" name="datenschutz" value="ja" required aria-invalid={bad.has('datenschutz') || undefined} onChange={() => clear('datenschutz')} />
                <span className={s.box} aria-hidden="true" />
                <span>
                  {t.form.consentA}
                  <Link to={href('datenschutz')} className={s.inlineLink}>
                    {t.form.consentLink}
                  </Link>
                  {t.form.consentB}
                </span>
              </label>
            </div>

            <div className={s.hp} aria-hidden="true">
              <label>
                Website
                <input type="text" name="_honey" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <div className={s.submitRow}>
              <button type="submit" className={s.submit} disabled={status === 'sending'}>
                <span>{t.form.submit}</span>
                <Arrow className={s.submitArrow} />
                <i className={s.progress} aria-hidden="true" />
              </button>
              <p className={s.note}>{t.form.nurGewerblich}{k !== 'kurz' ? ' ' + t.form.docsNote : ''}</p>
            </div>

            <p id={`${uid}-msg`} className={s.msg} data-kind={msg?.kind} role={msg?.kind === 'err' ? 'alert' : 'status'} aria-live="polite">
              {msg?.text}
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
