/**
 * E-Mail-Signatur Volkan Ertas (identisch mit der Outlook-Signatur).
 * Bilder liegen auf der Website unter /img/signatur/.
 */
import { alsHtml } from './ki.js'

const SITE = process.env.SITE_URL || 'https://www.priveleasing.de'
const F = "font-family:'Mona Sans','Mona Sans Variable',Arial,Helvetica,sans-serif;"

export const SIGNATUR_HTML = `
<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:6px;${F}color:#16181b;">
  <tr><td style="padding:0 0 14px 0;"><img src="${SITE}/img/signatur/prive-logo-signatur.png" width="183" height="54" alt="PRIVÉ" style="display:block;border:0;width:183px;height:54px;"></td></tr>
  <tr><td style="padding:0;${F}font-weight:500;font-size:19px;line-height:24px;letter-spacing:-0.01em;color:#16181b;">Volkan Ertas</td></tr>
  <tr><td style="padding:2px 0 12px 0;${F}font-size:12px;line-height:18px;color:#6b6f76;letter-spacing:0.04em;">Geschäftsführer<br>PRIVÉ Luxury Leasing</td></tr>
  <tr><td style="padding:0;${F}font-size:13px;line-height:20px;color:#16181b;">
    <a href="tel:+498941616310" style="color:#16181b;text-decoration:none;">089 41616310</a><br>
    <a href="mailto:info@priveleasing.de" style="color:#16181b;text-decoration:none;">info@priveleasing.de</a><br>
    <a href="${SITE}" style="color:#16181b;text-decoration:none;">www.priveleasing.de</a>
  </td></tr>
  <tr><td style="padding:16px 0 0 0;"><a href="${SITE}" style="text-decoration:none;border:0;"><img src="${SITE}/img/signatur/prive-banner-signatur.png" width="480" height="170" alt="PRIVÉ – Luxury Leasing" style="display:block;border:0;width:480px;height:170px;max-width:100%;"></a></td></tr>
  <tr><td style="padding:12px 0 0 0;${F}font-size:11px;line-height:16px;color:#9a9ea5;">Leasing, Finanzierung und Beschaffung ausgewählter Luxusgüter.<br>PRIVÉ ist eine Marke der Lead Lab Consulting FZCO, Dubai, Vereinigte Arabische Emirate.</td></tr>
</table>`

/** Entfernt eine evtl. von der KI geschriebene Namens-/Firmenzeile nach der Grußformel, damit nichts doppelt steht. */
export function ohneNamensblock(text) {
  return text
    .replace(/\n+(Volkan Ertas|PRIVÉ Luxury Leasing|PRIVÉ|089 41616310[^\n]*|info@priveleasing\.de[^\n]*|Geschäftsführer)\s*$/gim, '')
    .replace(/\n+(Volkan Ertas|PRIVÉ Luxury Leasing|PRIVÉ|089 41616310[^\n]*|info@priveleasing\.de[^\n]*|Geschäftsführer)\s*$/gim, '')
    .replace(/\n+(Volkan Ertas|PRIVÉ Luxury Leasing|PRIVÉ|089 41616310[^\n]*|info@priveleasing\.de[^\n]*|Geschäftsführer)\s*$/gim, '')
    .trimEnd()
}

/** Mailtext (Klartext mit Absätzen) → HTML mit Signatur. */
export function mitSignatur(text) {
  const html = alsHtml(ohneNamensblock(text))
  return html.replace(/<\/div>\s*$/, SIGNATUR_HTML + '</div>')
}
