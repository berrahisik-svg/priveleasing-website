from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm

for n in ['Light', 'Regular', 'Medium', 'SemiBold']:
    pdfmetrics.registerFont(TTFont('Mona-' + n, f'/tmp/claude-0/form/MonaSans-{n}.ttf'))

INK = HexColor('#16181b'); MUTE = HexColor('#6b6f76'); SOFT = HexColor('#9a9ea5')
FILL = HexColor('#f0efec'); FILL2 = HexColor('#e6e4df'); PAPER = HexColor('#ffffff')
W, H = A4
M = 16 * mm
OUT = '/mnt/user-data/outputs/PRIVE-Kundenunterlagen-und-Selbstauskunft.pdf'
PAGES = 4

c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle('PRIVÉ – Kundenunterlagen und Selbstauskunft')
c.setAuthor('PRIVÉ Luxury Leasing')
af = c.acroForm
seq = [0]


def nid(p):
    seq[0] += 1
    return f'{p}_{seq[0]}'


def text(x, y, s, font='Mona-Regular', size=10, color=INK, spacing=0):
    c.setFont(font, size); c.setFillColor(color)
    c.drawString(x, y, s, charSpace=spacing)


def rtext(x, y, s, font='Mona-Regular', size=10, color=INK):
    c.setFont(font, size); c.setFillColor(color)
    c.drawRightString(x, y, s)


def label(x, y, s, color=MUTE):
    text(x, y, s.upper(), 'Mona-SemiBold', 7.2, color, 1.1)


def field(x, y, w, h=8.2 * mm, name=None, size=10, fill=FILL):
    af.textfield(name=name or nid('f'), x=x, y=y, width=w, height=h, borderWidth=0, fillColor=fill,
                 textColor=INK, fontName='Helvetica', fontSize=size, forceBorder=False)


def labeled(x, y, w, s, h=8.2 * mm, name=None):
    label(x, y, s)
    field(x, y - 2.6 * mm - h, w, h, name=name)
    return y - 2.6 * mm - h


def check(x, y, s, size=4.2 * mm, fsize=10, name=None):
    af.checkbox(name=name or nid('c'), x=x, y=y - 0.6 * mm, size=size, borderWidth=0.8,
                borderColor=INK, fillColor=PAPER, textColor=INK, buttonStyle='check')
    text(x + size + 2.6 * mm, y + 0.35 * mm, s, 'Mona-Regular', fsize)


def section(y, num, title):
    text(M, y, f'{num}', 'Mona-Light', 22, SOFT)
    text(M + 11 * mm, y, title, 'Mona-Medium', 15, INK)
    return y - 10 * mm


def header(sub):
    c.drawImage('/tmp/claude-0/sig/prive-logo-signatur.png', M, H - M - 10 * mm, width=33.9 * mm, height=10 * mm, mask='auto')
    c.setFont('Mona-SemiBold', 7.2); c.setFillColor(MUTE)
    c.drawRightString(W - M, H - M - 4.5 * mm, sub.upper())


def footer(page):
    c.setFillColor(SOFT); c.setFont('Mona-Regular', 7.5)
    c.drawString(M, M - 6 * mm, 'PRIVÉ ist eine Marke der Lead Lab Consulting FZCO, Dubai  ·  info@priveleasing.de  ·  089 41616310  ·  www.priveleasing.de')
    c.drawRightString(W - M, M - 6 * mm, f'Seite {page} von {PAGES}')


def title(y, big, line1, line2=''):
    text(M, y, big, 'Mona-Light', 30, INK)
    y -= 9 * mm
    text(M, y, line1, 'Mona-Regular', 10.5, MUTE)
    if line2:
        y -= 5 * mm
        text(M, y, line2, 'Mona-Regular', 10.5, MUTE)
    return y


def table(y, cols, rows, prefix, rh=6.8 * mm, head=True, sum_row=None, lh=5.2 * mm):
    """cols: [(Überschrift, Breite-Anteil)], rows: Liste von Zeilenbeschriftungen ('' = leer) oder Zahl.
    Felder heißen prefix_<zeile>_<spalte>. Gibt y unterhalb zurück."""
    tw = W - 2 * M
    widths = [tw * f for _, f in cols]
    if head:
        x = M
        for (t, _), w in zip(cols, widths):
            if t:
                text(x + 1 * mm, y, t.upper(), 'Mona-SemiBold', 6.2, MUTE, 0.3)
            x += w
        y -= lh
    n = rows if isinstance(rows, int) else len(rows)
    for r in range(n):
        x = M
        lab = rows[r] if not isinstance(rows, int) else ''
        for ci, w in enumerate(widths):
            if ci == 0 and lab:
                c.setFillColor(FILL2); c.rect(x, y - rh, w - 1 * mm, rh, stroke=0, fill=1)
                text(x + 2 * mm, y - rh + 2.4 * mm, lab, 'Mona-Regular', 8.6, INK)
            else:
                field(x, y - rh, w - 1 * mm, rh, name=f'{prefix}_{r+1}_{ci+1}', size=9)
            x += w
        y -= rh + 1 * mm
    if sum_row:
        x = M
        c.setFillColor(FILL2); c.rect(x, y - rh, tw - widths[-1] - 1 * mm, rh, stroke=0, fill=1)
        text(x + 2 * mm, y - rh + 2.4 * mm, sum_row, 'Mona-Medium', 8.6, INK)
        field(M + tw - widths[-1], y - rh, widths[-1] - 1 * mm, rh, name=f'{prefix}_summe', size=9)
        y -= rh + 1 * mm
    return y


col = (W - 2 * M - 6 * mm) / 2
x1, x2 = M, M + col + 6 * mm

# ================================================================ Seite 1: Kundenunterlagen
header('Kundenunterlagen · Leasing & Finanzierung')
y = H - M - 26 * mm
y = title(y, 'Kundenunterlagen.',
          'Damit wir Ihr Leasing oder Ihre Finanzierung prüfen können, benötigen wir die folgenden Angaben',
          'und Unterlagen. Bitte ausgefüllt mit den Dokumenten an info@priveleasing.de – Rückmeldung in 48 Stunden.')

y -= 14 * mm
y = section(y, '01', 'Kundenangabe')
labeled(x1, y, col, 'Firma / Kunde', name='name'); labeled(x2, y, col, 'Telefonnummer', name='telefon'); y -= 15 * mm
labeled(x1, y, col, 'E-Mail-Adresse', name='email'); labeled(x2, y, col, 'Objekt (Marke, Modell)', name='objekt'); y -= 15 * mm

y -= 4 * mm
y = section(y, '02', 'Benötigte Unterlagen')
docs = [
    'Ausweis des Geschäftsführers oder Inhabers',
    'Handelsregisterauszug bei einer GmbH',
    'Angebot oder Kaufvertragsentwurf für das Fahrzeug mit Kaufpreis',
    'Gewerbeanmeldung',
    'Aktuellster Jahresabschluss',
    'Letzte BWA inklusive Summen- und Saldenliste (SuSa)',
    'Aktuelle BWA inklusive Summen- und Saldenliste (SuSa)',
    'Ausgefüllte Selbstauskunft (Seiten 2 bis 4)',
]
for i, s in enumerate(docs):
    check(x1, y, s, name=f'cb_u{i+1}'); y -= 7.2 * mm

y -= 5 * mm
y = section(y, '03', 'Vertragswunsch')
label(x1, y, 'Vertragsart'); yy = y - 6.5 * mm
check(x1, yy, 'Leasing', name='cb_leasing'); check(x1 + 32 * mm, yy, 'Finanzierung', name='cb_finanzierung')
labeled(x2, y, col * 0.42, 'Gewünschte Laufzeit (Monate)', name='laufzeit')
text(x2 + col * 0.46, y - 8.4 * mm, 'max. 60, länger auf Anfrage', 'Mona-Regular', 8.6, MUTE)
y -= 15 * mm
labeled(x1, y, col * 0.48, 'Anzahlung in EUR', name='anzahlung'); labeled(x1 + col * 0.52, y, col * 0.48, 'oder in Prozent', name='anzahlung_prozent')
label(x2, y, 'Versicherungscheck für das Fahrzeug'); yy = y - 6.5 * mm
check(x2, yy, 'Ja', name='cb_vers_ja'); check(x2 + 22 * mm, yy, 'Nein', name='cb_vers_nein')
y -= 16 * mm
text(x1, y, 'Hinweis zur Anzahlung: Bei einer Finanzierung ist eine Anzahlung erforderlich. Beim Leasing ist sie optional,', 'Mona-Regular', 8.6, MUTE)
y -= 4.3 * mm
text(x1, y, 'kann aber je nach Prüfung verlangt werden.', 'Mona-Regular', 8.6, MUTE)

y -= 13 * mm
c.setFillColor(INK); c.rect(M, y - 22 * mm, W - 2 * M, 26 * mm, stroke=0, fill=1)
text(M + 7 * mm, y - 4 * mm, 'Luxus nach Maß.', 'Mona-Medium', 13, PAPER)
text(M + 7 * mm, y - 11 * mm, 'Sie haben etwas Besonderes gefunden? Wir organisieren die passende Finanzierung oder das passende Leasing –', 'Mona-Regular', 9.2, HexColor('#c9c6bf'))
text(M + 7 * mm, y - 16 * mm, 'ob Uhr, Fahrzeug, Boot oder Privatjet. Sprechen Sie uns an: 089 41616310 · info@priveleasing.de', 'Mona-Regular', 9.2, HexColor('#c9c6bf'))
footer(1)
c.showPage()

# ================================================================ Seite 2: Selbstauskunft 1
header('Selbstauskunft')
y = H - M - 26 * mm
y = title(y, 'Selbstauskunft.',
          'Angaben zu Einkommen, Vermögen und Verpflichtungen – inklusive Ehegatte bzw. Lebenspartner.',
          'Beträge in Euro bzw. in T€ (Tausend Euro), wo angegeben.')

y -= 11 * mm
y = section(y, '01', 'Antragsteller')
labeled(x1, y, col, 'Vor- und Nachname', name='sa_name'); labeled(x2, y, col, 'Vor- und Nachname Ehegatte bzw. Lebenspartner', name='sa_name2'); y -= 14 * mm
labeled(x1, y, col * 0.48, 'Geburtsdatum', name='sa_geb'); labeled(x1 + col * 0.52, y, col * 0.48, 'Familienstand', name='sa_familienstand')
labeled(x2, y, col * 0.48, 'Geburtsdatum', name='sa_geb2'); labeled(x2 + col * 0.52, y, col * 0.48, 'Güterstand', name='sa_gueterstand'); y -= 14 * mm
labeled(x1, y, col * 0.72, 'Beruf / Arbeitgeber', name='sa_beruf'); check(x1 + col * 0.76, y - 8 * mm, 'Selbständig', fsize=9, name='sa_cb_selbst')
labeled(x2, y, col * 0.72, 'Beruf / Arbeitgeber (Partner)', name='sa_beruf2'); check(x2 + col * 0.76, y - 8 * mm, 'Selbständig', fsize=9, name='sa_cb_selbst2'); y -= 14 * mm
labeled(x1, y, col, 'Anschrift', name='sa_anschrift'); labeled(x2, y, col * 0.48, 'Telefon / Mobil', name='sa_tel'); labeled(x2 + col * 0.52, y, col * 0.48, 'Kinder (Zahl / Alter)', name='sa_kinder'); y -= 14 * mm

y -= 6 * mm
y = section(y, '02', 'Einnahmen und Ausgaben (monatlich, in Euro)')
label(x1, y, 'Einnahmen (netto)'); label(x2, y, 'Ausgaben'); y -= 6.5 * mm
ein = [('Gehalt / Rente Antragsteller', 'sa_e_gehalt'), ('Gehalt / Rente Mitantragsteller', 'sa_e_gehalt2'), ('Mieteinnahmen', 'sa_e_miete'), ('Selbständige Tätigkeit', 'sa_e_selbst'), ('Sonstiges Einkommen', 'sa_e_sonst')]
aus = [('Miete + Nebenkosten', 'sa_a_miete'), ('Lebenshaltungskosten', 'sa_a_leben'), ('Beiträge Lebens-/Krankenvers.', 'sa_a_vers'), ('Ratenkredit / Leasing', 'sa_a_kredit'), ('Sonstige Ausgaben (z. B. Unterhalt)', 'sa_a_sonst')]
rh = 6.8 * mm
for (le, ne), (la, na) in zip(ein, aus):
    for xx, lab_, nm in ((x1, le, ne), (x2, la, na)):
        c.setFillColor(FILL2); c.rect(xx, y - rh, col * 0.62 - 1 * mm, rh, stroke=0, fill=1)
        text(xx + 2 * mm, y - rh + 2.3 * mm, lab_, 'Mona-Regular', 8.6)
        field(xx + col * 0.62, y - rh, col * 0.38, rh, name=nm, size=9)
    y -= rh + 1 * mm

y -= 9 * mm
y = section(y, '03', 'Grundvermögen (z. B. EFH, MFH, ETW, Bauland)')
y = table(y, [('', 0.13), ('Bezeichnung, Ort, Eigentumsanteil', 0.39), ('Belastet ja/nein', 0.14), ('Miete p.a. T€', 0.17), ('Verkehrswert T€', 0.17)],
          ['Objekt 1', 'Objekt 2', 'Objekt 3'], 'sa_gv', sum_row='Zwischensumme Verkehrswert in T€')

footer(2)
c.showPage()

# ================================================================ Seite 3: Selbstauskunft 2
header('Selbstauskunft')
y = H - M - 22 * mm
y = section(y, '04', 'Bankguthaben, Bausparguthaben, Wertpapiere')
y = table(y, [('Institut, Kontoinhaber', 0.55), ('Verpfändet (ja/nein)', 0.22), ('Wert in T€', 0.23)], 4, 'sa_bank', sum_row='Zwischensumme in T€')

y -= 9 * mm
y = section(y, '05', 'Kapitallebensversicherungen')
y = table(y, [('Gesellschaft, Bezugsberechtigter', 0.36), ('Vers.-Summe in T€', 0.17), ('Laufzeit bis', 0.14), ('Abgetreten', 0.16), ('Rückkaufwert T€', 0.17)], 3, 'sa_lv', sum_row='Zwischensumme Rückkaufwert in T€')

y -= 9 * mm
y = section(y, '06', 'Sonstige Vermögensgegenstände (z. B. Firmenbeteiligungen)')
y = table(y, [('Art, Eigentümer', 0.40), ('Anmerkungen', 0.37), ('Wert in T€', 0.23)], 3, 'sa_sv', sum_row='Zwischensumme in T€')

y -= 9 * mm
y = section(y, '07', 'Verbindlichkeiten')
y = table(y, [('Kreditinstitut / Gläubiger', 0.28), ('Art, Schuldner', 0.28), ('Ursprung T€', 0.15), ('Zins + Tilgung p.a. T€', 0.15), ('Restschuld T€', 0.14)], 5, 'sa_vb', sum_row='Zwischensumme Restschuld in T€')
text(M, y - 1.5 * mm, 'Bei Baufinanzierungen bitte das entsprechende Objekt aus Abschnitt 03 angeben.', 'Mona-Regular', 8, MUTE)

footer(3)
c.showPage()

# ================================================================ Seite 4: Selbstauskunft 3
header('Selbstauskunft')
y = H - M - 22 * mm
y = section(y, '08', 'Sonstige Verpflichtungen (Bürgschaften, Steuernachzahlungen, Leasing)')
y = table(y, [('Art / Gegenstand', 0.30), ('Fälligkeit', 0.16), ('Anmerkungen, Verpflichteter', 0.34), ('Restverpflichtung T€', 0.20)], 4, 'sa_sp', sum_row='Zwischensumme in T€')

y -= 10 * mm
text(M, y, 'Zusammenfassung', 'Mona-Medium', 15, INK)
y -= 10 * mm
# Bilanz
rh = 7.4 * mm
for lab_, nm in [('Vermögenswerte in T€ (Summe 03 bis 06)', 'sa_summe_vermoegen'), ('Verbindlichkeiten in T€ (Summe 07 und 08)', 'sa_summe_verbind'), ('Freie Vermögenswerte in T€', 'sa_summe_frei')]:
    c.setFillColor(FILL2); c.rect(M, y - rh, W - 2 * M - 50 * mm - 1 * mm, rh, stroke=0, fill=1)
    text(M + 2 * mm, y - rh + 2.3 * mm, lab_, 'Mona-Medium', 8.6)
    field(W - M - 50 * mm, y - rh, 50 * mm, rh, name=nm, size=9)
    y -= rh + 1 * mm

y -= 10 * mm
text(M, y, 'Bestätigung', 'Mona-Medium', 15, INK)
y -= 8 * mm
text(M, y, 'Ich / wir bestätige(n) die Richtigkeit und Vollständigkeit der gemachten Angaben. PRIVÉ darf diese Angaben', 'Mona-Regular', 9.5, INK)
y -= 4.8 * mm
text(M, y, 'zur Prüfung an ausgewählte Leasing- und Finanzierungspartner weitergeben. Eine Bonitätsprüfung erfolgt', 'Mona-Regular', 9.5, INK)
y -= 4.8 * mm
text(M, y, 'erst nach gesonderter Zustimmung.', 'Mona-Regular', 9.5, INK)
y -= 16 * mm
w3 = (W - 2 * M - 12 * mm) / 3
labeled(M, y, w3, 'Ort, Datum', h=9 * mm, name='sa_ort_datum')
labeled(M + w3 + 6 * mm, y, w3, 'Unterschrift Antragsteller', h=9 * mm, name='sa_unterschrift')
labeled(M + 2 * (w3 + 6 * mm), y, w3, 'Unterschrift Partner', h=9 * mm, name='sa_unterschrift2')
footer(4)
c.save()
print('ok', OUT)
