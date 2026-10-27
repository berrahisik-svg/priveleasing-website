/**
 * /api/selbstauskunft – Online-Selbstauskunft und Unterlagen-Upload (priveleasing.de/selbstauskunft).
 *
 * GET  ?z=…                    Angaben zum Vorausfüllen aus dem persönlichen Link
 * GET  (mit CRON_KEY)          Erinnerungslauf von Hand (?trocken=1 nur anzeigen)
 * POST ?schritt=formular       Formular (JSON) → PDF → Nachricht im Postfach (mit Anhängen erst gespeichert)
 * POST ?schritt=datei&s=…      eine Datei (roh, max. 4,3 MB) an die gespeicherte Nachricht hängen
 * POST ?schritt=senden&s=…     gespeicherte Nachricht an info@ + Trello senden, Bestätigung an den Kunden
 *
 * Ohne Datenbank: Die Nachricht liegt bis zum Absenden im Postfach-Ordner „Automatik – Selbstauskunft Eingang“.
 * Bricht jemand ab, schickt der tägliche Lauf sie nach 60 Minuten trotzdem ab (Betreff „[Upload unvollständig]“).
 */
import { sendMail, ensureFolder, saveMessage, addAttachment, sendSaved, setSubject, getItem, getAttachment } from '../server/ews.js'
import { mitSignatur } from '../server/signatur.js'
import { selbstauskunftPdf } from '../server/selbstauskunft-pdf.js'
import { EINWILLIGUNGEN } from '../server/selbstauskunft-texte.js'
import { ORDNER, versiegeln, oeffnen, offenErledigt, erinnerungsLauf } from '../server/selbstauskunft.js'

export const config = { api: { bodyParser: false } }

const INFO = process.env.MAIL_USER || 'info@priveleasing.de'
const BOARD = process.env.TRELLO_BOARD_MAIL || ''
const MAX_JSON = 1.6 * 1024 * 1024
const MAX_DATEI = Math.floor(4.3 * 1024 * 1024)
const ENDUNGEN = /\.(pdf|jpe?g|png|heic|heif|webp|tiff?|gif|docx?|xlsx?)$/i

function lesen(req, max) {
  return new Promise((resolve, reject) => {
    const teile = []
    let n = 0
    req.on('data', (d) => {
      n += d.length
      if (n > max) {
        reject(new Error('zu groß'))
        req.destroy()
        return
      }
      teile.push(d)
    })
    req.on('end', () => resolve(Buffer.concat(teile)))
    req.on('error', reject)
  })
}

const rein = (s, max = 300) => String(s ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max)
const empfaenger = () => [INFO, BOARD].filter(Boolean)

function dateiname(name, art) {
  const n = rein(name, 120).replace(/[\\/:*?"<>|]/g, '_') || 'Datei'
  const a = rein(art, 40).replace(/[\\/:*?"<>|]/g, '_')
  return a ? `${a} – ${n}` : n
}

/** Daten aus dem Formular übernehmen (nur bekannte Felder, gekürzt). */
function datenAus(roh = {}) {
  const felder = [
    'firma', 'rechtsform', 'funktion', 'firmenanschrift', 'name', 'vorname', 'geburtsdatum', 'geburtsort', 'staatsangehoerigkeit', 'strasse', 'plz_ort', 'telefon', 'email',
    'familienstand', 'familienstand_seit', 'unterhalt', 'beruf', 'beschaeftigt_seit',
    'netto', 'geschaeft', 'bonus', 'mieteinnahmen', 'sonstige_einkuenfte',
    'miete', 'haushalt', 'sonstige_ausgaben', 'zins_tilgung', 'zins_tilgung_an', 'zins_tilgung_neu',
    'guthaben', 'wertpapiere', 'grundeigentum', 'verkehrswert', 'sonstiges_vermoegen', 'buergschaften',
    'mahnverfahren', 'zwangsvollstreckung', 'eidesstattlich', 'insolvenz', 'ort',
  ]
  const d = {}
  for (const k of felder) d[k] = rein(roh[k], k === 'firmenanschrift' || k.startsWith('sonstige') || k === 'guthaben' || k === 'wertpapiere' ? 600 : 200)
  d.email = d.email.toLowerCase()
  d.verbindlichkeiten = (Array.isArray(roh.verbindlichkeiten) ? roh.verbindlichkeiten : []).slice(0, 8).map((r) => ({
    bei: rein(r?.bei, 160), betrag: rein(r?.betrag, 40), saldo: rein(r?.saldo, 40), rate: rein(r?.rate, 40), laufzeit: rein(r?.laufzeit, 40), zinsbindung: rein(r?.zinsbindung, 40),
  }))
  for (const e of EINWILLIGUNGEN) d[e.key] = roh[e.key] === true
  d.datenschutz = roh.datenschutz === true
  return d
}

function zusammenfassung({ modus, d, link, dateien, vorgang }) {
  const z = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' }).format(new Date())
  const name = [d.vorname, d.name].filter(Boolean).join(' ')
  const zeilen = [
    `Quelle: Online-${modus === 'selbstauskunft' ? 'Selbstauskunft' : 'Unterlagen-Upload'} (priveleasing.de/selbstauskunft)`,
    `Eingang: ${z}`,
    `Vorgang: ${vorgang}${link ? ` · persönlicher Link aus der Anfrage ${link.i}` : ' · ohne persönlichen Link'}`,
    `Von: ${name}${d.email ? ' <' + d.email + '>' : ''}${d.telefon ? ' · ' + d.telefon : ''}`,
  ]
  if (d.firma) zeilen.push(`Firma: ${d.firma}`)
  if (link?.o) zeilen.push(`Objekt (aus der Anfrage): ${link.o}`)
  if (modus === 'selbstauskunft') {
    const neg = [['Mahnverfahren/Zahlungsklagen', d.mahnverfahren], ['Zwangsvollstreckung', d.zwangsvollstreckung], ['Eidesstattliche Versicherung', d.eidesstattlich], ['Insolvenz/Vergleich', d.insolvenz]]
      .filter(([, v]) => v === 'ja')
      .map(([k]) => k)
    zeilen.push(
      '',
      'Kurzüberblick',
      `Unternehmen: ${[d.rechtsform, d.beruf].filter(Boolean).join(' · ') || '–'}${d.beschaeftigt_seit ? ' · selbstständig seit ' + d.beschaeftigt_seit : ''}`,
      `Funktion: ${d.funktion || '–'}`,
      `Gehalt/Entnahmen: ${d.netto || '–'} · Gewinn: ${d.geschaeft || '–'} (monatlich)`,
      `Negative Merkmale (10 Jahre): ${neg.length ? 'ACHTUNG – ' + neg.join(', ') : 'keine angegeben'}`,
      `Einwilligungen: ${EINWILLIGUNGEN.every((e) => d[e.key]) ? 'alle bestätigt, elektronisch unterschrieben' : 'UNVOLLSTÄNDIG'}`,
    )
  }
  zeilen.push('', `Unterlagen (${dateien.length}):`, ...(dateien.length ? dateien.map((f) => `- ${dateiname(f.name, f.art)}`) : ['- keine hochgeladen']))
  if (modus === 'selbstauskunft') zeilen.push('', 'Die vollständige Selbstauskunft liegt als PDF bei.')
  return zeilen.join('\n')
}

const alsPre = (t) => '<pre style="font-family:Arial,Helvetica,sans-serif;font-size:13px;white-space:pre-wrap;">' + t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>'

function bestaetigung({ modus, name, anzahl, mitPdf }) {
  const unterlagen = anzahl === 1 ? 'Ihre Unterlage' : `Ihre Unterlagen (${anzahl} Dateien)`
  const was =
    modus === 'selbstauskunft'
      ? `Ihre Selbstauskunft${anzahl ? ` und ${unterlagen}` : ''} ${anzahl ? 'sind' : 'ist'} bei uns eingegangen.${mitPdf ? ' Eine Kopie Ihrer Selbstauskunft finden Sie im Anhang.' : ''}`
      : `${unterlagen} ${anzahl === 1 ? 'ist' : 'sind'} bei uns eingegangen.`
  return `Guten Tag${name ? ' ' + name : ''},

vielen Dank für Ihr Vertrauen – ${was}

Wir prüfen alles sorgfältig und melden uns innerhalb von 48 Stunden an Werktagen persönlich bei Ihnen. Sollte noch etwas fehlen, kommen wir gezielt auf Sie zu. Weitere Unterlagen können Sie jederzeit über denselben Link nachreichen.

Mit besten Grüßen`
}

async function kundenBestaetigung({ modus, email, name, anzahl, pdf }) {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return
  try {
    await sendMail({
      to: [email],
      subject: modus === 'selbstauskunft' ? 'Ihre Selbstauskunft ist eingegangen' : 'Ihre Unterlagen sind eingegangen',
      html: mitSignatur(bestaetigung({ modus, name, anzahl, mitPdf: !!pdf })),
      files: pdf ? [{ name: 'PRIVE-Selbstauskunft.pdf', contentType: 'application/pdf', content: pdf }] : [],
    })
  } catch (e) {
    console.error('Bestätigung', e.message)
  }
}

export default async function handler(req, res) {
  const q = req.query || {}
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    if (q.z) {
      const t = oeffnen(q.z)
      if (!t) return res.status(410).json({ ok: false, fehler: 'Link abgelaufen oder ungültig' })
      return res.status(200).json({ ok: true, name: t.n || '', firma: t.f || '', email: t.e || '', telefon: t.t || '' })
    }
    const key = q.key || req.headers['x-cron-key'] || (req.headers.authorization || '').replace('Bearer ', '')
    const erlaubt = [process.env.CRON_KEY, process.env.CRON_SECRET].filter(Boolean)
    if (!key || !erlaubt.includes(key)) return res.status(401).json({ fehler: 'kein Zugriff' })
    try {
      return res.status(200).json(await erinnerungsLauf({ bis: Date.now() + 50_000, trocken: q.trocken === '1' }))
    } catch (e) {
      return res.status(500).json({ fehler: e.message })
    }
  }
  if (req.method !== 'POST') return res.status(405).json({ fehler: 'Method not allowed' })

  try {
    /* ───────── 1 Formular ───────── */
    if (q.schritt === 'formular') {
      let body
      try {
        body = JSON.parse((await lesen(req, MAX_JSON)).toString('utf8'))
      } catch {
        return res.status(400).json({ ok: false, fehler: 'Ungültige Daten' })
      }
      if (body._honey) return res.status(200).json({ ok: true, fertig: true })
      const modus = body.modus === 'unterlagen' ? 'unterlagen' : 'selbstauskunft'
      const d = datenAus(body.daten)
      const link = body.z ? oeffnen(body.z) : null
      const geplant = (Array.isArray(body.dateien) ? body.dateien : []).slice(0, 30).map((f) => ({ name: rein(f?.name, 120), art: rein(f?.art, 40) }))

      // Prüfen
      // Pflichtfelder laut Volkan: Name, Vorname, Telefon, E-Mail, Adresse, Firma, Unterschrift
      const fehlt = []
      if (!d.name) fehlt.push('Name')
      if (!d.vorname) fehlt.push('Vorname')
      if (!d.telefon) fehlt.push('Telefon')
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) fehlt.push('E-Mail')
      if (!d.firma) fehlt.push('Firma')
      if (modus === 'selbstauskunft' && (!d.strasse || !d.plz_ort)) fehlt.push('Adresse')
      if (modus === 'selbstauskunft') {
        for (const e of EINWILLIGUNGEN) if (!d[e.key]) fehlt.push(e.titel)
        if (!/^data:image\/png;base64,/.test(body.unterschrift || '')) fehlt.push('Unterschrift')
      } else {
        if (!d.datenschutz) fehlt.push('Datenschutz')
        if (!geplant.length) fehlt.push('mindestens eine Datei')
      }
      if (fehlt.length) return res.status(400).json({ ok: false, fehler: 'Bitte ergänzen: ' + fehlt.join(', ') })

      const vorgang = link?.i || 'S-' + Date.now().toString(36).toUpperCase()
      const anzeigeName = [d.vorname, d.name].filter(Boolean).join(' ')
      let pdf = null
      if (modus === 'selbstauskunft') {
        pdf = await selbstauskunftPdf(d, {
          unterschrift: Buffer.from(body.unterschrift.split(',')[1] || '', 'base64'),
          vorgang,
          dateien: geplant,
        })
      }
      const betreff = `${modus === 'selbstauskunft' ? 'Selbstauskunft' : 'Unterlagen nachgereicht'}: ${d.firma ? d.firma + ' – ' : ''}${anzeigeName}`.slice(0, 200)
      const html = alsPre(zusammenfassung({ modus, d, link, dateien: geplant, vorgang }))
      const pdfDatei = pdf ? [{ name: `Selbstauskunft – ${anzeigeName || 'Kunde'}.pdf`, contentType: 'application/pdf', content: pdf }] : []

      // Ohne Dateien: sofort senden
      if (!geplant.length) {
        await sendMail({ to: empfaenger(), subject: betreff, html, files: pdfDatei })
        if (modus === 'selbstauskunft' && link?.i) await offenErledigt(link.i)
        await kundenBestaetigung({ modus, email: d.email, name: anzeigeName, anzahl: 0, pdf })
        return res.status(200).json({ ok: true, fertig: true })
      }

      // Mit Dateien: Nachricht speichern, Dateien folgen einzeln
      const ordner = await ensureFolder(ORDNER.eingang)
      const msg = await saveMessage({ folderId: ordner, to: empfaenger(), subject: betreff, html, files: pdfDatei })
      if (!msg?.id) throw new Error('Nachricht konnte nicht gespeichert werden')
      const s = versiegeln({ d: msg.id, m: modus, e: d.email, n: anzeigeName, z: link?.i || '', b: betreff, k: geplant.length }, 1)
      return res.status(200).json({ ok: true, s })
    }

    /* ───────── 2 Datei ───────── */
    if (q.schritt === 'datei') {
      const sess = oeffnen(q.s)
      if (!sess?.d) return res.status(403).json({ ok: false, fehler: 'Sitzung abgelaufen' })
      const name = (() => {
        try {
          return decodeURIComponent(req.headers['x-name'] || '')
        } catch {
          return ''
        }
      })()
      const art = (() => {
        try {
          return decodeURIComponent(req.headers['x-art'] || '')
        } catch {
          return ''
        }
      })()
      if (!ENDUNGEN.test(name)) return res.status(415).json({ ok: false, fehler: 'Dateityp nicht erlaubt (PDF, Foto oder Office-Datei)' })
      let inhalt
      try {
        inhalt = await lesen(req, MAX_DATEI)
      } catch {
        return res.status(413).json({ ok: false, fehler: 'Datei zu groß (max. 4 MB)' })
      }
      if (!inhalt.length) return res.status(400).json({ ok: false, fehler: 'Leere Datei' })
      await addAttachment(sess.d, { name: dateiname(name, art), contentType: rein(req.headers['content-type'], 100) || 'application/octet-stream', content: inhalt })
      return res.status(200).json({ ok: true })
    }

    /* ───────── 3 Senden ───────── */
    if (q.schritt === 'senden') {
      const sess = oeffnen(q.s)
      if (!sess?.d) return res.status(403).json({ ok: false, fehler: 'Sitzung abgelaufen' })
      let body = {}
      try {
        body = JSON.parse((await lesen(req, 64 * 1024)).toString('utf8') || '{}')
      } catch {}
      const fehl = (Array.isArray(body.fehlgeschlagen) ? body.fehlgeschlagen : []).map((n) => rein(n, 120)).filter(Boolean).slice(0, 30)
      const zuGross = (Array.isArray(body.zuGross) ? body.zuGross : []).map((n) => rein(n, 120)).filter(Boolean).slice(0, 30)
      const angekommen = Math.max(0, (sess.k || 0) - fehl.length)
      // Kopie der Selbstauskunft für den Kunden aus der gespeicherten Nachricht holen
      let pdf = null
      if (sess.m === 'selbstauskunft') {
        try {
          const item = await getItem(sess.d)
          const a = item.attachments.find((x) => /^Selbstauskunft – .*\.pdf$/i.test(x.name))
          if (a) pdf = await getAttachment(a.id)
        } catch (e) {
          console.error('PDF-Kopie', e.message)
        }
      }
      const nicht = fehl.length + zuGross.length
      if (nicht) await setSubject(sess.d, `${sess.b} (${nicht} Datei${nicht > 1 ? 'en' : ''} nicht übertragen – Kunde schickt sie per E-Mail)`)
      await sendSaved(sess.d)
      if (sess.m === 'selbstauskunft' && sess.z) await offenErledigt(sess.z)
      await kundenBestaetigung({ modus: sess.m, email: sess.e, name: sess.n, anzahl: angekommen, pdf })
      return res.status(200).json({ ok: true, fertig: true })
    }

    return res.status(400).json({ ok: false, fehler: 'Unbekannter Schritt' })
  } catch (e) {
    console.error('Selbstauskunft', e)
    return res.status(500).json({ ok: false, fehler: 'Übertragung fehlgeschlagen. Bitte versuchen Sie es erneut.' })
  }
}
