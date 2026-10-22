/**
 * Kundenunterlagen + Selbstauskunft (PDF mit Feldern) mit den Angaben einer Anfrage vorausfüllen.
 * Feldnamen siehe server/vorlagen/anfrageformular.pdf (gebaut aus dem Formular-Skript).
 */
import { PDFDocument } from 'pdf-lib'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const VORLAGE = path.join(process.cwd(), 'server', 'vorlagen', 'anfrageformular.pdf')

// Felder der Vorlage „Kundenunterlagen und Selbstauskunft“ (4 Seiten)
const TEXT = ['name', 'telefon', 'email', 'objekt', 'laufzeit', 'anzahlung', 'anzahlung_prozent', 'sa_name', 'sa_geb', 'sa_beruf', 'sa_anschrift', 'sa_tel']
const CHECK = ['cb_leasing', 'cb_finanzierung', 'cb_vers_ja', 'cb_vers_nein', 'cb_u1', 'cb_u2', 'cb_u3', 'cb_u4', 'cb_u5', 'cb_u6', 'cb_u7', 'cb_u8']

/** Angaben aus Anfrage/KI auf die Vorlagenfelder abbilden. */
function abbilden(d) {
  const out = { ...d }
  // „Firma / Kunde“: Firma, sonst Name; Selbstauskunft immer mit Personenname
  out.name = d.firma ? (d.name ? `${d.firma} (${d.name})` : d.firma) : d.name
  out.sa_name = d.sa_name || d.name
  out.sa_tel = d.sa_tel || d.telefon
  out.sa_geb = d.sa_geb || d.geburtsdatum
  out.sa_beruf = d.sa_beruf || d.beruf
  if (!out.sa_anschrift && (d.strasse || d.plz || d.ort)) out.sa_anschrift = [d.strasse, [d.plz, d.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  if (!out.objekt && d.preis_netto) out.objekt = `Kaufpreis ca. ${d.preis_netto}`
  else if (out.objekt && d.preis_netto && !String(out.objekt).includes(String(d.preis_netto))) out.objekt = `${out.objekt} · ca. ${d.preis_netto}`
  const checks = new Set(d.checks || [])
  const lz = [...checks].find((c) => c.startsWith('cb_lz_'))
  if (!out.laufzeit && lz) out.laufzeit = lz.replace('cb_lz_', '')
  if (!out.laufzeit && d.laufzeit) out.laufzeit = String(d.laufzeit)
  out.checks = [...checks].filter((c) => CHECK.includes(c))
  return out
}

/**
 * daten: { name, firma, telefon, email, objekt, preis_netto, link, verkaeufer, ort, ... , checks: ['cb_leasing', ...] }
 * Gibt den PDF-Buffer zurück.
 */
export async function formularAusfuellen(roh = {}) {
  const daten = abbilden(roh)
  const pdf = await PDFDocument.load(await readFile(VORLAGE))
  const form = pdf.getForm()
  for (const k of TEXT) {
    const v = daten[k]
    if (v == null || v === '') continue
    try {
      form.getTextField(k).setText(String(v).slice(0, 120))
    } catch {}
  }
  for (const k of daten.checks || []) {
    if (!CHECK.includes(k)) continue
    try {
      form.getCheckBox(k).check()
    } catch {}
  }
  // Erscheinungsbild neu zeichnen, damit alle Viewer die Werte zeigen; Felder bleiben editierbar.
  form.updateFieldAppearances()
  return Buffer.from(await pdf.save())
}

/**
 * Website-Anfrage (Felder des Formulars auf priveleasing.de) → PDF-Daten.
 * Erkennt grob, ob gewerblich (Firma/GmbH/Firmenmail) und welche Objektart.
 */
export function ausAnfrage(f = {}) {
  const text = [f.suche, f.name, f.verkaeufer].filter(Boolean).join(' ')
  const frei = /@(gmail|googlemail|web\.de|gmx|icloud|outlook|hotmail|live|yahoo|t-online|freenet|posteo|me\.com|aol)/i.test(f.email || '')
  const gewerblich = f.kundenart ? f.kundenart !== 'Privatperson' : /gmbh|\bag\b|\bkg\b|\bug\b|holding|gewerb|firma|unternehmen|betrieb|bilanz|dienstwagen/i.test(text) || (!!f.email && !frei)
  const checks = []
  if (gewerblich) checks.push('cb_unternehmen')
  if (f.objektart === 'Fahrzeug' || /\b(auto|fahrzeug|porsche|ferrari|lamborghini|mercedes|amg|bmw|audi|bentley|rolls|aston|mclaren|urus|g ?63)\b/i.test(text)) {
    // Fahrzeug: Suche gewünscht, wenn kein konkretes Objekt
    if (!f.kaufpreis && !f.link) checks.push('cb_suche')
  }
  if (f.kaufpreis || f.link) checks.push('cb_gebraucht')
  return {
    name: f.name,
    firma: f.firma,
    telefon: f.telefon,
    email: f.email,
    objekt: f.objektart && f.objektart !== 'Fahrzeug' ? `${f.objektart}: ${(f.suche || '').slice(0, 80)}` : (f.suche || '').slice(0, 100),
    preis_netto: f.kaufpreis,
    link: f.link,
    verkaeufer: f.verkaeufer,
    ort: f.land && !/deutschland|germany|^de$/i.test(f.land) ? f.land : undefined,
    anzahlung: f.budget && /anzahl/i.test(f.budget) ? f.budget : undefined,
    termin: f.zeitraum,
    checks,
  }
}
