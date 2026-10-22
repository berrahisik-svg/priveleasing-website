/**
 * GET /api/postfach?key=… – verarbeitet ungelesene Mails in info@priveleasing.de.
 * Wird alle paar Minuten aufgerufen (Vercel Cron oder externer Pinger).
 *
 * anfrage    → Antwort mit vorausgefülltem Dokument, Trello-Karte
 * unterlagen → herzlicher Dank + Hinweis auf Prüfung, Trello-Karte mit allen Unterlagen
 * rueckfrage → Antwort innerhalb der Leitplanken (keine Trello-Karte)
 * sonstiges  → nichts, bleibt ungelesen im Posteingang
 * spam       → als gelesen markieren, Ordner „Automatik/Ignoriert“
 * Bearbeitete Mails wandern nach „Automatik/Beantwortet“, damit nichts doppelt läuft.
 */
import { findUnread, getItem, getAttachment, sendMail, markRead, markChecked, ensureFolder, moveItem } from '../server/ews.js'
import { einordnen, antwortAnfrage, antwortUnterlagen, antwortRueckfrage, absagePrivat } from '../server/ki.js'
import { mitSignatur } from '../server/signatur.js'
import { formularAusfuellen } from '../server/formular.js'
import { karteAnlegen, beschreibung } from '../server/trello.js'

const INFO = (process.env.MAIL_USER || 'info@priveleasing.de').toLowerCase()
const EIGENE = new Set([INFO, (process.env.TRELLO_BOARD_MAIL || '').toLowerCase()])
const NICHT_ANTWORTEN = /no-?reply|noreply|mailer-daemon|postmaster|donotreply|notification|newsletter|boards\.trello\.com|formsubmit|ionos|vercel|google|meta\.com|facebookmail/i

function checksAus(a) {
  const c = []
  if (a.gewerblich === true) c.push('cb_unternehmen')
  if (a.gewerblich === false) c.push('cb_privat')
  if (a.art_wunsch === 'leasing') c.push('cb_leasing')
  if (a.art_wunsch === 'finanzierung') c.push('cb_finanzierung')
  if (a.art_wunsch === 'mietkauf') c.push('cb_mietkauf')
  if (a.art_wunsch === 'offen') c.push('cb_offen')
  if (['24', '36', '48', '60'].includes(String(a.laufzeit))) c.push('cb_lz_' + a.laufzeit)
  if (a.nutzung === 'gewerblich') c.push('cb_nutz_gewerblich')
  if (a.nutzung === 'privat') c.push('cb_nutz_privat')
  if (a.nutzung === 'gemischt') c.push('cb_nutz_gemischt')
  return c
}

async function verarbeiten(kopf, ordner, trocken = false) {
  const mail = await getItem(kopf.id)
  const from = (mail.replyTo || mail.from || '').toLowerCase()
  const protokoll = { von: from, betreff: mail.subject }

  // Kopien der Website-Anfragen (von uns selbst an info@): bleiben ungelesen im Posteingang, nur markieren
  if (EIGENE.has(from) && /^(Neue Website-Anfrage|Privatperson)/i.test(mail.subject)) {
    if (!trocken) await markChecked(kopf.id, kopf.changeKey)
    return { ...protokoll, art: 'website-kopie' }
  }
  // Eigene Mails und Systemabsender nie beantworten
  if (EIGENE.has(from) || NICHT_ANTWORTEN.test(from) || /^(auto|automatic|out of office|abwesen)/i.test(mail.subject)) {
    if (!trocken) {
      await markRead(kopf.id, kopf.changeKey)
      await moveItem(kopf.id, ordner.ignoriert)
    }
    return { ...protokoll, art: 'system' }
  }

  const e = await einordnen({ from, fromName: mail.fromName, subject: mail.subject, body: mail.body, attachments: mail.attachments })
  protokoll.art = e.art
  const zeit = new Date(kopf.received || Date.now())
  if (trocken) return { ...protokoll, titel: e.titel, zusammenfassung: e.zusammenfassung, label: e.label }

  if (e.art === 'spam') {
    await markRead(kopf.id, kopf.changeKey)
    await moveItem(kopf.id, ordner.ignoriert)
    return protokoll
  }

  // Anhänge der Mail laden (für Trello)
  const anhaenge = []
  for (const a of mail.attachments.slice(0, 10)) {
    try {
      anhaenge.push({ name: a.name, contentType: a.contentType, content: await getAttachment(a.id) })
    } catch (err) {
      console.error('Anhang', a.name, err.message)
    }
  }

  let pdfDatei = null
  let antwort = null
  if (e.art === 'anfrage' && e.angaben?.gewerblich === false) {
    // Privatperson: freundliche Absage, keine Karte, Mail bleibt im Posteingang (Kategorie)
    await sendMail({ to: [from], subject: /^(re|aw|wg|fwd?):/i.test(mail.subject) ? mail.subject : 'AW: ' + mail.subject, html: mitSignatur(absagePrivat({ name: e.angaben?.name || mail.fromName })), inReplyTo: mail.messageId })
    await markChecked(kopf.id, kopf.changeKey)
    return { ...protokoll, art: 'privat-abgesagt', antwort: 'Absage gesendet' }
  }
  if (e.art === 'anfrage') {
    const a = e.angaben || {}
    try {
      const pdf = await formularAusfuellen({ ...a, email: a.email || from, checks: checksAus(a) })
      pdfDatei = { name: 'PRIVE-Kundenunterlagen-und-Selbstauskunft.pdf', contentType: 'application/pdf', content: pdf }
    } catch (err) {
      console.error('PDF', err.message)
    }
    antwort = await antwortAnfrage({ fromName: mail.fromName || a.name || '', subject: mail.subject, body: mail.body, angaben: a })
  } else if (e.art === 'unterlagen') {
    antwort = await antwortUnterlagen({ fromName: mail.fromName || e.angaben?.name || '', attachments: mail.attachments })
  } else if (e.art === 'rueckfrage') {
    antwort = await antwortRueckfrage({ fromName: mail.fromName || '', subject: mail.subject, body: mail.body })
  }

  // Trello-Karte: nur für Anfragen und eingereichte Unterlagen (Rückfragen und Sonstiges bleiben im Postfach)
  if (e.art !== 'anfrage' && e.art !== 'unterlagen') {
    protokoll.trello = 'keine (nur Anfragen und Unterlagen)'
  } else try {
    const r = await karteAnlegen({
      titel: e.titel || `${mail.fromName || from} · ${mail.subject}`.slice(0, 80),
      label: e.label || 'Allgemein',
      beschreibung: beschreibung({
        quelle: `E-Mail (${e.art})`,
        angaben: e.angaben || {},
        zusammenfassung: e.zusammenfassung,
        von: `${mail.fromName} <${from}>`,
        zeit,
        extra: 'Ursprüngliche Mail:\n' + mail.body.slice(0, 2500) + (antwort ? '\n\nAutomatische Antwort:\n' + antwort : '\n\nKeine automatische Antwort – bitte manuell antworten.'),
      }),
      dateien: [...anhaenge, ...(pdfDatei ? [pdfDatei] : [])],
    })
    protokoll.trello = r.via
  } catch (err) {
    console.error('Trello', err.message)
    protokoll.trello = 'FEHLER ' + err.message
  }

  // Antwort senden
  if (antwort) {
    const betreff = /^(re|aw|wg|fwd?):/i.test(mail.subject) ? mail.subject : 'AW: ' + mail.subject
    await sendMail({ to: [from], subject: betreff, html: mitSignatur(antwort), files: pdfDatei ? [pdfDatei] : [], inReplyTo: mail.messageId })
    protokoll.antwort = 'gesendet'
  } else {
    protokoll.antwort = 'manuell'
  }

  // Beantwortete Kundenmails: gelesen + Unterordner. „sonstiges“ bleibt ungelesen im Posteingang.
  if (antwort) {
    await markRead(kopf.id, kopf.changeKey)
    await moveItem(kopf.id, ordner.beantwortet)
  } else {
    await markChecked(kopf.id, kopf.changeKey)
  }
  return protokoll
}

export default async function handler(req, res) {
  const key = req.query?.key || req.headers['x-cron-key'] || (req.headers.authorization || '').replace('Bearer ', '')
  if (!process.env.CRON_KEY || key !== process.env.CRON_KEY) return res.status(401).json({ fehler: 'kein Zugriff' })

  const start = Date.now()
  const ergebnisse = []
  try {
    const trocken = req.query?.trocken === '1'
    const ordner = trocken ? {} : { beantwortet: await ensureFolder('Automatik – beantwortet'), ignoriert: await ensureFolder('Automatik – ignoriert') }
    const neue = await findUnread(Number(req.query?.max || 8))
    for (const kopf of neue) {
      if (Date.now() - start > 50_000) break // Zeitlimit der Funktion
      try {
        ergebnisse.push(await verarbeiten(kopf, ordner, trocken))
      } catch (err) {
        console.error('Mail', kopf.subject, err)
        ergebnisse.push({ betreff: kopf.subject, fehler: err.message })
      }
    }
    res.status(200).json({ verarbeitet: ergebnisse.length, ergebnisse, dauer_ms: Date.now() - start })
  } catch (err) {
    console.error(err)
    res.status(500).json({ fehler: err.message })
  }
}
