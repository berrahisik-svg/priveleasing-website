/**
 * PDF der ausgefüllten Online-Selbstauskunft (PRIVÉ-Gestaltung, Mona Sans).
 */
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { EINWILLIGUNGEN, SCHUFA_HINWEIS, TEXTE_STAND } from './selbstauskunft-texte.js'

const DIR = path.join(process.cwd(), 'server', 'vorlagen')
const INK = rgb(0.086, 0.094, 0.106)
const SOFT = rgb(0.42, 0.435, 0.463)
const MUTE = rgb(0.6, 0.62, 0.647)
const BOX = rgb(0.937, 0.937, 0.945)
const W = 595.28
const H = 841.89
const ML = 48
const MR = 48
const TOP = 52
const BOTTOM = 64
const BREITE = W - ML - MR

const ROLLEN = { antragsteller: 'Antragsteller', mitantragsteller: 'Mitantragsteller', buerge: 'Bürge' }
const FAMILIE = { ledig: 'ledig', verheiratet: 'verheiratet', getrennt: 'getrennt lebend', geschieden: 'geschieden', verwitwet: 'verwitwet' }

/** Nur druckbare Zeichen, Zeilenumbrüche normalisiert. */
function rein(s) {
  return String(s ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, '')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}️]/gu, '')
    .trim()
}

/** Betrag: reine Zahlen als „12.500 €“, sonst wie eingegeben. */
function euro(v) {
  const s = rein(v)
  if (!s) return ''
  const n = s.replace(/\s|€|eur|euro/gi, '')
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$|^\d+(\.\d{1,2})?$/.test(n)) {
    const zahl = /,/.test(n) ? Number(n.replace(/\./g, '').replace(',', '.')) : /^\d{1,3}(\.\d{3})+$/.test(n) ? Number(n.replace(/\./g, '')) : Number(n)
    if (Number.isFinite(zahl)) return zahl.toLocaleString('de-DE', { minimumFractionDigits: zahl % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €'
  }
  return s
}

function datum(v) {
  const s = rein(v)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : s
}

const jn = (v) => (v === 'ja' ? 'ja' : v === 'nein' ? 'nein' : '–')

export async function selbstauskunftPdf(d = {}, { unterschrift = null, vorgang = '', eingang = new Date(), dateien = [] } = {}) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const [reg, med, semi] = await Promise.all(
    ['Regular', 'Medium', 'SemiBold'].map(async (n) => pdf.embedFont(await readFile(path.join(DIR, 'schrift', `MonaSans-${n}.ttf`)), { subset: true })),
  )
  const logo = await pdf.embedPng(await readFile(path.join(DIR, 'prive-logo-pdf.png')))
  let sig = null
  if (unterschrift) {
    try {
      sig = await pdf.embedPng(unterschrift)
    } catch {}
  }

  const name = [rein(d.vorname), rein(d.name)].filter(Boolean).join(' ')
  const zeit = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' }).format(eingang)
  const heute = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeZone: 'Europe/Berlin' }).format(eingang)

  let page
  let y

  function neueSeite() {
    page = pdf.addPage([W, H])
    const lh = 19
    page.drawImage(logo, { x: ML, y: H - TOP + 2 - lh, width: (lh * logo.width) / logo.height, height: lh })
    const k = 'SELBSTAUSKUNFT'
    page.drawText(k, { x: W - MR - spaced(k, 6.5, med, 1.2), y: H - TOP - 10, size: 6.5, font: med, color: SOFT, characterSpacing: 1.2 })
    y = H - TOP - 44
  }
  function spaced(s, size, font, cs) {
    return font.widthOfTextAtSize(s, size) + cs * (s.length - 1)
  }
  function platz(h) {
    if (y - h < BOTTOM) neueSeite()
  }
  function zeilen(text, font, size, breite) {
    const out = []
    for (const absatz of rein(text).split('\n')) {
      let z = ''
      for (const wort of absatz.split(/\s+/)) {
        if (!wort) continue
        const test = z ? z + ' ' + wort : wort
        if (font.widthOfTextAtSize(test, size) <= breite) z = test
        else {
          if (z) out.push(z)
          // überlange Wörter (z. B. Links) hart umbrechen
          let w = wort
          while (font.widthOfTextAtSize(w, size) > breite) {
            let i = w.length
            while (i > 1 && font.widthOfTextAtSize(w.slice(0, i), size) > breite) i--
            out.push(w.slice(0, i))
            w = w.slice(i)
          }
          z = w
        }
      }
      out.push(z)
    }
    return out
  }

  function abschnitt(nr, titel) {
    platz(70)
    y -= 10
    page.drawText(nr, { x: ML, y, size: 17, font: reg, color: MUTE })
    page.drawText(titel, { x: ML + reg.widthOfTextAtSize(nr, 17) + 8, y: y + 1, size: 12.5, font: med, color: INK })
    y -= 22
  }

  function unterTitel(t) {
    platz(48)
    y -= 4
    page.drawText(t, { x: ML, y, size: 9, font: semi, color: INK })
    y -= 17
  }

  /** Eine Zeile mit 1 oder 2 Feldern: [{label, wert, breit}] */
  function feldZeile(felder) {
    const gap = 14
    const spalten = felder.length === 1 || felder[0].breit ? [BREITE] : [(BREITE - gap) / 2, (BREITE - gap) / 2]
    const pad = 6
    const size = 9.5
    const inhalte = felder.map((f, i) => zeilen(f.wert || '–', reg, size, spalten[i] - 2 * pad))
    const boxH = Math.max(...inhalte.map((z) => z.length)) * 12.5 + 2 * pad - 2
    platz(boxH + 22)
    let x = ML
    felder.forEach((f, i) => {
      page.drawText(f.label.toUpperCase(), { x, y, size: 6.2, font: med, color: SOFT, characterSpacing: 0.9 })
      const top = y - 6
      page.drawRectangle({ x, y: top - boxH, width: spalten[i], height: boxH, color: BOX })
      inhalte[i].forEach((z, n) => page.drawText(z, { x: x + pad, y: top - pad - 8 - n * 12.5, size, font: f.wert ? reg : reg, color: f.wert ? INK : MUTE }))
      x += spalten[i] + gap
    })
    y -= boxH + 22
  }
  const F = (label, wert, breit = false) => ({ label, wert: rein(wert), breit })
  function paare(liste) {
    const vorhanden = liste.filter(Boolean)
    for (let i = 0; i < vorhanden.length; ) {
      if (vorhanden[i].breit) {
        feldZeile([vorhanden[i]])
        i += 1
      } else if (vorhanden[i + 1] && !vorhanden[i + 1].breit) {
        feldZeile([vorhanden[i], vorhanden[i + 1]])
        i += 2
      } else {
        feldZeile([vorhanden[i]])
        i += 1
      }
    }
  }

  function absatz(text, { size = 7.6, font = reg, color = SOFT, breite = BREITE, x = ML, abstand = 4 } = {}) {
    const z = zeilen(text, font, size, breite)
    const lh = size * 1.42
    for (const zeile of z) {
      platz(lh + 2)
      page.drawText(zeile, { x, y, size, font, color })
      y -= lh
    }
    y -= abstand
  }

  function haken(x, yy) {
    page.drawRectangle({ x, y: yy - 1.5, width: 9, height: 9, color: INK })
    page.drawLine({ start: { x: x + 2, y: yy + 3 }, end: { x: x + 3.8, y: yy + 1.1 }, thickness: 1.2, color: rgb(1, 1, 1) })
    page.drawLine({ start: { x: x + 3.8, y: yy + 1.1 }, end: { x: x + 7.2, y: yy + 5.6 }, thickness: 1.2, color: rgb(1, 1, 1) })
  }

  /* ───────── Seite 1 ───────── */
  neueSeite()
  y -= 22
  page.drawText('Selbstauskunft.', { x: ML, y, size: 27, font: reg, color: INK })
  y -= 20
  const meta = [`Online übermittelt am ${zeit} Uhr`, vorgang ? `Vorgang ${vorgang}` : '', `Ausgefüllt als ${ROLLEN[d.rolle] || 'Antragsteller'}`].filter(Boolean).join('  ·  ')
  page.drawText(meta, { x: ML, y, size: 8.2, font: reg, color: SOFT })
  y -= 26

  abschnitt('01', 'Angaben zur Person')
  paare([
    rein(d.firma) && F('Firma (Leasingnehmer)', d.firma, true),
    F('Name, ggf. auch Geburtsname', d.name),
    F('Vorname', d.vorname),
    F('Geburtsdatum', datum(d.geburtsdatum)),
    F('Geburtsort', d.geburtsort),
    F('Staatsangehörigkeit', d.staatsangehoerigkeit),
    F('Familienstand', [FAMILIE[d.familienstand] || d.familienstand, rein(d.familienstand_seit) ? 'seit ' + datum(d.familienstand_seit) : ''].filter(Boolean).join(', ')),
    F('Anschrift: Straße', d.strasse),
    F('Anschrift: PLZ / Ort', d.plz_ort),
    F('Telefon', d.telefon),
    F('E-Mail', d.email),
    F('Unterhaltsberechtigte Personen', d.unterhalt),
    F('Ausgeübter Beruf / Geschäftszweig', d.beruf),
    F('Beschäftigung bei (Firma mit Anschrift)', d.arbeitgeber, true),
    F('Beschäftigt seit', datum(d.beschaeftigt_seit)),
    F('Ungekündigte Stellung', jn(d.ungekuendigt)),
    F('Selbstständig', jn(d.selbststaendig)),
  ])

  abschnitt('02', 'Einkommen (monatlich, Nachweise beigefügt)')
  unterTitel('a) Monatliches Einkommen')
  paare([
    F('Nettolohn, -gehalt, sonstige Bezüge', euro(d.netto)),
    F('Geschäftseinkünfte (Entnahmen, Gewinn)', euro(d.geschaeft)),
    F('Anzahl der Monatsgehälter', d.monatsgehaelter),
    F('Bonuszahlungen', euro(d.bonus)),
    F('(Kalt-)Mieteinnahmen', euro(d.mieteinnahmen)),
    F('Sonstige Einkünfte (z. B. Beteiligungen, Kapitalvermögen)', euro(d.sonstige_einkuenfte)),
  ])
  unterTitel('b) Monatliche Ausgaben')
  paare([
    F('Miete', euro(d.miete)),
    F('Laufende Haushaltsausgaben', euro(d.haushalt)),
    F('Sonstige Ausgaben (z. B. Leasing, Bausparen, Sparplan, Unterhalt, Versicherungen)', euro(d.sonstige_ausgaben), true),
    F('Zins- und Tilgungsleistungen', euro(d.zins_tilgung)),
    F('… an (Kreditgeber)', d.zins_tilgung_an),
    F('Zins- und Tilgungsdienst für beantragten Kredit / künftige Mieteinnahmen aus Finanzierungsobjekt', euro(d.zins_tilgung_neu), true),
  ])

  abschnitt('03', 'Vermögensverhältnisse')
  paare([
    F('Guthaben (Kreditinstitut, ggf. Kontonummer)', d.guthaben, true),
    F('Wertpapiere (Gattung, Nennwert, Verwahrung bei)', d.wertpapiere, true),
    F('Grundeigentum (Art, Größe, Lage)', d.grundeigentum),
    F('Unterstellter Verkehrswert', euro(d.verkehrswert)),
    F('Sonstige Vermögenswerte (z. B. Beteiligungen, Erbanteile, Sammlungen)', d.sonstiges_vermoegen, true),
  ])

  // Verbindlichkeiten als Tabelle
  const vb = (Array.isArray(d.verbindlichkeiten) ? d.verbindlichkeiten : []).filter((r) => r && Object.values(r).some((v) => rein(v)))
  unterTitel('Verbindlichkeiten')
  if (!vb.length) {
    paare([F('Verbindlichkeiten bei', 'keine angegeben', true)])
  } else {
    const kopf = ['Bei', 'Darlehensbetrag', 'Aktueller Saldo', 'Rate', 'Laufzeit', 'Zinsbindung bis']
    const sp = [0.25, 0.15, 0.15, 0.13, 0.14, 0.18].map((f) => f * BREITE)
    platz(30)
    let x = ML
    kopf.forEach((k, i) => {
      page.drawText(k.toUpperCase(), { x: x + 4, y, size: 6, font: med, color: SOFT, characterSpacing: 0.7 })
      x += sp[i]
    })
    y -= 8
    for (const r of vb) {
      const werte = [rein(r.bei), euro(r.betrag), euro(r.saldo), euro(r.rate), rein(r.laufzeit), datum(r.zinsbindung)]
      const z = werte.map((w, i) => zeilen(w || '–', reg, 8.6, sp[i] - 8))
      const h = Math.max(...z.map((a) => a.length)) * 11 + 9
      platz(h + 4)
      page.drawRectangle({ x: ML, y: y - h, width: BREITE, height: h, color: BOX })
      let xx = ML
      z.forEach((zz, i) => {
        zz.forEach((t, n) => page.drawText(t, { x: xx + 4, y: y - 12 - n * 11, size: 8.6, font: reg, color: werte[i] ? INK : MUTE }))
        xx += sp[i]
      })
      y -= h + 3
    }
    y -= 14
  }
  paare([F('Übernommene Bürgschaften (Betrag, Gläubiger, Schuldner)', d.buergschaften, true)])

  unterTitel('Bestehen oder bestanden in den letzten zehn Jahren')
  paare([
    F('a) Mahnverfahren oder Zahlungsklagen', jn(d.mahnverfahren)),
    F('b) Zwangsvollstreckung', jn(d.zwangsvollstreckung)),
    F('c) Eidesstattliches Versicherungsverfahren', jn(d.eidesstattlich)),
    F('d) Insolvenz- oder Vergleichsverfahren', jn(d.insolvenz)),
  ])

  /* ───────── Einwilligungen ───────── */
  abschnitt('04', 'Einwilligungen und Unterschrift')
  for (const e of EINWILLIGUNGEN) {
    const ok = d[e.key] === true || d[e.key] === 'ja' || d[e.key] === 'on'
    platz(40)
    if (ok) haken(ML, y)
    else page.drawRectangle({ x: ML, y: y - 1.5, width: 9, height: 9, borderColor: SOFT, borderWidth: 0.8 })
    page.drawText(e.titel + (ok ? '' : ' (nicht bestätigt)'), { x: ML + 16, y, size: 9, font: med, color: INK })
    y -= 13
    absatz(e.text, { x: ML + 16, breite: BREITE - 16, abstand: 8 })
  }
  platz(30)
  page.drawText(SCHUFA_HINWEIS.titel, { x: ML + 16, y, size: 9, font: med, color: INK })
  y -= 13
  for (const a of SCHUFA_HINWEIS.absaetze) absatz(a, { x: ML + 16, breite: BREITE - 16, size: 7, abstand: 5 })

  // Unterschrift
  platz(120)
  y -= 10
  const sigH = 62
  const sigB = 230
  if (sig) {
    const s = Math.min(sigB / sig.width, sigH / sig.height)
    page.drawImage(sig, { x: ML, y: y - sigH + (sigH - sig.height * s) / 2, width: sig.width * s, height: sig.height * s })
  }
  y -= sigH + 4
  page.drawLine({ start: { x: ML, y }, end: { x: ML + sigB, y }, thickness: 0.7, color: INK })
  const ortZeile = [rein(d.ort), heute].filter(Boolean).join(', ')
  page.drawLine({ start: { x: ML + sigB + 30, y }, end: { x: ML + BREITE, y }, thickness: 0.7, color: INK })
  page.drawText(ortZeile, { x: ML + sigB + 30, y: y + 6, size: 10, font: reg, color: INK })
  y -= 11
  page.drawText(`Unterschrift ${name}`.trim(), { x: ML, y, size: 7.2, font: reg, color: SOFT })
  page.drawText('Ort, Datum', { x: ML + sigB + 30, y, size: 7.2, font: reg, color: SOFT })
  y -= 14
  absatz(`Elektronisch unterschrieben (Unterschrift per Finger oder Maus) und online übermittelt am ${zeit} Uhr. Einwilligungstexte Stand ${TEXTE_STAND}.`, { size: 6.8, color: MUTE })

  if (dateien.length) {
    y -= 6
    unterTitel('Beigefügte Unterlagen')
    absatz(dateien.map((f) => `${f.art ? f.art + ': ' : ''}${f.name}`).join('\n'), { size: 8, color: INK })
  }

  // Fußzeile auf allen Seiten
  const seiten = pdf.getPages()
  seiten.forEach((p, i) => {
    p.drawText('PRIVÉ ist eine Marke der Platin RE GmbH · info@priveleasing.de · 089 41616310 · www.priveleasing.de', { x: ML, y: 32, size: 6.6, font: reg, color: MUTE })
    const t = `Seite ${i + 1} von ${seiten.length}`
    p.drawText(t, { x: W - MR - reg.widthOfTextAtSize(t, 6.6), y: 32, size: 6.6, font: reg, color: MUTE })
  })

  pdf.setTitle(`Selbstauskunft ${name}`.trim())
  pdf.setAuthor('PRIVÉ')
  pdf.setCreator('priveleasing.de')
  return Buffer.from(await pdf.save())
}
