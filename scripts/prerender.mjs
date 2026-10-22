/* Rendert jede Route als statisches HTML in dist/, damit Inhalt, Titel und
   Sprache ohne JavaScript bei Suchmaschinen und beim ersten Paint ankommen. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const site = (process.env.SITE_URL ?? 'https://www.priveleasing.de').replace(/\/$/, '')
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const { render, allPaths, noIndexPaths, jsonLd } = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href)

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function page(url) {
  const { html, lang, meta, alternates } = render(url)
  const abs = (p) => (site ? `${site}${p}` : p)
  const hidden = noIndexPaths.includes(url) || url === '/404'
  const robots = hidden ? '<meta name="robots" content="noindex, nofollow" />' : '<meta name="robots" content="index, follow, max-image-preview:large" />'
  const ld = hidden ? '' : `<script type="application/ld+json">${JSON.stringify(jsonLd(url, site)).replace(/</g, '\\u003c')}</script>`
  const links = alternates && !hidden
    ? [
        site ? `<link rel="canonical" href="${abs(url)}" />` : '',
        `<link rel="alternate" hreflang="de" href="${abs(alternates.de)}" />`,
        `<link rel="alternate" hreflang="en" href="${abs(alternates.en)}" />`,
        `<link rel="alternate" hreflang="x-default" href="${abs(alternates.de)}" />`,
      ].join('\n    ')
    : ''
  return template
    .replace('<html lang="de">', `<html lang="${lang}">`)
    .replace(/<title>.*?<\/title>/s, `<title>${esc(meta.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(meta.description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(meta.title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(meta.description)}$2`)
    .replace('<meta property="og:image" content="/img/og.jpg" />', `<meta property="og:image" content="${abs('/img/og.jpg')}" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />\n    <meta property="og:site_name" content="PRIVÉ" />\n    <meta name="twitter:card" content="summary_large_image" />`)
    .replace('</head>', `    <meta property="og:locale" content="${lang === 'de' ? 'de_DE' : 'en_GB'}" />\n    ${robots}\n    ${links}\n    ${ld}\n  </head>`)
    .replace('<!--app-->', html)
}

let count = 0
for (const url of allPaths) {
  const file = url === '/' ? path.join(dist, 'index.html') : path.join(dist, url.slice(1), 'index.html')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, page(url))
  count++
}
fs.writeFileSync(path.join(dist, '404.html'), page('/404'))

/* Sitemap und robots.txt — nur mit SITE_URL sinnvoll, sonst relative Adressen. */
const today = new Date().toISOString().slice(0, 10)
const indexable = allPaths.filter((u) => !noIndexPaths.includes(u))
const alt = (u) => {
  const { alternates } = render(u)
  return alternates
    ? `\n    <xhtml:link rel="alternate" hreflang="de" href="${site}${alternates.de}" />\n    <xhtml:link rel="alternate" hreflang="en" href="${site}${alternates.en}" />\n    <xhtml:link rel="alternate" hreflang="x-default" href="${site}${alternates.de}" />`
    : ''
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${indexable.map((u) => `  <url>\n    <loc>${site}${u}</loc>\n    <lastmod>${today}</lastmod>${alt(u)}\n  </url>`).join('\n')}
</urlset>
`
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap)
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /danke\nDisallow: /en/thank-you\n\nSitemap: ${site}/sitemap.xml\n`)
fs.rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true })
console.log(`prerendered ${count} routes + 404`)
