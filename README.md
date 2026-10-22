# PRIVÉ · Website

Neubau der PRIVÉ-Website (Leasing, Finanzierung und Beschaffung ausgewählter Luxusgüter) in React.

## Stack

- Vite 8, React 19, TypeScript
- React Router (DE unter `/`, EN unter `/en`)
- Motion (Animationen), Lenis (Smooth Scroll)
- CSS Modules mit Design-Tokens in `src/styles/tokens.css` (OKLCH)
- Mona Sans (variabel, Breiten- und Gewichtsachse), selbst gehostet unter `public/fonts`
- Jede Route wird beim Build als statisches HTML vorgerendert (`scripts/prerender.mjs`)

## Befehle

```bash
npm install
npm run dev       # Entwicklung auf http://localhost:5173
npm run build     # Produktions-Build inkl. Prerendering nach dist/
npm run preview   # Build lokal ansehen
```

## Formulare

Die vier Formulare (Anfrage, Objekt einreichen, Private Sourcing, Kurzanfrage auf der Startseite)
prüfen im Browser Pflichtfelder, E-Mail-Format, Telefon oder E-Mail, Datenschutz-Einwilligung und
Honeypot `_honey`. Geht alles durch, schickt der **Browser selbst** das Formular als normalen POST an
FormSubmit — kein fetch, kein AJAX. Danach landet man auf `/danke` bzw. `/en/thank-you`.

Empfänger und Kopie stehen in `src/content/form.ts`:

| Konstante | Wirkung |
| --- | --- |
| `FORM_TO` | Empfänger (`info@priveleasing.de`) |
| `FORM_CC` | Kopie an das Trello-Board (leer lassen = keine Kopie) |
| `SITE_URL` | Absolute Adresse für die Rücksprungseite |

**Freischaltung, einmalig:** Beim allerersten Absenden schickt FormSubmit eine Mail „Activate form" an
`info@priveleasing.de` (auch im Spam nachsehen). Den Link anklicken, ab dann kommen alle Anfragen an.
Diese Mail wird nur bei einem normalen Browser-POST ausgelöst — deshalb nicht auf AJAX umbauen.

Der Betreff wird beim Absenden zusammengesetzt: `Formularname · Objekt oder Suchtext · Name`.
In Trello wird das der Kartentitel. Die Board-Adresse steht im Quelltext und ist öffentlich lesbar;
taucht Spam auf, in Trello eine neue Adresse erzeugen und in `form.ts` eintragen.

`?objekt=Fahrzeug` (bzw. `Yacht oder Boot`, `Aviation`, `Luxury Toy`, `Uhr`, `Sonstiges`) belegt die Objektart vor.

## Inhalte

Alle Texte liegen in `src/content/de.ts` und `src/content/en.ts`, Routen in `src/content/routes.ts`.
Bilder werden aus `public/img` in AVIF, WebP und JPEG in mehreren Breiten ausgeliefert (`src/imageManifest.json`).

## Deployment (Vercel)

`vercel.json` ist vorbereitet: saubere URLs, Umleitung `priveleasing.de → www.priveleasing.de`,
Weiterleitungen der alten `.html`-Adressen, Cache- und Sicherheits-Header.

Der Build schreibt zusätzlich `sitemap.xml`, `robots.txt`, JSON-LD (Organization, WebSite, WebPage,
BreadcrumbList, Service), absolute Canonical- und Open-Graph-Adressen. Basis ist `https://www.priveleasing.de`;
abweichend beim Build `SITE_URL=https://…` setzen. Die Dankeseiten stehen auf `noindex` und fehlen in der Sitemap.

Vercel: Projekt aus diesem Ordner anlegen (Framework „Vite"), Build-Befehl und Ausgabeordner kommen aus `vercel.json`.

## Meta-Pixel und Cookie-Banner

- Pixel-ID steht in `src/lib/pixel.ts` (`PIXEL_ID`). Geladen wird der Pixel **nur** nach Klick auf „Akzeptieren“ im Banner (`src/components/Consent.tsx`); die Entscheidung liegt in `localStorage` unter `prive:consent`.
- Events: `PageView` beim Laden und bei jedem Routenwechsel, `Lead` auf `/danke` bzw. `/en/thank-you` (dorthin leitet FormSubmit nach dem Absenden).
- „Cookie-Einstellungen“ im Footer öffnet das Banner erneut.
- Datenschutz, Abschnitt 5, beschreibt den Pixel (DE und EN).

## Automatisierung (api/)

Drei Serverfunktionen laufen auf Vercel neben der statischen Seite:

| Datei | Aufgabe |
|---|---|
| `api/anfrage.js` | Nimmt die Website-Formulare entgegen (ersetzt FormSubmit). Legt eine Trello-Karte an (Angaben, Anhänge, vorausgefülltes Anfrageformular), schickt dem Interessenten eine persönliche Antwort mit dem PDF und eine Kopie an info@. |
| `api/postfach.js` | Liest ungelesene Mails in info@priveleasing.de, ordnet sie per KI ein (Anfrage / Unterlagen / Rückfrage / Sonstiges / Spam), antwortet innerhalb fester Leitplanken, legt Trello-Karten an und räumt in Unterordner. Aufruf: `GET /api/postfach?key=CRON_KEY` (alle 5 Min. von cron-job.org o. ä.; `&trocken=1` = nur einordnen, nichts tun). |
| `api/whatsapp.js` | WhatsApp-Assistent über die Meta Cloud API (Webhook). Antwortet rund um die Uhr, sammelt Eckdaten, schickt nach Nennung der Mailadresse das vorausgefüllte Formular und legt eine Trello-Karte an. |

Bausteine in `server/`: `ews.js` (IONOS Exchange per EWS/NTLM), `ntlm-http.js`, `ki.js` (Einordnung und Texte, Modell per `KI_MODELL`), `formular.js` (PDF-Felder füllen, Vorlage `server/vorlagen/anfrageformular.pdf`), `trello.js` (Karten per Board-Mail oder API), `lokal.js` (lokaler Testserver auf :8102).

Umgebungsvariablen: siehe `.env.example`. In Vercel unter Project → Settings → Environment Variables eintragen; nie ins Repo.

Lokal testen: `.env` anlegen, `npm run lokal`, dann z. B. `curl "http://localhost:8102/api/postfach?key=…&trocken=1"`.
