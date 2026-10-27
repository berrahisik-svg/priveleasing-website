/**
 * Online-Selbstauskunft: Felder, persönlicher Link, Mail-Bausteine, Merkzettel im Postfach und Erinnerung nach 48 Stunden.
 *
 * Merkzettel: Für jeden verschickten Link liegt im Postfach (Posteingang › „Automatik – Selbstauskunft offen“) eine
 * gespeicherte Nachricht. Kommt die Selbstauskunft, wandert sie nach „Automatik – Selbstauskunft erledigt“.
 * Liegt sie 48 Stunden ohne Eingang, geht einmal eine Erinnerung raus (Kategorie „Erinnerung gesendet“).
 */
import crypto from 'node:crypto'
import { ensureFolder, saveMessage, findInFolder, getItem, moveItem, setCategory, sendMail, sendSaved, setSubject } from './ews.js'
import { mitSignatur } from './signatur.js'

const SITE = process.env.SITE_URL || 'https://www.priveleasing.de'

export const ORDNER = {
  offen: 'Automatik – Selbstauskunft offen',
  erledigt: 'Automatik – Selbstauskunft erledigt',
  eingang: 'Automatik – Selbstauskunft Eingang',
}
const ERINNERT = 'Erinnerung gesendet'

/** Checkliste (gleiche Punkte wie Seite 1 der Kundenunterlagen). */
export const CHECKLISTE = [
  'Ausweis des Geschäftsführers oder Inhabers (Vorder- und Rückseite)',
  'Handelsregisterauszug (bei einer GmbH)',
  'Angebot oder Kaufvertragsentwurf mit Kaufpreis',
  'Gewerbeanmeldung',
  'Aktuellster Jahresabschluss',
  'Letzte BWA inklusive Summen- und Saldenliste (SuSa)',
  'Aktuelle BWA inklusive Summen- und Saldenliste (SuSa)',
]

/* ───────── Verschlüsselte Tokens (Link und Upload-Sitzung) ───────── */

function schluessel() {
  const geheim = process.env.SA_KEY || process.env.CRON_KEY || process.env.MAIL_PASS
  if (!geheim) throw new Error('Kein Schlüssel für die Selbstauskunft gesetzt')
  return crypto.createHash('sha256').update('prive-selbstauskunft|' + geheim).digest()
}

/** Objekt verschlüsseln; gültig für `tage`. */
export function versiegeln(obj, tage = 90) {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', schluessel(), iv)
  const daten = Buffer.concat([c.update(JSON.stringify({ ...obj, x: Date.now() + tage * 864e5 }), 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), daten]).toString('base64url')
}

/** Token öffnen; null, wenn manipuliert oder abgelaufen. */
export function oeffnen(token) {
  try {
    const b = Buffer.from(String(token || ''), 'base64url')
    if (b.length < 30) return null
    const d = crypto.createDecipheriv('aes-256-gcm', schluessel(), b.subarray(0, 12))
    d.setAuthTag(b.subarray(12, 28))
    const obj = JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'))
    if (!obj.x || obj.x < Date.now()) return null
    return obj
  } catch {
    return null
  }
}

/** Neuer persönlicher Link für eine Anfrage. Gibt { id, link } zurück. */
export function neuerLink({ name = '', firma = '', email = '', telefon = '', objekt = '' } = {}) {
  const id = crypto.randomBytes(5).toString('hex').toUpperCase()
  const z = versiegeln({ i: id, n: name, f: firma, e: email, t: telefon, o: String(objekt || '').slice(0, 80) }, 90)
  return { id, link: `${SITE}/selbstauskunft?z=${z}` }
}

/** Allgemeiner Link ohne Vorausfüllung (z. B. per WhatsApp weitergeben). */
export const LINK_ALLGEMEIN = `${SITE}/selbstauskunft`

/* ───────── Mail-Bausteine ───────── */

const F = 'font-family:Arial,Helvetica,sans-serif;'
const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Button + Checkliste als HTML-Block für Mails. */
export function linkBlock(link, { checkliste = true, button = 'Selbstauskunft ausfüllen und Unterlagen hochladen' } = {}) {
  const liste = checkliste
    ? `<p style="margin:0 0 6px 0;${F}font-size:14px;line-height:1.55;color:#16181b;">Benötigte Unterlagen:</p>` +
      `<ul style="margin:0 0 14px 0;padding:0 0 0 20px;${F}font-size:14px;line-height:1.55;color:#16181b;">` +
      [...CHECKLISTE, 'Ausgefüllte Selbstauskunft (direkt online)'].map((p) => `<li style="margin:0 0 2px 0;">${escHtml(p)}</li>`).join('') +
      '</ul>'
    : ''
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin:2px 0 16px 0;"><tr>` +
    `<td style="background:#16181b;border-radius:999px;mso-padding-alt:13px 26px;">` +
    `<a href="${escHtml(link)}" style="display:inline-block;padding:13px 26px;${F}font-size:14px;font-weight:bold;line-height:18px;color:#ffffff;text-decoration:none;border-radius:999px;">${escHtml(button)}</a>` +
    `</td></tr></table>` +
    liste +
    `<p style="margin:0 0 14px 0;${F}font-size:12px;line-height:1.5;color:#6b6f76;">Der Link ist persönlich und verschlüsselt. Sie können ihn jederzeit erneut öffnen, um Unterlagen nachzureichen.<br>` +
    `Falls der Button nicht funktioniert: <a href="${escHtml(link)}" style="color:#6b6f76;">${escHtml(link.length > 70 ? link.slice(0, 60) + '…' : link)}</a></p>`
  )
}

/**
 * Mailtext mit Signatur; der Absatz mit [[LINK]] wird durch den Link-Block ersetzt.
 * Fehlt der Platzhalter, steht der Block vor der Grußformel.
 */
export function mitSignaturUndLink(text, link, opt) {
  let t = String(text || '')
  if (!t.includes('[[LINK]]')) {
    const gruss = t.search(/\n\s*Mit besten Grüßen\s*$/i)
    t = gruss >= 0 ? t.slice(0, gruss) + '\n\n[[LINK]]\n\n' + t.slice(gruss).trimStart() : t + '\n\n[[LINK]]'
  }
  t = t.replace(/[ \t]*\[\[LINK\]\][ \t]*/g, '\n\n§§LINK§§\n\n').replace(/\n{3,}/g, '\n\n')
  const html = mitSignatur(t)
  return html.replace(/<p[^>]*>§§LINK§§<\/p>/, linkBlock(link, opt))
}

/* ───────── Merkzettel und Erinnerung ───────── */

/** Merkzettel anlegen, nachdem die Antwort mit dem Link verschickt wurde. Fehler werden nur protokolliert. */
export async function offenAnlegen({ id, link, name = '', firma = '', email = '', telefon = '', objekt = '' }) {
  try {
    if (!email) return
    const ordner = await ensureFolder(ORDNER.offen)
    const daten = { id, link, name, firma, email, telefon, objekt, gesendet: new Date().toISOString() }
    const html =
      `<div style="${F}font-size:14px;line-height:1.55;">` +
      `<p><b>Selbstauskunft angefragt</b> – Link am ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} verschickt.</p>` +
      `<p>${escHtml(firma ? firma + ' – ' : '')}${escHtml(name)}<br>${escHtml(email)}${telefon ? '<br>' + escHtml(telefon) : ''}${objekt ? '<br>Objekt: ' + escHtml(objekt) : ''}</p>` +
      `<p>Persönlicher Link (z. B. per WhatsApp weiterleiten):<br><a href="${escHtml(link)}">${escHtml(link)}</a></p>` +
      `<p style="color:#6b6f76;font-size:12px;">Kommt die Selbstauskunft, wandert dieser Eintrag automatisch nach „${ORDNER.erledigt}“. Nach 48 Stunden ohne Eingang geht einmal automatisch eine Erinnerung an den Kunden.</p>` +
      `<p style="color:#9a9ea5;font-size:11px;">DATEN:${Buffer.from(JSON.stringify(daten)).toString('base64')}</p></div>`
    await saveMessage({ folderId: ordner, subject: `Selbstauskunft offen · ${firma ? firma + ' – ' : ''}${name || email} · ${id}`, html })
  } catch (e) {
    console.error('Merkzettel', e.message)
  }
}

/** Merkzettel nach „erledigt“ verschieben (wenn die Selbstauskunft mit diesem Link eingegangen ist). */
export async function offenErledigt(id) {
  if (!id) return false
  try {
    const offen = await ensureFolder(ORDNER.offen)
    const treffer = await findInFolder(offen, { betreffEnthaelt: id, max: 5 })
    if (!treffer.length) return false
    const erledigt = await ensureFolder(ORDNER.erledigt)
    for (const t of treffer) await moveItem(t.id, erledigt)
    return true
  } catch (e) {
    console.error('Merkzettel erledigt', e.message)
    return false
  }
}

function datenAus(body) {
  const m = String(body || '').match(/DATEN:([A-Za-z0-9+/=\s]+)/)
  if (!m) return null
  try {
    return JSON.parse(Buffer.from(m[1].replace(/\s+/g, ''), 'base64').toString('utf8'))
  } catch {
    return null
  }
}

/** Text der Erinnerung (fester Text, keine KI). */
export function erinnerungText({ name = '', objekt = '' }) {
  const o = String(objekt || '').replace(/^[^:]{2,24}:\s*/, '').split(/[,;\n]/)[0].trim().slice(0, 60)
  return `Guten Tag${name ? ' ' + name : ''},

vor einigen Tagen haben wir Ihnen den Link zu Ihrer Selbstauskunft geschickt. Damit wir Ihre Anfrage${o ? ' (' + o + ')' : ''} prüfen und Ihnen ein persönliches Angebot machen können, benötigen wir noch Ihre Angaben und Unterlagen.

[[LINK]]

Das Ausfüllen dauert etwa zehn Minuten. Wenn Sie Fragen haben oder die Unterlagen lieber per E-Mail senden möchten, antworten Sie einfach auf diese Nachricht.

Mit besten Grüßen`
}

/**
 * Täglicher Lauf (aus /api/postfach): Erinnerungen nach 48 Stunden und liegengebliebene Uploads abschicken.
 * bis: Zeitstempel (ms), bis zu dem gearbeitet werden darf.
 */
export async function erinnerungsLauf({ bis = Date.now() + 25_000, trocken = false } = {}) {
  const protokoll = { erinnert: [], uploads: [] }
  // 1 Liegengebliebene Uploads (Sitzung abgebrochen): nach 60 Minuten trotzdem abschicken
  try {
    const eingang = await ensureFolder(ORDNER.eingang)
    const alt = await findInFolder(eingang, { vor: new Date(Date.now() - 60 * 60e3), max: 10 })
    for (const it of alt) {
      if (Date.now() > bis) break
      if (trocken) {
        protokoll.uploads.push({ betreff: it.subject, trocken: true })
        continue
      }
      try {
        await setSubject(it.id, '[Upload unvollständig] ' + it.subject)
        await sendSaved(it.id)
        protokoll.uploads.push({ betreff: it.subject, gesendet: true })
      } catch (e) {
        protokoll.uploads.push({ betreff: it.subject, fehler: e.message })
      }
    }
  } catch (e) {
    protokoll.uploadsFehler = e.message
  }
  // 2 Erinnerung nach 48 Stunden, genau einmal
  try {
    const offen = await ensureFolder(ORDNER.offen)
    const faellig = await findInFolder(offen, { vor: new Date(Date.now() - 48 * 3600e3), ohneKategorie: ERINNERT, max: 20 })
    for (const it of faellig) {
      if (Date.now() > bis) break
      try {
        const d = datenAus((await getItem(it.id)).body)
        if (!d?.email || !d?.link) {
          if (!trocken) await setCategory(it.id, ERINNERT)
          protokoll.erinnert.push({ betreff: it.subject, uebersprungen: 'keine Daten' })
          continue
        }
        if (trocken) {
          protokoll.erinnert.push({ an: d.email, trocken: true })
          continue
        }
        await sendMail({
          to: [d.email],
          subject: 'Erinnerung: Ihre Selbstauskunft für PRIVÉ',
          html: mitSignaturUndLink(erinnerungText({ name: d.name, objekt: d.objekt }), d.link),
        })
        await setCategory(it.id, ERINNERT)
        protokoll.erinnert.push({ an: d.email })
      } catch (e) {
        protokoll.erinnert.push({ betreff: it.subject, fehler: e.message })
      }
    }
  } catch (e) {
    protokoll.erinnertFehler = e.message
  }
  return protokoll
}
