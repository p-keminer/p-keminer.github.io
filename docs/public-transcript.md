# Öffentlicher Notenspiegel

Die Leistungsnachweis-Seite zeigt einen kumulativen Notenspiegel mit Stand
26.09.2026. Beide Seiten sind als Vorschau vorhanden; Öffnen und Download führen
zu derselben bereinigten PDF. Es gibt keine Semesterauswahl oder leeren Platzhalter.

## Bereinigung

Entfernt sind Privatadresse, Matrikelnummer, Geburtsdatum und Geburtsort. Name,
Studiengang, Leistungen, Noten, ECTS, Fachsemester und Ausstellungsdatum bleiben.

`scripts/prepare_public_transcript.py` ist bewusst an den SHA-256-Prüfwert der
visuell geprüften Quelldatei gebunden. Die Quelle muss außerhalb des Repositorys
bleiben. Das Skript rendert lokal mit Poppler bei 300 dpi und ersetzt die Pixel in
fünf festgelegten Bereichen durch Schwarz. Die PDF wird anschließend vollständig
neu aus den bereinigten RGB-Pixeln aufgebaut. Kein Original-PDF-Objekt wird kopiert.

Die Ausgabe enthält weder Text-/OCR-Ebene noch Anhänge, Metadaten, Kommentare,
Formularfelder, Masken, ausgeblendete Ebenen oder inkrementelle Vorgängerversionen.
Die Schwärzungen können in dieser Datei nicht als aufliegende Rechtecke entfernt
werden, um darunterliegende Daten sichtbar zu machen. Das unveränderte private
Original bleibt separat erhalten; andere bereits vorhandene Kopien werden nicht
bereinigt. Diese öffentliche Kopie ist eine bearbeitete Darstellung des Nachweises.

Die visuelle Qualität bleibt mit 300 dpi hoch. Der bewusste Nachteil dieses
Verfahrens: Der PDF-Text lässt sich nicht durchsuchen, markieren oder von einem
Screenreader auslesen. Die übrigen Seiteninhalte werden nicht verändert.

## Erzeugung und Prüfung

Benötigt werden Python mit Pillow, pdfplumber und pypdf sowie Poppler (`pdftoppm`).

```sh
python scripts/prepare_public_transcript.py /privater/pfad/notenspiegel.pdf --output-dir output/pdf
```

Die Originalbilder entstehen nur in einem temporären Verzeichnis außerhalb des
Repositorys und werden beim Verlassen entfernt. Das Skript prüft schwarze Pixel
in allen Feldern, unveränderte Pixel außerhalb der Felder, die minimale
PDF-Objektstruktur, fehlenden Text und fehlende private Werte in dekodierten
Streams. Der lokale Prüfbericht enthält keine privaten Feldwerte.

Vor einer Übernahme müssen alle PDF-Seiten visuell geprüft werden. Eine unabhängige
Kontrolle vergleicht die Masken mit den Quelltextpositionen und die extrahierten
PDF-Bilder mit den Vorschauen. Erst dann die drei Dateien nach
`public/assets/leistungsnachweise/` übernehmen. Das Original, unbereinigte Bilder
und Arbeitsdateien gehören niemals in `public/`, `dist/` oder Git.

`scripts/public_transcript_manifest.json` enthält die Prüfsummen der freigegebenen
PDF und beider PNGs. Der Produktionsbuild verlangt in `public` und `dist` genau
diese drei Dateien mit identischen Prüfsummen. Das verhindert versehentliches
Ausliefern zusätzlicher oder ausgetauschter Dokumente. Es ersetzt keine erneute
Datenschutzprüfung bei einem späteren Nachweis.

Für ein neues Dokument zuerst jede Seite und alle privaten Felder prüfen, dann
Masken und Quellen-Prüfsumme bewusst aktualisieren. Erst nach erneuter technischer
und visueller Kontrolle das Manifest aktualisieren und `npm run build` ausführen.
