/**
 * Lokaler Testlauf der API-Funktionen ohne Vercel: node server/lokal.js  → http://localhost:8102
 */
import http from 'node:http'
import anfrage from '../api/anfrage.js'
import postfach from '../api/postfach.js'
import whatsapp from '../api/whatsapp.js'

function wrap(req, res) {
  const url = new URL(req.url, 'http://x')
  req.query = Object.fromEntries(url.searchParams)
  res.status = (c) => ((res.statusCode = c), res)
  res.send = (b) => res.end(typeof b === 'string' ? b : JSON.stringify(b))
  res.json = (o) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(o, null, 1))
  }
  res.redirect = (code, to) => {
    res.statusCode = code
    res.setHeader('location', to)
    res.end()
  }
  if (url.pathname === '/api/anfrage') return anfrage(req, res)
  if (url.pathname === '/api/postfach') return postfach(req, res)
  if (url.pathname === '/api/whatsapp') return whatsapp(req, res)
  res.status(404).send('nicht gefunden')
}
http.createServer(wrap).listen(8102, () => console.log('lokal auf http://localhost:8102'))
