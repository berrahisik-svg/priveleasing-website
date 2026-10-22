/* Empfang der Formulare.
   Die Formulare werden als normales Browser-Absenden (POST) an FormSubmit
   geschickt — kein fetch, kein AJAX. Grund: FormSubmit schaltet die
   Empfängeradresse nur bei einem normalen POST frei; über AJAX kommt die
   Freischaltungsmail nie an, und jede Anfrage scheitert still.
   Beim allerersten Absenden schickt FormSubmit eine Mail "Activate form" an
   FORM_TO. Den Link darin anklicken, danach kommen alle Anfragen an. */

export const FORM_TO = 'info@priveleasing.de'

/* Kopie an das Trello-Board (leer lassen = keine Kopie). Trello legt aus
   jeder Mail eine Karte an; der Betreff wird der Kartentitel. */
export const FORM_CC = 'volkanertas+dr7czgqw2vp8dc6cjxgy@boards.trello.com'

export const FORM_ACTION = '/api/anfrage' /* eigener Endpunkt auf Vercel, siehe api/anfrage.js */

/* Absolute Adresse der Seite, für _next (Rücksprung nach dem Absenden). */
export const SITE_URL = 'https://www.priveleasing.de'

/** Öffentliche Kontaktdaten, an einer Stelle gepflegt. */
export const PHONE_DISPLAY = '089 41616310'
export const PHONE_TEL = '+498941616310'
export const MAIL = 'info@priveleasing.de'
export const WHATSAPP_URL = 'https://wa.me/498941616310'
