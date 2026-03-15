# Änderungen nach dem GLB-Export (raum2.blend → room.glb)

Datum: 2026-03-14
Betroffene Szene: `docs/assets/blender/raum2.blend`
Exportiertes Asset: `public/models/room.glb`

---

## Dateigrößen-Historie

| Version | Inhalt | Größe |
|---|---|---|
| Ursprünglicher Export | Ohne Bevel, HASHED-Materialien teilweise falsch | 29,54 MB |
| Export nach Bevel + Material-Fix | `export_apply=True`, BLEND-Materialien, alle Bevel-Modifier eingebacken | 36,2 MB |
| Geplant: Nach Object-Merge + Draco | Geometrie zusammengeführt, Draco Level 6 | ~8–12 MB |

---

## 1. GLB-Export: raum2.blend

### Vorbereitungen vor dem Export
Die folgenden Korrekturen wurden direkt in Blender via MCP vorgenommen,
bevor die Szene als room.glb exportiert wurde:

| Problem | Maßnahme |
|---|---|
| `ws_lap1_keys` und `ws_lap2_keys` fehlten in der RAUM-Collection (nur in DISPLAY_CASE) | Beide Objekte zur RAUM-Collection hinzugefügt |
| 130+ Materialien hatten `blend_method = HASHED` (exportiert nicht korrekt nach GLTF) | Alle auf `BLEND` umgestellt (z. B. `mat_keyboard`, `desk_surface`, `struct_dark`, `accent_dim` u. v. m.) |
| 316 Materialien hatten `blend_method = HASHED` (zweiter Durchlauf, vollständig) | Alle restlichen auf `BLEND` umgestellt vor dem zweiten Export |

### Export-Befehl (aktuell gültig, ohne Draco)
```python
import bpy, os
export_path = r"C:/Users/pkemi/logic-simulator-studio/3d-web-chess/public/models/room.glb"
bpy.ops.export_scene.gltf(
    filepath=export_path,
    use_selection=False,
    export_apply=True,
    export_yup=True,
    export_format='GLB'
)
size = os.path.getsize(export_path)
print(f"Export abgeschlossen: {export_path}")
print(f"Dateigröße: {size:,} bytes ({size/1024/1024:.2f} MB)")
```

### Export-Befehl (geplant: mit Draco)
```python
import bpy, os
export_path = r"C:/Users/pkemi/logic-simulator-studio/3d-web-chess/public/models/room.glb"
bpy.ops.export_scene.gltf(
    filepath=export_path,
    use_selection=False,
    export_apply=True,
    export_yup=True,
    export_format='GLB',
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6
)
size = os.path.getsize(export_path)
print(f"Export abgeschlossen: {export_path}")
print(f"Dateigröße: {size:,} bytes ({size/1024/1024:.2f} MB)")
```

Alternativ direkt aus dem Blender Text-Editor ausführen.

---

## 2. Bevel-Optimierungen (Blender)

### Durchgeführt
Alle 752 Objekte der RAUM-Collection wurden analysiert und geeignete Objekte
mit einem Bevel-Modifier versehen (Limit Method: ANGLE, 2 Segments).

| Objektgruppe | Bevel-Breite | Begründung |
|---|---|---|
| Wandflächen, Boden, Decke (`floor_*`, `ceil_*`, `wall_*`) | 0,005 m | Sehr subtil, nur zur Kantenglättung |
| Möbel, Tisch, Stuhlgestell (`desk_*`, `ch_*`) | 0,012–0,025 m | Sichtbare Kanten, professioneller Look |
| Schachbrett, Sockelbauteile | 0,008–0,015 m | Geringere Bevel-Stärke für Präzisionsobjekte |
| Strukturbauteile (`struct_*`) | 0,010 m | Mittlere Stärke für Rahmenelemente |
| Kleinteile, Tasten, Dekoelemente | 0,003–0,006 m | Sehr klein, nur leichte Abrundung |

### Bekanntes Problem: backwall_main (noch offen)
`backwall_main` hat aktuell **100 Bevel-Segmente** statt 2 — verursacht
ca. 100.000 unnötige Polygone.

**Lösung (in Blender ausführen):**
```python
import bpy
obj = bpy.data.objects.get('backwall_main')
if obj:
    for mod in obj.modifiers:
        if mod.type == 'BEVEL':
            mod.segments = 2
            break
    print("backwall_main: Bevel-Segmente auf 2 gesetzt")
```
Nach der Korrektur muss room.glb neu exportiert werden.

---

## 3. Schachbrett-Koordinaten

### Kalibrierungskonstanten (`src/render/scene.ts`)

```ts
// Ein Blender-Schachfeld-Schritt (0,512 m) entspricht einer Three.js-Einheit
const ROOM_SCALE = 1 / 0.512;

// Verschiebt den Raum so, dass die Mitte des Blender-Schachbretts
// mit dem Three.js-Ursprung (0, 0, 0) übereinstimmt.
// ROOM_OFFSET.z = 15,426 — um 0,4 Einheiten korrigiert gegenüber früherem Wert.
const ROOM_OFFSET = new THREE.Vector3(-11.123, -3.833, 15.426);

// Oberkante von board_base_plate in raum2.blend:
//   Blender Z = 2,4221  →  Three.js Y = 2,4221 * ROOM_SCALE + ROOM_OFFSET.y = 0,898
const BOARD_SURFACE_Y = 0.898;
```

### Warum sich BOARD_SURFACE_Y geändert hat

| Szene | Referenzobjekt | Blender Z | Three.js Y |
|---|---|---|---|
| raum.blend (alt) | bishop_arm-Meshes | 2,669 | 1,379 |
| **raum2.blend (neu)** | **board_base_plate Oberkante** | **2,4221** | **0,898** |

Alle Figurenstellungen (Hover-Felder, Highlight-Marker, Animationen) basieren
auf `BOARD_SURFACE_Y`. Nach dem Import von raum2.blend war der alte Wert 1,379
zu hoch — die Three.js-Figuren schwebten über den GLB-Figuren.
Der neue Wert 0,898 bringt sie auf dieselbe Höhe wie die GLB-Figuren.

### Koordinatenumrechnung: Blender ↔ Three.js

```
Three.js X = Blender X / 0,512 + ROOM_OFFSET.x  (= -11,123)
Three.js Y = Blender Z / 0,512 + ROOM_OFFSET.y  (= -3,833)
Three.js Z = -(Blender Y) / 0,512 + ROOM_OFFSET.z (= +15,426)
```

Umgekehrt:
```
Blender X = (Three.js X - (-11,123)) * 0,512
Blender Z = (Three.js Y - (-3,833)) * 0,512
Blender Y = -(Three.js Z - 15,426) * 0,512
```

### Angepasste Dateien

**`src/render/pieces.ts` — Figur-Ankerpunkt Y**
```ts
// getPieceWorldPositionFromSquare()
return new THREE.Vector3(world.x, 0.898, world.z);
// Vorher: 1.379 (raum.blend-Wert)
```

**`src/render/combat-camera.ts` — Kampfkamera-Zielpunkt Y**
```ts
const COMBAT_TARGET_HEIGHT = 1.32;
// = BOARD_SURFACE_Y (0,898) + halbe Figurenhöhe (0,42)
// Vorher: 1.80
```

---

## 4. Ausblenden der GLB-Figuren beim Spielstart

### Problem
Die importierten GLB-Figuren aus room.glb und die Three.js-Engine-Figuren
überlagerten sich, sobald das Spiel gestartet wurde (Klick auf „Spiel starten").

### Lösung (`src/render/scene.ts`)

#### StageScene-Interface — neues Feld
```ts
interface StageScene {
  // ... bestehende Felder ...
  roomPieceNodes: THREE.Object3D[];  // NEU
}
```

#### Erkennung der GLB-Figuren nach dem Laden
```ts
const roomPieceNodes: THREE.Object3D[] = [];
const ROOM_PIECE_PATTERN = /^[wb]_(bishop|rook|knight|queen|king|pawn)/i;

loadRoomAsset().then((room) => {
  if (room) {
    for (const child of room.children.slice()) {
      roomGroup.add(child);
    }
    // Alle Figur-Knoten im GLB anhand des Namensmusters finden
    roomGroup.traverse((node) => {
      if (ROOM_PIECE_PATTERN.test(node.name)) {
        roomPieceNodes.push(node);
      }
    });
    onStateChange?.();
  }
});
```

#### Sichtbarkeits-Toggle in `syncStartFlowState`
```ts
const isBoardFocus = startFlowMode === 'boardFocus';
stage.pieceLayer.group.visible = isBoardFocus;   // Three.js-Figuren einblenden

// GLB-Figuren ausblenden wenn boardFocus aktiv, sonst einblenden
const roomPiecesVisible = !isBoardFocus;
for (const node of stage.roomPieceNodes) {
  if (node.visible !== roomPiecesVisible) {
    node.visible = roomPiecesVisible;
  }
}
```

#### Verhalten
| Modus | GLB-Figuren (room.glb) | Three.js-Figuren (Engine) |
|---|---|---|
| `menu` | sichtbar | unsichtbar |
| `roomExplore` | sichtbar | unsichtbar |
| `boardFocus` (Spiel aktiv) | **ausgeblendet** | **eingeblendet** |
| `displayCaseFocus` | sichtbar | unsichtbar |

---

## 5. Kamera-Koordinaten

Alle Werte wurden über das **Kamera-XYZ-Overlay** (unten rechts im 3D-Canvas,
aktiv in den Modi `menu` und `roomExplore`) ermittelt.

### Hauptkamera-Presets (`src/render/scene.ts`)

#### Menü / Raumübersicht (identisch)
```ts
MENU_CAMERA_PRESET = {
  position: { x:  1.80, y: 8.41, z: 66.99 },
  target:   { x: -14.76, y: 6.00, z:  8.95 }
};
```
> Diese Koordinaten wurden vom Benutzer direkt über das XYZ-Overlay abgelesen
> und eingetragen. `MENU_CAMERA_PRESET` und `overview` bleiben bewusst identisch,
> da „Raum erkunden" die `introTransition` überspringt.

#### Raumübersicht (roomExplore → overview)
```ts
ROOM_FOCUS_TARGET_PRESETS.overview = {
  position: { x:  1.80, y: 8.41, z: 66.99 },
  target:   { x: -14.76, y: 6.00, z:  8.95 }
};
```

#### Vitrine (displayCase)
```ts
ROOM_FOCUS_TARGET_PRESETS.displayCase = {
  position: { x: -22.00, y: 4.00, z:  3.60 },
  target:   { x: -24.90, y: 2.70, z: -8.00 }
};
```

#### Workbench
```ts
ROOM_FOCUS_TARGET_PRESETS.workbench = {
  position: { x: -17.96, y: 3.22, z: 18.01 },
  target:   { x: -26.27, y: 3.22, z: 18.01 }
};
```

#### Bilderrahmen / Zertifikate
```ts
ROOM_FOCUS_TARGET_PRESETS.pictureFrame = {
  position: { x: -17.00, y: 3.80, z:  1.20 },
  target:   { x: -28.40, y: 4.50, z:  1.20 }
};
```

---

## 6. Three.js Rendering-Verbesserungen

### 6.1 Beleuchtung (`src/render/lights.ts`) — komplett neu

Das ursprüngliche einfache AmbientLight + DirectionalLight wurde durch ein
vollständiges Cyber-Beleuchtungskonzept ersetzt:

| Licht | Typ | Farbe | Intensität | Zweck |
|---|---|---|---|---|
| `ambient` | AmbientLight | `#ffffff` | 0.30 | Verhindert komplett schwarze Flächen |
| `hemi` | HemisphereLight | `#1a1a40` / `#080808` | 0.50 | Kühle blaue Grundstimmung von oben |
| `key` | DirectionalLight | `#d0e8ff` | 2.2 | Haupt-Deckenlicht, Schatten |
| `neonA` | PointLight | `#ff0d05` | 4.0, r=22 | Rote Neon-Deckenleiste (Schachbrettseite) |
| `neonB` | PointLight | `#ff0d05` | 4.0, r=22 | Rote Neon-Deckenleiste (Workstation-Seite) |
| `rim` | DirectionalLight | `#ff0d05` | 0.40 | Globaler roter Neon-Gegenlichtfill |

**Key-Light-Schatten:**
- Shadow Map: 2048×2048 (vorher 4096×4096 — halbiert für Performance)
- Shadow Camera deckt den gesamten Raum ab: left=-35, right=20, top=25, bottom=-15
- `bias=-0.0008`, `normalBias=0.02`

**Key-Light-Animation (sanftes Schwingen):**
```ts
stage.lights.key.position.x = -9 + Math.sin(seconds * 0.18) * 1.5;
```

### 6.2 Bloom-Pipeline (`src/render/bloom.ts`) — neue Datei

Eigene HDR-Bloom-Implementierung ohne externe Post-Processing-Bibliothek
(Three.js r183 hat `EffectComposer` entfernt).

**5-Pass-Pipeline:**
1. Szene → HDR-RenderTarget (NoToneMapping + LinearSRGBColorSpace)
2. Threshold-Pass → helle Pixel extrahieren (Luminanz > threshold)
3. Horizontaler Gauss-Blur (7-Tap, separierbar)
4. Vertikaler Gauss-Blur
5. Composite → Screen: ACESFilmic Tonemapping + Bloom additiv + Gamma (1/2.2)

**Konfiguration in scene.ts:**
```ts
bloom = createBloomEffect(renderer, {
  threshold: 0.82,
  strength:  0.55,
  blurScale: 2.2,
  exposure:  1.25
});
```

**Wichtig — doppeltes Gamma verhindert:**
Der Composite-Pass läuft mit `renderer.outputColorSpace = LinearSRGBColorSpace`,
da der Shader selbst bereits Gamma-Korrektur anwendet. Ohne diese Einstellung
würde der Renderer ein zweites Mal Gamma anwenden → zu dunkles Bild.

### 6.3 PMREM Environment Map (`src/render/scene.ts`)

```ts
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.12;
pmrem.dispose();
```

Ergibt weiche Reflexionen auf metallischen Oberflächen (Schachfiguren,
Metallteile) ohne scharfe Spiegelungen.

### 6.4 Renderer-Einstellungen

| Einstellung | Wert | Begründung |
|---|---|---|
| `shadowMap.type` | `PCFShadowMap` | `PCFSoftShadowMap` in r183 deprecated |
| `toneMapping` | `NoToneMapping` | Bloom-Pipeline übernimmt Tonemapping selbst |
| `toneMappingExposure` | `1.0` | Wird durch Bloom-`exposure`-Uniform gesteuert |

---

## 7. Performance-Optimierungen

### Übersicht aller Maßnahmen

| Maßnahme | Wo | Status | Erwarteter Gewinn |
|---|---|---|---|
| Shadow Map 4096 → 2048 | `lights.ts` | **Erledigt** | ~4× weniger VRAM für Shadow-Map |
| Bloom-Blur auf Quarter-Res | `bloom.ts` | **Ausstehend** | ~25% weniger GPU-Arbeit in Blur-Passes |
| `backwall_main` Bevel 100 → 2 Segmente | Blender | **Ausstehend** | ~100k Polygone weniger |
| Objekte nach Material zusammenführen | Blender | **Ausstehend** | ~1900 → ~300 Draw Calls |
| Draco-Kompression Level 6 | Blender + Three.js | **Ausstehend** | 36 MB → ~8–12 MB (Ladezeit) |

### 7.1 Bloom-Blur auf Quarter-Res (`src/render/bloom.ts`)

**Änderung in `setSize()`:**
```ts
// Vorher: halfW = width/2, halfH = height/2
// Nachher:
const quarterW = Math.max(1, Math.floor(width / 4));
const quarterH = Math.max(1, Math.floor(height / 4));

brightRT.setSize(quarterW, quarterH);
blurHRT .setSize(quarterW, quarterH);
blurVRT .setSize(quarterW, quarterH);
// sceneRT bleibt full-res: sceneRT.setSize(fullW, fullH)
```

Bloom-Blur bei höherer Auflösung als Quarter-Res ist für die typische
Glow-Breite nicht wahrnehmbar besser, kostet aber deutlich mehr GPU-Füllrate.

### 7.2 Objekte nach Material zusammenführen (Blender)

Ziel: Statische Architektur-Objekte (Wände, Boden, Decke, Möbel) die dasselbe
Material teilen, in ein einziges Mesh zusammenführen.

**Bedingungen:**
- Nur Objekte ohne Animation/Rig
- Nur Objekte mit identischem Material
- Figur-EMPTYs (`w_*`, `b_*`) bleiben unberührt — ihre Namen sind Loader-API
- Interaktive Objekte (Vitrinenklappe, Stuhl) bleiben einzeln

**Erwartetes Ergebnis:** ~1900 Draw Calls → ~300 Draw Calls

**Vorgehen in Blender:**
```python
import bpy

# Alle Objekte nach Material-Slot-Name gruppieren
# Pro Gruppe: join() auf Mesh-Objekten ohne Rig/Animation
# Namen-Prefix '[merged]' vergeben zur Identifikation
```

### 7.3 Draco-Kompression

#### Blender-Seite
Export-Parameter (siehe Abschnitt 1 — geplanter Export-Befehl mit Draco).

#### Three.js-Seite (`src/loaders.ts`)

```ts
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');   // Decoder-WASM-Dateien in public/draco/

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
```

**Decoder-Dateien** müssen in `public/draco/` vorhanden sein:
```
public/draco/draco_decoder.wasm
public/draco/draco_decoder.js
public/draco/draco_wasm_wrapper.js
```

Quellen: `node_modules/three/examples/jsm/libs/draco/` oder
`node_modules/three-stdlib/libs/draco/`.

---

## 8. Sonstige Hinweise

### Raum-GLB-Raumgrenzen (Free Camera — room-camera-controls.ts)
```
Three.js X:  -60 bis  30
Three.js Y:  -10 bis  30
Three.js Z:  -30 bis  60
Radius:        3 bis 200
```

### Freie Kamerasteuerung (`src/render/room-camera-controls.ts`)
Aktiv wenn: `roomExplore` + `focusTarget === 'overview'` + `focusProgress >= 1`
- Linksklick + Ziehen = Orbit
- Shift + Ziehen oder Mittelklick + Ziehen = Schwenken
- Scrollrad = Zoom

### board.group sichtbarkeit
```ts
board.group.visible = false;
```
Das Three.js-Schachbrett-Grid bleibt dauerhaft unsichtbar — das GLB liefert die
Optik. Raycasting für Felder funktioniert unabhängig von `visible`.

### Neu-Kalibrierung nach zukünftigen Exporten
Nach einem neuen GLB-Export aus einer geänderten Blender-Szene:
1. `BOARD_SURFACE_Y` neu messen: Blender Z der `board_base_plate`-Oberkante
   → `Y_new = Z_blender * ROOM_SCALE + ROOM_OFFSET.y`
2. `ROOM_OFFSET` prüfen: sq_a1 und sq_h8 in Blender ausmessen, mit
   Three.js-Schachbrett-Mapping vergleichen
3. Kamera-Presets über XYZ-Overlay neu ablesen falls nötig

---

## 9. Stray-Objekte (Importartefakte)

### Problem
In der App wurden nahe Three.js (-7.6, 6.24, 20.0) drei unerwünschte Objekte
gefunden:
- Ein **hellblaues Objekt** — Importartefakt, muss weg
- Eine **schwarze Platte** — Importartefakt, muss weg
- Ein **Hex-Daten-Bild** — gehört zum Laptop, bleibt erhalten

### Befund
Alle drei Objekte entstammen einem **früheren Exportzustand** von room.glb.
Suche im aktuellen `raum2.blend` (Radius 3 + 10 Blender-Einheiten um
Blender-Zielposition X=1.80, Y=−2.34, Z=5.16) ergab **keinen Treffer** —
die Artefakte existieren nicht mehr im Blend-File.

**Konvertierung Three.js → Blender:**
```
BX = (-7.6  + 11.123) * 0.512 = 1.804
BZ = ( 6.24 +  3.833) * 0.512 = 5.157
BY = -(20.0 - 15.426) * 0.512 = -2.342
→ Blender-Ziel: (1.804, -2.342, 5.157)
```

### Lösung
Re-Export aus aktuellem `raum2.blend` (Artefakte nicht mehr im Blend-File).
