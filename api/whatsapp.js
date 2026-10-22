/**
 * WhatsApp-Agent (Meta WhatsApp Cloud API).
 * GET  /api/whatsapp  – Webhook-Verifizierung durch Meta (hub.verify_token = WA_VERIFY_TOKEN)
 * POST /api/whatsapp  – eingehende Nachrichten: KI-Antwort innerhalb der Leitplanken,
 *                       bei erkennbarer Anfrage zusätzlich Trello-Karte + Formular per E-Mail (wenn Mailadresse genannt).
 *
 * Nötige Variablen: WA_TOKEN (System-User-Token), WA_PHONE_ID (Phone Number ID), WA_VERIFY_TOKEN (frei wählbar),
 * optional UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN für Gesprächsgedächtnis (sonst nur letzte Nachricht).
 */
import { PRIVE_KONTEXT, einordnen } from '../server/ki.js'
import { karteAnlegen, beschreibung } from '../server/trello.js'
import { sendMail } from '../server/ews.js'
import { formularAusfuellen } from '../server/formular.js'
import { mitSignatur } from '../server/signatur.js'

const TOKEN = process.env.WA_TOKEN
const PHONE_ID = process.env.WA_PHONE_ID
const VERIFY = process.env.WA_VERIFY_TOKEN
const KEY = process.env.ANTHROPIC_API_KEY
const MODELL = process.env.KI_MODELL || 'claude-sonnet-5-5'
const REDIS = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

const SYSTEM = `${PRIVE_KONTEXT}

Du bist der WhatsApp-Assistent von PRIVÉ, rund um die Uhr erreichbar. Du schreibst wie ein aufmerksamer Mitarbeiter, nicht wie ein Bot.
Regeln:
- Deutsch, Sie-Form (Du nur, wenn der Kunde duzt). Kurz: 1 bis 4 Sätze pro Nachricht, keine Listen, keine Emojis, keine Ausrufezeichen.
- Niemals Raten, Zinsen, Konditionen, Zusagen oder Ablehnungen nennen. Keine Rechts- oder Steuerberatung.
- Ziel: verstehen, worum es geht (Objekt, ungefährer Preis, privat oder gewerblich, Leasing/Finanzierung/offen, Zeitpunkt) – aber immer nur EINE Frage pro Nachricht.
- Sobald Objekt und privat/gewerblich bekannt sind: um die E-Mail-Adresse bitten, damit wir das Anfrageformular (bereits vorausgefüllt) zuschicken können, und sagen, dass Volkan Ertas sich innerhalb von 48 Stunden an Werktagen persönlich meldet.
- Bei Fragen, die über den PRIVÉ-Kontext hinausgehen: ehrlich sagen, dass Volkan Ertas das persönlich beantwortet, und Telefonnummer 089 41616310 nennen.
- Nie behaupten, ein Mensch zu sein. Wenn gefragt: „Ich bin der digitale Assistent von PRIVÉ, Volkan Ertas übernimmt persönlich.“`

async function redis(cmd) {
  if (!REDIS) return null
  const r = await fetch(REDIS, { method: 'POST', headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(cmd) })
  return (await r.json()).result
}

async function verlauf(nr) {
  const v = await redis(['GET', `wa:${nr}`])
  return v ? JSON.parse(v) : []
}
async function merken(nr, msgs) {
  await redis(['SET', `wa:${nr}`, JSON.stringify(msgs.slice(-12)), 'EX', 60 * 60 * 24 * 7])
}

async function antwort(messages) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODELL, max_tokens: 300, system: SYSTEM, messages }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error('KI: ' + JSON.stringify(d.error || d).slice(0, 200))
  return d.content?.map((c) => c.text || '').join('').trim()
}

async function senden(to, text) {
  const r = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  })
  if (!r.ok) console.error('WA senden', await r.text())
}

async function lesen(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const c of req) chunks.push(c)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const q = req.query || {}
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === VERIFY) return res.status(200).send(q['hub.challenge'])
    return res.status(403).send('verify token falsch')
  }
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  const body = await lesen(req)
  // Meta erwartet sofort 200; die Arbeit passiert danach, aber innerhalb der Funktion.
  const msgs = body?.entry?.flatMap((e) => e.changes || []).flatMap((c) => c.value?.messages || []) || []
  const kontakte = body?.entry?.flatMap((e) => e.changes || []).flatMap((c) => c.value?.contacts || []) || []
  for (const m of msgs) {
    if (m.type !== 'text') {
      await senden(m.from, 'Danke, die Datei ist angekommen. Bitte schicken Sie Unterlagen und Dokumente zusätzlich per E-Mail an info@priveleasing.de, dann prüfen wir alles gesammelt.')
      continue
    }
    const name = kontakte.find((k) => k.wa_id === m.from)?.profile?.name || ''
    try {
      const alt = await verlauf(m.from)
      const messages = [...alt, { role: 'user', content: m.text.body }]
      const a = await antwort(messages)
      await senden(m.from, a)
      await merken(m.from, [...messages, { role: 'assistant', content: a }])

      // Wenn das Gespräch eine Anfrage mit Kontaktdaten ergibt: Karte + Formular
      const gespraech = messages.map((x) => (x.role === 'user' ? 'Kunde: ' : 'PRIVÉ: ') + x.content).join('\n')
      const mailTreffer = m.text.body.match(/[\w.+-]+@[\w-]+\.[\w.]+/)
      if (mailTreffer) {
        const e = await einordnen({ from: mailTreffer[0], fromName: name, subject: 'WhatsApp-Anfrage', body: gespraech, attachments: [] })
        const ang = { ...(e.angaben || {}), telefon: '+' + m.from, email: mailTreffer[0], name: e.angaben?.name || name }
        let pdf = null
        try {
          pdf = await formularAusfuellen({ ...ang, checks: ang.gewerblich === true ? ['cb_unternehmen'] : ang.gewerblich === false ? ['cb_privat'] : [] })
        } catch {}
        const datei = pdf ? [{ name: 'PRIVE-Kundenunterlagen-und-Selbstauskunft.pdf', contentType: 'application/pdf', content: pdf }] : []
        await karteAnlegen({
          titel: e.titel || `${ang.name || m.from} · WhatsApp`,
          label: e.label || 'Allgemein',
          beschreibung: beschreibung({ quelle: 'WhatsApp', angaben: ang, zusammenfassung: e.zusammenfassung, von: `${name} (+${m.from})`, extra: 'Gesprächsverlauf:\n' + gespraech }),
          dateien: datei,
        })
        await sendMail({
          to: [mailTreffer[0]],
          subject: 'Ihre Anfrage bei PRIVÉ – Anfrageformular',
          html: mitSignatur(`Guten Tag${ang.name ? ' ' + ang.name : ''},\n\nwie per WhatsApp besprochen, anbei unser Dokument „Kundenunterlagen und Selbstauskunft“, bereits mit Ihren Angaben vorbelegt. Bitte füllen Sie die Selbstauskunft aus und legen Sie die auf Seite 1 genannten Unterlagen als PDF bei.\n\nVolkan Ertas meldet sich innerhalb von 48 Stunden an Werktagen persönlich bei Ihnen.\n\nMit besten Grüßen`),
          files: datei,
        })
      }
    } catch (err) {
      console.error('WhatsApp', err)
      await senden(m.from, 'Vielen Dank für Ihre Nachricht. Volkan Ertas meldet sich persönlich bei Ihnen, telefonisch erreichen Sie uns unter 089 41616310.')
    }
  }
  res.status(200).send('ok')
}
