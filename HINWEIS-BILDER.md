# Hinweis für den Push

Dieses Zip enthält den kompletten Quelltext OHNE `public/img/` (26 MB, 244 Dateien).
Die Bilder liegen unverändert auf der Live-Seite: https://www.priveleasing.de/img/<datei>
Dateiliste: siehe `bilder-liste.txt`. Vor `npm run build` alle Dateien nach `public/img/` laden
(z. B. `curl -o public/img/NAME https://www.priveleasing.de/img/NAME`).
Alternativ: `prive-website-quelltext.zip` (mit Bildern) aus dem PRIVÉ-Chat vom 18.10. verwenden.

Deploy: Repo berrahisik-svg/priveleasing-website, Branch main, Vercel baut mit `npm run build` → `dist`.
