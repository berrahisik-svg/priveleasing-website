/**
 * POST /api/anfrage – nimmt die Website-Formulare entgegen (ersetzt FormSubmit).
 * Ablauf: prüfen → Trello-Karte (mit Anhang) → Antwort an den Interessenten mit vorausgefülltem Formular
 * → Kopie an info@ → Weiterleitung auf die Danke-Seite.
 */
import Busboy from 'busboy'
import { sendMail } from '../server/ews.js'
import { formularAusfuellen, ausAnfrage } from '../server/formular.js'
import { karteAnlegen, beschreibung } from '../server/trello.js'
import { alsHtml, antwortAnfrage, absagePrivat, PRIVE_KONTEXT } from '../server/ki.js'
import { mitSignatur } from '../server/signatur.js'

export const config = { api: { bodyParser: false } }

const SITE = process.env.SITE_URL || 'https://www.priveleasing.de'
const INFO = process.env.MAIL_USER || 'info@priveleasing.de'
const MAX_DATEI = 10 * 1024 * 1024

function parse(req) {
  return new Promise((resolve, reject) => {
    const felder = {}
    const dateien = []
    const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_DATEI, files: 3, fields: 40 } })
    bb.on('field', (k, v) => (felder[k] = String(v).trim()))
    bb.on('file', (k, stream, info) => {
      const teile = []
      stream.on('data', (d) => teile.push(d))
      stream.on('limit', () => reject(new Error('Datei zu groß')))
      stream.on('end', () => {
        if (!info.filename) return
        dateien.push({ name: info.filename, contentType: info.mimeType, content: Buffer.concat(teile) })
      })
    })
    bb.on('error', reject)
    bb.on('close', () => resolve({ felder, dateien }))
    req.pipe(bb)
  })
}

const FORMULARE = { Anfrage: 'anfrage', 'Objekt einreichen': 'einreichen', 'Private Sourcing': 'sourcing', Enquiry: 'anfrage', 'Submit object': 'einreichen' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  let felder, dateien
  try {
    ;({ felder, dateien } = await parse(req))
  } catch (e) {
    return res.status(400).send('Ungültige Anfrage: ' + e.message)
  }
  if (felder._honey) return res.redirect(303, SITE + '/danke') // Bot, still ignorieren
  if (!felder.name || (!felder.email && !felder.telefon)) return res.status(400).send('Bitte Name und Telefon oder E-Mail angeben.')

  const lang = felder._sprache === 'en' ? 'en' : 'de'
  const formular = (felder._subject || '').split(' · ')[0]

  // Privatpersonen: freundliche Absage, keine Trello-Karte, nur Hinweis an info@
  if (felder.kundenart === 'Privatperson') {
    if (felder.email) {
      try {
        await sendMail({
          to: [felder.email],
          subject: lang === 'en' ? 'Your enquiry at PRIVÉ' : 'Ihre Anfrage bei PRIVÉ',
          html: mitSignatur(absagePrivat({ name: felder.name, en: lang === 'en' })),
        })
      } catch (e) {
        console.error('Absage', e)
      }
    }
    try {
      const angabenP = Object.fromEntries(Object.entries(felder).filter(([k]) => !k.startsWith('_') && k !== 'datenschutz'))
      await sendMail({
        to: [INFO],
        subject: `Privatperson (automatisch abgesagt): ${felder.name} · ${(felder.suche || felder.objektart || '').slice(0, 40)}`,
        html: alsHtml(beschreibung({ quelle: `Website · ${formular || 'Formular'} (${lang})`, angaben: angabenP, von: `${felder.name} <${felder.email || '-'}>` }) + '\n\nAutomatische Absage an den Interessenten gesendet (nur Unternehmen/Selbstständige). Keine Trello-Karte.'),
      })
    } catch (e) {
      console.error('Kopie', e)
    }
    return res.redirect(303, SITE + (lang === 'en' ? '/en/thank-you' : '/danke'))
  }
  const art = FORMULARE[formular] || 'anfrage'
  const label = felder.objektart ? { Fahrzeug: 'Fahrzeuge', 'Yacht oder Boot': 'Yachten', Aviation: 'Aviation', 'Luxury Toy': 'Toys', Uhr: 'Uhren' }[felder.objektart] || 'Allgemein' : 'Fahrzeuge'

  // 1 PDF vorausfüllen
  const pdfDaten = ausAnfrage(felder)
  let pdf = null
  try {
    pdf = await formularAusfuellen(pdfDaten)
  } catch (e) {
    console.error('PDF', e)
  }
  const pdfDatei = pdf ? { name: 'PRIVE-Kundenunterlagen-und-Selbstauskunft.pdf', contentType: 'application/pdf', content: pdf } : null

  const angaben = Object.fromEntries(Object.entries(felder).filter(([k]) => !k.startsWith('_') && k !== 'datenschutz'))
  const titel = `${felder.firma ? felder.firma + ' – ' : ''}${felder.name} · ${(felder.suche || felder.objektart || formular).slice(0, 40)} · ${art === 'einreichen' ? 'Objekt' : art === 'sourcing' ? 'Sourcing' : 'Anfrage'}`

  // 2 Trello-Karte (mit Original-Anhängen und PDF)
  const ergebnisse = {}
  try {
    ergebnisse.trello = await karteAnlegen({
      titel,
      label,
      beschreibung: beschreibung({ quelle: `Website · ${formular || 'Formular'} (${lang})`, angaben, von: `${felder.name} <${felder.email || '-'}>` }),
      dateien: [...dateien, ...(pdfDatei ? [pdfDatei] : [])],
    })
  } catch (e) {
    console.error('Trello', e)
    ergebnisse.trello = { ok: false, fehler: e.message }
  }

  // 3 Antwort an den Interessenten
  if (felder.email) {
    try {
      const text = await antwortAnfrage({
        fromName: felder.name,
        subject: felder._subject || formular,
        body: Object.entries(angaben)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n'),
        angaben: pdfDaten,
      })
      await sendMail({
        to: [felder.email],
        subject: lang === 'en' ? 'Your enquiry at PRIVÉ – next steps' : 'Ihre Anfrage bei PRIVÉ – nächste Schritte',
        html: mitSignatur(text),
        files: pdfDatei ? [pdfDatei] : [],
      })
      ergebnisse.antwort = true
    } catch (e) {
      console.error('Antwort', e)
      ergebnisse.antwort = false
    }
  }

  // 4 Kopie an info@
  try {
    await sendMail({
      to: [INFO],
      subject: `Neue Website-Anfrage: ${titel}`,
      html: alsHtml(
        beschreibung({ quelle: `Website · ${formular || 'Formular'}`, angaben, von: `${felder.name} <${felder.email || '-'}>` }) +
          `\n\nTrello: ${ergebnisse.trello?.ok ? 'Karte angelegt (' + ergebnisse.trello.via + ')' : 'FEHLER'} · Antwort an Kunde: ${ergebnisse.antwort ? 'gesendet' : 'nicht gesendet'}`,
      ),
      files: [...dateien, ...(pdfDatei ? [pdfDatei] : [])],
    })
  } catch (e) {
    console.error('Kopie', e)
  }

  return res.redirect(303, SITE + (lang === 'en' ? '/en/thank-you' : '/danke'))
}

export { PRIVE_KONTEXT }
