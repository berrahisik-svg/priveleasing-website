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

/* ───────── Selbstauskunft: bestehende Karte finden und ergänzen (nur mit API-Schlüssel) ───────── */

const BOARD = process.env.TRELLO_BOARD || '' // Board-Link (https://trello.com/b/AbCd1234/…) oder Board-ID

/** API nutzbar? Braucht Schlüssel, Token und ein Board (TRELLO_BOARD oder TRELLO_LIST_ID). */
export function trelloApi() {
  return !!(KEY && TOKEN && (BOARD || LIST))
}

async function api(pfad, opt = {}) {
  const sep = pfad.includes('?') ? '&' : '?'
  const r = await fetch(`https://api.trello.com/1${pfad}${sep}key=${KEY}&token=${TOKEN}`, opt)
  if (!r.ok) throw new Error(`Trello ${r.status}: ${(await r.text()).slice(0, 160)}`)
  return r.json()
}

let boardCache = ''
async function boardId() {
  if (boardCache) return boardCache
  const m = BOARD.match(/trello\.com\/b\/([A-Za-z0-9]+)/)
  if (m) boardCache = m[1]
  else if (BOARD) boardCache = BOARD.trim()
  else boardCache = (await api(`/lists/${LIST}?fields=idBoard`)).idBoard
  return boardCache
}

/**
 * Offene Karte zur Anfrage suchen: zuerst über die Vorgangsnummer (steht in jeder neuen Anfrage-Karte),
 * sonst über die E-Mail-Adresse in der Beschreibung (neueste Karte gewinnt).
 */
export async function karteSuchen({ vorgang = '', email = '' } = {}) {
  const karten = await api(`/boards/${await boardId()}/cards/open?fields=name,desc,dateLastActivity,shortUrl`)
  const neueste = (liste) => liste.sort((a, b) => String(b.dateLastActivity).localeCompare(String(a.dateLastActivity)))[0] || null
  if (vorgang) {
    const t = karten.filter((k) => (k.desc || '').includes(vorgang))
    if (t.length) return neueste(t)
  }
  const mail = String(email || '').trim().toLowerCase()
  if (mail && mail.includes('@')) {
    const t = karten.filter((k) => (k.desc || '').toLowerCase().includes(mail) && !/^Selbstauskunft:/i.test(k.name || ''))
    if (t.length) return neueste(t)
  }
  return null
}

/** Kommentar und Dateien an eine Karte hängen; Label „Selbstauskunft“ setzen, falls es auf dem Board existiert. */
export async function anKarteHaengen(kartenId, { kommentar = '', dateien = [] } = {}) {
  if (kommentar) await api(`/cards/${kartenId}/actions/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: kommentar.slice(0, 16000) }) })
  for (const f of dateien) {
    const fd = new FormData()
    fd.append('file', new Blob([f.content], { type: f.contentType || 'application/octet-stream' }), f.name)
    fd.append('name', f.name)
    await api(`/cards/${kartenId}/attachments`, { method: 'POST', body: fd })
  }
  try {
    const labels = await api(`/boards/${await boardId()}/labels?fields=name`)
    const l = labels.find((x) => /selbstauskunft/i.test(x.name || ''))
    if (l) await api(`/cards/${kartenId}/idLabels`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: l.id }) })
  } catch {}
}

/**
 * Eingegangene Selbstauskunft/Unterlagen in Trello einsortieren.
 * Mit API: an die bestehende Karte der Anfrage hängen; gibt es keine, neue Karte über die Board-Mail.
 * Ohne API passiert hier nichts – dann ging die Board-Mail schon mit der Nachricht an info@ raus.
 */
export async function trelloEinsortieren({ vorgang = '', email = '', betreff = '', text = '', dateien = [] }) {
  if (!trelloApi()) return 'board-mail'
  try {
    const karte = await karteSuchen({ vorgang, email })
    if (karte) {
      await anKarteHaengen(karte.id, { kommentar: text, dateien })
      return 'bestehende Karte ' + (karte.shortUrl || karte.id)
    }
  } catch (e) {
    console.error('Trello-API', e.message)
  }
  if (!BOARD_MAIL) return 'keine'
  const html = '<pre style="font-family:Arial,Helvetica,sans-serif;font-size:13px;white-space:pre-wrap;">' + String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>'
  await sendMail({ to: [BOARD_MAIL], subject: betreff, html, files: dateien })
  return 'neue Karte'
}
