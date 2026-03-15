# Blockout Models

Hier liegen parallele Review-GLBs fuer fruehe Cyber-Mech-Blockouts.

## Aktueller Stand

- Aktuell existieren `pawn.glb`, `bishop.glb`, `rook.glb`, `knight.glb`, `queen.glb` und `king.glb`.
- Diese Dateien sind bewusst Review-Assets und ersetzen das Starter-Set noch nicht.
- Der Pawn wird aktuell als kleiner Hexapod-Scout aus `docs/assets/blender/bauer.blend` gedacht.
- Der Bishop wird aktuell als schlanker, vertikaler Vision-Blockout aus `docs/assets/blender/laeufer.blend` gedacht.
- Der Rook wird aktuell als kompakter Heavy-Unit-Blockout mit zentralem Rad-Chassis aus `docs/assets/blender/turm.blend` gedacht.
- Der Knight wird aktuell als schwebender Vision-Blockout aus `docs/assets/blender/springer.blend` gedacht.
- Die Queen wird aktuell als aus der aktiven Blender-Szene uebernommener Regal-/Command-Blockout aus `docs/assets/blender/dame.blend` gedacht.
- Der King wird aktuell als massiver Command-Mech-Blockout aus `docs/assets/blender/koenig.blend` gedacht.

## Konventionen

- Dateinamen folgen derselben Figurenlogik wie das Starter-Set.
- Die Web-App adressiert diese Modelle unter `/models/blockout/{piece}.glb`.
- Fehlende Blockout-Dateien fallen pro Typ auf `/models/{piece}.glb` zurueck.
- Die intendierte Front soll nach Import in Template-Space entlang `+Z` lesbar sein.
- Footprint und Standlogik sollen ueber die Figur selbst geloest werden, beim Pawn aktuell ueber drei Beinpaare statt ueber einen Schach-Pedestal.
- Fuer `blockout`-Assets nutzt die Web-App jetzt eine feste Familienpalette: ein gemeinsames Weiss fuer Hauptkoerper, ein gemeinsames Struktur-Dunkelblau fuer Sekundaerteile und ein gemeinsames Hellblau fuer Augen/Linsen/Visoren sowie ausgewaehlte Signalteile.
- Darauf sitzt jetzt eine feste Neon-Regel fuer alle Highlight-Teile: `sensor` fuer Augen/Linsen/Visoren, `core` fuer Herzen, `command` fuer Embleme und andere Kommandomarker.
- `sensor` ist bei Weiss cyan und bei Schwarz klares Neon-Rot, `core` ist bei Weiss pink-rot und bei Schwarz ebenfalls klares Neon-Rot, `command` bleibt amber/orange; diese Teile bekommen in der App immer Emission statt nur flacher Farbe.
- `blockout/king.glb` ist aktuell die Ausnahme dazu und behaelt fuer weisse Figuren weite Teile seiner exportierten Blender-Materialfarben; nur die Familien-Neons und die aeusseren Trim-Ringe werden gezielt in die Web-Regeln gezogen.
- Beim King greift innerhalb dieser Regel eine klare Ausnahme: Auge und Emblem nutzen beide das `command`-Neon, damit der Kopf denselben Marker wie das Emblem traegt.
- `springer_eye_ring` sowie die aeusseren King-Ringe um Auge und Emblem sind fest `trim`: Weiss dunkelblau, Schwarz gold.
- `rook_core_shield` laeuft als Sensor-Signal: Weiss hellblaues Neon, Schwarz neonrot.
- Das weisse Laeufer-Herz laeuft ebenfalls ueber den hellblauen Sensor-Zweig statt ueber den roten Core-Zweig.
- Bei schwarzen `blockout/king.glb`-Figuren bleiben nur Auge und Highlight in den exportierten Blender-Farben; die aeusseren Ringe und Crown-Teile werden bewusst auf das Familien-Gold gezogen.
- Schwarze Blockout-Figuren verwenden eine stark abgedunkelte Gegenvariante dieser festen Familienpalette, damit der Hauptkoerper klar Richtung Schwarz statt Richtung Braun liest.
- Fuesse, Schultern, normale Shields sowie aeussere und innere Radteile bleiben in der Grundfarbe und werden nicht der blauen Strukturgruppe zugeordnet.
- Beim Knight bleibt `springer_eye_ring` bewusst ein Struktur-/Trim-Teil statt Grundkoerper: bei Weiss liest der Ring deshalb dunkelblau, bei Schwarz gold.
- Der Knight bekommt in der Web-App einen sehr starken positiven Ground-Nudge, damit der Koerper klar als schwebende Einheit ueber dem Brett liest.
- `blockout/queen.glb` ist aktuell bewusst ein 1:1-Szenenexport: auch fremd benannte `knight_*`- oder `koenig_*`-Teile aus der aktiven Szene bleiben im Asset und werden nicht nach Namen herausgefiltert.

## Naechster Ausbau

- weitere Feinpässe an Familienproportionen, Loader-Mapping und eventuellen Queen-Sonderregeln nach Review
