/**
 * Einwilligungstexte der Online-Selbstauskunft (Stand 10/2026).
 * Grundlage: Selbstauskunft-Vorlage von Volkan Ertas, angepasst auf PRIVÉ (Platin RE GmbH).
 * Dieselben Texte stehen wörtlich auf public/selbstauskunft/index.html – bei Änderungen beide Stellen anpassen.
 */
export const TEXTE_STAND = '10/2026'

export const ANBIETER = 'PRIVÉ (Platin RE GmbH, Brauerstraße 12 A, 76135 Karlsruhe)'

export const EINWILLIGUNGEN = [
  {
    key: 'ein_vollmacht',
    titel: 'Vollmacht und Auskunftsanfrage',
    text:
      `Ich bevollmächtige ${ANBIETER}, im Rahmen meiner Leasing- oder Finanzierungsanfrage diese Selbstauskunft und die beigefügten Unterlagen an Leasinggesellschaften, Banken und weitere Finanzierungspartner weiterzugeben und dort Angebote einzuholen. ` +
      'PRIVÉ und diese Partner sind berechtigt, zur Prüfung meiner Kreditwürdigkeit Auskünfte bei der SCHUFA Holding AG und weiteren Auskunfteien sowie beim Grundbuchamt, Güterrechtsregister oder Einwohnermeldeamt einzuholen.',
  },
  {
    key: 'ein_daten',
    titel: 'Einwilligung zur Datenverarbeitung',
    text:
      'Ich willige ein, dass PRIVÉ und die angefragten Leasing- und Finanzierungspartner meine personenbezogenen Daten, die im Rahmen der Anfrage, des Vertragsabschlusses und der vereinbarungsgemäßen Abwicklung erhoben werden, zum Zweck der Vertragsanbahnung und Vertragserfüllung bis zum Ablauf der gesetzlichen Aufbewahrungspflicht speichern, verarbeiten, zum Zweck der Refinanzierung an Dritte übermitteln, verändern oder löschen. ' +
      'Diese Einwilligung und die Einwilligung zur Datenübermittlung an die SCHUFA kann ich jederzeit ohne Angabe von Gründen widerrufen, zum Beispiel per E-Mail an info@priveleasing.de.',
  },
  {
    key: 'ein_hinweise',
    titel: 'Datenschutzhinweise und SCHUFA-Informationsblatt',
    text:
      'Ich bestätige, die Datenschutzhinweise von PRIVÉ (www.priveleasing.de/datenschutz) und das SCHUFA-Informationsblatt nach Art. 14 DSGVO (www.schufa.de/datenschutz) erhalten und zur Kenntnis genommen zu haben.',
  },
  {
    key: 'ein_richtig',
    titel: 'Richtigkeit der Angaben',
    text: 'Ich versichere ausdrücklich die Richtigkeit und Vollständigkeit der gemachten Angaben.',
  },
]

export const SCHUFA_HINWEIS = {
  titel: 'Datenübermittlung an die SCHUFA',
  absaetze: [
    'Die angefragten Leasing- und Finanzierungspartner übermitteln im Rahmen des Vertragsverhältnisses erhobene personenbezogene Daten über die Beantragung, die Durchführung und Beendigung dieser Geschäftsbeziehung sowie Daten über nicht vertragsgemäßes oder betrügerisches Verhalten an die SCHUFA Holding AG, Kormoranweg 5, 65201 Wiesbaden. Rechtsgrundlagen dieser Übermittlungen sind Artikel 6 Absatz 1 Buchstabe b und Artikel 6 Absatz 1 Buchstabe f der Datenschutz-Grundverordnung (DSGVO). Übermittlungen auf der Grundlage von Artikel 6 Absatz 1 Buchstabe f DSGVO dürfen nur erfolgen, soweit dies zur Wahrung berechtigter Interessen des jeweiligen Partners oder Dritter erforderlich ist und nicht die Interessen oder Grundrechte und Grundfreiheiten der betroffenen Person, die den Schutz personenbezogener Daten erfordern, überwiegen. Der Datenaustausch mit der SCHUFA dient auch der Erfüllung gesetzlicher Pflichten zur Durchführung von Kreditwürdigkeitsprüfungen (§§ 505a und 506 des Bürgerlichen Gesetzbuches).',
    'Die SCHUFA verarbeitet die erhaltenen Daten und verwendet sie auch zum Zwecke der Profilbildung (Scoring), um ihren Vertragspartnern im Europäischen Wirtschaftsraum und in der Schweiz sowie gegebenenfalls weiteren Drittländern (sofern zu diesen ein Angemessenheitsbeschluss der Europäischen Kommission besteht oder Standardvertragsklauseln vereinbart wurden, die unter www.schufa.de eingesehen werden können) Informationen unter anderem zur Beurteilung der Kreditwürdigkeit von natürlichen Personen zu geben. Nähere Informationen zur Tätigkeit der SCHUFA können dem SCHUFA-Informationsblatt nach Art. 14 DSGVO entnommen oder online unter www.schufa.de/datenschutz eingesehen werden.',
  ],
}
