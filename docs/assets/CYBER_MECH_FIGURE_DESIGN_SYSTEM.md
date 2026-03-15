# Cyber-Mech Figure Design System

Dieses Dokument definiert die Formensprache fuer alle sechs Schachfiguren, bevor finale Blender-Modelle gebaut werden.

Die Stilrichtung wird zusaetzlich durch die Referenzbilder unter `public/models/vision/` gebunden. Dieses Dokument beschreibt die Rollenlogik; die Referenzbilder und `VISION_STYLE_BIBLE.md` definieren die aktuelle visuelle Familie.

Ziel:

- dieselbe Stilwelt fuer alle Figuren
- klare Silhouette pro Figur
- direkte Uebersetzung aus der bestehenden Motion Language in Form
- belastbare Grundlage fuer Blender-Blockouts

## Design-Prinzipien

Die Figuren sollen nicht wie Fantasy-Charaktere oder lebendige Wesen wirken, sondern wie taktische Mech-Einheiten.

Gemeinsame Leitlinien:

- praezise statt weich
- mechanisch statt organisch
- lesbar statt ueberdetailiert
- gewichtete Masse statt chaotischer Komplexitaet
- modulare Bauteile statt glatter Skulpturen
- klare Front- und Rueckseite
- starke Primarsilhouette pro Figur schon im Blockout

## Gemeinsame Weltlogik

Alle Figuren gehoeren in dieselbe Welt und teilen deshalb dieselbe visuelle Grammatik:

- Chassis: harte Panzersegmente, Servogelenke, Energiekerne, sichtbare Trennfugen
- Mechanik: Schieber, Kolben, Gelenkplatten, Stabilisatoren, Energiekanal-Linien
- Materialitaet: mattes Metall, beschichtete Panzerplatten, wenige emissive Akzente
- Proportion: stabile Basis, kompakter Schwerpunkt, klar lesbarer Oberbau
- Bewegung: Form soll Preload, Servo-Snap, Impact-Recoil und Settle glaubhaft machen

## Farb- und Materialsystem

Farbtrennung soll spaeter weiterhin weitgehend im Web oder ueber flexible Materialvarianten moeglich bleiben.

Material-Basis:

- Grundmaterial: dunkles gunmetal oder warmes titan-grau
- Sekundaermaterial: matter Keramik- oder Verbundplatten-Look
- Mechanikmaterial: dunkler Stahl fuer Gelenke, Schienen, Kolben
- Energieakzente: emissive Linien, Linsen oder Kernspalten

Farbidee fuer Teams:

- Weiss: helles titan/ivory alloy mit gold-warmen Akzenten
- Schwarz: dunkles gunmetal/obsidian alloy mit kupfer-orangen Akzenten

Akzentregel:

- pro Figur nur 1 bis 2 kleine Energiezonen
- keine grossen leuchtenden Flaechen
- Emissive Akzente muessen die Rolle unterstuetzen
- dieselbe Rollenlogik gilt ueber alle Figuren: `sensor` fuer Augen/Linsen/Visoren, `core` fuer Herzen oder offene Kerne, `command` fuer Embleme/Sigils/Kommandomarker
- `sensor` darf zwischen Teams wechseln, `core` und `command` muessen aber in der Familie konsistent bleiben, damit Energie- und Befehlslesbarkeit aus der Brettkamera sofort sitzt
- King-Sonderregel: sein Auge darf bewusst wie ein `command`-Marker lesen, wenn Emblem und Blick als ein gemeinsamer Befehlsakzent gedacht sind

## Silhouette-Regeln

Jede Figur braucht drei klare Ebenen:

1. Basisform: Gewichtsklasse und Standfestigkeit
2. Mittelbau: Hauptmasse und mechanischer Kern
3. Kopf/Krone/Sensorform: Identitaet aus Distanz

Lesbarkeitsregeln:

- Pawn und King duerfen nicht verwechselt werden
- Queen muss aus Distanz sofort elitera und komplexer wirken als Bishop
- Rook braucht die blockigste Silhouette
- Knight braucht die dynamischste Vorwaertsrichtung
- Bishop braucht die eleganteste diagonale Lesbarkeit

## Bewegungslogik in Form uebersetzen

Die bestehende Motion Language soll direkt in Geometrie uebersetzt werden:

- `preloadAmount`: sichtbare Rueckzugs- oder Spannelemente
- `servoSnap`: harte Segmentwechsel, definierte Gelenke, lineare Fuehrungen
- `mechanicalOvershoot`: Schlitten, Klingen, Stossplatten oder vorfahrende Bauteile
- `impactRecoil`: massive Frontteile, Rueckstoss-faehige Sektionen, Dampf-/Energiekernlogik ohne VFX
- `settleAmount`: verschiebbare Sekundaerplatten, Antennen, Finnen oder Balance-Flaps
- `weightClass`: Masseverteilung, Basisbreite, Oberbau-Volumen

## Shared Part Library

Diese Teile duerfen sich quer durch alle Figuren wiederholen:

- Standpads, Fusssegmente oder Magnet-Fuesse
- zentrale Core-Spine
- Gelenkhaeuser
- Panzerplatten mit Trennfugen
- Sensorlinsen
- Energiekanal-Rillen
- kleine Heat-Sink- oder Finnenmotive

Das haelt die Welt konsistent, obwohl jede Figur ihre eigene Rolle hat.

## Figurenprofile

### Pawn

Rolle:

- Scout hexapod
- leichte Vorwaerts-Aufklaerungseinheit
- expendable frontline unit

Gewichtsklasse:

- light

Silhouette:

- kompakter Pod-Korpus mit klarer Frontlinse
- sechs einfache, elegante Laufbeine statt humanoider Torso-/Arm-Logik
- helle Schale ueber dunkler Bein- und Gelenkstruktur
- klare Front ueber zentrales Sensorauge und ruhiges Frontpanel
- keine klassische Schachbasis, kein humanoider Brustkorb

Formmotive:

- flacher, weich gefaster Hauptkoerper mit grosser Frontlinse
- zwei kleine Seitenfenster oder Statuslichter
- drei Beinpaare mit schlankem Segmentaufbau
- vordere Beine duerfen leicht sichel- oder greiferartig lesen, aber nicht aggressiv werden
- kleine Antennen nur, wenn sie klar aus der Referenzrichtung kommen
- ruhige, grosse Flaechen statt humanoider Schulter- oder Kopf-Lesbarkeit

Bewegungscharakter:

- kurzes Ankrabbeln oder Vorschieben
- leichtes Absenken des Korpus vor dem Stoss
- schnelle, knappe Beinmechanik

Combat-Gefuehl:

- schneller Stich oder kurzer Vorwaertsdruck
- wenig Masse, aber praezise Ausrichtung
- effizient statt heroisch

Materialidee:

- glatte Sensorhaube mit wenigen Panelbruechen
- helle Schalen ueber dunkler Struktur
- cyanfarbene Sensor- und Statuslichter

Erlaubte bewegliche Teile:

- sechs Beine
- zentrale Sensorlinse
- kleine Antennen oder Rueckenmodule

Blender-Blockout:

- 4 bis 5 Hauptvolumen: Hauptkoerper, Frontlinse, Seitenmodule, obere Beinsegmente, untere Fangbeine
- Front ueber zentrales Auge und Frontpanel lesen lassen; keine humanoide Kopf-/Brust-Silhouette
- Footprint ueber drei Beinpaare und deren Spreizung loesen, nicht ueber einen Sockel
- Beine nur als grosse Segmente andeuten; klare Attachment-Rails und Joint-Pods sind erlaubt, aber keine feinen Gelenke, Klauen oder Kabel
- mittlere Beine duerfen als primaere Stuetze lesbarer sein als vordere und hintere Sekundaerbeine
- aus der Board-Kamera muss die Figur wie eine kleine taktische Hexapod-Unit wirken, nicht wie ein humanoider Mini-Mech
- klar von `rook` und `bishop` unterscheidbar: runderer Sensorkorpus, mehr Beinlogik, weniger vertikale Masse
- visuell naeher an `public/models/vision/bauer.png` als an einem frei interpretierten Cyber-Mech

### Rook

Rolle:

- Fortress mech
- Heavy ram block
- linienhaltende Durchbruchseinheit

Gewichtsklasse:

- heavy

Silhouette:

- breiteste Basis aller Figuren
- blockiger Turmaufbau
- hohe Schultermasse
- frontale Schutzplatten

Formmotive:

- Bastionsform
- stacked armor
- vertikale Schachtsegmente
- rammfaehige Frontplatte

Bewegungscharakter:

- schwer
- linear
- kaum elegant
- mehr Druck als Speed

Combat-Gefuehl:

- langsames, massives Anfahren
- dominanter Front-Impact
- minimale, aber schwere Reaktion

Materialidee:

- dicke Panzerplatten
- grobe mechanische Trennfugen
- wenige, tiefe Energiekanal-Zonen

Erlaubte bewegliche Teile:

- Front-Ram-Plate
- Schulter-/Seitenplatten
- kurzer Recoil-Schlitten im Mittelbau

Blender-Blockout:

- zuerst Quaderlogik statt Details
- obere Silhouette fast wie gepanzerter Turm
- Schwerpunkt muss sehr tief wirken

### Knight

Rolle:

- Assault jumper
- agile strike unit
- schnelle Durchbruchs- oder Flankiereinheit

Gewichtsklasse:

- striker

Silhouette:

- deutlich nach vorne geneigte Haltung
- dynamischste Frontsilhouette
- markanter Sensor-/Kopfbereich
- asymmetrisch moeglich, aber kontrolliert

Formmotive:

- sprungbereite Vordersektion
- hintere Schub-/Stabilisator-Module
- geknickte Energieachse
- angedeuteter "mech steed"-Charakter ohne echten Pferdekopf

Bewegungscharakter:

- sprungartig
- dashhaft
- kurze explosive Vorwaertsenergie

Combat-Gefuehl:

- sichtbar vorgespannt
- schnelle Freisetzung
- aggressivster Einstieg nach der Queen

Materialidee:

- gemischte Panzer- und Mechanikflaechen
- mehr sichtbare Gelenke

Erlaubte bewegliche Teile:

- Schulter-/Vorderarme
- Rueckenschubmodule
- Stabilisator-Finnen

Blender-Blockout:

- Frontsilhouette zuerst definieren
- aus Seitenansicht muss die Sprunglogik lesbar sein
- keine echte Tieranatomie nachbauen

### Bishop

Rolle:

- precision diagonal unit
- elegante Schraegachsen-Einheit
- kontrollierte Strike-Plattform

Gewichtsklasse:

- precision

Silhouette:

- schlanker als Rook und King
- hoeherer vertikaler Fokus
- saubere, geschlossene Linie
- weniger Massigkeit, mehr Praezision

Formmotive:

- diagonale Schneiden- oder Lamellenlogik
- fokussierter Sensorkopf
- langgezogene Mittelachse
- praezise Seitenflaechen

Bewegungscharakter:

- gleitend
- kontrolliert
- technisch elegant

Combat-Gefuehl:

- kein roher Druck
- sauberer diagonaler Eingriff
- fast wie eine gefuehrte Schneidbewegung

Materialidee:

- feinere Plattenunterteilung
- praezise Rillen und Kanalzonen
- kuehlere Energieakzente

Erlaubte bewegliche Teile:

- Seitenlamellen
- Fokuskopf
- schmale Balance-Flaps

Blender-Blockout:

- zuerst klare Mittelachse
- dann diagonale Formmotive einarbeiten
- darf nie wie eine duenne Queen wirken

### Queen

Rolle:

- elite multi-vector combat unit
- staerkste und vielseitigste Angriffsfigur
- mobile Dominanzplattform

Gewichtsklasse:

- elite

Silhouette:

- komplexeste Figur
- klar koeniglicher, aber aggressiver als King
- breite Schultern plus dominante Obersektion
- mehrere gerichtete Linien statt nur einer

Formmotive:

- Krone als Sensor-/Command-Array
- mehrlagige Schulter- oder Rueckenelemente
- elegante Klingen- oder Fluegelmotive
- zentraler Hochenergie-Kern

Bewegungscharakter:

- dominant
- schnell
- kontrolliert
- erweitert den Raum sichtbar

Combat-Gefuehl:

- groesster Vorwaertsanspruch
- hoechste Angriffsreichweite im Ausdruck
- elite, nicht chaotisch

Materialidee:

- hoechster Materialkontrast
- feinere emissive Linien
- eliterae Oberflaechen als bei den anderen Figuren

Erlaubte bewegliche Teile:

- Crown-array
- Ruecken- oder Schulterflaechen
- Frontsegmente mit leichtem Ausfahren

Blender-Blockout:

- erst Primarsilhouette
- dann Sekundaerkrone
- nicht zu filigran werden lassen

### King

Rolle:

- command core
- zentrale Autoritaetseinheit
- schwer, kontrolliert, unerschuetterlich

Gewichtsklasse:

- command

Silhouette:

- am staerksten zentriert
- breit, hoch, stabil
- nicht schnell, aber dominant
- ruhige Symmetrie

Formmotive:

- Command tower
- massiver Brust-/Kernblock
- Kronenantenne oder Befehlsarray
- stark geschuetzter Zentralreaktor

Bewegungscharakter:

- kurzer schwerer Vorstoss
- kaum Verschwendung
- maximale Autoritaet

Combat-Gefuehl:

- Druck, nicht Hektik
- kontrolliertes Vorschieben
- zentraler Machtkern statt Showmanship

Materialidee:

- dicke Schichten
- hochwertige Command-Surfaces
- wenige, aber starke Energieakzente

Erlaubte bewegliche Teile:

- Brust-/Core-Plate
- Crown-array
- Schulterpanzer mit leichtem Settle

Blender-Blockout:

- Symmetrie zuerst
- Schwerpunkt klar in die Mitte
- darf nie wie ein langsamer Rook wirken

## White vs Black Varianten

Die Geometrie sollte moeglichst identisch bleiben. Unterschiede kommen spaeter bevorzugt ueber:

- Materialfarben
- Emissive Farbtemperatur
- kleinere Oberflaechenakzente

Weiss:

- heller, sauberer, command-grade

Schwarz:

- dunkler, schwerer, kampfbenutzter

## Blender Blockout Regeln

Fuer den ersten Blockout pro Figur:

- nur grosse und mittlere Volumen
- keine Mikrodetails
- keine finalen Oberflaechen
- klare Front lesen lassen
- aus Top-, Front-, Side-View pruefen
- in Distanz auf Brettgroesse testen

Pro Figur zuerst liefern:

1. Primarsilhouette
2. Basis + Schwerpunkt
3. 1 bis 2 charakteristische Formmotive
4. 1 klares mechanisches Bewegungelement

## Mechanisch erlaubte Bewegung pro Figur

Pawn:

- Front-Stossplatte, Rueckenfinne

Rook:

- Ram-Plate, Seitenpanzer, Mittel-Schlitten

Knight:

- Frontsektion, Stabilisatoren, Rueckenschubmodule

Bishop:

- Seitenlamellen, Fokuskopf, Balance-Flaps

Queen:

- Crown-array, Schulter-/Rueckenelemente, Frontsegmente

King:

- Core-Plate, Crown-array, Schulterpanzer

## Ableitung in spaetere VFX/SFX

Dieses Design-System soll spaeter direkt anschlussfaehig sein fuer:

- Sparks bei schweren Impact-Zonen
- energy hit accents aus den Kernspalten
- servo sound cues fuer bewegliche Segmente
- materialbezogene Trefferreaktionen

Noch nicht Teil dieses Dokuments:

- finale VFX
- finale SFX
- Rigging
- Clip-Animationen

## Design Review Checklist

Vor jedem finaleren Blender-Pass pruefen:

- Ist die Figur aus Distanz sofort lesbar?
- Passt die Masse zur Gewichtsklasse?
- Passt die Form zur bestehenden Motion Language?
- Hat die Figur 1 bis 2 klare mechanische Gimmicks statt zehn kleiner Ideen?
- Ist sie klar von den anderen fuenf unterscheidbar?
- Wirkt sie wie dieselbe Welt?

## Naechster direkter Anschluss

Direkt aus diesem Dokument ableitbar:

1. Blender Blockout pro Figur
2. Vergleichsansichten fuer alle sechs Einheiten
3. Material- und Emissive-Testset
4. spaeter kleine thematische VFX/SFX
