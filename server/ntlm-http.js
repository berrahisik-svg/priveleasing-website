/**
 * Minimaler HTTP/1.1-Client über EINE TLS-Verbindung, damit der NTLM-Handshake
 * (Type1 → Challenge → Type3) auf demselben Socket bleibt. Geht direkt oder,
 * wenn HTTPS_PROXY gesetzt ist, durch einen CONNECT-Tunnel.
 */
import net from 'node:net'
import tls from 'node:tls'
import ntlm from 'httpntlm/ntlm.js'

function connectTls(host, port = 443) {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy
  return new Promise((resolve, reject) => {
    const wrap = (sock) => {
      const t = tls.connect({ socket: sock, servername: host }, () => resolve(t))
      t.on('error', reject)
    }
    if (!proxy) {
      const s = net.connect(port, host, () => wrap(s))
      s.on('error', reject)
      return
    }
    const u = new URL(proxy)
    const s = net.connect(Number(u.port || 80), u.hostname, () => {
      s.write(`CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\n\r\n`)
    })
    let buf = ''
    const onData = (d) => {
      buf += d.toString('latin1')
      const end = buf.indexOf('\r\n\r\n')
      if (end === -1) return
      s.removeListener('data', onData)
      if (!/^HTTP\/1\.[01] 200/.test(buf)) return reject(new Error('Proxy CONNECT fehlgeschlagen: ' + buf.split('\r\n')[0]))
      wrap(s)
    }
    s.on('data', onData)
    s.on('error', reject)
  })
}

/** Eine Anfrage auf einem offenen Socket; löst mit {status, headers, body} auf. */
function request(sock, { host, path, method = 'POST', headers = {}, body = '' }) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(body, 'utf8')
    const lines = [`${method} ${path} HTTP/1.1`, `Host: ${host}`, 'Connection: keep-alive', `Content-Length: ${payload.length}`]
    for (const [k, v] of Object.entries(headers)) lines.push(`${k}: ${v}`)
    sock.write(lines.join('\r\n') + '\r\n\r\n')
    sock.write(payload)

    let buf = Buffer.alloc(0)
    let head = null
    let hdrs = {}
    let status = 0
    const done = (bodyBuf) => {
      sock.removeListener('data', onData)
      sock.removeListener('error', onErr)
      resolve({ status, headers: hdrs, body: bodyBuf.toString('utf8') })
    }
    const onErr = (e) => reject(e)
    const onData = (d) => {
      buf = Buffer.concat([buf, d])
      if (!head) {
        const i = buf.indexOf('\r\n\r\n')
        if (i === -1) return
        head = buf.subarray(0, i).toString('latin1')
        buf = buf.subarray(i + 4)
        const [first, ...rest] = head.split('\r\n')
        status = Number(first.split(' ')[1])
        for (const l of rest) {
          const j = l.indexOf(':')
          if (j > 0) {
            const k = l.slice(0, j).toLowerCase()
            const v = l.slice(j + 1).trim()
            hdrs[k] = hdrs[k] ? hdrs[k] + ', ' + v : v
          }
        }
      }
      if (hdrs['transfer-encoding']?.includes('chunked')) {
        // Chunks einsammeln, bis der Null-Chunk kommt
        let out = Buffer.alloc(0)
        let rest = buf
        for (;;) {
          const i = rest.indexOf('\r\n')
          if (i === -1) return
          const size = parseInt(rest.subarray(0, i).toString('latin1'), 16)
          if (Number.isNaN(size)) return reject(new Error('Chunk-Fehler'))
          if (rest.length < i + 2 + size + 2) return
          if (size === 0) return done(out)
          out = Buffer.concat([out, rest.subarray(i + 2, i + 2 + size)])
          rest = rest.subarray(i + 2 + size + 2)
        }
      }
      const len = Number(hdrs['content-length'] ?? -1)
      if (len >= 0 && buf.length >= len) return done(buf.subarray(0, len))
    }
    sock.on('data', onData)
    sock.on('error', onErr)
  })
}

/**
 * POST mit NTLM-Authentifizierung. username darf die volle Mailadresse sein.
 * Gibt {status, headers, body} des eigentlichen Aufrufs zurück.
 */
export async function postNtlm(opts) {
  let last
  for (let i = 0; i < 3; i++) {
    try {
      return await postNtlmOnce(opts)
    } catch (e) {
      last = e
      if (!['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ECONNREFUSED'].includes(e.code) && !/Challenge fehlt/.test(e.message)) throw e
      await new Promise((r) => setTimeout(r, 400 * (i + 1)))
    }
  }
  throw last
}

async function postNtlmOnce({ host, path, username, password, headers = {}, body }) {
  const sock = await connectTls(host)
  sock.on('error', () => {}) /* späte Resets nach dem Antwortende ignorieren */
  try {
    const t1 = ntlm.createType1Message({ domain: '', workstation: 'PRIVE' })
    const r1 = await request(sock, { host, path, headers: { ...headers, Authorization: t1 }, body: '' })
    const ch = (r1.headers['www-authenticate'] || '')
      .split(',')
      .map((s) => s.trim())
      .find((s) => s.startsWith('NTLM '))
    if (r1.status !== 401 || !ch) throw new Error(`NTLM-Challenge fehlt (HTTP ${r1.status})`)
    const t2 = ntlm.parseType2Message(ch)
    const t3 = ntlm.createType3Message(t2, { username, password, domain: '', workstation: 'PRIVE' })
    return await request(sock, { host, path, headers: { ...headers, Authorization: t3 }, body })
  } finally {
    sock.end()
    sock.destroy()
  }
}
