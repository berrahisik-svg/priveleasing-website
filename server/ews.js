/**
 * Exchange Web Services (IONOS Hosted Exchange 2019) mit NTLM.
 * Lesen des Posteingangs, Antworten, Senden mit Anhängen, Verschieben.
 */
import { postNtlm } from './ntlm-http.js'

const HOST = process.env.MAIL_HOST || 'exchange2019.ionos.eu'
const USER = process.env.MAIL_USER
const PASS = process.env.MAIL_PASS
const URL = `https://${HOST}/EWS/Exchange.asmx`

const NS =
  'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ' +
  'xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types" ' +
  'xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"'

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function unesc(s) {
  return String(s ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x?[0-9a-fA-F]+;/g, (m) => String.fromCodePoint(parseInt(m.slice(2, -1).replace(/^x/, '0x'), m[2] === 'x' ? 16 : 10)))
    .replace(/&amp;/g, '&')
}

/** Ein SOAP-Aufruf; gibt den XML-Text zurück und wirft bei Fehlern. */
export async function soap(body) {
  const xml =
    `<?xml version="1.0" encoding="utf-8"?><soap:Envelope ${NS}>` +
    `<soap:Header><t:RequestServerVersion Version="Exchange2016"/></soap:Header>` +
    `<soap:Body>${body}</soap:Body></soap:Envelope>`
  const res = await postNtlm({
    host: HOST,
    path: '/EWS/Exchange.asmx',
    username: USER,
    password: PASS,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body: xml,
  })
  if (res.status !== 200) throw new Error(`EWS HTTP ${res.status}: ${res.body.slice(0, 300)}`)
  const t = res.body
  const code = t.match(/<m:ResponseCode>([^<]+)/)?.[1]
  if (code && code !== 'NoError') {
    const msg = t.match(/<m:MessageText>([^<]+)/)?.[1] || ''
    throw new Error(`EWS ${code}: ${msg}`)
  }
  return t
}

function tag(xml, name) {
  return xml.match(new RegExp(`<t:${name}[^>]*>([\\s\\S]*?)</t:${name}>`))?.[1]
}

/** Ungelesene Mails im Posteingang (neueste zuerst). */
export async function findUnread(max = 20) {
  const xml = await soap(
    `<m:FindItem Traversal="Shallow"><m:ItemShape><t:BaseShape>IdOnly</t:BaseShape>` +
      `<t:AdditionalProperties><t:FieldURI FieldURI="item:Subject"/><t:FieldURI FieldURI="message:From"/>` +
      `<t:FieldURI FieldURI="item:DateTimeReceived"/><t:FieldURI FieldURI="item:HasAttachments"/></t:AdditionalProperties></m:ItemShape>` +
      `<m:IndexedPageItemView MaxEntriesReturned="${max}" Offset="0" BasePoint="Beginning"/>` +
      `<m:Restriction><t:And><t:IsEqualTo><t:FieldURI FieldURI="message:IsRead"/><t:FieldURIOrConstant><t:Constant Value="false"/></t:FieldURIOrConstant></t:IsEqualTo>` +
      `<t:Not><t:Contains ContainmentMode="Substring" ContainmentComparison="IgnoreCase"><t:FieldURI FieldURI="item:Categories"/><t:Constant Value="Automatik"/></t:Contains></t:Not></t:And></m:Restriction>` +
      `<m:SortOrder><t:FieldOrder Order="Descending"><t:FieldURI FieldURI="item:DateTimeReceived"/></t:FieldOrder></m:SortOrder>` +
      `<m:ParentFolderIds><t:DistinguishedFolderId Id="inbox"/></m:ParentFolderIds></m:FindItem>`,
  )
  const items = []
  for (const m of xml.matchAll(/<t:Message>([\s\S]*?)<\/t:Message>/g)) {
    const x = m[1]
    const id = x.match(/<t:ItemId Id="([^"]+)" ChangeKey="([^"]+)"/)
    items.push({
      id: id?.[1],
      changeKey: id?.[2],
      subject: unesc(tag(x, 'Subject') || ''),
      fromName: unesc(x.match(/<t:From>[\s\S]*?<t:Name>([^<]*)/)?.[1] || ''),
      from: unesc(x.match(/<t:From>[\s\S]*?<t:EmailAddress>([^<]*)/)?.[1] || ''),
      received: tag(x, 'DateTimeReceived'),
      hasAttachments: tag(x, 'HasAttachments') === 'true',
    })
  }
  return items
}

/** Textkörper und Anhangsliste einer Mail. */
export async function getItem(id) {
  const xml = await soap(
    `<m:GetItem><m:ItemShape><t:BaseShape>IdOnly</t:BaseShape><t:BodyType>Text</t:BodyType>` +
      `<t:AdditionalProperties><t:FieldURI FieldURI="item:Body"/><t:FieldURI FieldURI="item:Subject"/><t:FieldURI FieldURI="message:From"/>` +
      `<t:FieldURI FieldURI="message:ToRecipients"/><t:FieldURI FieldURI="item:Attachments"/><t:FieldURI FieldURI="message:InternetMessageId"/><t:FieldURI FieldURI="message:ReplyTo"/></t:AdditionalProperties></m:ItemShape>` +
      `<m:ItemIds><t:ItemId Id="${esc(id)}"/></m:ItemIds></m:GetItem>`,
  )
  const body = unesc(tag(xml, 'Body') || '')
  const attachments = []
  for (const a of xml.matchAll(/<t:FileAttachment>([\s\S]*?)<\/t:FileAttachment>/g)) {
    attachments.push({
      id: a[1].match(/<t:AttachmentId Id="([^"]+)"/)?.[1],
      name: unesc(tag(a[1], 'Name') || 'Anhang'),
      contentType: tag(a[1], 'ContentType') || 'application/octet-stream',
      size: Number(tag(a[1], 'Size') || 0),
      inline: tag(a[1], 'IsInline') === 'true',
    })
  }
  return {
    subject: unesc(tag(xml, 'Subject') || ''),
    fromName: unesc(xml.match(/<t:From>[\s\S]*?<t:Name>([^<]*)/)?.[1] || ''),
    from: unesc(xml.match(/<t:From>[\s\S]*?<t:EmailAddress>([^<]*)/)?.[1] || ''),
    replyTo: unesc(xml.match(/<t:ReplyTo>[\s\S]*?<t:EmailAddress>([^<]*)/)?.[1] || ''),
    messageId: unesc(tag(xml, 'InternetMessageId') || ''),
    body,
    attachments: attachments.filter((a) => !a.inline),
  }
}

/** Anhang als Buffer laden. */
export async function getAttachment(attachmentId) {
  const xml = await soap(`<m:GetAttachment><m:AttachmentIds><t:AttachmentId Id="${esc(attachmentId)}"/></m:AttachmentIds></m:GetAttachment>`)
  const b64 = tag(xml, 'Content') || ''
  return Buffer.from(b64, 'base64')
}

function attachmentsXml(files) {
  if (!files?.length) return ''
  return (
    '<t:Attachments>' +
    files
      .map(
        (f) =>
          `<t:FileAttachment><t:Name>${esc(f.name)}</t:Name><t:ContentType>${esc(f.contentType || 'application/octet-stream')}</t:ContentType>` +
          `<t:Content>${Buffer.isBuffer(f.content) ? f.content.toString('base64') : f.content}</t:Content></t:FileAttachment>`,
      )
      .join('') +
    '</t:Attachments>'
  )
}

/**
 * Neue Mail senden (Kopie in „Gesendete Elemente“).
 * to: Array von Adressen, html: Nachrichtentext als HTML, files: [{name, contentType, content(Buffer)}]
 * inReplyTo: InternetMessageId der Ursprungsmail, damit der Mailclient den Thread erkennt.
 */
export async function sendMail({ to, cc = [], subject, html, files = [], inReplyTo = '' }) {
  const rcpt = (list) => list.map((a) => `<t:Mailbox><t:EmailAddress>${esc(a)}</t:EmailAddress></t:Mailbox>`).join('')
  const headers = inReplyTo
    ? `<t:ExtendedProperty><t:ExtendedFieldURI DistinguishedPropertySetId="InternetHeaders" PropertyName="In-Reply-To" PropertyType="String"/><t:Value>${esc(inReplyTo)}</t:Value></t:ExtendedProperty>` +
      `<t:ExtendedProperty><t:ExtendedFieldURI DistinguishedPropertySetId="InternetHeaders" PropertyName="References" PropertyType="String"/><t:Value>${esc(inReplyTo)}</t:Value></t:ExtendedProperty>`
    : ''
  await soap(
    `<m:CreateItem MessageDisposition="SendAndSaveCopy"><m:SavedItemFolderId><t:DistinguishedFolderId Id="sentitems"/></m:SavedItemFolderId>` +
      `<m:Items><t:Message><t:Subject>${esc(subject)}</t:Subject><t:Body BodyType="HTML">${esc(html)}</t:Body>` +
      attachmentsXml(files) +
      headers +
      `<t:ToRecipients>${rcpt(to)}</t:ToRecipients>` +
      (cc.length ? `<t:CcRecipients>${rcpt(cc)}</t:CcRecipients>` : '') +
      `</t:Message></m:Items></m:CreateItem>`,
  )
}

/** Als gelesen markieren. */
export async function markRead(id, changeKey) {
  await soap(
    `<m:UpdateItem ConflictResolution="AlwaysOverwrite" MessageDisposition="SaveOnly"><m:ItemChanges><t:ItemChange>` +
      `<t:ItemId Id="${esc(id)}" ChangeKey="${esc(changeKey)}"/><t:Updates><t:SetItemField><t:FieldURI FieldURI="message:IsRead"/>` +
      `<t:Message><t:IsRead>true</t:IsRead></t:Message></t:SetItemField></t:Updates></t:ItemChange></m:ItemChanges></m:UpdateItem>`,
  )
}

/** Kategorie „Automatik geprüft“ setzen – Mail bleibt ungelesen, wird aber nicht erneut verarbeitet. */
export async function markChecked(id, changeKey) {
  await soap(
    `<m:UpdateItem ConflictResolution="AlwaysOverwrite" MessageDisposition="SaveOnly"><m:ItemChanges><t:ItemChange>` +
      `<t:ItemId Id="${esc(id)}" ChangeKey="${esc(changeKey)}"/><t:Updates><t:SetItemField><t:FieldURI FieldURI="item:Categories"/>` +
      `<t:Message><t:Categories><t:String>Automatik geprüft</t:String></t:Categories></t:Message></t:SetItemField></t:Updates></t:ItemChange></m:ItemChanges></m:UpdateItem>`,
  )
}

/** Unterordner des Posteingangs finden oder anlegen; gibt die FolderId zurück. */
export async function ensureFolder(name) {
  const found = await soap(
    `<m:FindFolder Traversal="Shallow"><m:FolderShape><t:BaseShape>IdOnly</t:BaseShape></m:FolderShape>` +
      `<m:Restriction><t:IsEqualTo><t:FieldURI FieldURI="folder:DisplayName"/><t:FieldURIOrConstant><t:Constant Value="${esc(name)}"/></t:FieldURIOrConstant></t:IsEqualTo></m:Restriction>` +
      `<m:ParentFolderIds><t:DistinguishedFolderId Id="inbox"/></m:ParentFolderIds></m:FindFolder>`,
  )
  const id = found.match(/<t:FolderId Id="([^"]+)"/)?.[1]
  if (id) return id
  const made = await soap(
    `<m:CreateFolder><m:ParentFolderId><t:DistinguishedFolderId Id="inbox"/></m:ParentFolderId><m:Folders><t:Folder><t:DisplayName>${esc(name)}</t:DisplayName></t:Folder></m:Folders></m:CreateFolder>`,
  )
  return made.match(/<t:FolderId Id="([^"]+)"/)?.[1]
}

/** Mail in einen Ordner verschieben. */
export async function moveItem(id, folderId) {
  await soap(`<m:MoveItem><m:ToFolderId><t:FolderId Id="${esc(folderId)}"/></m:ToFolderId><m:ItemIds><t:ItemId Id="${esc(id)}"/></m:ItemIds></m:MoveItem>`)
}

/** Posteingangs-Zähler, für den Verbindungstest. */
export async function inboxStatus() {
  const xml = await soap(
    `<m:GetFolder><m:FolderShape><t:BaseShape>Default</t:BaseShape></m:FolderShape><m:FolderIds><t:DistinguishedFolderId Id="inbox"/></m:FolderIds></m:GetFolder>`,
  )
  return { total: Number(tag(xml, 'TotalCount') || 0), unread: Number(tag(xml, 'UnreadCount') || 0) }
}
