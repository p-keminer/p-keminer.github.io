# Render Memory

## Festgehalten

- Phase 1 startete mit Platzhalter-Meshes und wurde spaeter um eine GLB-Pipeline mit Fallback erweitert.
- Kamera und Licht wurden frueh sauber gesetzt und bleiben von der Regelwahrheit getrennt.
- `squareToWorld` ist fuer exakte Figurenplatzierung, Highlighting und spaetere Combat-Foki zentral.
- Die sichtbare Brettgeometrie ist von den Hit-Squares fuer Raycasting getrennt.
- Move- und Capture-Animationen bleiben reine Praesentationsschichten.
- Die `Combat-State-Maschine` existiert jetzt als vorgelagerte Presentation-Schicht ausserhalb von Render.
- Die `Combat-Kamera` existiert jetzt als eigener Controller mit expliziten Transition-Zustaenden.
- Die Board-Inspect-Kamera ist ein separater User-Control-Pfad und darf waehrend `combat` nicht gegen die Systemkamera arbeiten.
- Die Combat-Kamera ist jetzt strukturell auf genau zwei Zielkandidaten pro Gefecht beschraenkt: `leftCandidate` und `rightCandidate`, beide nur aus Angreifer/Victim-Midpoint, Combat-Forward, festem Side-Offset und festem Up-Offset gebaut; ein Rueckenversatz entlang `-combatForward` ist bewusst entfernt.
- Die aktuelle User-Inspect-Pose erzeugt dabei keine freie Combat-Kamera mehr, sondern entscheidet nur, welcher der beiden festen Kandidaten naeher an Position/Blickrichtung liegt; dieselbe Pose bleibt auch das Ruecksprungziel nach Combat.
- Die exakte Combat-Zielposition ist jetzt `event.to`, also der tatsaechliche Einschlag-/Landepunkt des Angreifers, nicht mehr die Mitte des Reisewegs zwischen Attacker und Victim.
- Die Combat-Transition nutzt jetzt eine gekruemmte Kugelbahn um diesen Kampfpunkt statt einer linearen Lerp-Fahrt, damit die Kamera nicht durch Brett oder Boden schneidet.
- Das Familienreview der sechs Blockout-Figuren und der aktuelle Combat-Kamera-Feintuning-Stand sind auf ausdrueckliches Nutzerfeedback vorerst als erledigt markiert; der naechste Render-Fokus liegt damit auf kleinen VFX/SFX statt auf einem weiteren grossen Kamera- oder Familien-Umbau.
- Ein leichter `combat-feedback`-Controller sitzt jetzt direkt auf der bestehenden Combat-Pipeline und liest dieselben Phasen `intro`, `attack`, `impact`, `resolve`, `return` wie die transform-basierte Capture-Praesentation.
- Diese Feedback-Schicht bleibt bewusst klein und deterministisch: additive Mesh-Akzente fuer Core-Pulses, Servo-Ringe, kompakte Impact-Flashes/Sparks und kurze Shutdown-Signale, plus ein kleiner Material-Emissive-Override nur auf dem Victim waehrend `impact/resolve`.
- Undo/Restart, Combat-Cancel und Combat-Ende loeschen diese transienten Render-Effekte jetzt sofort mit; `render_game_to_text()` spiegelt dafuer `animation.feedback.*` als Debug-Snapshot.
- Dieselbe Render-Schicht ist jetzt zusaetzlich ueber ein zentrales Flavor-Mapping pro Figurtyp unterschiedlich gewichtet: `pawn` liest kompakter und schneller, `rook` schwerer, `knight` schaerfer, `bishop` cleaner, `queen` dominanter und `king` kontrollierter, ohne den gemeinsamen Cyber-Mech-Stil zu verlassen.
- Der Debug-Hook `window.debug_preview_combat_camera(...)` akzeptiert dafuer jetzt auch `attackerType` und `victimType`, damit einzelne Flavor-Kombinationen ohne Engine-Mutation visuell pruefbar bleiben.
- Kamera-Controls bleiben jetzt bis zum Ende von `combatTransitionOut` gesperrt, damit die Rueckfahrt in die gespeicherte Inspect-Pose nicht gegen User-Input verliert.
- Camera-Snapshots und `render_game_to_text()` spiegeln dafuer jetzt zusaetzlich `priority`, `combatSide`, `inspect*`, `combatSource*` und `return*`, damit Combat-Framing und Ruecksprung debugbar bleiben.
- Eine generische `Capture-Cinematic` existiert jetzt als eigener transform-basierter Render-Controller, der Attacker-Advance, Victim-Hit-Reaction und Defeat/Removal ueber Combat-Phasen aus dem App-Snapshot liest.
- Eine dedizierte Motion-Profile-Mapping-Datei steuert jetzt figurtyp-spezifische Unterschiede fuer Attack, Timing-Gefuehl, Impact und Recovery innerhalb derselben generischen Combat-Pipeline.
- Eine separate Cyber-Mech-Stildatei steuert jetzt gemeinsames Maschinenvokabular wie Preload, Servo-Snap, mechanischen Overshoot, Impact-Recoil und Settle auf derselben Combat-Pipeline.
- Ein paralleles Figuren-Asset-Set `starter | blockout` existiert jetzt als Loader-Konzept; fehlende Blockout-Dateien fallen pro Typ auf Starter-GLBs zurueck.
- Snapshot und `render_game_to_text()` spiegeln jetzt aktives Figuren-Asset-Set, tatsaechlich geladene Piece-Dateien und Blockout-Fallbacks.
- Figuren trennen jetzt logisch zwischen `boardAnchor` und `visualRoot`: der Anchor bleibt exakt auf `squareToWorld`, waehrend Hover/Bobbing/sonstige Presentation-Offsets nur auf dem Child-Layer laufen.
- Move-Animationen laufen damit auf dem `boardAnchor`, waehrend visuelle Schwebehoehen auf `visualRoot` additiv darueberliegen; Combat- und Capture-Praesentation greifen ebenfalls nur in diese visuelle Schicht ein.
- Die freigegebenen realen Review-Blockouts liegen aktuell fuer `pawn`, `bishop`, `rook`, `knight`, `queen` und `king` unter `public/models/blockout/`; die intendierte Front wird dabei als Vorwaertsachsen-Konvention in Template-Space `+Z` behandelt.
- `blockout/king.glb` nutzt jetzt bewusst einen eigenen Loader-Ausnahmefall: weisse Figuren behalten weite Teile ihrer exportierten Blender-Materialfarben, waehrend die Familien-Neons und aeusseren Trim-Ringe gezielt in die Web-Regeln gezogen werden; schwarze Figuren laufen weiter ueber die bestehende Blockout-Logik.
- Fuer `blockout/king.glb` gibt es zusaetzlich eine gezielte Black-Palette-Regel: Auge und Emblem bleiben als exportierte Highlights erhalten, aeussere Ringe und Crown-Teile werden auf `trim` gezogen, und der zulaessige Footprint ist groesser damit die Familie trotz Zusatzteilen nicht zu klein skaliert.
- `blockout/king.glb` wirft beim Laden versehentlich mit exportierte `knight_hover_*`-Helper direkt aus dem Template; dadurch greifen Skalierung und Zentrierung wieder auf den echten King statt auf Fremd-Helfer, und der King bleibt mittig auf dem Feld.
- Blockout-Figuren teilen jetzt ausserdem ein zentrales Neon-Set im Loader: `sensor` fuer Augen/Linsen/Visoren, `core` fuer Herzen, `command` fuer Embleme; diese Rollen tragen echte Emission statt nur flacher Materialfarbe.
- Die aktuelle Farbregel dieses Neon-Sets lautet: Weiss `sensor = cyan`, Weiss `core = pink-rot`, Schwarz `sensor/core = klares Neon-Rot`, beide Seiten `command = amber`; der King zieht sein Auge bewusst ebenfalls auf `command`.
- `rook_core_shield` ist in dieser Logik jetzt wieder ein Sensor-Signal auf dem Koerper und liest deshalb Weiss cyan / Schwarz neonrot statt `command`.
- Das weisse Laeufer-Herz ist als gezielte Familienausnahme ebenfalls im `sensor`-Zweig verankert und liest deshalb cyan statt pink-rot.
- `springer_eye_ring` und die aeusseren King-Ringe sind trim-geschuetzt und laufen fuer Weiss dunkelblau sowie fuer Schwarz gold, statt von der Neon-Regel ueberschrieben zu werden.
- `blockout/queen.glb` kommt jetzt direkt 1:1 aus der aktiven Blender-Szene: die Projektkopie liegt unter `docs/assets/blender/dame.blend`, und der Export enthaelt bewusst die komplette Szene inklusive fremd benannter Knight-/King-Objekte statt einer Namensfilterung.
- Fuer `blockout/knight.glb` gibt es jetzt eine gezielte Loader-Sonderregel: `springer_eye_ring` laeuft ueber `trim`, damit der weisse Augenrahmen dunkelblau und der schwarze gold liest.
- Der alte Knight-Hover-Hack ueber einen grossen Ground-Nudge in der Asset-Normalisierung ist entfernt; dieselbe Hoehe lebt jetzt als reine Visual-Praesentation auf `visualRoot`.
- Der Knight schwebt jetzt ueber die neue Visual-Praesentationsschicht statt ueber einen baked Ground-Nudge im Asset-Loader.
- Fuer Kamera-Checks existiert zusaetzlich ein Test-Hook `window.debug_preview_combat_camera(...)`, der eine synthetische Combat-Praesentation samt Kamera-Prioritaet ohne Regelmutation ausloesen kann.
- Der aktuelle Kamera-Check lief bereits mit echter User-Orbit-Aenderung: nach Orbit waehlt der Combat-Debughook die naehere `left/right`-Seite, haelt waehrend Combat die Controls gesperrt und kehrt danach auf die gespeicherte Inspect-Pose zurueck.

## Warnungen

- keine Regelentscheidungen aus Renderereignissen ableiten
- Asset-Loading von Szeneaufbau trennen
- Combat-Events nur konsumieren, nicht aus Mesh- oder Kamera-Zustaenden ableiten
- Animationen und Kamera spaeter als eigene Ebenen denken
- kein Warten des Spielkerns auf Render- oder Combat-Ende
