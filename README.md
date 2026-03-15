# 3D Web Chess

Projektgeruest fuer ein browserbasiertes 3D-Schachspiel mit klarer Trennung von Schachlogik, Rendering, UI und spaeteren Blender-Assets.

## Zielbild

Am Ende soll dieses Projekt ein spielbares 3D-Schachspiel im Browser liefern mit:

- lokalem 1v1
- 3D-Brett und 3D-Figuren
- legalen Zuegen ueber eine Regelbibliothek
- klickbarer Bedienung
- Move-Highlights
- Zughistorie

Spaetere Erweiterungen:

- Bot
- Online-Multiplayer
- Animationen
- Sounds
- stylische Umgebung
- iterativer Combat- und Cinematic-Ausbau fuer Captures

## Grundprinzipien

1. Funktion vor Schoenheit.
2. Schachlogik, Render State und Animation State bleiben getrennt.
3. Erst Platzhalter-Meshes, dann Blender-Assets.
4. `chess.js` ist die Regelquelle, nicht selbstgeschriebene Komplettlogik.
5. Jede relevante Aenderung muss die passende Dokumentation mit aktualisieren.
6. Core Game Layer, Presentation Layer und Cinematic Layer bleiben getrennt.
7. Combat ist ein Praesentationsmodus fuer Captures, kein neues Regelmodul.

## Empfohlener Stack

- TypeScript
- Vite
- Three.js
- `chess.js`
- optional React fuer UI
- Blender fuer Brett, Figuren und GLB-Export

## Arbeitsreihenfolge

1. Spielkern mit Platzhaltern aufbauen.
2. 3D-Szene-Grundgeruest stabilisieren.
3. Blender-Assets erstellen.
4. Assets sauber integrieren.
5. Combat-System-Unterbau fuer Capture-Praesentationen aufsetzen.
6. Combat-Kamera und generische Capture-Cinematics iterativ ergaenzen.
7. Figurtypische Motion-Profile im Robotik/Cyber-Mech-Stil nachziehen.
8. Als naechsten grossen Experience-Block einen sauberen Startflow mit Menu, Intro-Transition und Board-Focus aufbauen.
9. Danach einen kuratierten Room-Layer mit wenigen klickbaren Fokusobjekten ergaenzen.
10. Bot, Multiplayer und weitere Modi danach ausbauen.

## Aktuelle Stilrichtung

Der aktuelle Themenpfad ist `Robotik/Cyber-Mech`.

Beispielrollen:

- Pawn als Scout bot
- Rook als Heavy Fortress mech
- Knight als agile Assault unit
- Bishop als Precision energy unit
- Queen als Elite combat android
- King als Command mech

Technik-Default fuer den naechsten Ausbau:

- zuerst transform-based oder procedural animation
- rigged Clips spaeter optional, aber nicht Voraussetzung fuer die naechsten Slices

## Wichtige Dokumente

- `ROADMAP.md` beschreibt Phasen, Sprints und Prioritaeten.
- `MEMORY.md` haelt Entscheidungen, Annahmen und offene Punkte fest.
- `progress.md` protokolliert den Arbeitsstand fuer nachfolgende Agenten.
- `AGENTS.md` enthaelt Codex-Anweisungen.
- `CLAUDE.md` enthaelt Claude-Code-Anweisungen.

## Projektstruktur

```text
3d-web-chess/
|- docs/
|- public/
|  |- models/
|  |- textures/
|- src/
|  |- app/
|  |- chess/
|  |- render/
|  |- ui/
|  |- utils/
|  |- styles/
|- validation/
|- README.md
|- ROADMAP.md
|- MEMORY.md
|- progress.md
|- AGENTS.md
|- CLAUDE.md
```

## Dokumentationspflicht

Wenn Architektur, Scope, Asset-Konventionen, Module oder Verhalten geaendert werden, muessen mindestens diese Dateien geprueft und bei Bedarf aktualisiert werden:

- Root-`README.md`
- `ROADMAP.md`
- `MEMORY.md`
- `progress.md`
- lokales `README.md` im betroffenen Ordner
- lokales `MEMORY.md` im betroffenen Ordner, falls vorhanden

## Status

Dieses Projekt besitzt einen vollständig spielbaren Gameplay-Kern mit `chess.js`, UI-Feedback, Move- und Capture-Animationen, Undo/Restart sowie GLB-Assets für Brett und Figuren.

Die `Combat-State-Maschine`, eine `Combat-Kamera`, Board-Inspect-Kamerasteuerung, eine generische `Capture-Cinematic`, figurtyp-spezifische `Combat-Motion-Profile`, eine zentrale `Cyber-Mech Motion Language` und ein `Cyber-Mech-VFX/SFX`-Slice sind als Presentation- und Cinematic-Basis für Capture-Ereignisse eingebaut. Eine parallele `starter | blockout`-Review-Pipeline mit globalem Toggle ist aktiv; Blockout-GLBs für alle sechs Figurentypen liegen unter `public/models/blockout/`.

Der vollständige **Start Flow** (`menu → roomExplore → boardFocus`) ist implementiert. Der **Room-Explore-Layer** bietet:

- 3D-Hotspot-Navigation mit animierten Kamerafahrten zu `board`, `displayCase`, `pictureFrame` und `workbench`
- Freie Kamera in der Raumübersicht (Orbit/Pan/Zoom)
- Klickbare Bilderrahmen mit Hover-Glow und frame-spezifischem Kamera-Zoom (8 Frames in zwei Reihen)
- Web-Embed-Overlay mit iframe für eine eingebettete Portfolio-Unterseite (`/portfolio/`)
- Vollständige Back-Button-Navigation auf jeder Ebene
- Direkte Einstiegspunkte aus dem Hauptmenü zu Portfolio und Leistungsnachweisen
