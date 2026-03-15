# ROADMAP

## Nordstern

Ein browserbasiertes 3D-Schachspiel aufbauen, das zuerst spielerisch korrekt funktioniert und danach systematisch visuell und funktional ausgebaut wird.

## Prioritaetsregel

Immer zuerst:

1. korrekte Regeln
2. saubere Architektur
3. stabile Interaktion
4. erst danach visuelle Veredelung

## Phase 1 - Spielkern ohne schoenes 3D

Ziel: Ein voll spielbares lokales Schach mit Platzhalterdarstellung.

Enthaelt:

- 8x8-Brett
- zwei lokale Spieler
- Startstellung
- Auswahl einer Figur per Klick
- Anzeige legaler Zuege
- Ausfuehrung eines Zuges per Klick
- Schach
- Schachmatt
- Patt
- Rochade
- En passant
- Umwandlung

Darstellung:

- Bretterfelder als einfache Geometrie
- Figuren als Primitive oder Labels

## Phase 2 - 3D-Szene-Grundgeruest

Ziel: Ein ueberzeugendes 3D-Schachgefuehl mit technischer Grundlage fuer Assets und Animationen.

Enthaelt:

- Kamera mit guter Schachperspektive
- Licht und Schatten
- 3D-Brett
- konsistente Feldkoordinaten
- belastbare `squareToWorld`-Zuordnung

Definition of Done:

- `a1` bis `h8` lassen sich deterministisch in Weltpositionen uebersetzen
- Platzhalterfiguren sitzen stabil auf korrekten Feldern

## Phase 3 - Blender-Assets

Ziel: Reusable 3D-Modelle erzeugen, ohne das Gameplay zu verkomplizieren.

Enthaelt:

- Brettmodell
- 6 Figurentypen
- klare Pivots
- saubere Skalierung
- GLB-Export

Grundsatz:

- lieber stilisiert und gut lesbar als ueberdetailiert

## Phase 4 - Asset-Integration

Ziel: Platzhalter durch produktionsnahe Figuren ersetzen.

Enthaelt:

- GLB-Loading
- Instanziierung pro Figurentyp
- Ableitung der Position aus dem Board State
- Captures korrekt visualisieren
- Promotion mit neuen Figurenmodellen

Strikte Trennung:

- Game State
- Render State
- Animation State

## Naechster iterativer Ausbau - Combat Presentation

Dieser Ausbau startet bewusst nach dem stabilen Gameplay-Kern und der Asset-Basis. Er wird nicht als ein grosser Filmblock umgesetzt, sondern als kontrollierte Folge kleiner Slices.

### Drei Layer

- Core Game Layer: `chess.js`, legale Zuege, Turn Flow, Captures, Undo/Restart, Game-over
- Presentation Layer: Figurenmodelle, Move-/Attack-/Defeat-Profile, Sound, Board-Polish
- Cinematic Layer: Combat-Kamera, Fokusfahrten, Rueckkehr zur Board-Kamera, spaeter Time-Slow oder Dramatic Pause

### Harte Regel

Layer 1 bleibt jederzeit autonom. Der Spielkern muss jederzeit korrekt weiterlaufen koennen, auch wenn Presentation oder Cinematic deaktiviert sind.

### Feste Reihenfolge

1. Combat-State-Maschine
2. Combat-Kamera
3. generische Capture-Cinematic
4. figurtyp-spezifische Bewegungsprofile
5. Blender-Theming fuer spaetere finalere Figuren

### Technik-Default

- zuerst transform-based oder procedural animation
- spaeter optional rigged Clips aus Blender
- keine Abhaengigkeit des Zug-Commits von Animationsende

### Aktuelle Themenrichtung

Der dokumentierte Stilpfad ist `Robotik/Cyber-Mech`.

Beispielrollen:

- Pawn als Scout bot
- Rook als Heavy Fortress mech
- Knight als agile Assault unit
- Bishop als Precision energy unit
- Queen als Elite combat android
- King als Command mech

### Naechster grosser Block

Die `Combat-State-Maschine`, die erste `Combat-Kamera`, eine generische `Capture-Cinematic`, figurtyp-spezifische Bewegungsprofile und eine erste Robotik/Cyber-Mech-Motion-Language sind jetzt als Basis in diesem Block umgesetzt. Das dedizierte Figuren-Design-System existiert bereits, ebenso eine parallele `starter | blockout`-Asset-Pipeline mit globalem Review-Toggle, per-Typ-Fallback und freigegebenen Review-GLBs fuer alle sechs Figurentypen `pawn`, `rook`, `knight`, `bishop`, `queen` und `king`. Die Combat-Kamera ist inzwischen ueber die erste Basis hinaus erweitert und nutzt jetzt einen exakten Kampf-Fokus sowie eine gekruemmte Transition um den Kampfpunkt. Auf derselben Pipeline sitzt jetzt zusaetzlich ein erster leichter `Cyber-Mech-VFX/SFX`-Slice mit phasengetriebenen Impact-/Servo-/Shutdown-Akzenten und kleinen synthetischen Combat-Cues sowie ein erster per-piece `Combat Flavor`-Pass, der dieselbe Pipeline je Figurtyp anders gewichtet statt neue Systeme einzufuehren. Das Familienreview der kompletten Review-Reihe, der aktuelle Combat-Kamera-Pass, der erste Material-/Shading-Pass und dieser erste Flavor-/VFX-/SFX-Block gelten vorerst als abgehakt. Ein erster `Holographic Board Presentation Pass` wurde anschliessend abgeschlossen: `board_cyber.glb` wurde strukturell in zwei klar getrennte Layer unterteilt (dunkle neutrale Hardware-Basis + schwebende emissive Projektions-Tiles), und die Spielflaeche liest jetzt als holografisches Taktik-Interface statt als physisches Brett. Der naechste grosse Ausbau ist damit ein `Start Flow` als eigener Experience-Block sowie danach das `Sci-fi Workstation Environment Blockout` als Raumkonzept.

## Geplanter Start Flow

Der naechste grosse Schritt ist kein freies Herumlaufen und keine Open-World-Umgebung, sondern ein klar kuratierter Start- und Fokusfluss mit spaeter erweiterbarer Raumlogik.

### Aktueller Fundament-Stand

Der Start-Flow-Block ist inzwischen deutlich weiter als die erste Basis:

- vollstaendiger `roomExplore`-Layer mit Hotspot-System, kuratierter Kamera-Interpolation zwischen Fokus-Posen und Idle-Pulse-Animation auf den Hotspot-Buttons
- `boardFocus` und `displayCaseFocus` als zwei separate Fokus-Modi mit eigenem Kamera-Preset, gesperrten Controls und jeweils einem "Back to Room"-Rueckweg
- vollstaendiger Rueckpfad aus beiden Fokus-Modi zurueck nach `roomExplore` / `overview`, ohne Spielstand zu veraendern
- CSS-getriebene Hotspot-UI mit Fokus-Plate, Untertiteln, Hover- und Fokus-Klassen
- `StartFlowMode` umfasst jetzt: `menu`, `introTransition`, `roomExplore`, `boardFocus`, `displayCaseFocus`

Die Architektur ist fuer weitere Fokus-Modi und spaetere Raumumgebungen vorbereitet.

### Zielzustand

1. `menu / start`
2. `intro transition`
3. `room explore`
4. `board focus / game`

### Reihenfolge fuer den Ausbau

1. den jetzigen `Start Flow` von `menu -> introTransition -> boardFocus` weiter verfeinern
2. danach einen kleinen `room explore`-Layer als kuratierte Interaktionsschicht auf dieselbe Struktur setzen
3. erst spaeter `Sci-fi Workstation`-Umgebung als Environment-Blockout, bessere Assets und Atmosphaeren-Polish

### Room-Explore-Regel

Der spaetere Raumteil soll bewusst als `curated room interaction` gebaut werden:

- keine freie Ego-Steuerung
- kein beliebiges Herumlaufen
- keine offene Point-and-Click-Welt
- stattdessen 3 bis 5 klar definierte Hotspots mit festen Kamera-Posen

### Typische Hotspots spaeter

- `chessTable` fuer Spielstart und Brettfokus (taktische Plattform / Holo-Interface)
- `displayCase` oder Figurenpodest fuer Figuren-/Lore-Fokus (Figuren-Review-Vitrine)
- `console` oder Terminal fuer Optionen, Credits oder spaetere Modi (Operator-Konsole)
- optional `techWall` oder Wandmodul fuer Projekt-/Portfolio-Infos

## Environment Leitidee: Sci-fi Workstation

Die Raumrichtung wurde bewusst von einem klassischen Wohnzimmer auf ein `Sci-fi Workstation`-Konzept umgestellt. Dieses passt deutlich besser zur bestehenden Projektidentitaet aus Cyber-Mech-Figuren, holografischem Brett, Combat-Cinematics und Room-Explore-Hotspots.

### Leitbegriffe

- Sci-fi Workstation / High-End-Operator-Raum
- futuristische Werkstatt / Robotics Lab
- Strategic Command Room
- Orbital Workstation / Station Hub
- Private Mech-Engineer's Room

### Raumzonierung fuer den spaetere Blockout

#### Zentrum

- das Schachboard als holografische Taktikplattform auf Pedestal

#### Sekundaerzone

- Display Case / Figurenpodest als Review- und Lore-Bereich

#### Arbeitszone

- Konsole / Monitor / Analyse-Desk als Operator-Interface

#### Hintergrundzone

- grosses Fenster / Raumoefffnung / Station Wall / Tech Wall mit Sicht ins All oder auf dunkle Aussenflaeche

### Absichtliche Grenzen

Der Raum ist kein steriles Laborgebaeude und keine generische Sci-fi-Kulisse, sondern ein persoenlicher Raum in dem man merkt: hier arbeitet jemand, hier wird entworfen, hier gehoert das Brett hin.

### Blockout-Reihenfolge

Wenn dieser Block dran ist:

1. Raumkonzept und Hauptzonen festlegen
2. Blickachsen und Board-Platzierung definieren
3. 2 bis 4 Fokusobjekte grob aufbauen
4. Raumhuelle und Lichtstimmung im Blockout
5. erst danach final ausarbeiten, Deko, Wandpaneel-Detail

## Phase 5 - UX und Spielgefuehl

Ziel: Professionelles und wertiges Nutzungserlebnis.

Enthaelt:

- Startscreen / Menu
- Intro-Transition
- spaeter Board-Focus-Uebergang aus dem Startflow
- Hover-Highlight
- Selection-Highlight
- moegliche Zuege markieren
- letzter Zug hervorheben
- Schachmarkierung
- Zugliste
- Turn-Anzeige
- Neustart
- Undo
- Promotion-Auswahl
- Perspektivwechsel oder Kameradrehung
- spaeter sanfte Animationen und Sounds
- spaeter kuratierter Room-Explore-Layer mit klickbaren Fokusobjekten

## Phase 6 - Erweiterungen

Moegliche Ausbaurichtung:

- Bot via Engine-Anbindung
- Multiplayer via WebSocket
- Landingpage und Moduswahl
- stilisierte Umgebung

## Sprint-Reihenfolge

### Sprint 1

- Vite-Projekt
- Three.js-Szene
- Brett
- Feld-Mapping
- klickbare Felder

### Sprint 2

- `chess.js` anbinden
- Spielzuege
- Turn-System
- Legal-Move-Highlights

### Sprint 3

- Primitive Figuren
- Figuren bewegen
- Captures
- Promotion
- Check und Checkmate

### Sprint 4

- Blender-Brett
- Blender-Figuren
- GLB-Import
- Materialien
- Skalierung bereinigen

### Sprint 5

- Animationen
- UI
- Sounds
- Polish

### Sprint 6

- Bot oder Multiplayer

## Vermeidbare Fehlstarts

- Nicht mit Multiplayer starten.
- Nicht zuerst auf ultrarealistische Assets gehen.
- Nicht die komplette Schachregelbasis neu erfinden.
- Nicht Game-Logik und 3D-Logik vermischen.

## Dokumentationsregel

Wenn eine Phase verschoben, erweitert oder neu priorisiert wird, muessen `README.md`, `MEMORY.md` und dieses Dokument synchronisiert werden.
