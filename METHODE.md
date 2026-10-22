# Wie diese Website gebaut ist — Vorgehen, Techniken, Animationen

Notizen zur Arbeitsweise des Webdesigners, abgelesen aus dem Quellcode. Gedacht als
Vorlage, um Seiten in dieser Qualität nachzubauen.

## 1. Stack und Architektur

| Baustein | Was | Warum |
| --- | --- | --- |
| Vite 8 + React 19 + TypeScript | App-Gerüst | Schneller Build, Typen für Inhalte und Routen |
| React Router 7 | DE unter `/`, EN unter `/en` | Zwei Sprachen, eine Komponente pro Seite |
| Motion (`motion/react`) | Alle Animationen | `useScroll`, `useTransform`, `animate`, `AnimatePresence`, SVG `pathLength` |
| Lenis | Smooth Scroll (`lerp 0.085`, `wheelMultiplier 0.9`) | Läuft im Motion-Frame-Takt (`frame.update`), damit Scroll und Animation nie auseinanderlaufen |
| CSS Modules + Design-Tokens | Styles | Keine Utility-Klassen, jede Komponente hat ihre `.module.css` |
| Prerender-Skript | Jede Route wird beim Build als statisches HTML geschrieben (`renderToString` + `StaticRouter`) | SEO ohne Server, erster Paint ohne JS, Client hydriert nur |

Ordnung: `components/` (Header, Menu, Footer, Shell, Intro, Lines, Picture, Cta, Brand),
`sections/` (Abschnitte der Startseite), `pages/`, `content/` (de.ts, en.ts, routes.ts, types.ts),
`lib/` (i18n, scroll, stage, range, meta, images, motion), `styles/` (tokens.css, base.css).

**Inhalte komplett getrennt vom Code.** Alle Texte liegen in `content/de.ts` und `content/en.ts`,
beide gegen denselben Typ `Dict` geprüft — eine fehlende Übersetzung ist ein Compile-Fehler.
Routen in `routes.ts` als Tabelle `{ key: { de, en } }`; daraus entstehen Links, hreflang,
Sprachwechsel (`useAlternate` findet die Gegenseite) und die Prerender-Liste.

## 2. Design-System (tokens.css)

- **Farben in OKLCH**, nie #000/#fff: Graphit `--ink oklch(0.165 0.006 255)` mit drei Stufen,
  Aluminium `--alu oklch(0.945 0.004 250)` mit drei Stufen, Textfarben `--on-ink`/`--on-alu`
  jeweils voll/soft/mute. Genau **ein Signal** (`--signal oklch(0.64 0.19 31)`, Orange-Rot wie ein
  Sekundenzeiger) für Hover, Fokus, Selection, aktiven Zustand.
- **Eine variable Schrift** (Mona Sans, selbst gehostet, Gewicht 200–900, Breite 75–125 %).
  Headlines leicht (280–380) und breit (125 %), Labels schmal-halbfett (112 %, 560, Versalien,
  Tracking 0.14em). Die Breitenachse wird animiert (siehe Lines).
- Größen mit `clamp()`: `--fs-mega` bis `--fs-micro`, Abstände `--space-1` bis `--space-6`,
  `--gutter`. Keine festen Pixel in Layouts.
- Easing-Kurven als Tokens, identisch in CSS und JS (`lib/motion.ts`):
  `out [0.22,1,0.36,1]`, `expo [0.16,1,0.3,1]`, `in [0.7,0,0.84,0]`, `inOut [0.65,0,0.35,1]`,
  `door [0.76,0,0.24,1]` („schwer anlaufend, weich auslaufend").
- **Filmkorn**: fixes Overlay mit SVG-`feTurbulence`, `opacity .07`, `mix-blend-mode: overlay`,
  `inset: -50%` — gibt dunklen Flächen Material.
- **Ein Formmotiv für alles**: der Bogen aus dem Signet (oben rund, unten gerade). Buttons
  (`border-radius: 999px 999px .45rem .45rem`), Bildrahmen, Menü-Vorhang, Seitenwechsel-Kuppel,
  Hero-Tür. Das Emblem ist als Pfadsammlung `EMBLEM` in `Brand.tsx` abgelegt — jeder Teil
  (Bogen, Grundlinie, Strahlen, Stern, Schlüsselbart) einzeln animierbar.
- Themen pro Abschnitt über `data-theme="ink|alu"`; die Kopfzeile liest per
  `document.elementsFromPoint()` aus, welche Fläche gerade unter ihr liegt, und wechselt Farbe.

## 3. Die Animationen im Einzelnen

### 3.1 Intro (erster Besuch pro Sitzung)
`Intro.tsx`. Inline-Skript im `<head>` setzt `html.is-intro`, wenn `sessionStorage` leer ist und
keine `prefers-reduced-motion`. Vollbild-SVG: Emblem zeichnet sich per `pathLength 0→1`
(gestaffelt: Grundlinie, Bogen, Strahlen je +45 ms, Stern dreht aus `rotate -90`, Schlüssel fällt
aus `y -46`). Der **Schlüsselbart dreht einmal** (`scaleX [1,-1,1]`, `transform-origin` in der
Schaftmitte). Dann wird das Bogeninnere zur Maske (`<mask>` mit schwarzem Pfad, `opacity 0→1`)
und Maske + Emblem skalieren auf `reach = Diagonale / (0.3·min(w,h)) · 2.2` — die Tür öffnet sich
und gibt die Seite frei. Sicherheitsnetz: nach 4 s ohne Mount wird `is-intro` entfernt.
Lenis ist währenddessen gestoppt, `body overflow: hidden`.

### 3.2 Seitenwechsel („Kuppel")
`Shell.tsx`. Statt Routen direkt zu tauschen, hält die Shell `shown` (gezeigte Location) getrennt
von `location`. Ablauf: alte Seite fährt `y -7vh, opacity .55`; eine fixe Fläche mit
`border-radius: 50vw 50vw 0 0` und `top: -50vw` (Halbkreis über volle Breite) fährt von `100%`
auf `0%` (`door`-Easing, 0.72 s). Währenddessen wird das **Hauptmotiv der Zielseite vorgeladen**
(`preload()`, wählt die AVIF-Breite ≥ Viewport·DPR). Dann Scroll nach oben, neue Seite tauschen,
Kuppel hinter die Seite legen (`z-index 0`), neue Seite wächst aus
`clip-path: inset(100vh 0 0 0 round 50vw 50vw 0 0)` + `y 14vh` auf voll (0.95 s expo).
Danach `clip-path: none`, Lenis wieder an, `#main` bekommt Fokus. Ein `StageCtx` („Bühne")
sagt den Seiten, wann ihr Auftritt beginnen darf — 260 ms nach dem Aufgehen oder nach dem Intro.

### 3.3 Zeilenweise Textenthüllung (`Lines`)
Text wird in Wörter zerlegt, jedes Wort in einem `overflow: clip`-Span. Nach dem Layout misst
ein `useLayoutEffect` per `offsetTop`, welche Wörter in derselben Zeile stehen, und setzt
`--l` (Zeilenindex). CSS: `transform: translate3d(0,115%,0)`, Übergang 1.15 s expo,
`transition-delay: calc(var(--d) + var(--l) * var(--st))` — alle Wörter einer Zeile steigen
gemeinsam, Zeile für Zeile. `ResizeObserver` + `document.fonts.ready` messen nach.
Option `unfold`: Wörter starten bei `font-stretch: 75%` und falten auf die Zielbreite auf
(1.6 s); ein unsichtbarer Geist in voller Breite hält den Platz. `|` im Text markiert einen
Trennpunkt, der nur auf schmalen Bildschirmen umbricht (mit Trennstrich).
Ohne JS (`html:not(.js)`) und bei reduced-motion steht der Text sofort.

### 3.4 Hero als Tür
`HomeHero.tsx`, 265 svh hoch, Bühne `sticky`. Das Bild sitzt in einem Bogen, dessen Geometrie
komplett in CSS liegt (`--aw`, `--ah`, `--gb`, `--ring`); JS liefert nur `--e` (0 = Tür, 1 =
Fläche) aus `scrollYProgress` mit kubischem In-Out. `clip-path: inset(… round …)` rechnet sich aus
`--k = 1 − --e`. Parallel: Bild `scale 1.12→1`, Headline hebt sich und blendet aus, Lead/CTAs
blenden früh aus, eine Schattierung dunkelt erst ab und hellt dann wieder auf, zum Schluss steigt
die nächste Überschrift von unten ein. Haarlinien-Rahmen und doppelte Grundlinie (wie im Emblem)
zeichnen sich nach dem Intro per `clip-path`/`scaleX`. Scroll-Hinweis: vertikal gesetztes Wort
plus 1-px-Linie, über die ein heller Balken fällt (`@keyframes fall`).

### 3.5 Fünf Welten (`Worlds`)
Abschnitt `N·95svh + 40svh` hoch, Bühne sticky. Fortschritt `u = progress · N`. Jede Welt `i`
hat `reveal(u,i)`; die Ebene wird als Bogen aufgedeckt
(`clip-path: inset(q·100% 0 0 0 round q·50vw q·50vw 0 0)`), die darunterliegende Welt hebt sich
`−8vh`, skaliert `1.08` und dunkelt ab, wenn die nächste kommt. Die erste Welt öffnet sich schon
beim Hereinscrollen (zweite `useScroll` mit Offset `start end → start start`). Riesenwort
(Straße/See/Luft/Spiel/Zeit) wechselt per `AnimatePresence mode="popLayout"` (`y 105% → 0 →
−105%`). Kapitelleiste links mit Fortschrittsbalken; Klick scrollt per Lenis auf die berechnete
Position `top + range·(i+0.02)/N`.

### 3.6 Drei Wege (`Ways`)
Links sticky ein Bildrahmen, rechts die drei Texte. `useInView` mit `margin −45% 0 −45% 0`
erkennt, welcher Block die Mitte hält; das Bild wechselt per `AnimatePresence` von unten
(`clip-path inset(100% 0 0 0)` → voll) mit innerem `scale 1.12→1`. Punkte zeigen den Stand.
Mobil steht das Bild über jedem Block.

### 3.7 Ablauf mit Schlüssel (`Process`)
Linie als Schiene, Füllung `--p` aus `scrollYProgress` (Offset `start 0.75 → end 0.55`). Der
Schlüssel aus dem Emblem wandert mit `--p` über die Schiene; am letzten Schritt (`p > 0.94`)
dreht der Bart (`scaleX −1`) — „aufgeschlossen". Schritte werden per Schwellen (0.02/0.48/0.94)
aktiv.

### 3.8 Menü
Vollflächiger Dialog, Vorhang kommt von oben als Bogen
(`clip-path: inset(0 0 100% 0 round 0 0 50vw 50vw)` → voll, 0.85 s door). Einträge steigen
gestaffelt (`y 110% → 0`, +60 ms). Hover/Fokus auf einer Kategorie tauscht rechts ein Hochformat
im Bogenrahmen (AVIF, `clip-path` von unten) plus das Riesenwort. Fokusfalle (Tab/Shift-Tab),
Escape schließt, Fokus kehrt zurück, Lenis stoppt, `data-lenis-prevent` am Panel.

### 3.9 Kopfzeile
`useScroll` + `useMotionValueEvent`: ab 40 px Fläche einblenden (keine Glas-Optik, nur Opazität
und eine Haarlinie, die von links wächst), beim Runterscrollen verstecken (`−110%`), beim
Hochscrollen zeigen, unter 160 px immer sichtbar. Farbe folgt der Fläche darunter
(`elementsFromPoint`, per rAF gedrosselt).

### 3.10 Kleine Gesten
- **ArchButton**: Füllung in Signalfarbe steigt als Bogen von unten (`::before`, `translateY(101%)`
  → 0, Radius `50% 50% 0 0 / 80% 80% 0 0` → 0), Pfeil rückt 0.3 rem nach rechts.
- **LineLink**: Haarlinie zieht sich beim Hover neu (`@keyframes redraw`: von rechts auf 0
  schrumpfen, Ursprung wechseln, von links wachsen).
- Nav-Links: Unterstrich wächst von links, aktiver Link in Signalfarbe.
- Burger: zwei Striche, der kurze untere wächst beim Öffnen auf volle Breite und kreuzt.
- Footer: Riesen-Wortmarke schiebt sich beim Hereinscrollen aus 42 % nach 0 % hoch.
- Kategorie-Seite: Hero-Bild parallax 22 %, Titel hebt sich, Riesenwort läuft beim Scrollen
  seitlich (`8vw → −14vw`), Bild im Rahmen `scale 1.08→1`, „Nächste Kategorie" öffnet sich
  als Bogen beim Hereinscrollen, Listen-Punkte stagger über `--j`.
- 404: Schlüssel rüttelt (`rotate [0,−7,5,−3,0]`, `repeat Infinity`) — „das Schloss gibt nicht nach".
- Kontakt / Danke: Emblem zeichnet sich per `pathLength`.
- Formular-Button: Fortschrittsbalken während des Sendens, Felder mit Unterstrich, der beim
  Fokus von links durchzieht; Drop-Zone für Dateien mit Drag-Zustand.

### 3.11 Bewegungs-Grundsätze
- Scroll-Animationen nur über `scrollYProgress`-MotionValues in CSS-Variablen oder `style`;
  die Geometrie steht in CSS, JS liefert eine Zahl. Kein Layout-Thrashing.
- `useRange()` statt `useTransform` mit Bereichen — verhindert, dass Motion Opazität an eine
  native ViewTimeline hängt, deren Bereich nicht passt.
- Lange, ruhige Dauern (0.7–1.6 s) mit expo/door-Kurven, kein Bounce, kein Elastic.
- Jede Bewegung hat eine Bedeutung (Tür, Schlüssel, Bogen) — nichts ist Dekoration.
- `prefers-reduced-motion`: Intro aus, Lenis aus, sticky-Bühnen werden normale Abschnitte,
  Welten blenden nur über, Text steht sofort, globale Übergänge auf 0.01 ms.

## 4. Bilder
`Picture.tsx`: `<picture>` mit AVIF → WebP → JPEG, mehrere Breiten (480–3200) aus
`imageManifest.json` (enthält Maße, Breiten, LQIP-Data-URL als Hintergrund). `sizes` pro
Einsatzort, Hero `priority`/`fetchpriority=high`, sonst lazy. Eigenes Hochformat-Motiv für
`(orientation: portrait)`. Bild blendet nach `onload` ein (900 ms), `width`/`height` gesetzt →
CLS 0. Bogenmotive sind eigens fürs 3:4- bzw. 4:5-Format komponiert.

## 5. Zugänglichkeit und Robustheit
Skip-Link, `aria-labelledby` an jedem Abschnitt, `aria-current`, Dialog mit Fokusfalle, Fokus
nach Seitenwechsel auf `#main`, sichtbarer Fokusring in Signalfarbe, Labels an jedem Feld,
Fehlermeldungen per `role="alert"` + `aria-describedby`, `html:not(.js)`-Fallbacks,
Intro-Timeout, Honeypot statt Captcha, `noValidate` + eigene Prüfung mit Fokus aufs erste Feld.

## 6. Build und Auslieferung
`tsc -b && vite build && vite build --ssr … && node scripts/prerender.mjs`. Das Prerender-Skript
schreibt jede Route als `pfad/index.html`, ersetzt Titel/Description/OG, setzt `lang`,
canonical, hreflang (de/en/x-default), og:locale, robots, JSON-LD, dazu `404.html`,
`sitemap.xml`, `robots.txt`. `vercel.json`: `cleanUrls`, www-Umleitung, `.html`-Umleitungen,
Cache-Header (Assets 1 Jahr immutable, Bilder/Fonts 30 Tage), Sicherheits-Header.

## 7. Was beim Nachbau zu beachten ist
1. Erst Inhalte und Routen als Typen anlegen, dann Komponenten.
2. Ein Formmotiv aus dem Logo ableiten und konsequent durchziehen.
3. Eine Signalfarbe, zwei Flächen, eine Schrift.
4. Jede Scroll-Bühne: Abschnitt hoch, Bühne sticky, Fortschritt → CSS-Variable.
5. Seitenwechsel über eine Shell, die alte und neue Location trennt.
6. Reduced-motion und No-JS von Anfang an mitdenken, nicht nachrüsten.
7. Formulare als normaler POST (FormSubmit braucht das zur Freischaltung).
8. Nach dem Build im Browser prüfen: Konsole, Hydration, Navigation, Menü, Formulare, 404.
