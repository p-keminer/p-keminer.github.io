# Portfolio — Philip Keminer

> Eine interaktive 3D-Portfolio-Website im Browser. Der Besucher navigiert durch einen vollständig modellierten Cyberpunk-Arbeitsraum und erkundet verschiedene Bereiche über kinematische Kamerafahrten — darunter ein spielbares Schachspiel, eine eingebettete 2D-Website, und einer Leistungsnachweisübersicht.

**Technologie:** TypeScript · Three.js · chess.js · Vite 

---

## Inhaltsverzeichnis

1. [Was ist das?](#was-ist-das)
2. [Bereiche der Website](#bereiche-der-website)
3. [Navigation & Spielfluss](#navigation--spielfluss)
4. [Technologie-Stack](#technologie-stack)
5. [Projektstruktur](#projektstruktur)
6. [3D-Rendering & Beleuchtung](#3d-rendering--beleuchtung)
7. [Kamerasystem](#kamerasystem)
8. [Schachspiel-Modul](#schachspiel-modul)
9. [Combat-Präsentation](#combat-präsentation)
10. [Asset-Pipeline](#asset-pipeline)
11. [Lokal starten](#lokal-starten)
12. [Debug-Hooks](#debug-hooks)

---

## Was ist das?

**Portfolio — Philip Keminer** ist eine vollständig im Browser laufende 3D-Portfolio-Website. Anstatt einer klassischen Webseite betritt der Besucher einen Cyberpunk-Arbeitsraum und navigiert durch ihn hindurch. Jeder Bereich des Raums steht für einen anderen Portfolio-Inhalt:

| Bereich | Inhalt |
|---|---|
| Workbench-Monitor | Eingebettete 2D-Portfolio-Website (iframe) |
| Bilderrahmen-Wand | Leistungsnachweise (8 Rahmen, Einzelzoom) |
| Zertifikatsvitrine | Präsentation der Zertifikate / Achievements |
| Schachbrett | Vollständig spielbares Schachspiel als interaktives Feature |

Der Raum ist in Blender modelliert und als GLB-Asset geladen. Die gesamte Navigation läuft über animierte Kamerafahrten.

---

## Bereiche der Website

### Raumübersicht (Startpunkt)
Nach dem Ladescreen befindet sich der Besucher in der freien Raumübersicht. Die Kamera kann per Maus gedreht und per Scroll gezoomt werden. Vier 3D-Hotspots sind als animierte Ping-Indikatoren sichtbar und führen zu den jeweiligen Bereichen.

### Workbench-Monitor → Portfolio-Website
Die Kamera fährt an den Workbench-Monitor heran. Sobald die Fahrt abgeschlossen ist, erscheint ein iframe-Overlay mit der eingebetteten 2D-Portfolio-Seite (`/portfolio/index.html`). Erreichbar auch direkt über „Zum Portfolio" im Hauptmenü.

### Bilderrahmen-Wand →  Leistungsnachweise (unvollständig)
Die Kamera fährt zur Galerie-Ansicht mit 8 interaktiven Bilderrahmen (2 Reihen × 4 Spalten). Jeder Rahmen kann einzeln angeklickt werden — die Kamera zoomt direkt auf das jeweilige Frame. Hover-Effekt via CSS.

### Zertifikatsvitrine/(unvollständig)
Kamerafahrt zur Vitrine mit Zertifikatsansichten.

### Schachbrett → Spielbares Schachspiel
Kamerafahrt zum Schachbrett, danach ist das Spiel vollständig spielbar (lokales Zwei-Spieler-Schach). Bei jedem Schlagzug läuft eine 5-Phasen-Kampfsequenz mit kinematischer Kamera, Partikeleffekten und Soundcues ab.

---

## Navigation & Spielfluss

```
[ Menü / Ladescreen ]
      │
      ├──→ [ Raum erkunden ] 
      │         │
      │         ├──→ [ Schachbrett ]         → Schach spielen        
      │         │         └──→ [ Zurück zum Raum ]
      │         │
      │         ├──→ [ Vitrine ]             → Zertifikats-Detailansicht
      │         │         └──→ [ Zurück zur Übersicht ]
      │         │
      │         ├──→ [ Bilderrahmen-Wand ]   → Galerie-Ansicht      
      │         │         └──→ [ Einzelrahmen ] → Detailzoom          
      │         │                   └──→ [ Zurück zur Galerie ]
      │         │
      │         └──→ [ Workbench-Monitor ]   → Monitor-Ansicht     
      │                   └──→ [ 2D-Website betreten ] → Portfolio    
      │                               └──→ [ Zurück zum Monitor ]
      │
      └──→ [ Zum Portfolio ]  
```

Alle Übergänge sind animierte Kamerafahrten. Hotspot-Buttons sind nur sichtbar wenn keine Transition läuft und die freie Raumübersicht aktiv ist.

**Navigationszustände im Code:**

| `StartFlowMode` | Bedeutung |
|---|---|
| `menu` | Ladescreen / Startmenü |
| `introTransition` | Kamerafahrt beim ersten Start |
| `roomExplore` | Raum-Erkundung (inkl. alle Hotspot-Ziele) |
| `boardFocus` | Schachspiel aktiv |
| `displayCaseFocus` | Vitrine aktiv |

| `RoomFocusTargetId` | Ziel |
|---|---|
| `overview` | Freie Raumübersicht |
| `workbench` | Monitor-Ansicht |
| `webEmbed` | Portfolio-iframe |
| `pictureFrame` | Galerie-Ansicht |
| `pictureFrameDetail` | Einzelrahmen-Zoom |
| `displayCase` | Vitrine |
| `board` | Schachbrett |

---

## Technologie-Stack

| Ebene | Technologie | Version |
|---|---|---|
| Sprache | TypeScript (strict, ES2022) | 5.9.3 |
| Renderer | Three.js | 0.183.2 |
| Asset-Loader | three-stdlib (GLTFLoader, DRACOLoader) | 2.36.1 |
| Schach-Engine | chess.js | 1.4.0 |
| Build-Tool | Vite | 7.3.1 |
| 3D-Modelle | Blender → GLB (DRACO-komprimiert) | — |
| UI | Vanilla HTML/CSS (kein Framework) | — |
| Post-Processing | Eigene HDR-Bloom-Pipeline (GLSL-Shader) | — |
| Audio | Web Audio API (synthetische Cues) | — |

Keine externen Post-Processing-Bibliotheken — Three.js r183 hat `EffectComposer` entfernt, daher eigene Implementierung.

---

## Projektstruktur

```
src/
├── app/
│   ├── main.ts                    # Bootstrap, HMR
│   ├── game.ts                    # Haupt-Orchestrator: Zustand, Interaktion, UI-Sync
│   ├── combat.ts                  # Combat-State-Machine (5 Phasen)
│   └── combat-flavor.ts           # Pro-Figur Audio/VFX-Gewichtung
│
├── chess/
│   ├── engine.ts                  # chess.js-Wrapper + stabile Figur-IDs
│   ├── state.ts                   # Typdefinitionen (Square, Piece, Move, Status)
│   ├── moves.ts                   # Zug-Formatierungshelfer
│   └── mapping.ts                 # Brettkoordinate ↔ 3D-Weltposition
│
├── render/
│   ├── scene.ts                   # Three.js-Szene, Hotspot-System, Focus-System
│   ├── board.ts                   # 8×8-Grid, Raycasting-Meshes, Hologramm-Overlay
│   ├── pieces.ts                  # Figurlayer, Animationsloop, Feedback
│   ├── lights.ts                  # Ambient, Hemisphere, Key, Neon-Points, Rim
│   ├── bloom.ts                   # HDR-Bloom (Threshold → Gauss → ACESFilmic)
│   ├── loaders.ts                 # GLTFLoader + DRACOLoader, Fallback-Kette
│   ├── camera.ts                  # Kamera-Presets, FOV 34°
│   ├── board-camera-controls.ts   # Orbit/Zoom/Pan mit Winkel-Clamp
│   ├── room-camera-controls.ts    # Sphärische freie Kamera, Zoom-Dämpfung
│   ├── combat-camera.ts           # Kampfkamera-Framing, Kurven-Transition
│   ├── combat-presentation.ts     # Kampfphasen-Abfolge, Figurbewegung
│   ├── combat-feedback.ts         # Partikel-VFX: Kern-Puls, Servo, Funken, Shutdown
│   ├── combat-motion-profiles.ts  # Ease-Kurven pro Figurtyp
│   ├── combat-cyber-mech-style.ts # Gemeinsame Maschinen-Bewegungssprache
│   ├── piece-animations.ts        # Bewegungsinterpolation (kubisch, 220 ms)
│   ├── capture-animations.ts      # Einfache Schlag-Animationen
│   ├── piece-material-style.ts    # Materialprofil-Slots, Neon-Paletten
│   └── interaction.ts             # Klick-Raycast, Hover/Select-Highlighting
│
├── ui/
│   ├── controls.ts                # Steuerleiste (Rückgängig, Neustart, Kamera, Raum)
│   ├── game-status.ts             # Zuganzeige, Schach/Matt-Status
│   ├── hud.ts                     # HUD-Karten-Renderer
│   ├── move-list.ts               # Zughistorie (SAN)
│   ├── captured-pieces.ts         # Geschlagene-Figuren-Galerie
│   └── overlays.ts                # Raum-Hotspot-Overlays
│
├── audio/
│   ├── sound.ts                   # Audio-Basis-Controller (Web Audio API)
│   └── combat-sfx.ts              # Kampfphasen-Soundcues (synthetisch)
│
├── utils/
│   └── coords.ts                  # Board-Index ↔ zentrierte Koordinate
│
└── styles/
    └── main.css                   # Globales Styling, dunkle Warm-Palette

public/
├── models/
│   ├── room.glb                   # Cyberpunk-Arbeitsraum (~9.98 MB)
│   ├── board_cyber.glb            # Holografisches Schachbrett (primär)
│   ├── board.glb                  # Fallback-Brett
│   ├── {bishop,king,knight,…}.glb # Starter-Figuren
│   ├── blockout/                  # Cyber-Mech-Review-Prototypen
│   └── README.md                  # Asset-Konventionen
│
├── portfolio/
│   └── index.html                 # Eingebettete 2D-Portfolio-Seite (iframe-Ziel)
│
└── draco/
    └── draco_decoder.wasm         # DRACO-Mesh-Dekompression (WebAssembly)

docs/
├── assets/blender/                # Blender-Quelldateien + Export-Skripte
└── sprints/ROADMAP.md             # Phasenplan
```

---

## 3D-Rendering & Beleuchtung

### Koordinatensystem Blender ↔ Three.js

```
ROOM_SCALE  = 1 / 0.512  ≈ 1.953
ROOM_OFFSET = (-11.123, -3.833, 15.426)

Three.js X =  Blender X  / 0.512 + (-11.123)
Three.js Y =  Blender Z  / 0.512 + ( -3.833)
Three.js Z = -Blender Y  / 0.512 + ( 15.426)

BOARD_SURFACE_Y = 0.898
```

### Beleuchtung (`src/render/lights.ts`)

| Licht | Typ | Farbe | Intensität | Besonderheit |
|---|---|---|---|---|
| ambient | AmbientLight | `#ffffff` | 0.30 | Neutrale Grundhelligkeit |
| hemi | HemisphereLight | `#1a1a40` / `#080808` | 0.50 | Kühles Blau oben, dunkel unten |
| key | DirectionalLight | `#d0e8ff` | 2.20 | Pos (−9, 22, 5), Shadow 2048² |
| neonA | PointLight | `#ff0d05` | 4.0 (r=22) | Pos (−4, 5.5, 6) — Neon-Deckenstreifen |
| neonB | PointLight | `#ff0d05` | 4.0 (r=22) | Pos (−18, 5.5, 14) — Neon-Deckenstreifen |
| rim | DirectionalLight | `#ff0d05` | 0.40 | Globales rotes Gegenlicht |

Key-Light pendelt sanft (`sin(t×0.18)×1.5`). Shadow Map: PCFShadowMap, `bias=−0.0008`.

### HDR-Bloom-Pipeline (`src/render/bloom.ts`)

```
Szene → HDR-RenderTarget (Linear) → Threshold (Lum > 0.90)
      → Gauss-Blur H (7-Tap, Half-Res) → Gauss-Blur V
      → Composite: Screen-Blend + ACESFilmic + Gamma ¹⁄₂.₂

threshold: 0.90  |  strength: 0.25  |  blurScale: 1.5  |  exposure: 1.25
```

### Weitere Rendering-Details
- WebGL MSAA (antialias: true), Pixel-Ratio max. 2.0
- Szenen-Nebel: `Fog('#0d0d18', 80, 150)`
- PMREM-Environment (RoomEnvironment, sigma 0.04, intensity 0.12)
- Holografisches Gitter-Overlay: Canvas-Textur 512×512, additive Blending, opacity 0.40
- DRACO-Mesh-Dekompression via WebAssembly

---

## Kamerasystem

### Drei unabhängige Controller

#### Raumkamera — freie Erkundung (`room-camera-controls.ts`)
Aktiv in `roomExplore` bei `focusTarget === 'overview'`:
- **Linksklick + Ziehen** → Sphärische Rotation
- **Scrollrad** → Zoom mit Exponential-Dämpfung (max. 3 Schritte, Faktor 0.9)
- Einfahrt 700 ms (ease-out cubic) / Ausfahrt 500 ms (ease-in-out quad)

#### Brett-Kamera — Schachspiel (`board-camera-controls.ts`)
Aktiv in `boardFocus`:
- Orbit, Zoom (MIN 7.2 / MAX 16.5), Pan
- Theta auf rechte Halbebene begrenzt
- Reset: Taste `R`, Preset `(6.8, 8.2, 7.8)` → `(0, 0.2, 0)`

#### Combat-Kamera — Kampfsequenzen (`combat-camera.ts`)
Automatisch während Schlagzügen:
- Links/Rechts-Framing je nach Brett-Position, Höhe 1.8, Seitenabstand 5.5
- Einfahrt 400 ms / Ausfahrt 300 ms (sphärisches Lerp)

### Kamera-Presets (exakte Werte)

| Ansicht | Position (x, y, z) | Target (x, y, z) |
|---|---|---|
| Menü / Übersicht | 1.8, 8.41, 66.99 | −14.76, 6.0, 8.95 |
| Vitrine | −20.5, 4.5, 9.0 | −24.9, 2.7, −8.0 |
| Workbench | −9.5, 3.5, 18.0 | −26.27, 3.22, 18.01 |
| Portfolio-iframe | −24.5, 3.22, 18.01 | −26.27, 3.22, 18.01 |
| Bilderrahmen-Galerie | −7.0, 3.5, 1.2 | −28.4, 4.5, 1.2 |
| Einzelrahmen | −21.4, frame.y, frame.z | −28.4, frame.y, frame.z |
| Schachbrett | 6.8, 8.2, 7.8 | 0, 0.2, 0 |

---

## Schachspiel-Modul

Das Schachspiel ist ein eigenständiges Modul innerhalb der Portfolio-Website. Es ist vollständig spielbar als lokales Zwei-Spieler-Spiel.

### Regelkern
`chess.js` ist die alleinige Autorität für Regelvalidierung. Unterstützt:
- Rochade (kurz + lang), En-passant, Bauernumwandlung (→ Dame automatisch)
- Schach, Matt, Patt, alle Remis-Varianten (50-Züge, Dreifachwiederholung, unzureichendes Material)

### Figur-IDs
Jede Figur erhält eine stabile UUID (z. B. `white-pawn-3`), die über Undo/Restart konstant bleibt und figurgenaue Animationen ermöglicht.

### Steuerleiste im Schach-Modus

| Schaltfläche | Funktion | Verfügbar wenn |
|---|---|---|
| Rückgängig | Letzten Halbzug zurücknehmen | ≥ 1 Zug gespielt |
| Neustart | Brett zurücksetzen | Immer |
| Kamera zentrieren | Standard-Schachperspektive | Nicht während Combat |
| Zur Übersicht | Portfolio-Raum öffnen | Nur im Schach-Modus |

---

## Combat-Präsentation

Bei jedem Schlagzug im Schachspiel läuft eine kinematische Kampfsequenz ab.

### 5-Phasen-Ablauf (924 ms gesamt)

| Phase | Dauer | Inhalt |
|---|---|---|
| `intro` | 168 ms | Angreifer nähert sich, Combat-Kamera fährt ein |
| `attack` | 224 ms | Angreifer schlägt zu |
| `impact` | 168 ms | Ziel reagiert — Partikel, Servo-Spin, Flash |
| `resolve` | 196 ms | Nachklang, Ziel blendet aus |
| `return` | 168 ms | Rückkehr, Kamera fährt aus |

### Pro-Figur-Profile

| Figur | Charakter | Bewegungsstil |
|---|---|---|
| Bauer | Scout-Bot | Schnelle, direkte Stöße |
| Turm | Festungs-Einheit | Langsam, wuchtig, `heavy-ram` |
| Läufer | Präzisions-Einheit | Linear, glatt, `diagonal-glide` |
| Springer | Agil-Angreifer | Sprung-Dash, hohe Energie |
| Dame | Elite-Einheit | Kraftvoll, ausladend, `dominant-lunge` |
| König | Kommando-Einheit | Bedächtig, autoritär, `command-shove` |

### Partikel-VFX
Core-Puls (Sphere), Servo-Torus, Impact-Ring, Funken (Box), Shutdown-Beacon — alle mit additivem Blending.

### Audio (Web Audio API)
Synthetische Cues pro Phase und Figurtyp. Kein externes Audio-Asset — alles prozedural über Oszillatoren.

---

## Asset-Pipeline

### GLB-Export (Blender → Three.js)

```python
bpy.ops.export_scene.gltf(
    filepath="public/models/room.glb",
    use_selection=False,
    export_apply=True,
    export_yup=True,
    export_format='GLB'
)
```

### Figuren-Fallback-Kette
1. `blockout/`-Set (Cyber-Mech-Prototypen, primär geladen)
2. Prozedurales Platzhalter-Mesh (Box-Geometrie)

---

## Lokal starten

```bash
# Repository klonen
git clone <repo-url>
cd 3d-web-chess

# Abhängigkeiten installieren
npm install

# Entwicklungsserver (http://localhost:5173)
npm run dev

# Produktions-Build
npm run build

# Build lokal vorschauen
npm run preview
```

---

## Debug-Hooks

Im Browser-Konsolenfenster verfügbar (nur Dev-Build):

```javascript
// Animations-Timer manuell vorschieben (Millisekunden)
window.advanceTime(500);

// Combat-Kamera-Framing isoliert testen
window.debug_preview_combat_camera({ square: 'e4', side: 'left' });

// Schachbrett-Zustand als Text ausgeben
window.render_game_to_text();
```

---

*Portfolio — Philip Keminer*
