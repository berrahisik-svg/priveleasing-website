/**
 * KI-Schicht: eingehende Mails einordnen, Angaben herausziehen, Antwort formulieren.
 * Antworten laufen immer durch feste Leitplanken: keine Zusagen, keine Konditionen, keine Raten.
 */
const KEY = process.env.ANTHROPIC_API_KEY
const MODELL = process.env.KI_MODELL || 'claude-sonnet-5-5'

async function claude(system, user, maxTokens = 1200) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODELL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error('KI: ' + JSON.stringify(d.error || d).slice(0, 300))
  return d.content?.map((c) => c.text || '').join('') || ''
}

function json(text) {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('KI: kein JSON in Antwort')
  return JSON.parse(m[0])
}

export const PRIVE_KONTEXT = `PRIVÉ (priveleasing.de) ist ein Vermittler für Leasing, Finanzierung und Mietkauf ausgewählter Luxusgüter:
Fahrzeuge (Sport- und Luxuswagen, meist ab 150.000 € netto), Yachten und Boote, Aviation, Luxury Toys (Jetski, Quad u. ä.) und Uhren.
PRIVÉ ist eine Marke der Lead Lab Consulting FZCO, Dubai. Ansprechpartner: Volkan Ertas (Geschäftsführer). Telefon 089 41616310, info@priveleasing.de.
Ablauf: Anfrage → Kundenunterlagen und Selbstauskunft (PDF, 4 Seiten) → Prüfung über Leasing- und Finanzierungspartner → persönliches Angebot. Rückmeldung innerhalb von 48 Stunden an Werktagen.
Es gibt keine Standardkonditionen: Laufzeit, Anzahlung, Restwert und Rate werden je Objekt und Bonität individuell strukturiert. Bei schwächerer Bonität ggf. mit Kaution oder höherer Anzahlung.
WICHTIG: PRIVÉ arbeitet ausschließlich mit Unternehmen, Selbstständigen und Freiberuflern (gewerbliche Kunden). Privatpersonen können nicht bedient werden.
Leasing: Objekt bleibt beim Leasinggeber, Rate meist Betriebsausgabe, Rückgabe oder Kauf am Ende. Finanzierung: Objekt gehört dem Kunden, steht in der Bilanz. Mietkauf: Eigentum geht mit letzter Rate über.`

const LEITPLANKEN = `Regeln für jede Antwort:
- Deutsch, Sie-Form, kurz, klar, höflich, hochwertig. Keine Floskeln, keine Emojis, keine Ausrufezeichen.
- Niemals Raten, Zinsen, Konditionen, Zusagen oder Ablehnungen nennen oder andeuten. Keine Rechtsberatung, keine Steuerberatung.
- Keine Angaben erfinden. Was unbekannt ist, offen lassen oder nachfragen.
- Anrede: „Guten Tag Herr/Frau Nachname," wenn Geschlecht sicher erkennbar, sonst „Guten Tag Vorname Nachname," oder „Guten Tag,".
- Schluss genau so, als letzte Zeile: "Mit besten Grüßen" – OHNE Namen, Firma oder Kontaktdaten darunter (die Signatur wird automatisch angehängt).
- Keine Markdown-Formatierung, keine Listen mit Sternchen. Absätze durch Leerzeilen.`

/**
 * Eingehende Mail einordnen.
 * Gibt { art, angaben, zusammenfassung, titel } zurück.
 * art: anfrage | rueckfrage | unterlagen | spam | sonstiges
 */
export async function einordnen({ from, fromName, subject, body, attachments = [] }) {
  const system = `${PRIVE_KONTEXT}\n\nDu sortierst eingehende E-Mails am Postfach info@priveleasing.de. Antworte ausschließlich mit einem JSON-Objekt.`
  const user = `Absender: ${fromName} <${from}>
Betreff: ${subject}
Anhänge: ${attachments.map((a) => a.name).join(', ') || 'keine'}

Mailtext:
"""
${body.slice(0, 6000)}
"""

Ordne ein und ziehe Angaben heraus. JSON-Schema:
{
 "art": "anfrage" | "rueckfrage" | "unterlagen" | "spam" | "sonstiges",
 "titel": "kurzer Kartentitel, max 60 Zeichen, Muster: Name · Objekt · Leasing/Finanzierung/offen",
 "zusammenfassung": "2-3 Sätze, was der Absender will",
 "angaben": {
   "name": "", "firma": "", "telefon": "", "email": "", "objekt": "", "preis_netto": "", "link": "", "verkaeufer": "",
   "art_wunsch": "leasing" | "finanzierung" | "mietkauf" | "offen",
   "gewerblich": true | false | null  (true = Unternehmen/Selbstständig/Freiberufler oder Firmenname/Firmenmail/„GmbH“/„Dienstwagen“/„Betrieb“; false = erkennbar Privatperson, z. B. „privat“, „für mich persönlich“, Angestellter ohne Firma; null = unklar),
   "laufzeit": "24" | "36" | "48" | "60" | "",
   "anzahlung": "", "termin": "", "nutzung": "gewerblich" | "privat" | "gemischt" | ""
 },
 "label": "Fahrzeuge" | "Yachten" | "Aviation" | "Toys" | "Uhren" | "Allgemein"
}
Regeln: "anfrage" = jemand will ein Objekt leasen/finanzieren/kaufen oder fragt nach Möglichkeiten dafür. "rueckfrage" = Kunde oder Interessent fragt zu einer laufenden Anfrage oder stellt eine allgemeine Frage ohne konkretes Objekt. "unterlagen" = schickt Dokumente oder das ausgefüllte Formular zurück. "spam" = nur Werbung, Newsletter, Phishing und reine Systemmails (Formular-Dienste, Hosting-Hinweise, Zustellfehler). "sonstiges" = alles, was ein Mensch sehen muss, aber keine Kundenanfrage ist: Dienstleister, Terminbestätigungen, Rechnungen, Partner, Presse, Behörden. Im Zweifel "sonstiges", nie "spam". Felder leer lassen, wenn nicht genannt.`
  const out = await claude(system, user, 900)
  return json(out)
}

/** Antwort auf eine neue Anfrage (mit Hinweis auf das beiliegende Formular). */
export async function antwortAnfrage({ fromName, subject, body, angaben }) {
  const system = `${PRIVE_KONTEXT}\n\n${LEITPLANKEN}\n\nDu schreibst im Namen von Volkan Ertas die erste Antwort auf eine Anfrage. Länge: 90 bis 160 Wörter.`
  const user = `Anfrage von ${fromName}:
Betreff: ${subject}
"""
${body.slice(0, 4000)}
"""
Erkannte Angaben: ${JSON.stringify(angaben)}

Schreibe die Antwort. Aufbau:
1. Dank für die Anfrage, das Objekt in einem Satz aufgreifen (wenn erkennbar).
2. Nächster Schritt: Im Anhang liegt unser Dokument „Kundenunterlagen und Selbstauskunft“, bereits mit den bekannten Angaben vorausgefüllt. Bitte die Selbstauskunft (Seiten 2 bis 4) ausfüllen, unterschreiben und die auf Seite 1 genannten Unterlagen als PDF beilegen.
3. Was dann passiert: Prüfung über unsere Partner, persönliches Angebot, Rückmeldung innerhalb von 48 Stunden nach Eingang der Unterlagen. Für Rückfragen telefonisch erreichbar.
4. Grußformel „Mit besten Grüßen“ (ohne Namen darunter).
Nur den Mailtext ausgeben, keinen Betreff.`
  return (await claude(system, user, 700)).trim()
}

/** Kurze Eingangsbestätigung, wenn Unterlagen oder das Formular zurückkommen. */
export async function antwortUnterlagen({ fromName, attachments = [] }) {
  const system = `${PRIVE_KONTEXT}\n\n${LEITPLANKEN}\n\nDu bestätigst im Namen von Volkan Ertas den Eingang von Unterlagen – herzlich, persönlich und wertschätzend, ohne übertrieben zu wirken. Länge: 60 bis 100 Wörter.`
  const user = `Absender: ${fromName}. Eingegangene Dateien: ${attachments.map((a) => a.name).join(', ') || 'siehe Mail'}.
Inhalt: Herzlicher Dank für das Vertrauen und die zugesandten Unterlagen; der Eingang ist bestätigt; die Unterlagen werden jetzt sorgfältig geprüft; Rückmeldung in kürzester Zeit, spätestens innerhalb von 48 Stunden an Werktagen; falls noch etwas fehlen sollte, kommen wir gezielt darauf zu; bei Fragen jederzeit telefonisch erreichbar. Grußformel „Mit besten Grüßen“ ohne Namen darunter. Nur den Mailtext.`
  return (await claude(system, user, 400)).trim()
}

/** Antwort auf eine allgemeine Rückfrage, streng innerhalb der Leitplanken. */
export async function antwortRueckfrage({ fromName, subject, body }) {
  const system = `${PRIVE_KONTEXT}\n\n${LEITPLANKEN}\n\nDu beantwortest im Namen von Volkan Ertas eine Rückfrage. Beantworte nur, was sich aus dem PRIVÉ-Kontext sicher beantworten lässt (Ablauf, Unterlagen, Unterschied Leasing/Finanzierung/Mietkauf, Objektarten). Alles andere: freundlich ankündigen, dass Volkan Ertas sich persönlich meldet. Länge: 60 bis 140 Wörter.`
  const user = `Von ${fromName}, Betreff: ${subject}
"""
${body.slice(0, 4000)}
"""
Nur den Mailtext ausgeben.`
  return (await claude(system, user, 600)).trim()
}

/** Text → einfache HTML-Mail (Absätze), ohne Styles, die Mailclients verwerfen. */
export function alsHtml(text) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#16181b;">' +
    text
      .split(/\n{2,}/)
      .map((p) => '<p style="margin:0 0 14px 0;">' + esc(p).replace(/\n/g, '<br>') + '</p>')
      .join('') +
    '</div>'
  )
}

/** Freundliche Absage an Privatpersonen (fester Text, keine KI nötig). */
export function absagePrivat({ name = '', en = false } = {}) {
  const anrede = name ? ` ${name}` : ''
  if (en)
    return `Dear${anrede},

thank you very much for your enquiry and your interest in PRIVÉ.

PRIVÉ works exclusively with companies, the self-employed and freelancers; we are unfortunately unable to arrange leasing or financing for private individuals. Should your request be made on behalf of a company or a self-employed activity, simply reply to this email with the company name and we will be glad to take care of it.

Kind regards`
  return `Guten Tag${anrede},

vielen Dank für Ihre Anfrage und Ihr Interesse an PRIVÉ.

PRIVÉ arbeitet ausschließlich mit Unternehmen, Selbstständigen und Freiberuflern. Leasing oder Finanzierung für Privatpersonen können wir leider nicht vermitteln. Sollte Ihre Anfrage für ein Unternehmen oder eine selbstständige Tätigkeit gedacht sein, antworten Sie einfach auf diese E-Mail mit dem Firmennamen – dann kümmern wir uns gerne darum.

Mit besten Grüßen`
}
