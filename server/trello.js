/**
 * Trello-Karten per E-Mail an die Board-Adresse.
 * Betreff = Kartentitel, #Label setzt das Label, Mailtext = Beschreibung, Anhänge hängen an der Karte.
 * Optional (TRELLO_KEY + TRELLO_TOKEN + TRELLO_LIST_ID gesetzt): Karte direkt per API, inkl. Anhängen.
 */
import { sendMail } from './ews.js'

const BOARD_MAIL = process.env.TRELLO_BOARD_MAIL
const KEY = process.env.TRELLO_KEY
const TOKEN = process.env.TRELLO_TOKEN
const LIST = process.env.TRELLO_LIST_ID

const LABELS = { Fahrzeuge: 'Fahrzeuge', Yachten: 'Yachten', Aviation: 'Aviation', Toys: 'Toys', Uhren: 'Uhren', Allgemein: 'Allgemein' }

/**
 * karte: { titel, label, beschreibung (Text), dateien: [{name, contentType, content(Buffer)}] }
 */
export async function karteAnlegen({ titel, label = 'Allgemein', beschreibung = '', dateien = [] }) {
  if (KEY && TOKEN && LIST) return karteApi({ titel, label, beschreibung, dateien })
  if (!BOARD_MAIL) return { via: 'keine', ok: false }
  const betreff = `${titel} #${LABELS[label] || 'Allgemein'}`
  const html = '<pre style="font-family:Arial,Helvetica,sans-serif;font-size:13px;white-space:pre-wrap;">' + beschreibung.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>'
  await sendMail({ to: [BOARD_MAIL], subject: betreff, html, files: dateien })
  return { via: 'mail', ok: true }
}

async function karteApi({ titel, label, beschreibung, dateien }) {
  const q = `key=${KEY}&token=${TOKEN}`
  const r = await fetch(`https://api.trello.com/1/cards?${q}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idList: LIST, name: titel, desc: beschreibung, pos: 'top' }),
  })
  if (!r.ok) throw new Error('Trello: ' + (await r.text()).slice(0, 200))
  const card = await r.json()
  // Label nach Name suchen und setzen
  try {
    const labels = await (await fetch(`https://api.trello.com/1/boards/${card.idBoard}/labels?${q}`)).json()
    const l = labels.find((x) => x.name?.toLowerCase() === String(label).toLowerCase())
    if (l) await fetch(`https://api.trello.com/1/cards/${card.id}/idLabels?${q}&value=${l.id}`, { method: 'POST' })
  } catch {}
  for (const f of dateien) {
    const fd = new FormData()
    fd.append('file', new Blob([f.content], { type: f.contentType || 'application/octet-stream' }), f.name)
    fd.append('name', f.name)
    await fetch(`https://api.trello.com/1/cards/${card.id}/attachments?${q}`, { method: 'POST', body: fd })
  }
  return { via: 'api', ok: true, url: card.shortUrl }
}

/** Beschreibungstext für eine Karte aus Angaben bauen. */
export function beschreibung({ quelle, angaben = {}, zusammenfassung = '', von = '', zeit = new Date(), extra = '' }) {
  const z = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' }).format(zeit)
  const zeilen = [`Quelle: ${quelle}`, `Eingang: ${z}`, von ? `Von: ${von}` : '', '']
  if (zusammenfassung) zeilen.push(zusammenfassung, '')
  const namen = {
    name: 'Name', firma: 'Firma', telefon: 'Telefon', email: 'E-Mail', objekt: 'Objekt', preis_netto: 'Preis netto', link: 'Link',
    verkaeufer: 'Verkäufer', art_wunsch: 'Wunsch', gewerblich: 'Gewerblich', laufzeit: 'Laufzeit', anzahlung: 'Anzahlung', termin: 'Termin',
    nutzung: 'Nutzung', land: 'Land', budget: 'Budget', zeitraum: 'Zeitraum', objektart: 'Objektart', kaufpreis: 'Kaufpreis', suche: 'Anliegen',
  }
  for (const [k, v] of Object.entries(angaben)) {
    if (v === '' || v == null || k === 'checks') continue
    zeilen.push(`${namen[k] || k}: ${typeof v === 'boolean' ? (v ? 'ja' : 'nein') : v}`)
  }
  if (extra) zeilen.push('', extra)
  return zeilen.join('\n')
}
