import { InquiryForm } from '../components/InquiryForm'
import { Lines } from '../components/Lines'
import { useDict } from '../lib/i18n'
import s from './Enquiry.module.css'

export function Enquiry() {
  const t = useDict()
  return (
    <section className={s.enquiry} data-theme="alu" aria-labelledby="enquiry-title" id="anfrage">
      <div className={s.grid}>
        <div className={s.intro}>
          <Lines as="h2" id="enquiry-title" text={t.home.formTitle} className={s.title} />
          <p className={s.lead}>{t.home.formLead}</p>
        </div>
        <div className={s.form}>
          <InquiryForm k="kurz" tone="alu" />
        </div>
      </div>
    </section>
  )
}
