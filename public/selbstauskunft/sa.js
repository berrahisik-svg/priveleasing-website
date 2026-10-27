/* PRIVÉ · Online-Selbstauskunft und Unterlagen-Upload */
(function () {
  'use strict'

  var API = '/api/selbstauskunft'
  var MAX = Math.floor(4.3 * 1024 * 1024)
  var SPEICHER = 'prive:sa'
  var ENDUNG = /\.(pdf|jpe?g|png|heic|heif|webp|tiff?|gif|docx?|xlsx?)$/i

  /* Einwilligungstexte – wörtlich wie server/selbstauskunft-texte.js */
  var ANBIETER = 'PRIVÉ (Platin RE GmbH, Brauerstraße 12 A, 76135 Karlsruhe)'
  var EINWILLIGUNGEN = [
    {
      key: 'ein_vollmacht',
      titel: 'Vollmacht und Auskunftsanfrage',
      html:
        'Ich bevollmächtige ' + ANBIETER + ', im Rahmen meiner Leasing- oder Finanzierungsanfrage diese Selbstauskunft und die beigefügten Unterlagen an Leasinggesellschaften, Banken und weitere Finanzierungspartner weiterzugeben und dort Angebote einzuholen. ' +
        'PRIVÉ und diese Partner sind berechtigt, zur Prüfung meiner Kreditwürdigkeit Auskünfte bei der SCHUFA Holding AG und weiteren Auskunfteien sowie beim Grundbuchamt, Güterrechtsregister oder Einwohnermeldeamt einzuholen.',
    },
    {
      key: 'ein_daten',
      titel: 'Einwilligung zur Datenverarbeitung',
      html:
        'Ich willige ein, dass PRIVÉ und die angefragten Leasing- und Finanzierungspartner meine personenbezogenen Daten, die im Rahmen der Anfrage, des Vertragsabschlusses und der vereinbarungsgemäßen Abwicklung erhoben werden, zum Zweck der Vertragsanbahnung und Vertragserfüllung bis zum Ablauf der gesetzlichen Aufbewahrungspflicht speichern, verarbeiten, zum Zweck der Refinanzierung an Dritte übermitteln, verändern oder löschen. ' +
        'Diese Einwilligung und die Einwilligung zur Datenübermittlung an die SCHUFA kann ich jederzeit ohne Angabe von Gründen widerrufen, zum Beispiel per E-Mail an info@priveleasing.de.',
    },
    {
      key: 'ein_hinweise',
      titel: 'Datenschutzhinweise und SCHUFA-Informationsblatt',
      html:
        'Ich bestätige, die Datenschutzhinweise von PRIVÉ (<a href="/datenschutz" target="_blank" rel="noopener">www.priveleasing.de/datenschutz</a>) und das SCHUFA-Informationsblatt nach Art. 14 DSGVO (<a href="https://www.schufa.de/datenschutz" target="_blank" rel="noopener">www.schufa.de/datenschutz</a>) erhalten und zur Kenntnis genommen zu haben.',
    },
    { key: 'ein_richtig', titel: 'Richtigkeit der Angaben', html: 'Ich versichere ausdrücklich die Richtigkeit und Vollständigkeit der gemachten Angaben.' },
  ]
  var SCHUFA = [
    'Die angefragten Leasing- und Finanzierungspartner übermitteln im Rahmen des Vertragsverhältnisses erhobene personenbezogene Daten über die Beantragung, die Durchführung und Beendigung dieser Geschäftsbeziehung sowie Daten über nicht vertragsgemäßes oder betrügerisches Verhalten an die SCHUFA Holding AG, Kormoranweg 5, 65201 Wiesbaden. Rechtsgrundlagen dieser Übermittlungen sind Artikel 6 Absatz 1 Buchstabe b und Artikel 6 Absatz 1 Buchstabe f der Datenschutz-Grundverordnung (DSGVO). Übermittlungen auf der Grundlage von Artikel 6 Absatz 1 Buchstabe f DSGVO dürfen nur erfolgen, soweit dies zur Wahrung berechtigter Interessen des jeweiligen Partners oder Dritter erforderlich ist und nicht die Interessen oder Grundrechte und Grundfreiheiten der betroffenen Person, die den Schutz personenbezogener Daten erfordern, überwiegen. Der Datenaustausch mit der SCHUFA dient auch der Erfüllung gesetzlicher Pflichten zur Durchführung von Kreditwürdigkeitsprüfungen (§§ 505a und 506 des Bürgerlichen Gesetzbuches).',
    'Die SCHUFA verarbeitet die erhaltenen Daten und verwendet sie auch zum Zwecke der Profilbildung (Scoring), um ihren Vertragspartnern im Europäischen Wirtschaftsraum und in der Schweiz sowie gegebenenfalls weiteren Drittländern (sofern zu diesen ein Angemessenheitsbeschluss der Europäischen Kommission besteht oder Standardvertragsklauseln vereinbart wurden, die unter www.schufa.de eingesehen werden können) Informationen unter anderem zur Beurteilung der Kreditwürdigkeit von natürlichen Personen zu geben. Nähere Informationen zur Tätigkeit der SCHUFA können dem SCHUFA-Informationsblatt nach Art. 14 DSGVO entnommen oder online unter www.schufa.de/datenschutz eingesehen werden.',
  ]

  var SLOTS = [
    ['Ausweis', 'Ausweis des Geschäftsführers oder Inhabers', 'Vorder- und Rückseite, Foto genügt'],
    ['Handelsregisterauszug', 'Handelsregisterauszug', 'bei einer GmbH'],
    ['Angebot', 'Angebot oder Kaufvertragsentwurf', 'mit Kaufpreis'],
    ['Gewerbeanmeldung', 'Gewerbeanmeldung', ''],
    ['Jahresabschluss', 'Aktuellster Jahresabschluss', ''],
    ['BWA letzte', 'Letzte BWA inklusive SuSa', 'mit Summen- und Saldenliste'],
    ['BWA aktuell', 'Aktuelle BWA inklusive SuSa', 'mit Summen- und Saldenliste'],
    ['Weitere', 'Weitere Unterlagen', 'optional, z. B. Einkommensnachweise'],
  ]

  var JN = [['ja', 'ja'], ['nein', 'nein']]

  var SCHRITTE = {
    selbstauskunft: [
      {
        id: 'person',
        kurz: 'Person',
        titel: 'Angaben zur Person',
        intro: 'Pflichtfelder sind markiert. Ihre Eingaben bleiben in diesem Browser-Tab erhalten, auch wenn Sie zwischendurch Fotos aufnehmen.',
        gruppen: [
          {
            felder: [
              { k: 'rolle', label: 'Ich fülle aus als', t: 'pillen', opts: [['antragsteller', 'Antragsteller'], ['mitantragsteller', 'Mitantragsteller'], ['buerge', 'Bürge']], req: true, wide: true, def: 'antragsteller' },
              { k: 'firma', label: 'Firma (Leasingnehmer)', hint: 'Für welches Unternehmen läuft die Anfrage?', wide: true, ac: 'organization' },
              { k: 'name', label: 'Name', hint: 'ggf. auch Geburtsname', req: true, ac: 'family-name' },
              { k: 'vorname', label: 'Vorname', req: true, ac: 'given-name' },
              { k: 'geburtsdatum', label: 'Geburtsdatum', t: 'date', req: true, ac: 'bday' },
              { k: 'geburtsort', label: 'Geburtsort', req: true },
              { k: 'staatsangehoerigkeit', label: 'Staatsangehörigkeit', req: true, ph: 'z. B. deutsch' },
              { k: 'familienstand', label: 'Familienstand', t: 'select', req: true, opts: [['', 'Bitte wählen'], ['ledig', 'ledig'], ['verheiratet', 'verheiratet'], ['getrennt', 'getrennt lebend'], ['geschieden', 'geschieden'], ['verwitwet', 'verwitwet']] },
              { k: 'familienstand_seit', label: 'Familienstand seit', ph: 'z. B. 2012', im: 'numeric' },
              { k: 'unterhalt', label: 'Unterhaltsberechtigte Personen', ph: '0', im: 'numeric' },
            ],
          },
          {
            titel: 'Anschrift und Kontakt',
            felder: [
              { k: 'strasse', label: 'Straße und Hausnummer', req: true, ac: 'street-address', wide: true },
              { k: 'plz_ort', label: 'PLZ und Ort', req: true, ph: 'z. B. 76133 Karlsruhe' },
              { k: 'telefon', label: 'Telefon', t: 'tel', req: true, ac: 'tel' },
              { k: 'email', label: 'E-Mail', t: 'email', req: true, ac: 'email', wide: true },
            ],
          },
          {
            titel: 'Beruf',
            felder: [
              { k: 'beruf', label: 'Ausgeübter Beruf / Geschäftszweig', req: true },
              { k: 'beschaeftigt_seit', label: 'Beschäftigt seit', ph: 'z. B. 01/2015' },
              { k: 'arbeitgeber', label: 'Beschäftigung bei (Firma mit Anschrift)', req: true, wide: true },
              { k: 'ungekuendigt', label: 'Ungekündigte Stellung', t: 'pillen', opts: JN, req: true },
              { k: 'selbststaendig', label: 'Selbstständig', t: 'pillen', opts: JN, req: true },
            ],
          },
        ],
      },
      {
        id: 'einkommen',
        kurz: 'Einkommen',
        titel: 'Einkommen und Ausgaben',
        intro: 'Monatliche Beträge in Euro. Bitte mindestens Nettoeinkommen oder Geschäftseinkünfte angeben. Nachweise laden Sie im Schritt „Unterlagen“ hoch.',
        gruppen: [
          {
            titel: 'Monatliches Einkommen',
            felder: [
              { k: 'netto', label: 'Nettolohn, -gehalt, sonstige Bezüge', t: 'eur' },
              { k: 'geschaeft', label: 'Geschäftseinkünfte', hint: 'Entnahmen, Gewinn', t: 'eur' },
              { k: 'monatsgehaelter', label: 'Anzahl der Monatsgehälter', ph: 'z. B. 12', im: 'numeric' },
              { k: 'bonus', label: 'Bonuszahlungen', t: 'eur' },
              { k: 'mieteinnahmen', label: '(Kalt-)Mieteinnahmen', t: 'eur' },
              { k: 'sonstige_einkuenfte', label: 'Sonstige Einkünfte', hint: 'z. B. Beteiligungen, Kapitalvermögen', t: 'eur' },
            ],
          },
          {
            titel: 'Monatliche Ausgaben',
            felder: [
              { k: 'miete', label: 'Miete', t: 'eur' },
              { k: 'haushalt', label: 'Laufende Haushaltsausgaben', t: 'eur' },
              { k: 'sonstige_ausgaben', label: 'Sonstige Ausgaben', hint: 'z. B. Leasing, Bausparen, Sparplan, Unterhalt, Versicherungen', ph: 'z. B. Leasing 890 €, Versicherungen 420 €', wide: true },
              { k: 'zins_tilgung', label: 'Zins- und Tilgungsleistungen', t: 'eur' },
              { k: 'zins_tilgung_an', label: '… an (Kreditgeber)' },
              { k: 'zins_tilgung_neu', label: 'Zins- und Tilgungsdienst für beantragten Kredit / künftige Mieteinnahmen aus Finanzierungsobjekt', t: 'eur', wide: true },
            ],
          },
        ],
      },
      {
        id: 'vermoegen',
        kurz: 'Vermögen',
        titel: 'Vermögensverhältnisse',
        intro: 'Ungefähre Angaben genügen. Felder, die nicht zutreffen, lassen Sie einfach leer.',
        gruppen: [
          {
            titel: 'Vermögen',
            felder: [
              { k: 'guthaben', label: 'Guthaben', hint: 'Kreditinstitut, ggf. Kontonummer', ph: 'z. B. Sparkasse, ca. 50.000 €', wide: true },
              { k: 'wertpapiere', label: 'Wertpapiere', hint: 'Gattung, Nennwert, Verwahrung bei', wide: true },
              { k: 'grundeigentum', label: 'Grundeigentum', hint: 'Art, Größe, Lage' },
              { k: 'verkehrswert', label: 'Unterstellter Verkehrswert', t: 'eur' },
              { k: 'sonstiges_vermoegen', label: 'Sonstige Vermögenswerte', hint: 'z. B. Beteiligungen, Erbanteile, Sammlungen', wide: true },
            ],
          },
          { titel: 'Verbindlichkeiten', block: 'verbindlichkeiten' },
          {
            titel: 'Weitere Angaben',
            felder: [{ k: 'buergschaften', label: 'Übernommene Bürgschaften', hint: 'Betrag, Gläubiger, Schuldner', wide: true }],
          },
          {
            titel: 'Bestehen oder bestanden in den letzten zehn Jahren',
            felder: [
              { k: 'mahnverfahren', label: 'Mahnverfahren oder Zahlungsklagen', t: 'pillen', opts: JN, req: true },
              { k: 'zwangsvollstreckung', label: 'Zwangsvollstreckung', t: 'pillen', opts: JN, req: true },
              { k: 'eidesstattlich', label: 'Eidesstattliches Versicherungsverfahren', t: 'pillen', opts: JN, req: true },
              { k: 'insolvenz', label: 'Insolvenz- oder Vergleichsverfahren', t: 'pillen', opts: JN, req: true },
            ],
          },
        ],
      },
      {
        id: 'unterlagen',
        kurz: 'Unterlagen',
        titel: 'Unterlagen hochladen',
        intro: 'PDF oder Foto, bis 4 MB je Datei. Mit dem Handy können Sie die Dokumente direkt fotografieren. Was nicht zutrifft oder noch fehlt, reichen Sie später über denselben Link nach.',
        gruppen: [{ block: 'slots' }],
      },
      {
        id: 'unterschrift',
        kurz: 'Unterschrift',
        titel: 'Einwilligung und Unterschrift',
        intro: 'Bitte bestätigen Sie die folgenden Punkte und unterschreiben Sie mit dem Finger oder der Maus.',
        gruppen: [
          { block: 'einwilligungen' },
          {
            titel: 'Unterschrift',
            felder: [{ k: 'ort', label: 'Ort', req: true, ac: 'address-level2' }],
            nach: 'unterschrift',
          },
        ],
      },
    ],
    unterlagen: [
      {
        id: 'kontakt',
        kurz: 'Ihre Angaben',
        titel: 'Ihre Angaben',
        intro: 'Damit wir die Unterlagen Ihrer Anfrage zuordnen können.',
        gruppen: [
          {
            felder: [
              { k: 'vorname', label: 'Vorname', req: true, ac: 'given-name' },
              { k: 'name', label: 'Name', req: true, ac: 'family-name' },
              { k: 'firma', label: 'Firma', ac: 'organization', wide: true },
              { k: 'email', label: 'E-Mail', t: 'email', req: true, ac: 'email' },
              { k: 'telefon', label: 'Telefon', t: 'tel', ac: 'tel' },
            ],
          },
        ],
      },
      {
        id: 'unterlagen',
        kurz: 'Unterlagen',
        titel: 'Unterlagen hochladen',
        intro: 'PDF oder Foto, bis 4 MB je Datei. Mit dem Handy können Sie die Dokumente direkt fotografieren.',
        gruppen: [{ block: 'slots' }, { block: 'datenschutz' }],
      },
    ],
  }

  /* ───────── Zustand ───────── */
  var zustand = { modus: 'selbstauskunft', schritt: 0, z: '', werte: {}, vb: [{}] }
  var dateien = {} // art → [{ name, blob, groesse, typ, fehler }]
  var unterschrift = null // { canvas, gezeichnet, box, laden(), leeren(), png() }
  var sendet = false

  var $ = function (s, r) { return (r || document).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)) }
  function el(tag, attrs, kinder) {
    var e = document.createElement(tag)
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue
      if (k === 'text') e.textContent = attrs[k]
      else if (k === 'html') e.innerHTML = attrs[k]
      else e.setAttribute(k, attrs[k] === true ? '' : attrs[k])
    }
    ;(kinder || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c) })
    return e
  }

  function laden() {
    try {
      var s = JSON.parse(sessionStorage.getItem(SPEICHER) || 'null')
      if (s && typeof s === 'object') {
        zustand.modus = s.modus === 'unterlagen' ? 'unterlagen' : 'selbstauskunft'
        zustand.schritt = Math.max(0, Number(s.schritt) || 0)
        zustand.z = s.z || ''
        zustand.werte = s.werte || {}
        zustand.vb = Array.isArray(s.vb) && s.vb.length ? s.vb : [{}]
        zustand.sig = s.sig || null
      }
    } catch (e) {}
  }
  function speichern() {
    try {
      sessionStorage.setItem(SPEICHER, JSON.stringify({ modus: zustand.modus, schritt: zustand.schritt, z: zustand.z, werte: zustand.werte, vb: zustand.vb, sig: unterschrift && unterschrift.gezeichnet ? unterschrift.png() : null }))
    } catch (e) {}
  }

  /* ───────── Felder ───────── */
  function feld(f) {
    var id = 'f-' + f.k
    var kopf = el('div', { class: 'feld-kopf' }, [
      el('label', { class: 'l', for: f.t === 'pillen' ? null : id, id: id + '-l' }, [f.label, f.req ? el('span', { class: 'pflicht', text: ' *' }) : null]),
    ])
    var box = el('div', { class: 'feld' + (f.wide ? ' wide' : ''), 'data-k': f.k }, [kopf])
    var hinweis = f.hint ? el('span', { class: 'h', text: f.hint, id: id + '-h' }) : null
    var wert = zustand.werte[f.k] != null ? zustand.werte[f.k] : f.def || ''
    var input
    if (f.t === 'pillen') {
      var gruppe = el('div', { class: 'pillen', role: 'radiogroup', 'aria-labelledby': id + '-l' })
      f.opts.forEach(function (o) {
        var r = el('input', { type: 'radio', name: f.k, value: o[0], required: f.req })
        if (wert === o[0]) r.checked = true
        gruppe.appendChild(el('label', { class: 'pille' }, [r, el('span', { text: o[1] })]))
      })
      box.appendChild(gruppe)
      if (hinweis) box.appendChild(hinweis)
      return box
    }
    if (f.t === 'select') {
      input = el('select', { id: id, name: f.k, required: f.req, 'aria-describedby': f.hint ? id + '-h' : null })
      f.opts.forEach(function (o) {
        var op = el('option', { value: o[0], text: o[1] })
        if (o[0] === wert) op.selected = true
        input.appendChild(op)
      })
    } else if (f.t === 'textarea') {
      input = el('textarea', { id: id, name: f.k, required: f.req, rows: 3, placeholder: f.ph })
      input.value = wert
    } else {
      var typ = f.t === 'eur' ? 'text' : f.t || 'text'
      input = el('input', {
        id: id, name: f.k, type: typ, required: f.req, placeholder: f.ph || (f.t === 'eur' ? '0' : null),
        autocomplete: f.ac || 'off', inputmode: f.t === 'eur' ? 'decimal' : f.im || null,
        'aria-describedby': f.hint ? id + '-h' : null, maxlength: 300,
      })
      input.value = wert
    }
    box.appendChild(f.t === 'eur' ? el('div', { class: 'eur' }, [input]) : input)
    if (hinweis) box.appendChild(hinweis)
    return box
  }

  function blockVerbindlichkeiten() {
    var wrap = el('div', { class: 'zeilen', id: 'vb' })
    function zeichnen() {
      wrap.innerHTML = ''
      zustand.vb.forEach(function (r, i) {
        var felder = [
          ['bei', 'Bei (Gläubiger)', 'text', null],
          ['betrag', 'Darlehensbetrag', 'eur', null],
          ['saldo', 'Aktueller Saldo', 'eur', null],
          ['rate', 'Rate', 'eur', null],
          ['laufzeit', 'Laufzeit', 'text', 'z. B. 2031'],
          ['zinsbindung', 'Zinsbindung bis', 'text', 'z. B. 03/2030'],
        ]
        var grid = el('div', { class: 'grid' })
        felder.forEach(function (f) {
          var input = el('input', { type: 'text', 'data-vb': i, 'data-vk': f[0], inputmode: f[2] === 'eur' ? 'decimal' : null, placeholder: f[3] || (f[2] === 'eur' ? '0' : null), id: 'vb-' + i + '-' + f[0], maxlength: 160 })
          input.value = r[f[0]] || ''
          grid.appendChild(el('div', { class: 'feld' }, [el('label', { class: 'l', for: 'vb-' + i + '-' + f[0], text: f[1] }), f[2] === 'eur' ? el('div', { class: 'eur' }, [input]) : input]))
        })
        var weg = zustand.vb.length > 1 ? el('button', { type: 'button', class: 'btn-klein', text: 'Entfernen' }) : null
        if (weg) weg.addEventListener('click', function () { sammeln(); zustand.vb.splice(i, 1); zeichnen(); speichern() })
        wrap.appendChild(el('div', { class: 'zeile' }, [el('div', { class: 'zeile-kopf' }, [el('p', { text: 'Verbindlichkeit ' + (i + 1) }), weg]), grid]))
      })
      if (zustand.vb.length < 8) {
        var plus = el('button', { type: 'button', class: 'btn-plus', text: '+ Weitere Verbindlichkeit' })
        plus.addEventListener('click', function () { sammeln(); zustand.vb.push({}); zeichnen(); speichern(); var n = $('#vb-' + (zustand.vb.length - 1) + '-bei'); if (n) n.focus() })
        wrap.appendChild(plus)
      }
    }
    zeichnen()
    return el('div', null, [el('p', { class: 'h', text: 'Laufende Kredite, Darlehen und Leasingverträge. Keine? Dann einfach leer lassen.', style: 'margin:-6px 0 12px' }), wrap])
  }

  function groesse(b) {
    return b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'
  }

  function blockSlots() {
    var liste = el('div', { class: 'slots' })
    SLOTS.forEach(function (s) {
      var art = s[0]
      var input = el('input', { type: 'file', multiple: true, accept: '.pdf,image/*,.heic,.heif,.doc,.docx,.xls,.xlsx', 'aria-label': s[1] + ' hochladen' })
      var chips = el('div', { class: 'dateien' })
      var slot = el('div', { class: 'slot', 'data-art': art }, [
        el('div', null, [el('p', { class: 'slot-titel', text: s[1] }), s[2] ? el('p', { class: 'slot-hint', text: s[2] }) : null]),
        el('label', { class: 'slot-btn' }, ['Datei wählen', input]),
        chips,
      ])
      function zeichnen() {
        chips.innerHTML = ''
        var l = dateien[art] || []
        l.forEach(function (d, i) {
          var x = el('button', { type: 'button', class: 'datei-x', 'aria-label': d.name + ' entfernen', html: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' })
          x.addEventListener('click', function () { l.splice(i, 1); zeichnen() })
          chips.appendChild(el('div', { class: 'datei', 'data-fehler': d.fehler ? true : null }, [
            el('span', { class: 'datei-name', text: d.name }),
            el('span', { class: 'datei-groesse', text: d.fehler || (d.bereit ? groesse(d.groesse) : 'wird vorbereitet …') }),
            x,
          ]))
        })
        if (l.some(function (d) { return !d.fehler })) slot.setAttribute('data-voll', '')
        else slot.removeAttribute('data-voll')
      }
      input.addEventListener('change', function () {
        var neu = Array.prototype.slice.call(input.files || [])
        input.value = ''
        dateien[art] = dateien[art] || []
        neu.forEach(function (file) {
          var eintrag = { name: file.name || 'Datei', blob: file, groesse: file.size, typ: file.type || '', bereit: false }
          dateien[art].push(eintrag)
          vorbereiten(eintrag).then(zeichnen)
        })
        zeichnen()
        var fehlerBox = $('#fehler')
        if (fehlerBox) fehlerBox.textContent = ''
      })
      zeichnen()
      liste.appendChild(slot)
    })
    return liste
  }

  /** Fotos verkleinern (max. 2400 px, JPEG), Größe prüfen. */
  function vorbereiten(d) {
    var name = d.name
    if (!ENDUNG.test(name) && !/^image\//.test(d.typ)) {
      d.fehler = 'Dateityp nicht möglich'
      d.bereit = true
      return Promise.resolve()
    }
    var bild = /^image\/(jpeg|png|webp|gif)$/.test(d.typ) || /\.(jpe?g|png|webp)$/i.test(name)
    if (!bild || (d.groesse < 1.2 * 1024 * 1024 && !/png$/i.test(d.typ))) return Promise.resolve(fertig())
    return verkleinern(d.blob)
      .then(function (b) {
        if (b && b.size < d.groesse) {
          d.blob = b
          d.groesse = b.size
          d.typ = 'image/jpeg'
          d.name = name.replace(/\.[^.]+$/, '') + '.jpg'
        }
      })
      .catch(function () {})
      .then(fertig)
    function fertig() {
      if (!ENDUNG.test(d.name)) d.name += /pdf/.test(d.typ) ? '.pdf' : '.jpg'
      if (d.groesse > MAX) d.fehler = 'zu groß (max. 4 MB) – bitte per E-Mail senden'
      d.bereit = true
    }
  }
  function verkleinern(file) {
    return new Promise(function (ok, nein) {
      var url = URL.createObjectURL(file)
      var img = new Image()
      img.onload = function () {
        var max = 2400
        var s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
        var c = document.createElement('canvas')
        c.width = Math.round(img.naturalWidth * s)
        c.height = Math.round(img.naturalHeight * s)
        var ctx = c.getContext('2d')
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.drawImage(img, 0, 0, c.width, c.height)
        URL.revokeObjectURL(url)
        c.toBlob(function (b) { b ? ok(b) : nein() }, 'image/jpeg', 0.84)
      }
      img.onerror = function () { URL.revokeObjectURL(url); nein() }
      img.src = url
    })
  }

  function blockEinwilligungen() {
    var wrap = el('div', { class: 'einw' })
    EINWILLIGUNGEN.forEach(function (e) {
      var cb = el('input', { type: 'checkbox', name: e.key, required: true, id: 'f-' + e.key })
      if (zustand.werte[e.key] === true) cb.checked = true
      var text = el('span', { class: 'check-text', html: e.html })
      wrap.appendChild(el('label', { class: 'check', 'data-k': e.key, for: 'f-' + e.key }, [cb, el('span', null, [el('span', { class: 'check-titel', text: e.titel }), text])]))
    })
    var det = el('details', { class: 'schufa' }, [el('summary', { text: 'SCHUFA-Hinweis: Datenübermittlung an die SCHUFA' })])
    SCHUFA.forEach(function (p) { det.appendChild(el('p', { text: p })) })
    wrap.appendChild(det)
    return wrap
  }

  function blockDatenschutz() {
    var cb = el('input', { type: 'checkbox', name: 'datenschutz', required: true, id: 'f-datenschutz' })
    if (zustand.werte.datenschutz === true) cb.checked = true
    return el('div', { class: 'einw', style: 'margin-top:18px' }, [
      el('label', { class: 'check', 'data-k': 'datenschutz', for: 'f-datenschutz' }, [cb, el('span', null, [
        el('span', { class: 'check-titel', text: 'Datenschutz' }),
        el('span', { class: 'check-text', html: 'Ich habe die <a href="/datenschutz" target="_blank" rel="noopener">Datenschutzerklärung</a> gelesen und bin einverstanden, dass PRIVÉ meine Unterlagen für meine Leasing- oder Finanzierungsanfrage verarbeitet.' }),
      ])]),
    ])
  }

  function blockUnterschrift() {
    var heute = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    var box = el('div', { class: 'unterschrift' }, [el('canvas', { 'aria-label': 'Unterschriftsfeld' }), el('div', { class: 'unterschrift-platz', text: 'Hier mit Finger oder Maus unterschreiben' })])
    var leeren = el('button', { type: 'button', class: 'btn-klein', text: 'Unterschrift löschen' })
    var wrap = el('div', { class: 'feld wide', 'data-k': 'unterschrift' }, [
      el('div', { class: 'feld-kopf' }, [el('span', { class: 'l' }, ['Unterschrift', el('span', { class: 'pflicht', text: ' *' })]), el('span', { class: 'h', text: 'Datum: ' + heute })]),
      box,
      el('div', { class: 'unterschrift-fuss' }, [el('span', { class: 'h', text: 'Ihre Unterschrift erscheint auf dem PDF Ihrer Selbstauskunft.' }), leeren]),
    ])
    unterschrift = pad(box)
    leeren.addEventListener('click', function () { unterschrift.leeren(); speichern() })
    return wrap
  }

  function pad(box) {
    var canvas = box.querySelector('canvas')
    var ctx = canvas.getContext('2d')
    var api = { gezeichnet: false, box: null }
    var punkte = []
    var malt = false
    var letzter = null
    function groesseSetzen() {
      var r = box.getBoundingClientRect()
      if (!r.width) return
      var dpr = Math.min(window.devicePixelRatio || 1, 3)
      var alt = api.gezeichnet ? canvas.toDataURL('image/png') : null
      var altB = canvas.width
      canvas.width = Math.round(r.width * dpr)
      canvas.height = Math.round(r.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#111215'
      ctx.lineWidth = 2.4
      if (alt && altB) bildLaden(alt)
    }
    function bildLaden(src) {
      var img = new Image()
      img.onload = function () {
        var r = box.getBoundingClientRect()
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        var s = Math.min(canvas.width / img.width, canvas.height / img.height, 1.5)
        ctx.drawImage(img, (canvas.width - img.width * s) / 2, (canvas.height - img.height * s) / 2, img.width * s, img.height * s)
        ctx.restore()
        api.gezeichnet = true
        api.box = { x0: 0, y0: 0, x1: r.width, y1: r.height }
        box.setAttribute('data-gezeichnet', '')
      }
      img.src = src
    }
    function pos(e) {
      var r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    function merken(p) {
      if (!api.box) api.box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
      api.box.x0 = Math.min(api.box.x0, p.x); api.box.y0 = Math.min(api.box.y0, p.y)
      api.box.x1 = Math.max(api.box.x1, p.x); api.box.y1 = Math.max(api.box.y1, p.y)
    }
    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault()
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId)
      malt = true
      letzter = pos(e)
      punkte = [letzter]
      merken(letzter)
      ctx.beginPath()
      ctx.arc(letzter.x, letzter.y, 1.1, 0, Math.PI * 2)
      ctx.fillStyle = '#111215'
      ctx.fill()
    })
    canvas.addEventListener('pointermove', function (e) {
      if (!malt) return
      e.preventDefault()
      var p = pos(e)
      merken(p)
      var mitte = { x: (letzter.x + p.x) / 2, y: (letzter.y + p.y) / 2 }
      ctx.beginPath()
      ctx.moveTo(punkte.length > 1 ? (punkte[punkte.length - 2].x + letzter.x) / 2 : letzter.x, punkte.length > 1 ? (punkte[punkte.length - 2].y + letzter.y) / 2 : letzter.y)
      ctx.quadraticCurveTo(letzter.x, letzter.y, mitte.x, mitte.y)
      ctx.stroke()
      punkte.push(p)
      letzter = p
      if (!api.gezeichnet) {
        api.gezeichnet = true
        box.setAttribute('data-gezeichnet', '')
        var f = box.closest('.feld')
        if (f) {
          f.removeAttribute('data-fehler')
          var ff = f.querySelector('.feld-fehler')
          if (ff) ff.remove()
        }
        var fb = document.getElementById('fehler')
        if (fb) fb.textContent = ''
      }
    })
    function ende() {
      if (!malt) return
      malt = false
      speichern()
    }
    canvas.addEventListener('pointerup', ende)
    canvas.addEventListener('pointercancel', ende)
    canvas.addEventListener('pointerleave', ende)
    api.leeren = function () {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore()
      api.gezeichnet = false
      api.box = null
      box.removeAttribute('data-gezeichnet')
    }
    /** Zugeschnittenes PNG der Unterschrift. */
    api.png = function () {
      if (!api.gezeichnet) return null
      var dpr = canvas.width / (box.getBoundingClientRect().width || canvas.width)
      var b = api.box || { x0: 0, y0: 0, x1: canvas.width / dpr, y1: canvas.height / dpr }
      var rand = 8
      var x = Math.max(0, (b.x0 - rand) * dpr), y = Math.max(0, (b.y0 - rand) * dpr)
      var w = Math.min(canvas.width - x, (b.x1 - b.x0 + 2 * rand) * dpr), h = Math.min(canvas.height - y, (b.y1 - b.y0 + 2 * rand) * dpr)
      if (w < 4 || h < 4) return canvas.toDataURL('image/png')
      var c = document.createElement('canvas')
      c.width = Math.round(w); c.height = Math.round(h)
      c.getContext('2d').drawImage(canvas, x, y, w, h, 0, 0, c.width, c.height)
      return c.toDataURL('image/png')
    }
    api.laden = bildLaden
    window.addEventListener('resize', function () { requestAnimationFrame(groesseSetzen) })
    api.init = groesseSetzen
    return api
  }

  /* ───────── Aufbau ───────── */
  function schritte() { return SCHRITTE[zustand.modus] }

  function aufbauen() {
    var cont = $('#schritte')
    cont.innerHTML = ''
    unterschrift = null
    schritte().forEach(function (s, i) {
      var sec = el('section', { class: 'schritt', 'data-schritt': i, hidden: true, 'aria-labelledby': 'st-' + s.id })
      sec.appendChild(el('h2', { class: 'h2', id: 'st-' + s.id, text: s.titel, tabindex: '-1' }))
      if (s.intro) sec.appendChild(el('p', { class: 'schritt-intro', text: s.intro }))
      s.gruppen.forEach(function (g) {
        var gr = el('div', { class: 'gruppe' })
        if (g.titel) gr.appendChild(el('p', { class: 'gruppe-titel', text: g.titel }))
        if (g.felder) {
          var grid = el('div', { class: 'grid' })
          g.felder.forEach(function (f) { grid.appendChild(feld(f)) })
          if (g.nach === 'unterschrift') grid.appendChild(blockUnterschrift())
          gr.appendChild(grid)
        }
        if (g.block === 'verbindlichkeiten') gr.appendChild(blockVerbindlichkeiten())
        if (g.block === 'slots') gr.appendChild(blockSlots())
        if (g.block === 'einwilligungen') gr.appendChild(blockEinwilligungen())
        if (g.block === 'datenschutz') gr.appendChild(blockDatenschutz())
        sec.appendChild(gr)
      })
      cont.appendChild(sec)
    })
    $$('.modus-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-modus') === zustand.modus)) })
    zeigen(Math.min(zustand.schritt, schritte().length - 1), false)
  }

  function stepper() {
    var nav = $('#stepper')
    nav.innerHTML = ''
    schritte().forEach(function (s, i) {
      var stand = i < zustand.schritt ? 'fertig' : i === zustand.schritt ? 'aktiv' : 'offen'
      var b = el('button', { type: 'button', class: 'step', 'data-stand': stand, 'aria-current': stand === 'aktiv' ? 'step' : null, tabindex: stand === 'fertig' ? null : '-1' }, [
        el('span', { class: 'step-balken' }),
        el('span', { class: 'step-text', html: '<b>' + (i + 1) + '</b>' + s.kurz + (stand === 'aktiv' ? '<span style="color:var(--mute);font-weight:550"> · Schritt ' + (i + 1) + ' von ' + schritte().length + '</span>' : '') }),
      ])
      if (stand === 'fertig') b.addEventListener('click', function () { sammeln(); zeigen(i, true) })
      nav.appendChild(b)
    })
  }

  function zeigen(i, scroll) {
    zustand.schritt = i
    $$('.schritt').forEach(function (s) { s.hidden = Number(s.getAttribute('data-schritt')) !== i })
    var letzter = i === schritte().length - 1
    $('#zurueck').hidden = i === 0
    $('#weiter').textContent = letzter ? (zustand.modus === 'unterlagen' ? 'Unterlagen senden' : 'Selbstauskunft absenden') : 'Weiter'
    $('#fehler').textContent = ''
    stepper()
    var aktiv = $('.schritt[data-schritt="' + i + '"]')
    if (unterschrift && aktiv && aktiv.contains($('.unterschrift'))) {
      requestAnimationFrame(function () {
        unterschrift.init()
        if (zustand.sig && !unterschrift.gezeichnet) unterschrift.laden(zustand.sig)
      })
    }
    if (scroll) {
      var top = $('#stepper').getBoundingClientRect().top + window.pageYOffset - 16
      window.scrollTo({ top: top, behavior: 'smooth' })
      var h = aktiv && aktiv.querySelector('.h2')
      if (h) setTimeout(function () { h.focus({ preventScroll: true }) }, 350)
    }
    speichern()
  }

  /* ───────── Werte ───────── */
  function sammeln() {
    $$('#schritte input[name], #schritte select[name], #schritte textarea[name]').forEach(function (e) {
      if (e.type === 'radio') { if (e.checked) zustand.werte[e.name] = e.value }
      else if (e.type === 'checkbox') zustand.werte[e.name] = e.checked
      else zustand.werte[e.name] = e.value.trim()
    })
    $$('#schritte input[data-vb]').forEach(function (e) {
      var i = Number(e.getAttribute('data-vb'))
      if (!zustand.vb[i]) zustand.vb[i] = {}
      zustand.vb[i][e.getAttribute('data-vk')] = e.value.trim()
    })
  }

  function fehler(box, text) {
    box.setAttribute('data-fehler', '')
    var alt = box.querySelector('.feld-fehler')
    if (alt) alt.remove()
    if (text) box.appendChild(el('span', { class: 'feld-fehler', text: text }))
  }

  function pruefen() {
    sammeln()
    var sec = $('.schritt[data-schritt="' + zustand.schritt + '"]')
    var s = schritte()[zustand.schritt]
    var erste = null
    $$('[data-fehler]', sec).forEach(function (b) { b.removeAttribute('data-fehler'); var f = b.querySelector('.feld-fehler'); if (f) f.remove() })
    function markieren(box, text) { if (!box) return; fehler(box, text); if (!erste) erste = box }
    s.gruppen.forEach(function (g) {
      ;(g.felder || []).forEach(function (f) {
        var v = zustand.werte[f.k]
        var box = $('.feld[data-k="' + f.k + '"]', sec)
        if (f.req && (v == null || v === '')) markieren(box, f.t === 'pillen' || f.t === 'select' ? 'Bitte auswählen' : 'Bitte ausfüllen')
        else if (f.t === 'email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) markieren(box, 'Bitte eine gültige E-Mail-Adresse angeben')
        else if (f.t === 'date' && v) {
          var j = Number(String(v).slice(0, 4))
          if (!(j > 1900 && j < new Date().getFullYear() - 15)) markieren(box, 'Bitte Geburtsdatum prüfen')
        }
      })
      if (g.block === 'einwilligungen') EINWILLIGUNGEN.forEach(function (e) { if (zustand.werte[e.key] !== true) markieren($('.check[data-k="' + e.key + '"]', sec), null) })
      if (g.block === 'datenschutz' && zustand.werte.datenschutz !== true) markieren($('.check[data-k="datenschutz"]', sec), null)
      if (g.nach === 'unterschrift' && !(unterschrift && unterschrift.gezeichnet)) markieren($('.feld[data-k="unterschrift"]', sec), 'Bitte unterschreiben')
    })
    if (s.id === 'einkommen' && !zustand.werte.netto && !zustand.werte.geschaeft) {
      markieren($('.feld[data-k="netto"]', sec), 'Bitte Nettoeinkommen oder Geschäftseinkünfte angeben')
      fehler($('.feld[data-k="geschaeft"]', sec), null)
    }
    if (s.id === 'unterlagen') {
      var warten = alleDateien(true).some(function (e) { return !e.d.bereit })
      if (warten) { $('#fehler').textContent = 'Einen Moment, die Fotos werden noch vorbereitet.'; return false }
      if (zustand.modus === 'unterlagen' && !alleDateien().length) { $('#fehler').textContent = 'Bitte mindestens eine Datei auswählen.'; return false }
      var summe = alleDateien().reduce(function (n, e) { return n + e.d.groesse }, 0)
      if (summe > 15 * 1024 * 1024) { $('#fehler').textContent = 'Zusammen höchstens 15 MB (jetzt ' + groesse(summe) + '). Bitte einzelne Dateien entfernen und später nachreichen.'; return false }
    }
    if (erste) {
      $('#fehler').textContent = 'Bitte die markierten Angaben ergänzen.'
      var top = erste.getBoundingClientRect().top + window.pageYOffset - 90
      window.scrollTo({ top: top, behavior: 'smooth' })
      var input = erste.querySelector('input:not([type="hidden"]), select, textarea')
      if (input) setTimeout(function () { input.focus({ preventScroll: true }) }, 300)
      return false
    }
    $('#fehler').textContent = ''
    return true
  }

  function alleDateien(auchFehler) {
    var l = []
    SLOTS.forEach(function (s) { (dateien[s[0]] || []).forEach(function (d) { if (auchFehler || (!d.fehler && d.bereit)) l.push({ art: s[0], d: d }) }) })
    return l
  }

  /* ───────── Senden ───────── */
  function json(url, daten) {
    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(daten), credentials: 'same-origin' }).then(function (r) {
      return r.json().catch(function () { return { ok: false, fehler: 'Übertragung fehlgeschlagen (' + r.status + ')' } }).then(function (j) { if (!r.ok && j.ok !== false) j.ok = false; return j })
    })
  }
  function hochladen(s, eintrag, versuch) {
    return fetch(API + '?schritt=datei&s=' + encodeURIComponent(s), {
      method: 'POST',
      headers: { 'content-type': eintrag.d.typ || 'application/octet-stream', 'x-name': encodeURIComponent(eintrag.d.name), 'x-art': encodeURIComponent(eintrag.art) },
      body: eintrag.d.blob,
    })
      .then(function (r) { return r.ok })
      .catch(function () { return false })
      .then(function (ok) { return ok || versuch > 0 ? ok : new Promise(function (w) { setTimeout(w, 1200) }).then(function () { return hochladen(s, eintrag, 1) }) })
  }
  function fortschritt(p, text) {
    $('#balken').style.width = Math.max(4, Math.min(100, p)) + '%'
    if (text) $('#senden-text').textContent = text
  }

  function absenden() {
    if (sendet) return
    sammeln()
    var liste = alleDateien()
    var zuGross = alleDateien(true).filter(function (e) { return e.d.fehler }).map(function (e) { return e.d.name })
    var daten = {}
    for (var k in zustand.werte) daten[k] = zustand.werte[k]
    daten.verbindlichkeiten = zustand.vb
    var nutzlast = {
      modus: zustand.modus,
      z: zustand.z || '',
      daten: daten,
      unterschrift: zustand.modus === 'selbstauskunft' && unterschrift ? unterschrift.png() : null,
      dateien: liste.map(function (e) { return { name: e.d.name, art: e.art } }),
      _honey: ($('input[name="_honey"]') || {}).value || '',
    }
    sendet = true
    $('#weiter').disabled = true
    $('#senden').hidden = false
    fortschritt(6, zustand.modus === 'selbstauskunft' ? 'Selbstauskunft wird übertragen …' : 'Wird vorbereitet …')
    var fehl = []
    json(API + '?schritt=formular', nutzlast)
      .then(function (r) {
        if (!r.ok) throw new Error(r.fehler || 'Übertragung fehlgeschlagen')
        if (r.fertig) return
        var n = liste.length
        var kette = Promise.resolve()
        liste.forEach(function (e, i) {
          kette = kette.then(function () {
            fortschritt(12 + (80 * i) / n, 'Unterlage ' + (i + 1) + ' von ' + n + ' wird übertragen …')
            return hochladen(r.s, e, 0).then(function (ok) { if (!ok) fehl.push(e.d.name) })
          })
        })
        return kette.then(function () {
          fortschritt(95, 'Wird abgeschlossen …')
          return json(API + '?schritt=senden&s=' + encodeURIComponent(r.s), { fehlgeschlagen: fehl, zuGross: zuGross })
        }).then(function (r2) { if (!r2.ok) throw new Error(r2.fehler || 'Abschluss fehlgeschlagen') })
      })
      .then(function () {
        fortschritt(100, 'Fertig.')
        setTimeout(function () { fertig(liste.length, fehl, zuGross) }, 350)
      })
      .catch(function (err) {
        $('#senden').hidden = true
        $('#fehler').textContent = (err && err.message) || 'Übertragung fehlgeschlagen. Bitte erneut versuchen.'
      })
      .then(function () {
        sendet = false
        $('#weiter').disabled = false
      })
  }

  function fertig(anzahl, fehl, zuGross) {
    $('#senden').hidden = true
    $('#form').hidden = true
    $('#stepper').hidden = true
    $('#link-hinweis').hidden = true
    var ok = anzahl - fehl.length
    $('#fertig-text').textContent =
      (zustand.modus === 'selbstauskunft'
        ? 'Ihre Selbstauskunft' + (ok ? ' und ' + (ok === 1 ? 'eine Unterlage' : ok + ' Unterlagen') + ' sind' : ' ist') + ' bei uns eingegangen.'
        : (ok === 1 ? 'Ihre Unterlage ist' : 'Ihre ' + ok + ' Unterlagen sind') + ' bei uns eingegangen.') +
      ' Eine Bestätigung ist per E-Mail unterwegs. Wir prüfen alles sorgfältig und melden uns innerhalb von 48 Stunden an Werktagen persönlich bei Ihnen.'
    var fl = $('#fehl-liste')
    var offen = fehl.concat(zuGross || [])
    if (offen.length) {
      fl.hidden = false
      fl.innerHTML = ''
      fl.appendChild(el('p', { text: 'Diese Dateien konnten nicht übertragen werden. Bitte senden Sie sie per E-Mail an info@priveleasing.de:' }))
      fl.appendChild(el('ul', null, offen.map(function (n) { return el('li', { text: n }) })))
    } else fl.hidden = true
    // Kontaktdaten behalten, alles andere löschen
    var w = zustand.werte
    zustand.werte = { name: w.name, vorname: w.vorname, firma: w.firma, email: w.email, telefon: w.telefon }
    zustand.vb = [{}]
    zustand.sig = null
    dateien = {}
    zustand.schritt = 0
    try { sessionStorage.removeItem(SPEICHER) } catch (e) {}
    $('#fertig').hidden = false
    window.scrollTo({ top: $('#fertig').getBoundingClientRect().top + window.pageYOffset - 24, behavior: 'smooth' })
    $('#fertig').focus({ preventScroll: true })
  }

  function modusWechseln(m) {
    if (sendet || m === zustand.modus) return
    sammeln()
    zustand.modus = m
    zustand.schritt = 0
    $('#fertig').hidden = true
    $('#form').hidden = false
    $('#stepper').hidden = false
    aufbauen()
  }

  /* ───────── Start ───────── */
  function start() {
    laden()
    var p = new URLSearchParams(location.search)
    var z = p.get('z')
    if (z) {
      zustand.z = z
      p.delete('z')
      try { history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash) } catch (e) {}
    }
    if (p.get('modus') === 'unterlagen') zustand.modus = 'unterlagen'
    aufbauen()

    $('#weiter').addEventListener('click', function () {
      if (!pruefen()) return
      if (zustand.schritt < schritte().length - 1) zeigen(zustand.schritt + 1, true)
      else absenden()
    })
    $('#zurueck').addEventListener('click', function () { sammeln(); if (zustand.schritt > 0) zeigen(zustand.schritt - 1, true) })
    $('#form').addEventListener('submit', function (e) { e.preventDefault() })
    $('#form').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'radio') { e.preventDefault(); $('#weiter').click() }
    })
    var timer
    $('#form').addEventListener('input', function (e) {
      var box = e.target.closest && e.target.closest('[data-fehler]')
      if (box) { box.removeAttribute('data-fehler'); var f = box.querySelector('.feld-fehler'); if (f) f.remove() }
      clearTimeout(timer)
      timer = setTimeout(function () { sammeln(); speichern() }, 250)
    })
    $('#form').addEventListener('change', function (e) {
      var box = e.target.closest && e.target.closest('[data-fehler]')
      if (box) { box.removeAttribute('data-fehler'); var f = box.querySelector('.feld-fehler'); if (f) f.remove() }
      sammeln(); speichern()
    })
    $$('.modus-btn').forEach(function (b) { b.addEventListener('click', function () { modusWechseln(b.getAttribute('data-modus')) }) })
    $('#nachreichen').addEventListener('click', function () {
      zustand.modus = 'selbstauskunft'
      modusWechseln('unterlagen')
      zeigen(zustand.werte.vorname && zustand.werte.name && zustand.werte.email ? 1 : 0, true)
    })
    window.addEventListener('beforeunload', function (e) {
      if (sendet) { e.preventDefault(); e.returnValue = '' }
    })

    // Persönlicher Link: Angaben vorausfüllen
    if (zustand.z) {
      fetch(API + '?z=' + encodeURIComponent(zustand.z))
        .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j } }) })
        .then(function (x) {
          if (!x.j || !x.j.ok) {
            zustand.z = ''
            speichern()
            var h = $('#link-hinweis')
            h.textContent = 'Ihr persönlicher Link ist abgelaufen. Sie können die Selbstauskunft trotzdem hier ausfüllen – wir ordnen sie Ihrer Anfrage zu.'
            h.hidden = false
            return
          }
          var d = x.j
          var w = zustand.werte
          if (d.name && !w.name && !w.vorname) {
            var teile = d.name.trim().split(/\s+/)
            w.name = teile.length > 1 ? teile.pop() : teile[0]
            w.vorname = teile.length ? teile.join(' ') : ''
          }
          if (d.firma && !w.firma) w.firma = d.firma
          if (d.email && !w.email) w.email = d.email
          if (d.telefon && !w.telefon) w.telefon = d.telefon
          ;['name', 'vorname', 'firma', 'email', 'telefon'].forEach(function (k) {
            var e = $('#f-' + k)
            if (e && !e.value && w[k]) e.value = w[k]
          })
          if (d.name) $('#lead').textContent = 'Guten Tag ' + d.name + '. Hier ergänzen Sie die Angaben für Ihre Anfrage – in etwa zehn Minuten erledigt. Unterlagen laden Sie direkt mit hoch.'
          speichern()
        })
        .catch(function () {})
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
