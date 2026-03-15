# Render

Diese Schicht kapselt die 3D-Darstellung des Spiels.

## Verantwortung

- Szeneaufbau
- Brettdarstellung
- Brettdarstellung inklusive Randbeschriftung fuer Files und Ranks
- Brettinteraktion und Highlight-Overlays mit fester Prioritaet
- Figurendarstellung aus abgeleitetem Engine-State
- leichte, deterministische Figurenanimationen ohne zweite Zustandsquelle
- kontrollierte Capture-Ausblendung als reine Praesentationsschicht
- generische Capture-Cinematic als eigener transform-basierter Combat-Controller
- figurtyp-spezifische Combat-Motion-Profile als Daten- und Mapping-Schicht fuer denselben Cinematic-Flow
- zentrale Cyber-Mech-Stilschicht fuer gemeinsames Maschinengefuehl ueber allen Combat-Profilen
- leichter phasengetriebener Combat-Feedback-Controller fuer kleine Cyber-Mech-VFX
- zentrales per-piece Flavor-Mapping fuer dieselbe Combat-Feedback-Pipeline
- asynchrones Laden lokaler GLB-Assets mit Placeholder-Fallback
- paralleles Figuren-Asset-Set `starter | blockout` mit globalem Review-Toggle und per-Typ-Fallback
- kuenftige Presentation- und Cinematic-Mechanik fuer Capture-Ereignisse
- leichte Board-Inspect-Kamera mit Zoom, Orbit, optionalem Pan und Reset
- dedizierte Combat-Kamera mit leichten Ein- und Ausfahrten
- klare Kamera-Prioritaet zwischen freier Inspect-Ansicht und strengem Zwei-Seiten-Combat-Framing
- Licht und Kamera
- Asset-Loader

## Regeln

- keine autoritative Schachlogik
- Visualisierung folgt dem Board-State
- Combat ist ein Praesentationsmodus fuer Captures, kein Regelmodul
- Combat-Events werden konsumiert, aber nicht aus Renderereignissen erfunden
- Combat kennt strukturell genau zwei Zielposen pro Gefecht: `leftCandidate` und `rightCandidate`, beide nur aus exakter Kampfposition `event.to`, festem Side-Offset und Up-Offset gebaut
- die aktuelle User-Inspect-Ansicht bestimmt nur, welcher der beiden Kandidaten naeher ist; sie baut keine dritte Combat-Pose
- die Transition in den Combat nutzt jetzt eine gekruemmte Bahn um den Kampfpunkt statt einer geraden Kamerafahrt durch die Szene
- nach Combat kehrt die Kamera sauber zur zuletzt gespeicherten Inspect-Ansicht zurueck
- Combat-VFX bleiben klein, deterministisch und phasengetrieben; sie haengen an bestehender Presentation statt frei in der Szene zu leben
- per-piece Flavor wird ueber zentrale Profile statt ueber verstreute Sonderfaelle gesteuert
- Undo/Restart und Combat-Ende muessen alle transienten Feedback-Meshes und Material-Overrides sofort wieder raeumen
- Platzhalter und GLB-Assets sollen austauschbar bleiben
- Blockout-Review-Assets duerfen Starter-Assets nicht stillschweigend ersetzen

## Dateien

- `scene.ts`
- `board.ts`
- `board-camera-controls.ts`
- `interaction.ts`
- `pieces.ts`
- `piece-animations.ts`
- `capture-animations.ts`
- `combat-cyber-mech-style.ts`
- `combat-camera.ts`
- `combat-feedback.ts`
- `../app/combat-flavor.ts`
- `combat-motion-profiles.ts`
- `combat-presentation.ts`
- `loaders.ts`
- `lights.ts`
- `camera.ts`

## Naechster Ausbau

Die `Combat-State-Maschine`, die `Combat-Kamera`, die leichte Board-Inspect-Kamera, eine generische `Capture-Cinematic`, figurtyp-spezifische Combat-Profile und eine zentrale Cyber-Mech-Motion-Language stehen jetzt als Basis fuer spaetere thematische VFX/SFX. Zusaetzlich existiert jetzt eine parallele `starter | blockout`-Review-Pipeline fuer Figuren mit freigegebenen Review-GLBs fuer `pawn`, `bishop`, `rook`, `knight`, `queen` und `king`. Die Combat-Kamera ist jetzt bewusst auf exakt zwei Zielposen pro Gefecht beschnitten: links oder rechts relativ zur exakten Kampfposition. Die aktuelle User-Inspect-Ansicht waehlt nur noch den naeheren dieser beiden Kandidaten, waehrend die Ein- und Ausfahrt ueber eine gekruemmte Bahn um den Kampfpunkt laeuft und danach die gespeicherte Inspect-Ansicht wiederherstellt. Auf derselben Pipeline sitzt jetzt ausserdem ein kleiner `combat-feedback`-Pass fuer Core-Pulses, Servo-Akzente, kompakte Impact-Flashes/Sparks und Shutdown-Signale, die bei Combat-Ende sofort wieder entfernt werden, sowie ein zentrales per-piece Flavor-Mapping fuer unterschiedliche Gewichtung pro Figurtyp. Das Familienreview der vorhandenen Blockouts, der aktuelle Combat-Kamera-Pass und dieser erste Flavor-/VFX-/SFX-Block gelten vorerst als erledigt. Der naechste konkrete Slice fuer diese Schicht ist damit kleiner Kamera-/UX- und Material-Polish, bevor spaeter reichere thematische Combat-Effekte folgen; Render bleibt dabei fuer Bewegung, Kamera, Loader, leichte VFX und Review-Sichtbarkeit zustaendig, aber nie fuer die Regelentscheidung, ob ein Combat ueberhaupt stattfindet.
