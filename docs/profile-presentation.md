# Markierbare Profilansicht

Das Profil unter `public/ueber-mich/` bietet eine durchgehend markierbare Ansicht
mit einem per Tastatur bedienbaren Sprachschalter für Deutsch und Englisch. Farben,
Schriften, Koordinaten, Abschnittsgrößen und Wortanimationen stammen aus den
vorhandenen acht SVG-Dateien in `assets/`. Die feste Gestaltung hat weiterhin
eine Mindestbreite von 48rem und ist auf schmalen Bildschirmen horizontal scrollbar.

Die sichtbaren Texte sind native SVG-Textknoten und lassen sich auswählen und
kopieren. Ein separater, nur visuell ausgeblendeter HTML-Textbaum enthält
Überschriften, Absätze, Listen und die Tech-Stack-Begriffe für assistive Technik.
Die redundanten SVGs sind `aria-hidden`, damit Inhalte nicht doppelt vorgelesen
werden. Projektbeschreibungen stehen außerhalb der knapp benannten Projektlinks,
damit deren `aria-label` keine Beschreibungen verdeckt. Die Links haben sichtbare
Fokusrahmen. Das Ziehen der Linkadresse ist deaktiviert, damit auch Text innerhalb
der Projektkarten mit der Maus markiert werden kann.

Beim Sprachwechsel werden Darstellung und semantische Inhalte gemeinsam ersetzt
und die Wortanimationen beginnen neu. Die gewählte Sprache steht im URL-Parameter
`lang`; beispielsweise öffnet `/ueber-mich/?lang=en` die englische Fassung.

Die ursprünglichen SVG-Dateien enthalten jeweils das gesamte Profil und schneiden
es nur per `viewBox` zu. Für die Profilansicht erzeugt dieser Befehl bereinigte
Abschnitte, die jeden sichtbaren Text und seine Animation genau einmal enthalten:

```sh
python scripts/generate_profile_text_graphics.py
```

Das Ergebnis `public/ueber-mich/profile-text-graphics.js` wird mit eingecheckt.
Der Browser importiert das lokale Modul; ein Runtime-Fetch oder eine Lockerung
der Content Security Policy ist nicht nötig. Die SVG-Daten für beide Sprachen
betragen derzeit ungefähr 12kB gzip. Die vier Original-SVG-Bilder werden zur
Laufzeit nicht zusätzlich geladen; sie bleiben die Quellen für den Generator.

Bei Änderungen an der Originalgrafik das Modul neu erzeugen und die semantischen
HTML-Vorlagen in `public/ueber-mich/index.html` inhaltlich mitziehen. Die vier
`data-profile-segment`-Markierungen trennen Intro, Roboterarm, Alarmanlage und
restliches Profil. Anschließend prüfen:

```sh
python scripts/generate_profile_text_graphics.py --check
npm run build
```

Zusätzlich beide Sprachen im Browser vergleichen, die Projektkarten per Tastatur
fokussieren und ihren sichtbaren Text markieren. Der Generator prüft Quellen und
Schnittgrenzen, ersetzt aber keine Browserprüfung von Schriften und Auswahl.
