Original prompt: Erstelle eine komplette Ordnerhierarchie fuer ein 3D-Webschachspiel und platziere die gelieferten Informationen in passenden README-, ROADMAP-, MEMORY- sowie Anweisungsdateien fuer Claude Code und Codex. Lege fest, dass Roadmap, Memory und die relevanten READMEs bei Aenderungen immer aktualisiert werden muessen.

## Stand

- Initiales Projektgeruest fuer `3d-web-chess` angelegt.
- Root-Dokumentation fuer Vision, Roadmap und Memory erstellt.
- Modulordner fuer App, Schachlogik, Rendering, UI, Assets, Sprints und Validation vorbereitet.
- Agentenrichtlinien fuer Claude Code und Codex werden parallel zur Struktur hinterlegt.

## TODOs

- Implementierung von Vite-, Three.js- und `chess.js`-Basis starten.
- Phase-1-Gameplay mit Platzhalterfiguren umsetzen.
- Spaeter `window.render_game_to_text` und `window.advanceTime` fuer automatische UI-Validierung einfuehren.

## Hinweise fuer den naechsten Agenten

- Vor jeder groesseren Aenderung `README.md`, `ROADMAP.md`, `MEMORY.md` und die lokalen Moduldateien lesen.
- Neue Architekturentscheidungen sofort dokumentieren, statt sie spaeter nachzutragen.

## Update nach Verifikation

- Root-, Modul- und Asset-Dokumentation ist angelegt.
- Lokale `AGENTS.md`- und `CLAUDE.md`-Dateien existieren fuer App, Chess, Render, UI und Models.
- Zusaeztliche Memory-Dateien fuer Assets und Sprintplanung wurden ergaenzt.
- Struktur wurde per Dateipruefung verifiziert.

## Vertical Slice Update

- Minimaler Vite- und Three.js-Start ist implementiert.
- App bootet in eine echte 3D-Szene mit Kamera, Licht, Schatten und 8x8-Brett aus Platzhaltergeometrie.
- `window.render_game_to_text()` und `window.advanceTime(ms)` sind fuer Browser-Validierung verfuegbar.
- `npm run build` ist erfolgreich.
- Browser-Validierung ueber den Web-Game-Client war erfolgreich, inklusive Screenshots und State-JSON unter `validation/web-game-final/`.
- Konsole wurde bereinigt; keine Fehler oder Warnings mehr auf der Zielseite.

## Naechste sinnvolle Schritte

- Raycasting und square hover vorbereiten.
- Klickbare Felder und Auswahlzustand einfuehren.
- Danach `chess.js` fuer legale Zuege anbinden.

## Board Interaction Update

- Ein dedizierter Raycasting-Layer fuer Brettinteraktion wurde in `src/render/interaction.ts` eingefuehrt.
- `hoveredSquare` und `selectedSquare` werden explizit getrennt gehalten und ueber `render_game_to_text()` ausgegeben.
- Hover wird beim Verlassen des Bretts geloescht, Selektion bleibt bis zum naechsten Feldklick bestehen.
- Ein erneuter Klick auf das bereits selektierte Feld schaltet die Selektion konsistent aus.
- Build ist weiterhin erfolgreich.
- Browservalidierung war erfolgreich: Hover, Selektionswechsel, Hover-Clear und Toggle-off wurden direkt im Browser geprueft.
- Web-Game-Client-Artefakte fuer sichtbare Selection und Toggle-Off liegen unter `validation/interaction-single-select-headless/` und `validation/interaction-toggle-headless/`.

## Naechste sinnvolle Schritte

- Platzhalterfiguren als eigene Render-Schicht einfuehren.
- Startstellung sichtbar machen, ohne schon die komplette Regelmaschine einzubauen.
- Danach Figurenselektion mit Feldselektion koppeln und erst anschliessend `chess.js` anbinden.

## Cyber-Mech Combat VFX/SFX Slice

- Ein leichter renderseitiger `combat-feedback`-Controller haengt jetzt direkt an der bestehenden Combat-Pipeline und setzt phasengetriebene Cyber-Mech-Akzente fuer `intro`, `attack`, `impact`, `resolve`, `return`.
- Die neuen Render-Effekte bleiben absichtlich klein: Energy-Core-Pulses, Servo-Ringe, kompakter Impact-Flash mit kleinen Sparks sowie ein kurzer Shutdown-/Flicker-Akzent auf dem Victim.
- Audio-seitig existiert jetzt ein eigener `combat-sfx`-Controller, der die bestehenden WebAudio-Oszillator-Sounds um kleine Combat-Cues fuer Intro, Attack, Impact, Resolve und Return erweitert.
- `undo()`, `restart()`, Combat-Ende und Combat-Cancel raeumen die transienten VFX/SFX jetzt sofort wieder; `render_game_to_text()` zeigt dafuer `animation.feedback` und `sound.combat`.
- Der bestehende Debug-Hook `window.debug_preview_combat_camera(...)` staged jetzt eine synthetische Combat-Szene in der Render-Pipeline und akzeptiert zusaetzlich `phaseProgress`, damit einzelne Combat-Phasen gezielt validierbar sind.
- `npm.cmd run build` ist erfolgreich.
- Leichte Browser-Verifikation lief gegen den bestehenden Dev-Server: Impact- und Resolve-Preview zeigen die neuen Feedback-Flags/SFX-Cues im Snapshot, und der Ruecksprung auf `mode: board` leert Feedback- und SFX-Zustand wieder.

## Camera UX Polish Update

- `src/render/board-camera-controls.ts` unterstuetzt jetzt tatsaechlich Middle-Mouse-Pan; zuvor wurde die Mitteltaste zwar im UX-Text genannt, aber im Pointer-Down-Pfad direkt abgefangen und nie als `pan` gestartet.
- `src/render/combat-camera.ts` behaelt die bestehende Zwei-Kandidaten-Logik bei, nutzt bei Winkel-Gleichstand jetzt aber einen kleinen Travel-Tie-Break zur aktuelleren User-Inspect-Pose, statt beliebig links zu bevorzugen.
- `npm.cmd run build` ist erfolgreich.
- Direkte Playwright-Verifikation gegen den laufenden Dev-Server: Middle-Mouse-Drag verschiebt `inspectTarget` und `inspectPosition` jetzt sichtbar, Combat-Debug-Preview bleibt weiter intakt, und die Browser-Konsole zeigt keine neuen Errors.
- Screenshot-Artefakt fuer den gepannten Inspect-View liegt unter `validation/camera-ux-middle-pan.png`.

## Priority Update: Start Flow

- Auf direktes Nutzerfeedback ist der naechste grosse Ausbau jetzt kein weiterer Combat- oder Materialblock, sondern ein `Start Flow` als eigener Experience-Schritt.
- Dokumentiert sind dafuer jetzt die Zielzustaende `menu / start`, `intro transition`, spaeter `room explore` und `board focus / game`.
- Der spaetere Raumteil ist bewusst als `curated room interaction` mit wenigen klickbaren Hotspots und festen Kamera-Posen eingeplant, nicht als freies Herumlaufen oder Open-World-System.

## Startflow State System

- Die App besitzt jetzt einen expliziten top-level Startflow mit `menu`, `introTransition` und `boardFocus`; die spaetere Erweiterung `roomExplore` bleibt als geplanter Anknuepfungspunkt bestehen, ist aber in diesem Slice noch nicht aktiv.
- `src/app/game.ts` steuert dafuer jetzt den Startflow-State, die minimale temporaere Start-UI, den `Start Game`-Trigger sowie die Freigabe von Gameplay-Interaktion erst nach `boardFocus`.
- `src/render/scene.ts` haengt eine kontrollierte Kamerafahrt von einer Start/Menu-Pose in die bestehende Board-Kamera-Endpose ein und sperrt dabei Inspect-Controls sowie Brettinteraktion bis `boardFocus`.
- `src/render/interaction.ts` hat dafuer einen kleinen `enabled`-Schalter bekommen, damit Hover/Click vor `boardFocus` wirklich hart inaktiv bleiben.
- `render_game_to_text()` liefert jetzt zusaetzlich `startFlow.state`, `startFlow.gameplayInteractionEnabled` und `startFlow.introTransitionActive`.
- Technischer Check: `npm.cmd run build` erfolgreich.
- Leichte Browser-Verifikation gegen den laufenden Dev-Server: Die App startet in `menu`, Canvas-Klicks bleiben dort wirkungslos, `Start Game` setzt `introTransition`, und sowohl nach echtem Warten (`~2.2s`) als auch nach `window.advanceTime(1700)` landet der Zustand sauber in `boardFocus` mit freigeschalteter Brettinteraktion; ein Klick auf `a2` liefert dort wieder `selectedSquare = a2` und `legalTargets = [a3, a4]`.
- Screenshot-Artefakte liegen unter `validation/startflow-menu.png`, `validation/startflow-intro.png`, `validation/startflow-top.png` und `validation/startflow-boardfocus.png`.

## Per-Piece Cyber-Mech Combat Flavor Pass

- Die bestehende Combat-Feedback-/Combat-SFX-Basis ist jetzt um ein zentrales `src/app/combat-flavor.ts`-Mapping erweitert, das pro Figurtyp gemeinsame Flavor-Regeln fuer Render und Audio kapselt statt neue Sonderpfade zu verteilen.
- `pawn`, `rook`, `knight`, `bishop`, `queen` und `king` gewichten jetzt Core-Pulses, Servo-Akzente, Impact-Sprache, Sparks, Shutdown-Signale und Combat-SFX-Cues unterschiedlich, waehrend die gemeinsame Cyber-Mech-Familie erhalten bleibt.
- `animation.feedback` und `sound.combat` spiegeln jetzt zusaetzlich die aktiven Flavor-Labels fuer Attacker/Victim, damit der Snapshot nicht nur Phase, sondern auch den gezogenen Figur-Charakter zeigt.
- Der Debug-Hook `window.debug_preview_combat_camera(...)` akzeptiert jetzt auch `attackerType` und `victimType`, damit verschiedene Flavor-Kombinationen direkt previewbar sind.
- `npm.cmd run build` ist erfolgreich.
- Der vorgeschriebene kleine Web-Game-Client lief nach dem Flavor-Pass erneut erfolgreich gegen `http://127.0.0.1:5173`.
- Leichte Playwright-Verifikation bestaetigt unterschiedliche Flavor-Kombinationen im Snapshot fuer `pawn -> bishop`, `rook -> queen` und `knight -> king`; Cleanup auf `mode: board` leert Feedback- und aktive Combat-SFX-Zustaende wieder.
- Visuelle Artefakte fuer den Flavor-Pass liegen unter `validation/combat-flavor-pawn-vs-bishop.png`, `validation/combat-flavor-rook-vs-queen.png`, `validation/combat-flavor-knight-vs-king.png` sowie den Inline-Screenshots fuer den leichten/heavy Vergleich.

## Starting Position Update

- `src/chess/state.ts` modelliert jetzt eine explizite, typisierte Startstellung mit 32 Figuren als datengetriebene Piece-Liste.
- `src/render/pieces.ts` rendert eine separate Platzhalter-Figuren-Schicht auf Basis dieses Piece-States.
- Die Szene kombiniert nun Brett, Interaktion und Figuren-Rendering, ohne dass die Render-Schicht zur Wahrheitsquelle fuer den Board-State wird.
- `render_game_to_text()` liefert jetzt die komplette Figurenbelegung mit Farbe, Typ und Feld aus.
- Hover und Feldselektion funktionieren weiterhin mit Figuren auf dem Brett.
- Build ist weiterhin erfolgreich.
- Browser- und Web-Game-Validierung waren erfolgreich; Artefakte liegen unter `validation/starting-position-preview/` und `validation/starting-position-select/`.

## Naechste sinnvolle Schritte

- Piece Selection als eigene Schicht auf den bestehenden Feld- und Piece-State aufsetzen.
- Danach moeglichst direkt `chess.js` als Regel- und Zugsystem anbinden, statt Zwischenlogik aufzubauen.

## Chess.js Integration Update

- `chess.js` ist jetzt als einzige Regel- und Zustandsquelle integriert.
- `src/chess/engine.ts` kapselt die Bibliothek hinter einem kleinen Adapter fuer Turn, Pieces, legale Ziele, Snapshot und Move-Ausfuehrung.
- Die Render-Schicht liest ihre Figurenbelegung nur noch aus dem Engine-Snapshot.
- `hoveredSquare`, `selectedSquare` und `legalTargetSquares` bleiben explizit getrennt vom Chess-State.
- Legale Zielfelder werden sichtbar hervorgehoben.
- Ein legaler Klick fuehrt den Zug ueber `chess.js` aus; illegale Klicks mutieren den Zustand nicht.
- `render_game_to_text()` liefert jetzt Turn, Status, Legal Targets, Piece Placement, FEN, Move History und Last Move.
- Build ist erfolgreich.
- Browservalidierung war erfolgreich fuer: `e2` selektieren, `e3/e4` als legale Ziele sehen, `e4` spielen, Turn-Wechsel auf schwarz, und illegalen Leerklick ohne State-Aenderung.
- Web-Game-Client-Artefakte bestaetigen zusaetzlich, dass ein schwarzer Bauer am Spielstart nicht selektierbar ist: `validation/chessjs-black-start/`.
- Das HUD hat fuer die neue Detailzeile ein eigenes Styling erhalten, damit Turn- und Auswahlhinweise lesbar bleiben.

## Naechste sinnvolle Schritte

- Figurenselektion im UI gezielter kommunizieren.
- Danach `last move`-Highlight, Move History und Check-Highlight als naechsten Zustands- und UX-Block aufsetzen.

## Feedback and Check Update

- Der Engine-Snapshot liefert jetzt zusaetzlich `inCheck` und `checkedKingSquare`.
- Das Brett visualisiert jetzt `lastMove` und `check` mit fester Highlight-Prioritaet:
  `checkedKingSquare > selectedSquare > legalTargetSquare > lastMoveSquare > hoveredSquare`.
- Die UI zeigt die SAN-Zughistorie turnweise an und spiegelt Check-Zustaende in HUD und Overlay.
- `render_game_to_text()` enthaelt jetzt `lastMove`, `moveHistory`, `inCheck`, `checkedKingSquare` und die aktive Highlight-Prioritaet.
- Build war nach den Code-Aenderungen erfolgreich.
- Leichte Browser-Validierung war erfolgreich fuer `e2 -> e4` sowie fuer einen Checkmate-Fall per `Qh4#`.
- Um das Geraet zu schonen, wurden nach dem Nutzerhinweis keine weiteren redundanten schweren Validierungsschleifen gestartet; es wurden nur noch schlanke Dateikontrollen und Artefakt-Snapshots genutzt.

## Naechste sinnvolle Schritte

- Captures sauber rueckmelden und Spielende-Zustaende im UI ausbauen.
- Danach Restart und Undo in denselben sauberen Zustandsfluss einfuehren.

## Controls and End-State UX Update

- Der Engine-Adapter liefert jetzt auch Captures, Game-over-Status, Result-Texte, `undoAvailable`, `restartAvailable` und eine kompakte `statusPresentation`.
- Die UI zeigt nun ein eigenes Status-Panel, ein Capture-Panel und explizitere Control-Hinweise fuer Undo und Restart.
- Normale Auswahl wird in `handleSquareClick()` hart blockiert, sobald `gameOver` aktiv ist.
- `undo()` und `restart()` loeschen den transienten Auswahlzustand weiterhin konsequent, bevor Szene und Panels neu synchronisiert werden.
- Zur Schonung des Geraets wurden fuer diesen Slice nur leichte Checks verwendet; der abgeschlossene technische Check ist `npm run build`.

## Naechste sinnvolle Schritte

- Jetzt ist der Weg frei fuer den Animations-Block oder fuer kleine UI-Feinschliffe an Captures und Endstatus.

## Piece Animation Update

- Die Render-Schicht besitzt jetzt mit `src/render/piece-animations.ts` einen kleinen, deterministischen Interpolationspfad fuer Figurenbewegungen.
- Normale Zuege animieren nur die bewegte Figur von `from` nach `to`, waehrend `chess.js` sofort die Wahrheitsquelle fuer den neuen Board-State bleibt.
- `undo()` und `restart()` setzen die Figuren bewusst sofort an ihre Zielpositionen und loeschen damit eventuell laufende Bewegungsanimationen.
- Die Szene gibt jetzt im Snapshot einen kleinen `animation`-Block fuer aktive Figurenanimationen aus.
- Fuer diesen Slice wurde nur `npm run build` als leichter technischer Check verwendet.

## Naechste sinnvolle Schritte

- Der naechste saubere Block ist jetzt Capture-Animation plus kleine Sound-Ebene.

## Capture and Sound Update

- Captures erhalten jetzt eine kurze, kontrollierte Exit-Animation ueber `src/render/capture-animations.ts`, statt abrupt aus der Szene zu verschwinden.
- Die bewegte Figur behaelt ihre bestehende Positionsanimation; `chess.js` bleibt dabei sofort die autoritative Zustandsquelle.
- Eine minimale Sound-Schicht in `src/audio/sound.ts` spielt leichte Signale fuer normale Zuege, Captures und Check ab.
- `undo()` und `restart()` bleiben bewusst sofortig und setzen laufende Bewegungs- oder Capture-Animationen direkt zurueck.
- Zur Schonung des Geraets wurden fuer diesen Slice weiterhin nur leichte Checks verwendet; der technische Abschlusscheck ist `npm run build`.

## Naechste sinnvolle Schritte

- Der naechste saubere Block ist jetzt kleiner Capture-Polish oder direkter Asset-/Visual-Polish mit Blender-Modellen.

## Blender Asset Integration Update

- Lokale Starter-GLBs fuer Brett und alle sechs Figurentypen wurden ueber `scripts/export_chess_assets.py` per Blender-CLI nach `public/models/` exportiert.
- `src/render/loaders.ts` laedt Board- und Figurenmodelle asynchron und haelt Placeholder pro Brett/Figurentyp als Fallback aktiv.
- `src/render/board.ts` trennt jetzt visuelles Brettmodell von den unsichtbaren Hit-Squares fuer Raycasting und Highlight-Stabilitaet.
- `src/render/pieces.ts` kann zwischen prozeduralen Platzhaltern und GLB-basierten Figuren wechseln, ohne den Engine-State zur zweiten Wahrheitsquelle zu machen.
- `render_game_to_text()` enthaelt jetzt auch die Asset-Modi und die geladenen Modelldateien fuer leichte Validierung.
- Fuer diesen Slice wurde nur `npm run build` verwendet; aufwaendige Browser-Automation blieb weiterhin aus.

## Naechste sinnvolle Schritte

- Kleiner Visual-Polish auf Basis der GLB-Assets oder danach direkt der Experience-Layer mit Startscreen, Intro und Raum.

## Combat Presentation Roadmap Update

- Der aktuelle Stand wird jetzt als stabiler Gameplay-Kern mit Asset-Basis behandelt, nicht mehr nur als Vorstufe fuer allgemeines Visual-Polish.
- Die Projektdoku trennt den weiteren Ausbau ab sofort explizit in `Core Game Layer`, `Presentation Layer` und `Cinematic Layer`.
- `Robotik/Cyber-Mech` ist als aktueller Stilpfad festgeschrieben; die vorhandenen GLBs bleiben dabei Starter-Assets und nicht schon finale thematische Charaktere.
- Der dokumentierte Technik-Default fuer den kommenden Ausbau ist `procedural/transform-based first`; rigged Blender-Clips bleiben spaeter optional.
- Dieser Pass ist nur ein Doku- und Prioritaetsupdate; es wurden keine neuen Code- oder Validierungsschritte daran geknuepft.

## Naechste sinnvolle Schritte

- `Combat-State-Maschine` als Capture-Praesentationsmodus einfuehren.
- Waehrend Combat die normale Interaktion blockieren und danach sauber zur Board-Ansicht zurueckkehren.
- Erst nach diesem Slice Combat-Kamera und generische Capture-Cinematics ergaenzen.

## Combat State Machine Update

- `src/app/combat.ts` fuehrt jetzt einen expliziten Praesentationsmodus mit `board` und `combat` ein.
- Capture-Zuege erzeugen nun ein strukturiertes `combatEvent` mit `attacker`, `victim`, `from`, `to`, `capturedSquare` und Move-Metadaten.
- Normale Brettinteraktion ist waehrend `combat` blockiert, ohne dass `chess.js` seine Regelautoritaet verliert oder auf Animationsende warten muss.
- `undo()` und `restart()` loeschen den Combat-Zustand deterministisch zusammen mit transienter Auswahl.
- `render_game_to_text()` gibt jetzt auch den Presentation-Zustand und das aktive Combat-Event fuer leichte Debug-Sichtbarkeit aus.
- Fuer diesen Slice wurde nur `npm run build` als technischer Check verwendet.

## Naechste sinnvolle Schritte

- `Combat-Kamera` fuer Capture-Ereignisse einfuehren.
- Danach generische Capture-Cinematics auf den bestehenden Combat-Modus aufsetzen.

## Combat Camera Update

- `src/render/combat-camera.ts` fuehrt jetzt einen dedizierten Kamera-Controller mit `board`, `combatTransitionIn`, `combatHold` und `combatTransitionOut` ein.
- Die Combat-Kamera framed Capture-Ereignisse auf Basis von `from`, `to` und `capturedSquare`, ohne neue Regelentscheidungen zu treffen.
- `src/render/scene.ts` spiegelt jetzt `camera.mode`, `camera.position` und `camera.target` im Snapshot, damit der Kamerazustand leicht sichtbar bleibt.
- `undo()` und `restart()` setzen die Kamera sofort auf die Board-Perspektive zurueck, waehrend normale Combat-Enden weich zur Standardkamera ausfahren.
- Fuer diesen Slice wurde weiterhin nur `npm run build` als leichter technischer Check verwendet.

## Naechste sinnvolle Schritte

- Generische Capture-Cinematic auf den bestehenden Combat-Event- und Combat-Kamera-Unterbau setzen.
- Danach figurtyp-spezifische Bewegungsprofile im Robotik/Cyber-Mech-Stil einfuehren.

## Board Camera Controls Update

- `src/render/board-camera-controls.ts` fuehrt jetzt leichte User-Kamerasteuerung fuer den normalen Board-Modus ein.
- Unterstuetzt werden Zoom per Mausrad, Orbit per Rechtsklick-Drag, leichtes Pan per Mitteltaste oder `Shift` plus Rechtsklick sowie Reset per Taste `R` oder Button.
- Waehend `combat` werden diese User-Controls sauber gesperrt, damit die Systemkamera deterministisch bleibt.
- `undo()` und `restart()` setzen die Kamera wieder auf eine konsistente Board-Standardansicht zurueck.
- `render_game_to_text()` enthaelt jetzt auch `camera.controlsLocked` und `camera.gestureMode` fuer leichte Debug-Sichtbarkeit.
- Fuer diesen Slice wurde weiterhin nur `npm run build` als technischer Check verwendet.

## Naechste sinnvolle Schritte

- Generische Capture-Cinematic auf den bestehenden Combat-Event-, Combat-Kamera- und Board-Inspect-Unterbau setzen.
- Danach figurtyp-spezifische Bewegungsprofile im Robotik/Cyber-Mech-Stil einfuehren.

## Board Coordinate Labels Update

- `src/render/board.ts` rendert jetzt Randbeschriftungen fuer Files (`a` bis `h`) und Ranks (`1` bis `8`) direkt am Brett.
- Die Labels sind bewusst in der Brett-Schicht verankert, damit sie sowohl mit Placeholder- als auch mit GLB-Brett sichtbar bleiben.
- Fuer diesen Slice wurde nur `npm run build` als leichter technischer Check verwendet.

## Generic Capture Cinematic Update

## Neon Highlight Rule Update

- `src/render/loaders.ts` nutzt fuer Blockout-Figuren jetzt ein gemeinsames Neon-Set mit den Rollen `sensor`, `core` und `command` statt einer isolierten King-Highlight-Sonderbehandlung.
- Augen/Linsen/Visoren laufen auf `sensor`, Herzen auf `core`, Embleme auf `command`; die zugehoerigen Materialien bekommen in der App echte Emission und sind fuer sichtbaren Neon-Punch `toneMapped = false`.
- Die aktuelle Familienregel lautet: Weiss `sensor = cyan`, Weiss `core = pink-rot`, Schwarz `sensor/core = klares Neon-Rot`, beide Seiten `command = amber/orange`.
- Der King bleibt als Ausnahme erhalten: sein Auge liest bewusst wie das Emblem und nutzt deshalb ebenfalls `command`.
- Die Regel ist in `docs/assets/BLENDER_PIPELINE.md`, `public/models/blockout/README.md`, `docs/assets/CYBER_MECH_FIGURE_DESIGN_SYSTEM.md` und `src/render/MEMORY.md` dokumentiert.

## Rook Emblem and Black Red Fix

- `rook_core_shield` wird im Loader jetzt explizit als Command-Emblem behandelt und nicht mehr nur als generisches Signal-Highlight.
- Schwarze Blockout-Highlights fuer Augen und Herzen laufen jetzt ueber ein klares Neon-Rot statt ueber den pinkigeren Weiss-Signalton.

## Family Rule Corrections

- `rook_core_shield` wurde wieder aus dem `command`-Zweig herausgezogen und laeuft jetzt bewusst als `sensor`: Weiss hellblaues Neon, Schwarz klares Neon-Rot.
- `springer_eye_ring` sowie die aeusseren King-Ringe sind jetzt trim-geschuetzt; Weiss liest dort dunkelblau, Schwarz gold.
- Das weisse Laeufer-Herz laeuft jetzt ueber den hellblauen `sensor`-Zweig statt ueber den roten `core`-Zweig.
- Fuer diesen Pass wurde auf ausdruecklichen Nutzerwunsch noch kein neuer Build gestartet.

## Hover Presentation Separation Update

- Figuren nutzen jetzt eine saubere Transform-Trennung aus `boardAnchor -> visualRoot -> model`.
- `boardAnchor` bleibt die exakte `squareToWorld`-Platzierung und damit die logische Render-Verankerung auf dem Feld.
- Hovering/Bobbing wird rein visuell ueber `visualRoot.position.y` gerechnet; dadurch bleibt die Schachlogik unveraendert und der Asset-Export braucht keinen fake Float-Offset mehr.
- Move-Animationen laufen jetzt auf dem `boardAnchor`, Capture- und Combat-Praesentation auf dem visuellen Child-Layer.
- Der alte Knight-Ground-Nudge fuer die Schwebehoehe wurde aus `src/render/loaders.ts` entfernt und in die neue Praesentationsschicht verlegt.
- `render_game_to_text()` enthaelt jetzt pro Figur auch Hover-Debugdaten wie `isHoveringVisual`, `hoverBaseOffset`, `boardAnchorPosition` und `visualRootPosition`.

- `src/app/combat.ts` fuehrt jetzt explizite Combat-Phasen `intro`, `attack`, `impact`, `resolve`, `return` mit Fortschritt und Restzeit im Snapshot.
- `src/render/combat-presentation.ts` kapselt eine leichte, deterministische Capture-Cinematic fuer Attacker-Advance, Victim-Hit-Reaction und Defeat/Removal.
- `src/render/pieces.ts` uebergibt Capture-Combats jetzt an den neuen Combat-Controller, statt Opfer sofort generisch auszublenden; normale Move- und Fallback-Capture-Animationen bleiben getrennt.
- `src/render/scene.ts` synchronisiert Board-Controls, Combat-Kamera und Combat-Presentation ueber denselben Praesentations-Snapshot und besitzt jetzt einen expliziten Hard-Reset-Pfad fuer Combat-State.
- `src/app/game.ts` verdrahtet Capture-Ereignisse in die generische Cinematic, haelt `chess.js` als einzige Regelquelle und setzt `undo()`/`restart()` sofort auf Board-State plus neutrale Kamera/Animationen zurueck.
- `render_game_to_text()` zeigt jetzt neben Presentation-Mode auch Combat-Phase und Combat-Animationsstatus fuer leichtere Debug-Sichtbarkeit.
- Auf ausdruecklichen Nutzerwunsch wurden keine schwergewichtigen Browser- oder Validation-Runs gestartet; der Abschlusscheck fuer diesen Slice ist bewusst nur `npm.cmd run build`.

## Naechste sinnvolle Schritte

- Figurtyp-spezifische Bewegungsprofile auf den bestehenden generischen Combat-Phasen aufsetzen.
- Danach staerkere Robotik/Cyber-Mech-Ausarbeitung fuer Pose, Timing und Charakter einfuehren.

## Figure-Type Motion Profile Update

- `src/render/combat-motion-profiles.ts` fuehrt jetzt eine dedizierte Daten- und Mapping-Schicht fuer `pawn`, `rook`, `knight`, `bishop`, `queen` und `king` ein.
- Die bestehende Combat-Pipeline `intro -> attack -> impact -> resolve -> return` bleibt unveraendert, aber `src/render/combat-presentation.ts` nutzt jetzt attacker- und victim-spezifische Profile fuer Bewegungsstil, Timing-Gefuehl, Impact und Recovery.
- Die Profile bleiben bewusst transform-basiert und leichtgewichtig: keine Paarungslogik, keine Partikel, keine Rig-/Clip-Abhaengigkeit.
- `src/app/game.ts` reicht jetzt Figurtypen im Combat-Event bis in die Render-Praesentation durch und spiegelt aktives Motion-Profil plus Motion-Style leicht im Snapshot/Detail-Panel.
- `undo()` und `restart()` bleiben harte Resets der Praesentation; es wurde weiterhin kein zweiter Board-State eingefuehrt.
- Auf ausdruecklichen Nutzerwunsch wurden erneut keine schwergewichtigen Browser- oder Validation-Runs gestartet; der Abschlusscheck fuer diesen Slice ist nur `npm.cmd run build`.

## Naechste sinnvolle Schritte

- Die neue Motion-Profil-Basis jetzt in eine klarere Robotik/Cyber-Mech-Motion-Language uebersetzen.
- Danach kleine thematische VFX/SFX ergaenzen, bevor spaeter der Experience-Layer kommt.

## Robot / Cyber-Mech Motion Language Update

- `src/render/combat-cyber-mech-style.ts` fuehrt jetzt eine zentrale Stil-Schicht ueber den bestehenden Figurenprofilen ein.
- Diese Stil-Schicht steuert gemeinsames Maschinengefuehl ueber Parameter wie `preloadAmount`, `servoSnap`, `mechanicalOvershoot`, `impactRecoil`, `settleAmount`, `stiffness`, `weightClass` und `energyPulse`.
- `src/render/combat-presentation.ts` kombiniert jetzt pro Capture sowohl das figurtyp-spezifische Bewegungsprofil als auch die neue Cyber-Mech-Stilschicht, ohne die bestehende Combat-Pipeline `intro -> attack -> impact -> resolve -> return` zu veraendern.
- Das Ergebnis bleibt procedural, deterministisch und leichtgewichtig: keine Partikel, keine Kamera-Erweiterung, keine Rig-/Clip-Abhaengigkeit und kein zweiter Board-State.
- `src/app/game.ts` spiegelt jetzt zusaetzlich Style-Label, World-Style und Weight-Class leicht im Detail-Panel und `render_game_to_text()`.
- `undo()` und `restart()` bleiben harte Resets aller Presentation-Zustaende.
- Auf ausdruecklichen Nutzerwunsch wurden erneut keine schwergewichtigen Browser- oder Validation-Runs gestartet; der Abschlusscheck fuer diesen Slice ist nur `npm.cmd run build`.

## Naechste sinnvolle Schritte

- Kleine Cyber-Mech-VFX/SFX als naechsten restrained Slice auf den vorhandenen Combat- und Motion-Language-Unterbau setzen.

## Pawn-First Blockout Pipeline Update

- `src/render/loaders.ts` besitzt jetzt ein explizites Figuren-Asset-Set `starter | blockout` mit per-Typ-Candidate-Loading und sauberem Fallback von `/models/blockout/{piece}.glb` auf `/models/{piece}.glb`.
- `src/render/scene.ts` spiegelt jetzt aktives `pieceAssetSet`, tatsaechlich geladene Piece-Dateien und Blockout-Fallbacks im Snapshot und in `render_game_to_text()`.
- `src/app/game.ts` laedt Board- und Piece-Assets jetzt getrennt, verwendet `last-request-wins` fuer asynchrone Piece-Reloads und besitzt einen globalen Dev-Toggle fuer das Figuren-Asset-Set ohne Aenderung von Spiel-, Combat- oder Kamera-State.
- `src/ui/controls.ts` und `src/styles/main.css` rendern jetzt einen globalen `Starter | Blockout`-Schalter in der bestehenden Controls-Zone; der Toggle ist waehrend Combat und waehrend laufender Piece-Loads gesperrt.
- `scripts/export_blockout_assets.py` erzeugt jetzt das erste parallele Review-Asset `public/models/blockout/pawn.glb` als Cyber-Mech-Pawn mit stabiler Front-Achsen-Konvention fuer spaetere Combat- und Motion-Slices.
- Die minimale Doku wurde fuer Loader-, UI- und Asset-Konventionen nachgezogen, inklusive neuem `public/models/blockout/README.md`.
- Leichtgewichtige Verifikation: `npm.cmd run build` erfolgreich; keine schweren Browser- oder Validation-Runs gestartet.

## Naechste sinnvolle Schritte

- Pawn im Spiel visuell reviewen und das neue `blockout`-Set manuell gegen `starter` vergleichen.
- Danach `rook` auf derselben parallelen Blockout-Pipeline modellieren und exportieren.

## Humanoid Pawn Blockout Correction

- Der erste `pawn`-Blockout wurde nach visueller Review von einer abstrakteren Ram-Silhouette auf eine vereinfachte humanoide Cyber-Mech-Silhouette korrigiert.
- `scripts/export_blockout_assets.py` baut den Pawn jetzt ueber Standbasis, Unterkoerper, Torso, kleinen Sensor-Kopf sowie asymmetrisches Front-/Schultermodul auf.
- `docs/assets/CYBER_MECH_FIGURE_DESIGN_SYSTEM.md` spiegelt dieselbe Richtungsentscheidung jetzt auch in der Pawn-Sektion wider.
- Blender-Preview fuer den korrigierten Pawn liegt unter `validation/blender/pawn-blockout-preview-humanoid.png`.
- Kein neuer Browser- oder Build-Check noetig; dieser Pass war ein reiner Blockout- und Doku-Feinschliff.

## Version B Mini-Character Shift

- Der Pawn wurde noch einmal von `humanoider Schachfigur` auf `sockellose Mini-Cyber-Mech-Unit` umgestellt.
- `scripts/export_blockout_assets.py` loest Footprint und Stand jetzt ueber Fuesse, Beine und Unterkoerper statt ueber einen klassischen Schachsockel.
- `docs/assets/CYBER_MECH_FIGURE_DESIGN_SYSTEM.md` und `public/models/blockout/README.md` halten jetzt dieselbe Richtungsentscheidung fest: character-first, pedestal-free.
- Die aktuelle Blender-Vorschau fuer Version B liegt unter `validation/blender/pawn-blockout-preview-version-b.png`.

## Pawn Silhouette Clarification

- Der Pawn besitzt jetzt zusaetzlich grobe Arme als grosse Massen, eine klarere Schulterbruecke und etwas plausiblere Fuss-/Beinproportionen.
- Die Pawn-Sektion im Design-System nennt jetzt explizit `grobe Arme` als Teil der Referenz-Silhouette.
- Die aktuelle Blender-Vorschau fuer diesen Stand liegt unter `validation/blender/pawn-blockout-preview-arms.png`.
- Danach die Blender-Assets visuell staerker in dieselbe Stilwelt ziehen.

## Combat Timing And Camera Tuning Update

- Auf Nutzerfeedback wurden die Combat-Phasen in `src/app/combat.ts` um ungefaehr 20 Prozent verlaengert, damit `intro`, `attack`, `impact`, `resolve` und `return` lesbarer bleiben.
- `src/render/combat-camera.ts` fokussiert die Kamera jetzt staerker auf die eigentliche Impact-Zone statt auf den Mittelpunkt zwischen Start- und Opferfeld.
- Fuer laengere Angriffslinien skaliert das Combat-Framing jetzt seitliche Distanz, Tiefe und Hoehe leicht mit, damit die Einstellung nicht zwischen den Figuren haengen bleibt.
- Die Kamerarichtung lehnt sich jetzt staerker an die normale Board-View an; dadurch bleiben insbesondere schwarze Angriffe lesbarer und landen seltener auf der falschen Seite des Geschehens.
- Der Abschlusscheck fuer diesen Tuning-Pass ist bewusst nur `npm.cmd run build`.

## Combat Distinction And Slowdown Tuning Update

- Auf weiteres Nutzerfeedback wurden die globalen Combat-Phasen in `src/app/combat.ts` erneut leicht verlaengert, damit der gesamte Ablauf noch besser lesbar ist.
- `src/render/combat-motion-profiles.ts` enthaelt jetzt pro Phase auch ein explizites `tempo`, damit sich Figuren nicht nur ueber Weg und Pose, sondern auch ueber Bewegungsrhythmus staerker unterscheiden.
- Die Profilwerte fuer `pawn`, `rook`, `knight`, `bishop`, `queen` und `king` wurden bewusst markanter gemacht: staerkere Unterschiede in Windup, Lift, Side-Arc, Overshoot, Recoil, Victim-Drift und Recovery.
- `src/render/combat-presentation.ts` nutzt diese staerkeren Profilwerte jetzt direkter und mit etwas mehr Ausschlag, damit die Unterschiede im Spiel sichtbarer werden statt im gemeinsamen Cyber-Mech-Layer zu verschwimmen.
- Der Abschlusscheck fuer diesen Feintuning-Pass ist erneut nur `npm.cmd run build`.

## Cyber-Mech Figure Design System Update

- `docs/assets/CYBER_MECH_FIGURE_DESIGN_SYSTEM.md` definiert jetzt fuer `pawn`, `rook`, `knight`, `bishop`, `queen` und `king` jeweils Rolle, Gewichtsklasse, Silhouette, Formmotive, Combat-Gefuehl, Materialidee, erlaubte bewegliche Teile und konkrete Blender-Blockout-Hinweise.
- Das Dokument bindet die bestehende Motion Language bewusst an Formensprache, damit spaetere Blender-Modelle nicht nur cool aussehen, sondern sich nach demselben System anfuehlen wie die Animationen.
- `docs/assets/README.md` und `docs/assets/MEMORY.md` verweisen jetzt explizit auf dieses Design-System als Vorstufe fuer die naechsten Blockout-Modelle.
- Root-`README.md`, `ROADMAP.md` und `MEMORY.md` behandeln den naechsten sinnvollen Schritt jetzt als `Blender-Blockout-Modelle` auf Basis des Design-Systems, nicht direkt als VFX-Pass.
- Dieser Pass ist bewusst dokumentationsorientiert; es wurden keine Code-Aenderungen und keine technischen Checks daran geknuepft.

## Pawn Prototype Restructure Update

- Die Blockout-Arbeit wird jetzt staerker als schrittweise Prototypenreihe gedacht statt als lineare Verfeinerung einer einzigen Figurensprache.
- Der `pawn` wechselt dafuer bewusst von einer humanoiden Mini-Unit auf einen einfachen `Hexapod-Scout`, angelehnt an ein kleines Sensor-/Korpus-Modell mit drei Beinpaaren.
- `scripts/export_blockout_assets.py` baut den aktuellen Pawn jetzt aus kompaktem Sensorkorpus, Frontlinse, kleinen Seitenmodulen und sechs groben Laufbein-Segmenten auf.
- `docs/assets/CYBER_MECH_FIGURE_DESIGN_SYSTEM.md`, `public/models/blockout/README.md`, `README.md`, `ROADMAP.md` und `MEMORY.md` spiegeln diese Prototyp-Richtungsentscheidung jetzt mit.
- Dieser Pass bleibt bewusst leichtgewichtig: kein Combat-Umbau, kein Gameplay-Umbau, keine schweren Browser-Checks.

## Vision Reference Lock Update

- Die Referenzbilder unter `public/models/vision/` gelten jetzt als verbindliche Stilbasis fuer die naechsten Figuren-Slices.
- `docs/assets/VISION_STYLE_BIBLE.md` fasst die gemeinsame Form-, Farb- und Materialsprache der sechs Referenzen jetzt explizit zusammen.
- Der Pawn-Blockout in `scripts/export_blockout_assets.py` wurde erneut naeher an `public/models/vision/bauer.png` geschoben: hellerer Pod-Korpus, dunkler Mittelrahmen, klarere Frontlinse, cyanfarbene Akzentlichter und elegantere Beinformen.
- Der neue Blockout bleibt absichtlich grossformig und review-tauglich; Finaldetails, Rigging und Family-Refinement bleiben ein spaeterer Schritt.

## Pawn Leg System Clarification Pass

- Auf weiteres Design-Feedback wurde der naechste Pass bewusst nur auf Beinanschluesse, Gelenklogik, untere Beinsegmente und Standstabilitaet begrenzt.
- `scripts/export_blockout_assets.py` baut den Pawn jetzt mit klareren seitlichen Joint-Rails, definierten Attachment-Pods am Koerper, separaten Kniepunkten und konsistenteren unteren Beinsegmenten.
- Die mittleren Beine lesen jetzt staerker als primaere Stuetze, waehrend Front- und Rear-Legs schlanker und sekundarer bleiben.
- Die neue Blender-Vorschau fuer diesen Pass liegt unter `validation/blender/pawn-blockout-preview-leg-pass.png`.
- Dieser Pass bleibt asset- und blockout-orientiert; es wurden keine schweren Browser- oder App-Checks gestartet.

## Pawn Leg Connection Fix Pass

- Nach weiterem Feedback wurde die Beinlogik nochmals vereinfacht und mechanisch eindeutiger gemacht.
- Die seitlichen Joint-Rails greifen jetzt sichtbar in die Hueftpods, die Oberbeine ueberlappen sauber mit den Kniepods, und die Unterbeine enden direkt in aufgesetzten Fussplaettchen statt frei davor oder daneben.
- Die aktuelle Blender-Vorschau fuer diesen Korrekturpass liegt unter `validation/blender/pawn-blockout-preview-leg-pass-2.png`.

## Pawn Leg Connection Geometry Fix

- Der darauffolgende Pass behebt jetzt explizit die echten Anschlussfehler: `Korpus -> Gelenk`, `Gelenk -> Unterbein` und `Unterbein -> Fuss`.
- Die sechs Beine sind jetzt als klareres `front / middle / rear`-System mit korrekteren Kippachsen aufgebaut, damit die Segmente nicht nur optisch gedreht, sondern tatsaechlich in die Stuetzrichtung ausgerichtet sind.
- Die aktuelle Blender-Vorschau fuer diesen Stand liegt unter `validation/blender/pawn-blockout-preview-leg-pass-3.png`.

## Pawn Hexapod Rhythm Pass

- Danach wurde der Beinaufbau nochmals auf eine punktbasierte `joint -> knee -> foot`-Logik umgestellt, damit die grossen Formen wirklich als kontrolliertes Hexapod-System lesbar werden.
- Die Seitenbeine folgen jetzt staerker einer `/'\\____/'\\`-Rhythmik: obere Segmente spreizen sich kontrolliert nach aussen, waehrend die unteren Segmente wieder sauber auf definierte Fussplaettchen zuruecklaufen.
- Die aktuelle Blender-Vorschau fuer diesen Stand liegt unter `validation/blender/pawn-blockout-preview-leg-pass-4.png`.

## Pawn Leg Taper Pass

- Auf weiteres Form-Feedback wurden die Beinsegmente jetzt einzeln verjüngt statt als gleich dicke Streben aufgebaut.
- `scripts/export_blockout_assets.py` erzeugt Ober- und Unterbein jetzt als zweiteilige Spindel-/Frustum-Links mit mehr Volumen in der Mitte und schlankeren Enden an Gelenk und Fuss.
- Die aktuelle Blender-Vorschau fuer diesen Stand liegt unter `validation/blender/pawn-blockout-preview-leg-pass-5.png`.

## Pawn Outer Shield Lower Leg Pass

- Fuer die Aussenbeine wurde das Unterbein danach gezielt von einem normalen Glied auf eine ueberlappende Shield-/Blade-Form umgestellt.
- Die Aussenbeine besitzen jetzt weiterhin Spindel-Oberschenkel, aber das Unterbein wird als elliptisch-flacher, nach unten spitz zulaufender Schild aufgebaut, der das Knie von aussen ueberlappt.
- Die Mittelbeine bleiben bewusst einfacher als Stuetzbeine, damit der Pawn nicht wieder ins chaotische Krabbeltier kippt.
- Die aktuelle Blender-Vorschau fuer diesen Stand liegt unter `validation/blender/pawn-blockout-preview-leg-pass-7.png`.

## Pawn Outer Leg Rebuild Pass

- Die Aussenbeine wurden danach noch einmal strukturell neu aufgebaut: erst aus dem Korpus nach unten, dann ueber ein Hip-Gelenk im 90-Grad-Knick nach aussen, und erst davor das Shield.
- Zusaetzlich besitzen die Shield-Beine jetzt eine separate obere Ellipsoid-Kappe, damit die Form am Knie runder beginnt und danach erst spitz auslaeuft.
- Die aktuelle Blender-Vorschau fuer diesen Stand liegt unter `validation/blender/pawn-blockout-preview-leg-pass-8.png`.

## Pawn Shield Angle And Center Leg Pass

- Auf weiteres Feedback wurden die Outer-Shields jetzt nochmals um ihre Laengsachse gedreht, damit Front- und Rear-Legs nicht mehr dieselbe falsche Schild-Anordnung teilen.
- Die Center-Legs wurden wieder sichtbarer in die Silhouette eingebunden: laenger, etwas kraeftiger und weiter nach aussen gezogen.
- Die obere Shield-Kappe wurde zusaetzlich runder gemacht, damit das Unterbein am Knie weniger flach beginnt.
- Die aktuelle Blender-Vorschau fuer diesen Stand liegt unter `validation/blender/pawn-blockout-preview-leg-pass-9.png`.

## Pawn Blend Import And Orientation Fix

- Der fertig modellierte Pawn wurde aus `C:\Users\pkemi\OneDrive\Desktop\roboter\bauer.blend` nach `public/models/blockout/pawn.glb` exportiert.
- Die Referenzdatei wurde zusaetzlich unter `docs/assets/blender/bauer.blend` im Projekt gesichert, damit der Stand nicht nur auf dem Desktop lebt.
- Fuer die In-App-Review wurde der laufende Vite-Server genutzt; `blockout/pawn.glb` laedt korrekt ueber das bestehende `starter | blockout`-System, waehrend die restlichen Typen weiterhin sauber auf Starter-Assets zurueckfallen.
- Auf Nutzerfeedback wurde die Grundausrichtung der weissen Figuren in der Render-Schicht um 180 Grad gedreht; die Basisrotation bleibt jetzt auch waehrend Combat-Resets erhalten.
- Leichtgewichtige Verifikation: `npm.cmd run build` erfolgreich, plus manueller App-Screenshot unter `validation/app-blockout-pawn-white-rotated.png`.

## Blockout Source Palette Update

- `src/render/loaders.ts` behandelt `blockout`-Assets jetzt farblich anders als das Starter-Set.
- Fuer Weiss bleiben die exportierten Blender-Farben der Blockout-Materialien unveraendert erhalten.
- Fuer Schwarz werden auf denselben Blockout-Materialslots jetzt die exakten Komplementaerfarben der exportierten Blender-Farben verwendet.
- Die neue Farbkonvention ist zusaetzlich in `docs/assets/BLENDER_PIPELINE.md` und `public/models/blockout/README.md` dokumentiert.

## Pawn Foot Completion Fix

- Nach einem weiteren Review wurden die uebrig gebliebenen blauen Mittelplatten direkt im Blender-Source entfernt und gespeichert.
- Die zwei noch fehlenden Fuss-/Beinteile wurden anschliessend direkt im offenen `bauer.blend` nachgezogen und gespeichert: `pawn_leg_center_right_fix` und `pawn_leg_rear_left_lower_fix`.
- Der Projekt-Referenzstand unter `docs/assets/blender/bauer.blend` wurde erneut vom Desktop-Source synchronisiert.
- `public/models/blockout/pawn.glb` wurde danach frisch aus der aktualisierten `Codex_VisionPawnPreviewScene` exportiert.
- Die In-App-Pruefung zeigt den aktualisierten Pawn wieder im `blockout`-Set; Screenshot liegt unter `validation/app-blockout-pawn-feet-fix.png`.

## Pawn Export Source Correction

- Der vorherige Fehler lag nicht mehr nur in einzelnen Meshes, sondern im Exportansatz selbst: Es wurden Teilmengen und Helper-Roots aus `bauer.blend` exportiert statt der sichtbare Pawn-Stand als ganze Referenzfigur.
- Zur Korrektur wurde `C:\Users\pkemi\OneDrive\Desktop\roboter\bauer.blend1` wieder als Quelle fuer `bauer.blend` und `docs/assets/blender/bauer.blend` hergestellt.
- Der aktuelle `blockout`-Export nimmt den Pawn jetzt direkt aus allen sichtbaren `pawn_*`-Meshes der `Codex_VisionPawnPreviewScene` statt aus einem einzelnen Root-Fragment.
- Der daraus erzeugte In-App-Stand liegt unter `validation/app-blockout-pawn-from-user-blend.png`.

## Exact Open Blender Export

- Auf expliziten Nutzerhinweis wurde der Export nochmals auf den exakt aktuell offenen Blender-Stand umgestellt.
- Die offene Datei `bauer.blend` wurde zuerst gespeichert und danach direkt aus der aktiven `Codex_VisionPawnPreviewScene` exportiert.
- Fuer den Export werden jetzt nur die aktuell sichtbaren `pawn_*`-Meshes der offenen Szene verwendet; eine eigene Root-Auswahl oder zusaetzliche Cleanup-Logik greift dabei nicht mehr ein.
- Der aktuelle Export liegt unter `public/models/blockout/pawn.glb`, die synchronisierte Referenzdatei unter `docs/assets/blender/bauer.blend`.

## Bishop Vision Blockout Slice

- Der naechste Figurtyp wurde als eigener Vision-Blockout fuer den Laeufer aufgebaut, statt den Pawn weiterzuverwenden oder umzubenennen.
- Die neue Projektquelle liegt unter `docs/assets/blender/laeufer.blend` in der Szene `Codex_VisionBishopPreviewScene`.
- Der Laeufer orientiert sich an `public/models/vision/laeufer.png`: vertikaler heller Kernkoerper, dunkle seitliche Armaturen, cyanfarbener Herz-Core und sehr schlanke Beine.
- Der Export liegt jetzt unter `public/models/blockout/bishop.glb`.
- Leichtgewichtige In-App-Pruefung am laufenden Dev-Server: `render_game_to_text()` meldet im `blockout`-Set jetzt `bishop: blockout/bishop.glb`, waehrend `king`, `knight`, `queen` und `rook` weiter sauber auf Starter-Fallback laufen.
- Visuelle Referenzen fuer diesen Slice liegen unter `validation/blender/bishop-blockout-preview-3.png` und `validation/app-blockout-bishop-overview.png`.
- Leichtgewichtiger technischer Abschlusscheck: `npm.cmd run build` erfolgreich; keine schweren Browser-Validation-Runs gestartet.

## Bishop Exact Active Blender Export

- Auf expliziten Nutzerwunsch wurde der Laeufer danach noch einmal exakt aus dem aktuell offenen Blender-Stand exportiert, ohne weitere Formaenderungen.
- Der aktive Stand wurde zuerst wieder nach `docs/assets/blender/laeufer.blend` gespeichert und danach direkt nach `public/models/blockout/bishop.glb` exportiert.
- Leichtgewichtige Pruefung: Die exportierte Datei liegt mit aktuellem Zeitstempel unter `public/models/blockout/bishop.glb`, und `render_game_to_text()` meldet im laufenden Dev-Server weiterhin `bishop: blockout/bishop.glb`.

## Blockout Palette Unification Update

- Die Render-Palette fuer `blockout`-Assets wurde in `src/render/loaders.ts` von `Blender-Weiss + Schwarz-Komplement` auf eine feste In-Game-Palette umgestellt.
- Hauptkoerper verwenden jetzt ein einheitliches Weiss bzw. Schwarz, strukturelle Sekundaerteile ein gemeinsames Blau.
- Nur Highlight-Teile wie `eye`/`visor`/`lens` und `heart`/`core` behalten weiterhin ihre aktuell im Blender-Export gesetzte Akzentfarbe.
- Diese Farbregel ist zusaetzlich in `docs/assets/BLENDER_PIPELINE.md` und `public/models/blockout/README.md` dokumentiert.

## Rook Wheel-Base Blockout Slice

- Der Turm wurde als eigene Vision-Blockout-Datei unter `docs/assets/blender/turm.blend` aufgebaut, statt auf Bauer oder Laeufer weiterzuarbeiten.
- Das Grundgeruest orientiert sich moeglichst nah an `public/models/vision/Turm.png`: grosser runder Oberkoerper, zentrales Sensorauge, breites Brustschild, schwere Armkapseln und unten ein zentrales Rad-Chassis statt Beinen.
- Der Export liegt jetzt unter `public/models/blockout/rook.glb`.
- Leichtgewichtige In-App-Pruefung am laufenden Dev-Server: `render_game_to_text()` meldet im `blockout`-Set jetzt `rook: blockout/rook.glb`, waehrend `king`, `knight` und `queen` weiter sauber auf Starter-Fallback laufen.
- Visuelle Referenzen fuer diesen Slice liegen unter `validation/blender/rook-blockout-preview-3.png` und `validation/app-blockout-rook-overview.png`.

## Rook Palette Correction

- Auf Nutzerfeedback wurden fuer den Turm zwei Blockout-Paletten-Ausnahmen nachgezogen: die Schulterkapseln und der aeussere Brust-/Core-Rahmen bleiben jetzt in der Grundfarbe statt im Struktur-Blau.
- Die Ausnahmen laufen ueber `src/render/loaders.ts`, ohne die bestehende Highlight-Regel fuer Auge und Herz/Core zu aendern.
- Leichtgewichtige Verifikation: `npm.cmd run build` erfolgreich und der Turm wurde danach erneut im laufenden `blockout`-Set geprueft.

## Wheel And Grounding Adjustment

- Das Turmrad nutzt jetzt eine gezielte Drei-Zonen-Farbaufteilung: aeusseres Rad und innerer Hub bleiben in der Grundfarbe, waehrend nur der mittlere Radbereich blau bleibt.
- Fuer die Blockout-Templates von Bauer und Turm wurde zusaetzlich ein kleiner vertikaler Boden-Nudge eingefuehrt, damit beide Figuren im Spiel sichtbar tiefer sitzen und nicht mehr ueber dem Brett schweben.
- Beide Anpassungen laufen ausschliesslich ueber `src/render/loaders.ts`, also ohne neue Blender-Aenderungen an den freigegebenen Quelldateien.

## Fixed Blockout Family Palette

- Die Blockout-Palette in `src/render/loaders.ts` wurde nochmals gestrafft, damit alle Review-Figuren dieselbe feste Familienlogik nutzen: gemeinsames Weiss, gemeinsames Struktur-Blau, gemeinsames Hellblau fuer Augen/Linsen/Visoren und gemeinsames Pink fuer weisse Herzen.
- Schwarze Blockout-Figuren nutzen jetzt eine deutlich abgedunkelte Gegenvariante dieser festen Palette statt gemischter Material-Heuristiken oder warmer Schoko-Brauntoene im Hauptkoerper.
- Die Highlight-Erkennung ist jetzt enger an echte Mesh-Namen gebunden: nur echte Augen-/Visor-/Sensor-Meshes werden hellblau, nur das eigentliche Herz wird pink; Ringe und Herz-Border bleiben in Basis- bzw. Strukturfarben.
- Fuesse, Schultern, Shields sowie die aeusseren und inneren Turm-Radteile bleiben explizit in der Grundfarbe; nur die mittlere Radzone bleibt blau.
- Leichtgewichtige Verifikation: `npm.cmd run build` erfolgreich, `blockout` im laufenden Dev-Server erneut geprueft und Screenshot unter `validation/app-blockout-fixed-family-palette.png` abgelegt.
- Zusatzpass: der schwarze Grundkoerper wurde danach noch einmal von einer zu warmen Braunnote auf ein deutlich neutraleres Fast-Schwarz gezogen; aktueller Screenshot liegt unter `validation/app-blockout-black-base-near-black-board.png`.

## Rook Red Signal Fix

- Der Turm behandelt `rook_eye_lens` und `rook_core_shield` jetzt wieder als eigenes Signal-Highlight statt als weisse Grundflaeche.
- `rook_core_frame` bleibt als dunkles Strukturteil erhalten; Schultern, Fuesse und die weissen Radteile bleiben unveraendert in der Grundfarbe.
- Die Anpassung laeuft ausschliesslich ueber `src/render/loaders.ts`.
- Leichtgewichtige Verifikation: `npm.cmd run build` erfolgreich und In-App-Screenshot unter `validation/app-rook-red-signal-fix.png`.

## Black Highlight Correction

- In `src/render/loaders.ts` wurden nur zwei schwarze Highlight-Slots nachgezogen: `heart` und `signal` sind jetzt explizit wieder rot, statt indirekt den inzwischen hellblauen weissen `signal`-Wert zu erben.
- Damit trifft die Black-Palette jetzt wieder genau den gewuenschten Stand: schwarzer Bauer-Augenkern rot, schwarzes Laeufer-Herz rot und schwarze Turm-Signale `rook_eye_lens` plus `rook_core_shield` rot.
- Alles andere an der Blockout-Palette blieb unveraendert.
- Leichtgewichtige Verifikation: `npm.cmd run build` erfolgreich.

## Knight Blockout Rebound

- Der aktuell offene Springer aus Blender wurde ohne freie Formaenderungen direkt als Projektdatei nach `docs/assets/blender/springer.blend` gesichert und als `public/models/blockout/knight.glb` exportiert.
- Exportiert wurden nur die echten `knight_*`- und `springer_*`-Meshes der aktiven Szene; Preview-Boden, Lichtobjekte und andere Helpers bleiben draussen.
- Der Springer bleibt in der bestehenden Blockout-Palette und nutzt damit automatisch dieselben Farbregeln wie die bereits freigegebenen Figuren.
- In `src/render/loaders.ts` wurde fuer den Knight ein kleiner positiver Ground-Nudge ergaenzt, damit er im Spiel sichtbar als schwebendes Objekt liest statt am Brett zu kleben.
- Zusaetzlich wurden die Knight-Meshes fuer Auge und Kralle-Kreise gezielt an die Highlight-Erkennung angebunden, damit sie bei Weiss hellblau und bei Schwarz rot lesen.

## Knight Height And Eye-Ring Tuning

- In `src/render/loaders.ts` wurde der positive Ground-Nudge des Blockout-Knights nochmals leicht erhoeht, damit der Springer auf dem Feld sichtbar etwas hoeher sitzt.
- `springer_eye_ring` wird jetzt explizit als `trim` gelesen statt in die generische Grundkoerper-Regel zu fallen; dadurch ist der weisse Augenrahmen jetzt blau und der schwarze gold.
- Technischer Check: `npm.cmd run build` erfolgreich.
- Leichtgewichtige In-App-Pruefung am laufenden Vite-Server erfolgreich: `blockout/knight.glb` wurde aktiv geladen, und visuelle Screenshots liegen unter `validation/knight-height-eye-ring-page.png` sowie `validation/knight-height-eye-ring-zoomed.png`.

## Knight Stronger Float Lift

- Auf direktes Nutzerfeedback wurde der Knight danach nochmals deutlich staerker angehoben, damit er nicht mehr mit den unteren Stab-/Beinteilen am Boden liest.
- Der Blockout-Knight-Ground-Nudge in `src/render/loaders.ts` liegt jetzt bei `0.36` statt nur bei einer kleinen Korrektur.
- Browser- oder Screenshot-Pruefung wurde auf ausdruecklichen Nutzerwunsch in diesem Schritt ausgelassen; technischer Check bleibt `npm.cmd run build` erfolgreich.

## Exact Active Scene King Export

- Auf expliziten Nutzerwunsch wurde `public/models/blockout/king.glb` danach 1:1 aus der aktiven Blender-Szene exportiert, ohne Mesh-Filter und ohne zusaetzliche Szenenbereinigung.
- Weil der Web-Loader `blockout`-Assets sonst ueber die feste Review-Palette uefaerbt, behaelt `blockout/king.glb` jetzt als gezielte Ausnahme fuer weisse Figuren seine exportierten Blender-Materialfarben 1:1.
- Die Anpassung laeuft ausschliesslich ueber `src/render/loaders.ts`; andere Blockout-Figuren bleiben bei ihrer bisherigen Familienpalette.

## King Family Fit And Black Trim Rule

- `src/render/loaders.ts` behandelt `blockout/king.glb` jetzt mit groesserem zulaessigem Footprint, damit die aktive Szene trotz Ringen und Crown-Teilen wieder auf normale Familienhoehe skaliert.
- Fuer schwarze King-Instanzen bleiben nur Auge und Emblem als exportierte Highlights erhalten; die aeusseren Ringe sowie die Crown-Teile werden explizit auf das goldene Familien-`trim` gezogen.
- Weisse King-Instanzen behalten weiterhin die Blender-Materialfarben 1:1.

## Knight Hover Lift Increase

- Der Blockout-Knight-Ground-Nudge in `src/render/loaders.ts` wurde auf `1.5` angehoben.
- Ziel ist, dass der Springer in der App klar als schwebender Koerper liest statt nur leicht ueber dem Brett zu sitzen.

## Knight Hover Reset And King Center Fix

- Der Knight-Hover lebt weiterhin rein in der `visualRoot`-Praesentationsschicht, wurde auf direktes Feedback aber wieder auf ca. `0.36` Grundoffset abgesenkt.
- Fuer `blockout/king.glb` werden versehentlich mit exportierte `knight_hover_*`-Meshes jetzt direkt aus dem geladenen Template entfernt, statt nur noch indirekt ueber Bounds-Filter behandelt zu werden.
- Die King-Zielhoehe im Loader wurde danach wieder abgesenkt, damit er trotz sauberer Zentrierung nicht uebergross in der Familie liest.
- Dadurch bleiben Board-Anchor und Square-Mapping unveraendert, waehrend der sichtbare King wieder mittig auf dem Feld sitzt statt nach vorne versetzt zu lesen.

## Queen Blockout Import

- Die aktuell offene Queen aus Blender wurde als Projektkopie nach `docs/assets/blender/dame.blend` gesichert und zuerst zu eng gefiltert exportiert.
- Auf direktes Nutzerfeedback wurde `public/models/blockout/queen.glb` danach 1:1 aus der aktiven Szene neu exportiert, also mit allen 51 Szenenobjekten statt nur den `dame_*`-Meshes.
- Ein trockener GLB-Check im Repo bestaetigt jetzt 51 Meshes; darin bleiben bewusst auch fremd benannte `knight_*`- und `koenig_*`-Teile erhalten.
- Fuer diesen Korrekturpass wurde bewusst keine Namensfilterung mehr auf die Szene gelegt.

## Combat Camera Priority Update

- Die Combat-Kamera ist jetzt noch haerter beschnitten: pro Gefecht werden exakt zwei und nur zwei Zielkandidaten gebaut, `leftCandidate` und `rightCandidate`.
- Beide Kandidaten entstehen nur aus Kampfgeometrie: Angreifer/Victim-Midpoint, `combatForward`, festem Side-Offset, festem Back-Offset und festem Up-Offset; es gibt keine freie Framing-Suche mehr.
- Die aktuelle User-Inspect-Pose bestimmt nur noch, welcher dieser beiden Kandidaten naeher an der momentanen Blickseite liegt, und bleibt zugleich das Ruecksprungziel nach Combat.
- Die Kamera-Controls bleiben waehrend `combat` und auch waehrend `combatTransitionOut` gesperrt, damit die Rueckfahrt nicht gegen Orbit-Input arbeitet.
- `render_game_to_text()` und die Snapshot-Daten liefern jetzt `camera.priority`, `camera.combatSide`, `inspectPosition/Target`, `combatSourcePosition/Target` und `returnPosition/Target` fuer Debugging.
- Fuer gezielte Checks existiert ausserdem `window.debug_preview_combat_camera(...)`, das eine synthetische Combat-Praesentation ohne Mutation des Schachzustands triggern kann.
- Technischer Check: `npm.cmd run build` erfolgreich.
- Web-Game-Client lief erneut erfolgreich gegen `http://127.0.0.1:4173`; Artefakte liegen unter `validation/camera-priority-client-baseline/`.
- Zusaetzlicher Playwright-Debugcheck: nach einem echten Orbit auf die rechte Brettseite waehlte ein synthetischer Combat (`e4 -> d5`) korrekt `camera.combatSide = right`, lief in `combatHold`, sperrte Controls und kehrte danach ueber `returnToInspect` sauber auf die gespeicherte User-Ansicht zurueck.
- Korrektur auf direktes Nutzerfeedback: der fruehere Rueckenversatz `-combatForward` wurde komplett aus der Kandidaten-Geometrie entfernt. `leftCandidate` und `rightCandidate` entstehen jetzt nur noch aus `midpoint +/- sideOffset + upOffset`, damit Combat nicht standardmaessig hinter den Angreifer geschoben wird.
- Technischer Check nach dieser Korrektur: `npm.cmd run build` erneut erfolgreich.
- Der vorgeschriebene Web-Game-Client wurde erneut gestartet, lief diesmal aber in ein Playwright-Screenshot-Timeout; kein neuer App-Fehler im Kamerastand sichtbar, aber der Client-Artefaktlauf war dadurch nicht sauber abschliessbar.
- Direkte Playwright-Verifikation als Fallback erfolgreich: nach Orbit auf die rechte Seite blieb `inspectPosition` bei `10.7 / 6.72 / -3.74`, der synthetische Combat waehlt weiter `combatSide = right`, und die Combat-Kamera liegt nun ohne Rueckenversatz bei `position = { x: 1.03, y: 2.7, z: -1.03 }`.
- Zusaetzlicher Canvas-Screenshot dieses Option-A-Stands liegt unter `validation/camera-option-a-canvas.png`.

## Combat Camera Focus And Curve Update

- Die Combat-Kamera nutzt jetzt fuer den visuellen Fokus nicht mehr den Wegmittelpunkt, sondern die exakte Kampfposition `event.to`, also den Landepunkt des Angreifers.
- Die Ein- und Ausfahrt der Kamera laeuft nicht mehr ueber lineare Position-Lerps, sondern ueber eine gekruemmte Kugelbahn um den Kampfpunkt.
- Die harte Zwei-Kandidaten-Regel bleibt dabei unveraendert: es gibt weiterhin nur `leftCandidate` und `rightCandidate`, die User-Inspect-Ansicht waehlt nur die naehere Seite.
- Technischer Check nach dieser Umstellung: `npm.cmd run build` erfolgreich.

## Priority Rebase

- Auf direktes Nutzerfeedback gelten der Familienreview-Block fuer alle sechs Blockout-Figuren und der aktuelle Combat-Kamera-Feintuning-Block vorerst als erledigt.
- Die dokumentierte naechste Prioritaet verschiebt sich damit auf kleine `Cyber-Mech-VFX/SFX` und sonstigen Experience-/Presentation-Polish statt auf einen weiteren grossen Figuren- oder Kamera-Grundsatzpass.

## Cyber-Mech Combat VFX/SFX Slice

- Ein leichter renderseitiger `combat-feedback`-Controller haengt jetzt direkt an der bestehenden Combat-Pipeline und setzt phasengetriebene Cyber-Mech-Akzente fuer `intro`, `attack`, `impact`, `resolve`, `return`.
- Die neuen Render-Effekte bleiben absichtlich klein: Energy-Core-Pulses, Servo-Ringe, kompakter Impact-Flash mit kleinen Sparks sowie ein kurzer Shutdown-/Flicker-Akzent auf dem Victim.
- Audio-seitig existiert jetzt ein eigener `combat-sfx`-Controller, der die bestehenden WebAudio-Oszillator-Sounds um kleine Combat-Cues fuer Intro, Attack, Impact, Resolve und Return erweitert.
- `undo()`, `restart()`, Combat-Ende und Combat-Cancel raeumen die transienten VFX/SFX jetzt sofort wieder; `render_game_to_text()` zeigt dafuer `animation.feedback` und `sound.combat`.
- Der bestehende Debug-Hook `window.debug_preview_combat_camera(...)` staged jetzt eine synthetische Combat-Szene in der Render-Pipeline und akzeptiert zusaetzlich `phaseProgress`, damit einzelne Combat-Phasen gezielt validierbar sind.
- `npm.cmd run build` ist erfolgreich.
- Leichte Browser-Verifikation lief gegen den bestehenden Dev-Server: Impact- und Resolve-Preview zeigen die neuen Feedback-Flags/SFX-Cues im Snapshot, und der Ruecksprung auf `mode: board` leert Feedback- und SFX-Zustand wieder.

## Room Explore Polish Slice

- In renderRoomHotspots (src/app/game.ts) wurden alle inline Styles auf CSS-Klassen umgestellt; nur left/top fuer die 2D-Projection bleiben inline.
- Jeder Hotspot-Button zeigt jetzt einen Untertitel (board -> 'Enter to play', displayCase -> 'View pieces') ueber eine ROOM_HOTSPOT_SUBTITLES-Konstante.
- Fokussierter Hotspot zeigt eine Info-Plate (.room-focus-plate) unten links im Szene-Frame mit 'Viewing / [Name]'.
- Hover- und Fokus-Zustand werden ueber CSS-Klassen room-hotspot-btn--hovered und room-hotspot-btn--focused gesteuert.
- src/styles/main.css um ca. 130 Zeilen Hotspot-CSS erweitert: .room-hotspot-btn, Zustandsmodifikatoren, .room-hotspot-indicator mit ::after-Ping-Animation (@keyframes hotspot-ping), .room-hotspot-text/label/sublabel, .room-focus-plate.
- roomExplore-Branch in renderStartFlowControls bereinigt.
- npm.cmd run build erfolgreich.

## Start Flow Return Paths Und Display Case Focus

- boardFocus -> roomExplore: In src/ui/controls.ts wurde renderControls um einen optionalen showReturnToRoom-Prop erweitert. Im boardFocus-Modus erscheint ein 'Back to Room'-Button (data-control='return-to-room') oberhalb der Spiel-Controls.
- returnToRoomExplore() in src/app/game.ts setzt den State auf roomExplore / overview zurueck, ohne den Schachspielstand zu veraendern. Handler return-to-room greift fuer boardFocus und displayCaseFocus.
- StartFlowMode in src/render/scene.ts um 'displayCaseFocus' erweitert. getStartFlowCameraPreset() gibt fuer displayCaseFocus das bestehende displayCase-Kamera-Preset zurueck; Camera-Lock und Interaction-Lock greifen automatisch.
- enterDisplayCaseFocus() ergaenzt - analog zu enterBoardFocus().
- handleControlsClick haelt einen neuen enter-display-case-focus-Handler (aktiv wenn roomFocusTarget === 'displayCase' und keine Transition laeuft).
- Im roomExplore-Branch von renderStartFlowControls erscheint ein zweiter Button 'View Display Case'. displayCaseFocus-Branch zeigt nur 'Back to Room' ohne Spiel-Controls.
- buildOverlayMessage liefert jetzt eigene Texte fuer alle roomExplore-Ziele und fuer displayCaseFocus.
- MEMORY.md um Sektion 'Arbeitsweise: Systemweite Aenderungen' erweitert.
- npm.cmd run build erfolgreich.

## Cyber-Mech Board Asset Integration Slice

### Was wurde gemacht

- Neues  aus dem Blender-Cyber-Mech-Brett exportiert und unter  abgelegt (224 KB, 116 Objekte: 64 Felder, Rahmen, Emissiv-Akzente, Sockel/Pedestal).
-  minimal erweitert:
  - Neue Konstante .
  - Neue Ausrichtungskonstante  (passt Blender-Schritt 0.512 an Game-Schritt 1.0 an).
  -  versucht jetzt zuerst , faellt bei Fehler auf  zurueck.
  -  erhaelt jetzt -Parameter und wendet  an wenn die Cyber-Board-Datei geladen wurde.
  -  meldet  als primaere erwartete Board-Datei fuer korrektes Debug-Overlay.

### Warum diese Umsetzung

- Minimale Aenderungsflaeche: Nur  wurde angefasst. Keine Aenderungen an , ,  oder UI.
- Das bestehende Interaktionssystem (unsichtbare Hit-Squares, Highlights, squareToWorld) bleibt vollstaendig unveraendert.
- Der Fallback auf  haelt die Architektur nicht-destruktiv.
- Nach der Skalierung sitzt die Board-Oberflaeche bei Y ~0.068, konsistent mit der Platzhalter-Variante (Y ~0.07).

### Ausrichtungs-Logik

- Blender-Board: SQ=0.50, GAP=0.012, SQ_STEP=0.512, Board-Breite=4.096 Blender-Einheiten
- Game-Grid: 1.0 Einheit pro Feld, Board-Breite=8.0 Game-Einheiten
- Skalierungsfaktor: 1.0 / 0.512 = 1.953125 ? ein Blender-Feld-Schritt = ein Game-Feld-Schritt
- Datei-Achse (a-h) liegt auf Three.js X: Blender X ? GLTF X (unveraendert)
- Rang-Achse (1-8) liegt auf Three.js Z: Blender Y ? GLTF -Z (korrekte Polaritaet)
- Visuelle Ausrichtungsabweichung max. ~0.012 Game-Einheiten pro Feld (kleiner als 1.5% eines Feldbreitenwertes) durch OFFSET-Formel; fuer Gameplay irrelevant da die Interaktions-Squares vom Game-Grid bestimmt werden.

### Dateien geaendert

-  (neu, 224 KB)
-  (minimal erweitert)

### Build-Status

- 
> 3d-web-chess@0.1.0 build
> tsc && vite build

[36mvite v7.3.1 [32mbuilding client environment for production...[36m[39m
transforming...
[32m?[39m 321 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m  0.46 kB[22m[1m[22m[2m � gzip:   0.30 kB[22m
[2mdist/[22m[35massets/index-DgSoaEb9.css  [39m[1m[2m  7.59 kB[22m[1m[22m[2m � gzip:   2.33 kB[22m
[2mdist/[22m[36massets/index-BzpCF7TA.js   [39m[1m[33m737.57 kB[39m[22m[2m � gzip: 196.34 kB[22m
[32m? built in 4.62s[39m passiert sauber ohne TypeScript-Fehler.

### TODOs / Folge-Hinweise

- Nach manuellem Test pruefen ob die Brett-Oberflaeche und Figuren-Positionierung korrekt wirken; ggf.  oder Y-Offset anpassen.
- Wenn die Blender-Board-Felder visuell zu dunkel oder zu hell sind koennen sq_light / sq_dark Materialwerte im Blender-Quellfile nachgesteuert werden ohne Code-Aenderungen.
- Kein Aenderungsbedarf an Kamera-, Combat-, Undo/Restart- oder StartFlow-Logik.


## Cyber-Mech Board Asset Integration Slice

### Was wurde gemacht

- Neues board_cyber.glb aus dem Blender-Cyber-Mech-Brett exportiert (224 KB, 116 Objekte: 64 Felder, Rahmen, Emissiv-Akzente, Sockel).
- src/render/loaders.ts minimal erweitert:
  - Neue Konstante BOARD_CYBER_MODEL_FILE.
  - Skalierungskonstante BOARD_CYBER_SCALE = 1.953125 (Blender-Schritt 0.512 -> Game-Schritt 1.0).
  - loadBoardVisualAsset() versucht zuerst board_cyber.glb, faellt auf board.glb zurueck.
  - prepareBoardTemplate() erhaelt sourceFile-Parameter und wendet BOARD_CYBER_SCALE an.
  - getExpectedModelFiles() meldet board_cyber.glb als primaere Board-Datei.

### Umsetzungs-Entscheidungen

- Minimale Aenderungsflaeche: nur loaders.ts angefasst.
- board.ts, scene.ts, game.ts, UI unveraendert.
- Interaktionssystem (Hit-Squares, Highlights, squareToWorld) vollstaendig unveraendert.
- Fallback auf board.glb haelt Integration nicht-destruktiv.
- Brettoberflaeche nach Skalierung bei Y ~0.068, konsistent mit Platzhalter (~0.07).

### Ausrichtungs-Logik

- Blender-Board: SQ=0.50 + GAP=0.012 = SQ_STEP 0.512 Einheiten pro Feld
- Game-Grid: 1.0 Einheit pro Feld
- Skalierungsfaktor: 1.0 / 0.512 = 1.953125
- Datei-Achse (a-h): Blender X -> Three.js X korrekt
- Rang-Achse (1-8): Blender Y -> Three.js -Z korrekte Polaritaet
- Visuelle Restabweichung < 0.012 Game-Einheiten pro Feld (irrelevant fuer Gameplay)

### Dateien

- public/models/board_cyber.glb (neu)
- src/render/loaders.ts (minimal erweitert)

### Build

- npm run build passiert sauber, keine TypeScript-Fehler.

### Folge-Hinweise

- Nach manuellem Test pruefen ob Brettoberflaeche und Figurenpositionierung korrekt wirken.
- Wenn Felder visuell nachgesteuert werden sollen: sq_light/sq_dark im Blender-Quellfile anpassen, kein Code-Aenderungsbedarf.
- Kein Aenderungsbedarf an Kamera, Combat, Undo/Restart oder StartFlow.


## Board Presentation Sanity Pass + Smooth Return Transition

### Diagnosis

**Was wurde ersetzt:**
- setVisualBoardAsset() ersetzt den gesamten Fallback (frame y=-0.28, plinth y=-0.68, 64 Schachfelder) vollstaendig durch das neue GLB. Der alte Tisch ist vollstaendig weg.

**Was noch aus dem alten Setup kam (und jetzt gefixt):**
1. createStageGround() lag bei y=-0.92 -> klippte mitten durch den Pedestal-Schaft (Pedestal geht nach Skalierung bis y approx -2.3).
2. Fog-Farbe '#8c6846' (warmes Braun) kollidierte visuell mit den Cyan-Emissiv-Akzenten.
3. Emissive Materialien (emit_cyan/emit_core/emit_dim) wurden durch ACESFilmic Tone Mapping zu stark komprimiert -> kaum sichtbares Gluehen.

### Aenderungen

**src/render/loaders.ts - prepareBoardTemplate:**
- Traverse aller Meshes nach dem Skalieren: Materialien mit Name 'emit_*' erhalten toneMapped=false und verstaerktes emissiveIntensity (min 3.0, oder Exportwert*2.0 falls > 0).
- Dadurch rendern die Cyan-Strips und Corner-Studs am echten HDR-Brightness statt tone-mapping-komprimiert.

**src/render/scene.ts - createStageGround:**
- Boden von y=-0.92 auf y=-2.5 abgesenkt: Pedestal-Basis sitzt sauber auf dem Boden statt durch ihn zu klippen.
- Radius von 10.5 auf 14 vergroessert damit Pedestal-Basis nicht ueber sichtbaren Rand ragt.
- Bodenmaterial von warm-braunem '#6f5036' auf dunkles neutrales '#0e0e14' geaendert.

**src/render/scene.ts - createStageScene:**
- Fog-Farbe von warme '#8c6846' auf dunkles Neutral '#0d0d18' geaendert, Far von 28 auf 32 erweitert.
- Board und Figuren lesen jetzt ohne braunen Atmosphaere-Stich.

**src/app/game.ts - returnToRoomExplore:**
- returnToRoomExplore() war ein sofortiger Snap: roomFocusElapsedMs = DURATION_MS (kein Uebergang).
- Jetzt: roomFocusFromTarget wird aus dem aktiven Modus abgeleitet ('board' aus boardFocus, 'displayCase' aus displayCaseFocus), roomFocusElapsedMs=0, ensureStartFlowLoop() gestartet.
- Ergebnis: Die bestehende lerpCameraPreset-Infrastruktur animiert die Kamera in 700ms (easeInOutCubic) von der aktuellen Board-Pose (oder DisplayCase-Preset) zur Overview-Pose.
- Kein neuer Kamera-Code noetig: getRoomFocusTargetPreset('board') liefert die Live-boardCameraControls-Pose.
- Gameplay-Interaktion bleibt waehrend des Uebergangs gesperrt (isRoomFocusTransitionActive() = true).

### Unveraendert

- squareToWorld, Hit-Squares, Highlights, Combat, chess.js, UI-Struktur.
- enterBoardFocus, enterDisplayCaseFocus, focusRoomTarget, introTransition.
- Kamera-Architektur, StartFlow-State-Machine.

### Build

- npm run build passiert sauber, keine TypeScript-Fehler.

## Holographic Board Presentation Pass

### Ziel

Das Schachbrett soll nicht mehr wie ein physisches Board mit Glow-Akzenten lesen, sondern als holografisches Taktik-Interface, das klar in zwei Schichten getrennt ist: dunkle neutrale Hardware-Basis und schwebende emissive Projektions-Tiles.

### Was wurde gemacht (Blender-Seite)

- Tile-XY-Ausdehnung von 0.25 auf 0.19 Blender-Einheiten reduziert: 37% Bedeckung, 63% sichtbare Luecke zwischen Zellen
- Tile-Z-Skalierung von 0.0175 auf 0.004 (duennere Scheiben), Z-Position auf 0.038 angehoben (schwebt ueber Basis)
- `sq_light`-Material: near-black Basis, Emission Cyan Strength 5.0, alpha 0.38, BLEND
- `sq_dark`-Material: near-black Basis, Emission Teal Strength 2.0, alpha 0.16, BLEND
- `proj_separator` neu: 18 Bmesh-Quads (9 vertikal + 9 horizontal), dunkle metallische Trennstege zwischen Zellen, Z=0.015
- `proj_separator_mat`: near-black (0.028, 0.033, 0.038), Metallic 0.95, Emission=0
- `proj_field_mat`: alpha=0 (unsichtbar, kein blauer Nebel mehr)
- `board_frame`-Material: neutrales Dunkelgrau (0.056, 0.068, 0.080), Metallic 0.92, Emission=0
- `base_plate_hardware`-Material: neutrales Dunkelgrau (0.038, 0.048, 0.058), Metallic 0.92, Emission=0
- GLB exportiert als `public/models/board_cyber.glb` (222 KB)

### Was wurde gemacht (Code-Seite)

- `src/render/loaders.ts`: sq_light/sq_dark erhalten `toneMapped=false`, `depthWrite=false`, ggf. Fallback-Intensitaet und Opacity
- `src/render/board.ts`: `createHolographicGridOverlay()` hinzugefuegt (Canvas 512x512, 9x9 Linien + Eckpunkte, AdditiveBlending, opacity 0.40, Y=0.085, renderOrder=4)
- Grid-Y bewusst ueber Tile-Oberkante (Tiles Y~0.078), unter Highlight-Markern (Y>=0.095)

### Ergebnis

Physische Hardware (Rahmen, Rails, Pedestal, Trennstege) = dunkel, neutral, premium, kein Teal-Stich. Spielflaeche = 64 emissive Projektionsfenster, die als projiziertes Licht ueber der Hardware schweben.

### Build

- `npx tsc --noEmit` sauber, keine Fehler.

## Environment Direction Update: Wohnzimmer -> Sci-fi Workstation

### Entscheidung

Die bisherige Raumplanung als klassisches Wohnzimmer wird durch ein `Sci-fi Workstation / Orbital Room`-Konzept ersetzt. Das Wohnzimmer wuerde gegen die bereits etablierte Projektrichtung arbeiten.

### Bestehendes passt bereits zur neuen Richtung

- Cyber-Mech-Figuren (Blockout fuer alle 6 Typen freigegeben)
- Holografisches Schachbrett als Taktikplattform
- Combat-Cinematics und phasengetriebene VFX/SFX
- Room-Explore-Hotspot-System mit Kamera-Posen
- Dunkle neutrale Szene (Boden, Fog) aus dem Board-Sanity-Pass

### Neue Raumrichtung

Mischung aus: persoenlichem Sci-fi Operator-Raum, futuristischer Werkstatt und Orbital Workstation. Naeher an High-End Mech-Engineer's Room als an generischer Labeled-Sci-fi-Kulisse.

### Geplante Raumzonen (spaeterer Blockout)

- **Zentrum**: Schachbrett / Taktikplattform auf Pedestal
- **Sekundaerzone**: Display Case / Figurenpodest
- **Arbeitszone**: Konsole / Monitor / Analyse-Desk
- **Hintergrundzone**: grosses Fenster / Tech Wall mit Ausblick

### Was sich geaendert hat

- `ROADMAP.md` aktualisiert: Section `Geplanter Start Flow` verweist jetzt auf Sci-fi Workstation statt Wohnzimmer
- `ROADMAP.md`: neue Section `Environment Leitidee: Sci-fi Workstation` mit Leitbegriffen, Raumzonen und Blockout-Reihenfolge hinzugefuegt
- `ROADMAP.md`: Hotspot-Labels an Sci-fi-Kontext angepasst

### Naechste Prioritaet

Kein sofortiger Environment-Blockout. Erst:

1. Start-Flow und Room-Explore im bestehenden Setup weiter verfeinern
2. dann Sci-fi Workstation Environment Blockout als naechster grosser Block

## Sci-fi Workstation Environment Blockout

### Ziel

Ersten raeumlichen Blockout um das Schachbrett herum aufbauen. Der Raum soll als futuristische Workstation / Portfolio-Umgebung lesbar werden — nicht als Wohnzimmer. Das Brett ist ein wichtiges Element, aber nicht das einzige.

### Was wurde gemacht

**Alle Aenderungen in einer einzigen Datei: `src/render/scene.ts`**

Neue Funktion `createEnvironmentBlockout()` eingefuehrt, die ein `THREE.Group` mit prozeduraler Raumgeometrie erstellt. In `createStageScene()` wird das Ergebnis mit `scene.add(createEnvironmentBlockout())` eingehaengt — eine Zeile Change.

**Raumzonen:**

_Raumhuelle (Wände):_
- Back wall: z=−9.2, 18.5 breit, 9 hoch, material dark metallic
- 4 Panel-Insets auf der Rueckwand (aufgesetzte Flaechen)
- Emissive Akzentstreifen oben und unten auf der Rueckwand (cyan / dim-teal)
- Left wall: x=−8.2, WALL_H hoch, 15 lang
- Vertikaler Eckstreifen und horizontaler Top-Streifen auf der linken Wand
- Right partial wall: x=9.5, nur der rueckwaertige Bereich (Kamera bleibt offen)

_Strukturelle Saeulenmit Akzentringen:_
- 3 Zylinder-Saeuleh (8- seitig, slight taper) an Ecken: links-hinten, rechts-hinten, links-vorne
- Je 3 Torus-Ringe pro Saeule (dim-teal emissiv) bei y = 1.2, 4.5, 7.8 ueber Boden

_Boden-Akzentkanale:_
- 2 emissive dimAccent-Streifen auf dem Boden (beidseitig, verlaufen von vorne nach hinten)

_Display Case Zone (vorne-links, x=−3.2, z=1.8):_
- Boden-Plattform (flacher Slab auf dem Boden)
- Zentraler Pedestal-Sockel (Hoehe 2.2)
- Emissiver Akzentring oben am Sockel
- Glas-Schaukasten (1.85h, semitransparent, depthWrite=false)
- Rahmen: Top-Cap und Front/Back-Kanten-Streifen aus dunklem Metall
- Zwei emissive Indikator-Dots an Sockelseitenwanden

_Workstation Console Zone (rechts-hinten, x=6.8, z=−4.6):_
- Boden-Plattform mit Akzentstreifen-Kante
- Schreibtisch (Oberfläche + 4 Beine)
- Erhoehtes Console-Input-Deck mit emissivem Akzentstreifen oben
- Monitor-Spine-Staender
- 3 Monitore in leichtem Bogen (±0.22 rad gedreht), je Frame + dunklem Screen
- Wandmontiertes Rack-Panel (6 Module-Schichten + dim-teal Akzentkante)

### Aenderungsflaeche

- `src/render/scene.ts`: neue Funktion `createEnvironmentBlockout()` (~175 Zeilen), ein neuer Aufruf in `createStageScene()`.
- Kein anderes System wurde beruehrt: game.ts, board.ts, loaders.ts, interaction.ts, combat, chess.js, UI unveraendert.
- Kameraziele und Hotspot-Anker unveraendert.

### Geometrie-Koordinaten-Snap

- Board-Zentrum: (0, 0, 0), Board-Oberflaeche: y ≈ 0.07
- Boden: y = −2.5
- Back wall: z = −9.2 (Distanz von Overview-Kamera: ~19.4, schwach gefoggt)
- Display Case Showcase-Top: y ≈ 1.65, passend zu Hotspot-Anker bei y = 1.55
- Workstation Desk-Oberflaeche: y = −1.45, Monitor-Zentren: y ≈ −0.51

### Build

- `npm.cmd run build` sauber, keine TypeScript-Fehler.
- Bundle: 741 KB (vorher 737 KB, +4 KB fuer Geometriecode).

## Environment Blockout — Positionskorrektur Display Case

Korrektur-Pass nach dem initialen Blockout: Display Case wurde waehrend des initialen Blockouts bei x=−3.2 platziert, was innerhalb der a-Spalten-Ausdehnung liegt (a-Spalten-Felder: x=−4.0 bis −3.0). Das Schaukasten-Gehaeuse ueberlappte damit mit den Board-Koordinaten.

### Was geaendert wurde (alle Aenderungen in `src/render/scene.ts`)

**Display Case verschoben — klar links vom Brett:**
- `DCX`: −3.2 → −5.5
- `DCZ`: 1.8 → 2.5
- Neue Position: x=−5.5 liegt 1.5 Einheiten links der a-Spalte (Zentrum x=−3.5), Schaukasten-Koerper ueberschneidet sich nicht mehr mit Brett-Footprint.

**Kamera-Preset `ROOM_FOCUS_TARGET_PRESETS.displayCase` aktualisiert:**
- position: (−7.1, 4.8, 6.1) → (−8.0, 3.5, 6.0)
- target: (−2.8, 1.35, 1.7) → (−5.5, 1.2, 2.5)

**Hotspot-Anker `ROOM_HOTSPOT_DEFINITIONS[1].anchor` aktualisiert:**
- (−2.8, 1.55, 1.7) → (−5.5, 1.5, 2.5)

**Schreibtisch-Bein-Positionen korrigiert:**
- z-Koordinaten der Beine lagen ausserhalb des Schreibtisch-Footprints.
- Korrigiert auf z=−4.05 (vordere Beine) und z=−5.15 (hintere Beine), passend zu Schreibtischtiefe 1.18 zentriert auf z=−4.6.

### Build

- `npm.cmd run build` sauber, keine TypeScript-Fehler.

## Environment Blockout — Refactoring in separates Modul

`createEnvironmentBlockout()` wurde aus `scene.ts` in ein eigenes Modul ausgelagert. Damit bleibt `scene.ts` frei von Blockout-Geometriecode; der Austausch gegen ein Blender-GLB ist eine Aenderung in einer einzigen Datei.

### Was geaendert wurde

**Neue Datei `src/render/environment.ts`:**
- Enthaelt die exportierte Funktion `createEnvironmentBlockout(): THREE.Group`.
- Voller Blockout-Inhalt unveraendert (Waende, Saeulen, Display Case bei x=−5.5/z=2.5, Workstation-Console bei x=6.8/z=−4.6).
- Datei-Header erklaert, dass dies ein Platzhalter bis zur Blender-GLB-Integration ist.

**`src/render/scene.ts`:**
- Import ergaenzt: `import { createEnvironmentBlockout } from './environment';`
- Inline-Funktion (~175 Zeilen) entfernt.
- Aufruf `scene.add(createEnvironmentBlockout())` unveraendert in `createStageScene()`.
- Kamera-Presets und Hotspot-Anker unveraendert.

### Build

- `npm run build` sauber, keine TypeScript-Fehler.
- Bundle: 741 KB (unveraendert — nur Refactoring, kein neuer Geometriecode).

## Environment Blockout — Aus App entfernt

Der prozeduralkode Blockout (`createEnvironmentBlockout`) wurde vollstaendig aus der App herausgenommen. In der App ist jetzt kein Raumgeometrie mehr sichtbar.

### Was geaendert wurde

- `src/render/environment.ts`: Gesamter Blockout-Code entfernt. Datei ist jetzt ein leerer Kommentar-Stub, der erklaert, dass hier spaeter der GLTFLoader fuer `raum.glb` eingehaengt wird.
- `src/render/scene.ts`: Import und Aufruf `scene.add(createEnvironmentBlockout())` entfernt.

### Naechster Schritt

Raum in Blender bauen. Erst wenn `raum.glb` exportiert ist, wird `environment.ts` mit dem GLTFLoader-Aufruf befuellt.

### Build

- `npm run build` sauber, keine TypeScript-Fehler.
- Bundle: 739 KB (vorher 741 KB, −2 KB durch entfernten Geometriecode).

## Sci-fi Workstation Blockout in Blender

### Was wurde gemacht

Erster vollstaendiger Blender-Blockout fuer den Raum wurde in einem neuen `.blend` direkt per MCP aufgebaut und gespeichert.

- Quelldatei: `docs/assets/blender/raum.blend`
- 154 Objekte gesamt, 143 Meshes, 8 Lichter, 3 Kameras
- Saubere Collection-Struktur: `RAUM > HUELLE | STRATEGIE_ZONE | DISPLAY_CASE | WORKSTATION | ATMOSPHAERE`

**HUELLE (40 Objekte):** Boden, Decke, Rueckwand mit 4 grossen Tech-Panel-Insets + Akzentstreifen, linke Wand mit 2 Panel-Sektionen, rechte Partial-Wand, 3 strukturelle Deckentraeger, 3 Eckpfeiler mit je 3 Torus-Ringen.

**STRATEGIE_ZONE (23 Objekte):** Angehobene Platform mit Kanten-Akzentstreifen, achteckiger Pedestal-Basis + Schaft (konisch) + Cap + 2 Akzentringe, visueller Board-Platzhalter-Slab mit Rahmen, schwebendem Holo-Ring ueber dem Brett, Eintritts-Stufen, 4 Boden-Datenkonduit-Rohre.

**DISPLAY_CASE (21 Objekte):** Eigene Zone-Platform, zentraler Pedestal mit Schaft + Cap + 2 Ringen, semitransparenter Glas-Schaukasten, dunkles Metallrahmen-System (Top-Cap + Eckstaebe), Indikator-Dots, Overhead-Lichtbruecke.

**WORKSTATION (41 Objekte):** Zone-Platform, L-foermige Tischplatte + 4 Beine, Input-Console-Deck mit 3 Indikator-Reihen + Akzentstreifen, zentraler Monitor-Spine-Staender, 3 Monitore im leichten Bogen (Frame + Screen + Top-Akzent), Wand-Rack-Panel mit 5 Units + LEDs, Kabel-Konduit-Box.

**ATMOSPHAERE (29 Objekte):** 4 Area-Lights (Haupt, Board-Key, Workstation, Display Case), 1 Fill-Light, 3 Point-Lights (Board-Glow, DC-Glow, Konsolen-Glow), 3 Kameras (Overview, Board, Room-Wide), Kabelgehaeuse-Serie (linke Wand), horizontaler Wand-Konduit (Rueckwand hoch), Decken-Duct-Box, kleines Analyse-Terminal neben dem Brett.

### Koordinatensystem

- Blender Z = oben, Y = Tiefe (Y+ = rueckwaertig, Y- = dem Betrachter zugewandt)
- Boden: Z = 0
- Spielbrett-Oberflaeche: Z ≈ 2.5 (Board-Pedestal hebt 2.5 Einheiten an)
- Decke: Z = 10
- Raumbreite: X -9 bis +11
- Raumtiefe: Y -8 bis +14
- Display Case Zentrum: X = -5.5, Y = -2.5
- Workstation Zentrum: X = 6.8, Y = 4.6

### Naechste Schritte

- Blockout in Blender visuell pruefen und ggf. Formen anpassen
- Danach `raum.glb` aus Blender exportieren (alle sichtbaren Meshes der Szene)
- Danach `src/render/environment.ts` mit GLTFLoader-Aufruf befuellen

## Mittlere Maustaste Global Blockiert

- `src/app/main.ts` blockiert jetzt vor `boot()` alle mittleren Maustastenklicks global im capture-phase.
- Abgedeckte Events: `mousedown`, `mouseup`, `click`, `auxclick`, `pointerdown`, `pointerup`.
- Verhindert Browser-Auto-Scroll, Seite-zurueck-Navigation und App-Absturz bei mittlerem Mausklick in allen Ansichten und Modi.
- Kein neuer State, kein Framework-Eingriff — reiner `window.addEventListener(..., { capture: true })`-Block.

## Combat-Animations Y-Position Fix

- `src/render/combat-presentation.ts`: `PIECE_BASE_HEIGHT` von `0.08` auf `0.898` korrigiert.
- Ursache: `getWorldPosition()` lieferte Y=0.08 als Weltposition fuer Kampfanimationen. Da `boardAnchor` auf Y=0.898 (Brettoberflaeche) sitzt, errechnete `anchor.worldToLocal()` local Y=0.08−0.898=−0.818 — die gesamte Kampfanimation fand 0.82 Einheiten unterhalb des Bretts statt.
- Fix: `PIECE_BASE_HEIGHT = 0.898` entspricht `BOARD_SURFACE_Y` aus `scene.ts`. `worldToLocal(y=0.898)` ergibt lokal y=0, Animationen laufen jetzt korrekt auf Bretthöhe ab.

## Room Explore — Vollständiger Interaktions-Layer

### Was wurde gemacht

Dieser Slice schließt den Room-Explore-Layer vollständig ab: Navigation, Hotspots, Bilderrahmen-Interaktion, Web-Embed-Overlay und vollständige Back-Button-Logik.

**Kamera & Board-Camera-Controls:**
- Vertikale Kamera-Rotation: letzten 5° unten gesperrt (`MAX_PHI`).
- Horizontale Rotation: 170° nach rechts ab Startposition (`THETA_LEFT_RANGE`).

**Control Panel — Bereinigung:**
- Sektionen „chess.js authority", „captured pieces", „move history", „game status" und der „select a white piece"-Fallbacktext wurden aus dem Control Panel entfernt.

**Intro-Overlay:**
- Nach 60 rAF-Frames wartet die App zusätzlich 2 Sekunden (`setTimeout 2000 ms`), bevor das Intro-Overlay ausgeblendet wird.

**Room-Hotspot-Buttons:**
- Button-Größe reduziert (font 9 px, min-width 108 px, padding 6/10 px).
- Positionen kalibriert: `board (0.15, 4.5, 0.55)`, `displayCase (-15.5, 5.22, 2.29)`, `pictureFrame (-25.15, 9.12, 4.51)`, `workbench (-17.47, 6.5, 29.56)`.
- Hotspot-Buttons nur sichtbar bei `currentRoomFocusTarget === 'overview'` und keiner laufenden Transition.

**Navigation — Back-Buttons:**
- `overview` → `menu` (`return-to-menu`)
- `webEmbed` → `workbench` (`back-from-web-embed`)
- `pictureFrameDetail` → `pictureFrame` (`back-from-picture-frame-detail`)
- `boardFocus` / `displayCaseFocus` → `roomExplore` overview (bestehend)
- `returnToMenu()` in `game.ts` springt sofort zurück; Menü- und Overview-Kamera sind identisch.

**Menü-Buttons:**
- „Zum Portfolio" (`direct-to-portfolio`) → `beginStartFlowTransition()` + `focusRoomTarget('webEmbed')`.
- „Zu den Leistungsnachweisen" (`direct-to-leistungen`) → `focusRoomTarget('pictureFrame')`.

**Picture Frame Interaktion:**
- `PICTURE_FRAME_ANCHORS` in `scene.ts`: 8 Frames in zwei Reihen.
  - Obere Reihe (Y=7.0): frame0(Z=6.0), frame2(Z=2.71), frame3(Z=−0.76), frame4(Z=−4.05)
  - Untere Reihe (Y=3.2): frame1(Z=6.0), frame5(Z=2.71), frame6(Z=−0.76), frame7(Z=−4.05)
  - Z-Schritt: −3.29 Einheiten.
- CSS `.picture-frame-hotspot`: 112 × 182 px, `transform: translate(calc(-50% - 16px), calc(-50% + 36px))`.
- Hover-Glow ausschließlich über CSS `:hover` (kein JS-Re-Render nötig).
- Standard-Border invisible (`transparent`), nur Hover zeigt Glow.
- Klick setzt `activePictureFrameDetailId` → `focusRoomTarget('pictureFrameDetail')`.
- **Per-Frame-Zoom:** `StartFlowStateInput.pictureFrameDetailId` überträgt die geklickte Frame-ID an `scene.ts`. `getRoomFocusTargetPreset('pictureFrameDetail')` schlägt dynamisch `{ position: (-21.4, frame.y, frame.z), target: (-28.4, frame.y, frame.z) }` nach.

**Web Embed / Portfolio:**
- `focusTarget: 'webEmbed'` zoomt Kamera in den Monitor: `position (-24.5, 3.22, 18.01)`, `target (-26.27, 3.22, 18.01)`.
- Bei abgeschlossener Transition: iframe-Overlay (`src="/portfolio/index.html"`) über dem Canvas.
- `public/portfolio/index.html` als gestylter Platzhalter erstellt (dunkel-warme Palette).
- CSS `.web-embed-overlay`: `position: absolute; inset: 0; pointer-events: auto`.

**Zugang Web Embed:** „2D Webseite betreten" (Workbench-Ansicht) + „Zum Portfolio" (Menü).

### Dateien geändert

- `src/app/game.ts` — Hotspot-Logik, Navigation, Rendering, Frame-Klick-Handler, Back-Buttons, Menü-Buttons
- `src/app/main.ts` — 2-Sekunden-Verzögerung nach 60 rAF-Frames
- `src/render/scene.ts` — `PICTURE_FRAME_ANCHORS`, `StartFlowStateInput.pictureFrameDetailId`, `getRoomFocusTargetPreset` per-Frame, webEmbed-Kamera-Preset, `activePictureFrameDetailId`
- `src/render/board-camera-controls.ts` — Theta/Phi-Clamp
- `src/styles/main.css` — Hotspot-Größen, `.picture-frame-hotspot`, `.web-embed-overlay`
- `public/portfolio/index.html` — neu erstellt

## Repository-Hygiene Pass

### Was wurde gemacht

- `.gitignore` vollständig befüllt: `node_modules/`, `dist/`, `output/`, `.env*`, `*.tsbuildinfo`, `.vite/`, `__pycache__/`, `*.pyc`, `docs/assets/blender/*.blend1`, `artefacts/`, `validation/`, `*.log`, OS-Dateien (`.DS_Store`, `Thumbs.db`, `desktop.ini`), Editor-Dateien (`.vscode/`, `.idea/`), `.claude/`.
- Kein Secret, kein API-Key, keine sensiblen Credentials im Repository gefunden.
- Localhost-Referenzen (`127.0.0.1:5173/4173`) ausschließlich in `progress.md`-Dokumentation — kein App-Code betroffen.
- Absolute Windows-Pfade (`C:/Users/pkemi/...`) ausschließlich in `artefacts/`-Debug-Skripten und `aenderungen_nach_export.md` — kein App-Quellcode betroffen. `artefacts/` wird jetzt über `.gitignore` ausgeschlossen.
- `MEMORY.md` vollständig auf den aktuellen Projektstand aktualisiert (Room Explore, Picture Frames, Web Embed, Navigation, Back-Buttons).
- `README.md` Status-Sektion aktualisiert.
- `progress.md` mit diesem Eintrag auf den neusten Stand gebracht.

## Portfolio-Integration & Site-Header/Footer

### Was wurde gemacht

**React-Portfolio eingebettet:**
- `p-keminer.github.io` (React + Framer Motion) als eigenständige Sub-App in das Projekt integriert.
- Quellcode liegt jetzt unter `portfolio-src/` (direkt editierbar, kein WSL-Umweg mehr).
- `portfolio-src/vite.config.ts` setzt `base: '/portfolio/'` und `outDir: '../public/portfolio'` — Build landet direkt im richtigen Verzeichnis, kein manuelles Kopieren nötig.
- Medien-Dateien (`Cheat-Suite.mp4`, `ags_project-8-bit-219384.mp3`) liegen in `portfolio-src/public/` und werden beim Build nach `public/portfolio/` kopiert.
- Pfadfehler behoben: `new Audio("/...")` und `src="/..."` auf `import.meta.env.BASE_URL + "..."` umgestellt, da Vite absolute Pfad-Strings bei `--base` nicht automatisch transformiert.

**Persistenter Header & Footer:**
- `index.html` erhält einen fest eingebetteten `#site-header` (70 px) mit pk-Avatar, p-keminer-Gradient-Name, grünem Status-Dot, Social-Badges (GitHub, Instagram, Spotify) und mobilem `⋯`-Dropdown-Menü.
- `#site-footer` (40 px) mit „built with Three.js + Vite" — Schrift Inter + JetBrains Mono via Google Fonts.
- Header und Footer sind in allen Views sichtbar; im webEmbed-Modus werden sie ausgeblendet.
- FOUC-Fix: Inline-`<style>` im `<head>` setzt sofort Body-Hintergrund und `visibility: hidden` auf Header/Footer, bis main.css geladen ist.

**webEmbed-Vollbild:**
- `body.web-embed-active` (gesetzt in `syncPanels()` in `game.ts`) blendet `#site-header`/`#site-footer` aus und gibt dem Overlay den vollen Viewport (`top: 0; bottom: 0`).
- Zurück- und Hauptmenü-Buttons leben jetzt innerhalb des `.web-embed-overlay`-Divs (nicht mehr im Controls-Panel).
- Click-Forwarding: `handleRoomHotspotClick` leitet `[data-control]`-Klicks an `handleControlsClick` weiter — Buttons waren zuvor nicht anklickbar.
- Buttons positioniert: `position: absolute; bottom: 20px; left: 20px`.

**Portfolio-Karte aktualisiert (`portfolio-src/src/`):**
- `data/projects.ts`: Titel „3D Portfolio", neue Beschreibung (Three.js-Shell + eingebettete React-App), Tags um `Three.js` erweitert.
- `components/ProjectCard.tsx`: `PortfolioCover`-SVG komplett neu designed — zwei Browserzeilen übereinander: oben `localhost:5173` mit isometrischem 3D-Würfel, flankiert von „LEISTUNGEN" (links) und „SCHACHSPIEL" (rechts); unten `p-keminer.github.io` mit `<React App />`, flankiert von „PORTFOLIO" (links) und „MINI-SPIELE" (rechts). Dazwischen gestrichelter Pfeil „embeds".

### Dateien geändert

- `index.html` — Header, Footer, Google Fonts, kritisches Inline-CSS
- `src/styles/main.css` — `#site-header`, `#site-footer`, `body.web-embed-active`, `.web-embed-overlay`, `.web-embed-nav`, `visibility: visible`-Korrekturen
- `src/app/game.ts` — `syncPanels()` body-Klasse, webEmbed-HTML-Template, `handleRoomHotspotClick` Click-Forwarding
- `portfolio-src/vite.config.ts` — `base: '/portfolio/'`, `outDir: '../public/portfolio'`
- `portfolio-src/src/data/projects.ts` — portfolio-site Karte
- `portfolio-src/src/components/ProjectCard.tsx` — `PortfolioCover` SVG
- `portfolio-src/src/components/ChiptunePlayer.tsx` — `import.meta.env.BASE_URL` Pfad
- `portfolio-src/src/minispiele/cheatsuite/CheatSuiteModal.tsx` — `import.meta.env.BASE_URL` Pfad
- `README.md` — Architektur-Überblick, Dual-Stack, Projektstruktur, portfolio-src-Workflow

### Build-Status

- `npm run build` (3D-Shell) sauber, keine TypeScript-Fehler.
- `cd portfolio-src && npm run build` sauber, Output direkt nach `public/portfolio/`.

### Offene Punkte / Risiken

- `portfolio-src/node_modules/` ist per `.gitignore` (`node_modules/`) ausgeschlossen — einmalig `npm install` in `portfolio-src/` nötig nach einem frischen Clone.
- Der Vite-Devserver der 3D-Shell läuft auf Port 5173; für Änderungen an der React-App muss nach `npm run build` der Dev-Server nicht neugestartet werden (Vite HMR greift für statische `public/`-Dateien nicht — manueller Reload nötig).

---

## Hardening Paket 3 — Performance-Optimierung (2026-03-24)

### Umgesetzte Änderungen

1. **Device-Tier-Erkennung** (`src/render/device-tier.ts` NEU)
   - `high` (Desktop), `medium` (Mobile DPR>1.5), `low` (Mobile DPR≤1.5)
   - Einmalig beim Import berechnet, als Konstante exportiert

2. **Antialias conditional** (`src/render/scene.ts`)
   - MSAA nur auf `high` (Desktop) — Mobile-DPR macht es überflüssig

3. **Shadow-Map Fallback** (`src/render/lights.ts`)
   - 1024×1024 auf Desktop, 512×512 auf Mobile

4. **Bloom-Budget** (`src/render/bloom.ts`)
   - Halbe Auflösung (Desktop), Viertel-Auflösung (Mobile)

5. **Vite Build-Optimierung** (`vite.config.ts`)
   - Three.js als separater Chunk (608KB → 128KB Brotli)
   - Gzip + Brotli Kompression für alle JS/CSS Assets
   - `vite-plugin-compression2` als devDependency

### Lighthouse-Ergebnisse (Desktop)

| Metrik | Vorher | Nachher | Änderung |
|---|---|---|---|
| Performance Score | 15 | 45 | +200% |
| LCP | 16.6s | 1.0s | -94% |
| TBT | 3,450ms | 1,530ms | -56% |
| Speed Index | 8.3s | 2.0s | -76% |
| TTI | 16.6s | 7.5s | -55% |

### Rote Linien eingehalten

- Desktop-Darstellung visuell unverändert (gleiche Bloom/Shadow-Werte)
- Keine Eingriffe in Schachlogik, Kamera-Transitions, Material-System, UI-Overlays

### Offene Punkte

- CLS 0.433 unverändert — hängt mit dem Intro-Overlay-Flow zusammen, nicht mit Rendering
- TBT 1,530ms noch hoch — hauptsächlich Three.js Parse-/Compile-Zeit, schwer reduzierbar
- Mobile Lighthouse im headless Modus unzuverlässig (WebGL-Last) — am echten Gerät testen
