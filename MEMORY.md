# MEMORY

## Aktueller Kontext

- Dieses Projekt hat einen vollständig spielbaren 3D-Schachkern mit `chess.js`, Board-Interaktion, UI-Feedback, Undo/Restart, Move- und Capture-Animationen sowie GLB-Assets.
- Ein vollständiger **Start Flow** (`menu → roomExplore → boardFocus`) ist implementiert.
- Ein **Room-Explore-Layer** mit 3D-Hotspot-Navigation, freier Kamera, Bilderrahmen-Interaktion und Web-Embed-Overlay ist aktiv.
- Die wichtigste Leitlinie lautet: Funktion vor Schönheit.
- Stack: TypeScript, Vite, Three.js, `chess.js` — kein Framework (Vanilla TS).

## Bekannte Architekturentscheidungen

- `chess.js` validiert Schachregeln; Board-State und Visualisierung bleiben getrennt.
- Core Game Layer, Presentation Layer und Cinematic Layer bleiben getrennt; der Core Game Layer darf nie von Presentation oder Cinematic abhängen.
- Der aktuelle Stilpfad ist `Robotik/Cyber-Mech`.
- Default für kommende Ausbaustufen: `procedural/transform-based first`; rigged Clips bleiben optional.
- Eine `Combat-State-Maschine` (in `app/`) sperrt Interaktion während Capture-Präsentationen ohne Regelkern zu blockieren.
- Eine `Combat-Kamera` (in `render/`) interpoliert deterministisch zwischen Board- und Combat-Framing.
- Eine generische `Capture-Cinematic` läuft über explizite Phasen `intro | attack | impact | resolve | return`.
- Motion-Profile geben jeder Figur ein eigenes Attack/Impact/Recovery-Gefühl; die `Cyber-Mech Motion Language` steuert gemeinsames Maschinengefühl.
- Ein `combat-feedback`-Controller (Render) und ein `combat-sfx`-Controller (Audio) decken VFX/SFX ab; beide werden bei Undo/Restart/Combat-Ende hart geräumt.
- Ein `Combat Flavor`-Mapping gewichtet Cyber-Mech-Sprache pro Figurtyp unterschiedlich.
- Die `starter | blockout`-Review-Pipeline mit globalem Toggle und per-Typ-Fallback ist aktiv; Blockout-GLBs liegen unter `public/models/blockout/`, Blender-Quellen unter `docs/assets/blender/`.

### Start Flow & Room Explore

- **Start Flow Modi:** `menu → introTransition → roomExplore → boardFocus | displayCaseFocus`
- `beginStartFlowTransition()` springt direkt zu `roomExplore` (keine Kamerafahrt, Menü-Kamera = Overview-Kamera).
- `focusRoomTarget(id)` startet eine animierte Kamerafahrt zur gewünschten Focus-Position; Guard: `roomExplore` aktiv + keine laufende Transition + Ziel ≠ aktuelles Ziel.
- `returnToRoomExplore()` animiert zurück zu `overview`; `returnToMenu()` springt sofort zurück zu `menu`.

### Room Hotspot System

- `ROOM_HOTSPOT_DEFINITIONS` in `scene.ts` definiert klickbare 3D-Ankerpunkte (`board`, `displayCase`, `pictureFrame`, `workbench`).
- Anker-Weltkoordinaten werden jede Frame auf Bildschirmkoordinaten projiziert und als absolute DOM-Elemente über dem Canvas gerendert (in `roomHotspotsRoot`).
- Hotspot-Buttons sind nur sichtbar wenn: kein Kamera-Übergang aktiv UND `currentRoomFocusTarget === 'overview'`.
- Navigation aus `roomExplore` ausschließlich über diese 3D-Hotspots; aus Einzelansichten nur „Zur Übersicht".

### Picture Frame Interaktion

- `PICTURE_FRAME_ANCHORS` in `scene.ts`: 8 Frames in zwei Reihen (Y=7.0 oben, Y=3.2 unten), Z-Schritt −3.29.
- Frames werden als `.picture-frame-hotspot`-Divs projiziert (nur sichtbar bei `currentRoomFocusTarget === 'pictureFrame'`).
- Hover-Glow via CSS `:hover` (keine JS-Neurendering nötig).
- Klick setzt `activePictureFrameDetailId` → `focusRoomTarget('pictureFrameDetail')`.
- Jedes Frame zoomt auf seine eigene Kameraposition: `{ position: (-21.4, frame.y, frame.z), target: (-28.4, frame.y, frame.z) }`.
- `activePictureFrameDetailId` wird via `StartFlowStateInput.pictureFrameDetailId` an `scene.ts` übergeben und in `getRoomFocusTargetPreset('pictureFrameDetail')` ausgewertet.

### Web Embed / Portfolio

- `focusTarget: 'webEmbed'` zoomt die Kamera vollständig in den Workbench-Monitor (`position: (-24.5, 3.22, 18.01)`).
- Sobald Kamerafahrt abgeschlossen: iframe-Overlay über dem Canvas mit `src="/portfolio/index.html"`.
- `public/portfolio/index.html` ist ein gestylter Platzhalter (dunkel-warme Farbpalette passend zum Raum).
- Zugang: „2D Webseite betreten" (aus Workbench-Ansicht) oder „Zum Portfolio" (direkt aus Menü).

### Navigations-Back-Buttons

| Ansicht | Zurück zu |
|---|---|
| `overview` (roomExplore) | `menu` (`return-to-menu`) |
| `webEmbed` | `workbench` (`back-from-web-embed`) |
| `pictureFrameDetail` | `pictureFrame` (`back-from-picture-frame-detail`) |
| `boardFocus` | `roomExplore` overview (`return-to-room`) |
| `displayCaseFocus` | `roomExplore` overview (`return-to-room`) |

### Room GLB Kalibrierung (scene.ts)

- `ROOM_SCALE = 1/0.512` — Blender-Schachfeld 0.512 m → 1 Three.js-Einheit.
- `ROOM_OFFSET = (-11.123, -3.833, 15.426)` — Raum-GLB-Ausrichtung auf Three.js-Ursprung.
- `BOARD_SURFACE_Y = 0.898` — Brettoberfläche in Three.js-Y.
- `board.group.visible = false` — Raum-GLB liefert Brett-Visual; Three.js-Brett nur für Raycasting.

### Kamera-Presets (ROOM_FOCUS_TARGET_PRESETS)

| Ziel | Position | Target |
|---|---|---|
| `overview` | per free-camera-controls | per free-camera-controls |
| `displayCase` | fest in Preset | fest in Preset |
| `pictureFrame` | `(-21.4, 7.0, 6.0)` | `(-28.4, 7.0, 6.0)` |
| `pictureFrameDetail` | dynamisch per `activePictureFrameDetailId` | dynamisch |
| `workbench` | fest in Preset | fest in Preset |
| `webEmbed` | `(-24.5, 3.22, 18.01)` | `(-26.27, 3.22, 18.01)` |

## Geplante Modulgrenzen

- `src/chess/`: Regeln, Status, Züge, Mapping
- `src/render/`: Szene, Brett, Figuren, Licht, Kamera, Loader, Room-Controls
- `src/ui/`: HUD, Overlays, Bedienelemente
- `src/app/`: App-Bootstrap, Orchestrierung (game.ts)
- `public/models/`: Blender-GLB-Dateien
- `public/portfolio/`: Eingebettete Sub-Website (iframe)

## Offene Punkte

- Ob die UI rein mit DOM oder später mit React gebaut wird
- Wann von procedural Animation auf rigged Clips erweitert werden soll
- Inhalte für die einzelnen Bilderrahmen (`pictureFrameDetail`-Ansicht)
- Inhalte für `public/portfolio/index.html`

## Arbeitsweise: Systemweite Änderungen

Wenn eine Änderung an einem Punkt eines Systems implementiert wird und dieselbe Logik sinnvoll auf weitere Fälle anwendbar wäre, muss immer zuerst gefragt werden:

> „Soll diese Änderung nur für diesen spezifischen Fall gelten, oder auch für alle gleichwertigen Fälle im System?"

Beispiele:
- Neuer Focus-Modus → andere Modi prüfen (Back-Button, Camera Preset, Controls-Rendering)
- Neues UI-Control für einen Zustand → äquivalente Zustände prüfen
- Neue Kamera-Preset-Behandlung → alle Start-Flow-Modi prüfen

Diese Regel gilt nicht bei bewusst einmaligen Lösungen (z.B. `boardFocus` ist explizit der einzige spielbare Modus).

## Pflegepflicht

Diese Datei muss aktualisiert werden, wenn sich ändert:
- Architekturgrenzen oder Stack-Entscheidungen
- Asset-Konventionen
- Prioritäten in der Umsetzung
- wesentliche offene Fragen oder neue Entscheidungen
