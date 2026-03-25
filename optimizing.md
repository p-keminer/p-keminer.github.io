# Performance-Optimierung: Schritt-fuer-Schritt Plan

## Kontext

Die Three.js-Portfolio-Seite hat Performance-Probleme: `requestAnimationFrame`-Handler brauchen 100-150ms selbst im Idle. Hauptursachen: 5-Pass Bloom-Pipeline laeuft jeden Frame, Shadow-Maps werden unnoetig neu berechnet, keine Tier-basierte Qualitaetsanpassung. Ziel: fluessige 60fps auf Desktop, stabile 30fps+ auf Mobile.

**Bereits umgesetzt:** Shadow-Map `autoUpdate=false`, Key-Light Drift-Threshold, Look-Around onChange-Throttle, Vector3-Allokation eliminiert.

---

## WP-01: On-Demand Rendering (Dirty Flag)

**Problem:** `render()` laeuft 60x/Sekunde mit 5+ GPU-Passes — auch wenn nichts passiert.

**Dateien:** `src/render/scene.ts`

**Aenderungen:**
1. `let dirty = true` Flag in `createBoardPreviewScene`
2. `markDirty()` Helper der `dirty = true` setzt
3. In `step()`: `render()` nur ausfuehren wenn `dirty === true`, danach `dirty = false`
4. `markDirty()` aufrufen aus:
   - `syncPieces`, `syncPresentationState`, `syncInteractionState`, `syncStartFlowState`
   - `resize` Callback
   - `boardCameraControls.onPoseChange` (statt direktem render())
   - `roomCameraControls.onPoseChange` (statt direktem render())
   - `interaction.onChange` (statt direktem render())
   - In `step()` wenn Piece-Animationen aktiv oder Key-Light-Drift ausgefuehrt wurde
5. Direkte `bloom.render()` Aufrufe in den onPoseChange/onChange Callbacks entfernen (werden durch markDirty + naechsten Frame ersetzt)
6. rAF-Loop laeuft weiter (step() ist billig ohne render())

**Verifikation:**
- DevTools Performance Tab: 5 Sekunden Idle aufnehmen → keine GPU-Aktivitaet
- `console.count('render')` in render() → Idle = 0 Increments, Kamera-Drag = Counts nur waehrend Bewegung
- Alle Animationen, Kamera-Orbit, Bloom muessen identisch funktionieren

**Impact:** Eliminiert ~95% der GPU-Arbeit im Idle. Groesster Einzelgewinn.
**Risiko:** Mittel — fehlende `markDirty()` Aufrufe lassen Szene einfrieren.

---

## WP-02: powerPreference: 'high-performance'

**Problem:** Browser waehlt auf Dual-GPU Laptops evtl. die integrierte GPU.

**Dateien:** `src/render/scene.ts`

**Aenderungen:**
1. `powerPreference: 'high-performance'` zum WebGLRenderer-Konstruktor hinzufuegen

**Verifikation:**
- `renderer.getContext().getParameter(renderer.getContext().RENDERER)` in Console zeigt dedizierte GPU

**Impact:** 2-5x auf Dual-GPU Laptops. Null auf anderen Geraeten.
**Risiko:** Keins.

---

## WP-03: Shadow-Map 512 auf Mobile

**Problem:** Shadow-Map 1024x1024 auf allen Geraeten. Overkill fuer kleine Bildschirme.

**Dateien:** `src/render/lights.ts`

**Aenderungen:**
1. `deviceTier` importieren
2. `const shadowSize = deviceTier === 'high' ? 1024 : 512;`
3. `key.shadow.mapSize.set(shadowSize, shadowSize);`

**Verifikation:**
- Mobile emulieren, `scene.traverse(n => { if (n.shadow?.map) console.log(n.shadow.map.width); })` → 512
- Schatten-Kanten etwas weicher, auf Phone-Screen kaum sichtbar

**Impact:** Shadow-Map 4x billiger. Relevant bei needsUpdate-Triggers.
**Risiko:** Keins.

---

## WP-04: Mobile DPR auf 1.0 cappen

**Problem:** Medium-Tier Phones rendern bei DPR 2.0-3.0. Mit Bloom = 5x mehr Pixel pro Pass.

**Dateien:** `src/render/scene.ts`

**Aenderungen:**
1. In `resize()` die maxDpr-Logik aendern:
   ```
   const maxDpr = isTabletDevice ? 1.5
     : deviceTier === 'high' ? 2
     : 1.0;
   ```

**Verifikation:**
- Mobile emulieren, `renderer.getPixelRatio()` → 1.0
- Visuell: etwas weniger scharf, auf Abstand kaum merkbar
- Frame-Time sollte deutlich sinken

**Impact:** Bis zu 4x weniger Pixel auf DPR-2+ Phones.
**Risiko:** Gering — visuelle Schaerfe sinkt. Falls zu weich: 1.25 als Kompromiss testen.

---

## WP-05: Bloom Quarter-Resolution auf Mobile

**Problem:** Bloom-Blur bei halber Aufloesung. Auf Mobile reicht Viertel-Aufloesung.

**Dateien:** `src/render/bloom.ts`

**Aenderungen:**
1. `bloomDiv`-Konstante tier-abhaengig machen:
   ```
   const bloomDiv = deviceTier === 'high' ? 2 : 4;
   ```

**Verifikation:**
- Spector.js: brightRT/blurHRT/blurVRT Dimensionen pruefen → canvas_width/4 auf Mobile
- Visuell: Bloom etwas weicher, auf Phone-Abstand kein Unterschied

**Impact:** 4x weniger Pixel in 3 Bloom-Passes. ~15-25% Frame-Time Reduktion auf Mobile.
**Risiko:** Gering.

---

## WP-06: Bloom auf Low-Tier deaktivieren

**Problem:** Low-Tier Geraete schaffen kaum 30fps mit 5-Pass Bloom.

**Dateien:** `src/render/bloom.ts`, `src/render/scene.ts`

**Aenderungen:**
1. In `bloom.ts` neuen `createDirectRenderer(renderer)` erstellen der das gleiche BloomEffect-Interface implementiert aber nur 1 Render-Pass macht (direkt auf Screen mit ACESFilmic Tonemapping)
2. In `createStageScene`: `deviceTier === 'low' ? createDirectRenderer(renderer) : createBloomEffect(...)`

**Verifikation:**
- Tier temporaer auf 'low' forcen
- Spector.js: nur 1 Draw-Call pro Frame statt 5
- Visuell: kein Bloom-Glow, aber korrekte Farben/Tonemapping

**Impact:** 80% weniger Render-Passes auf Low-Tier. Massiv.
**Risiko:** Gering — BloomEffect Interface-Abstraktion isoliert die Aenderung.

---

## WP-07: Board-Camera onPoseChange throttlen

**Problem:** `pointermove` feuert pro Pixel → jedes Mal onPoseChange → Render-Trigger.

**Dateien:** `src/render/board-camera-controls.ts`

**Aenderungen:**
1. rAF-Coalescing Pattern wie bei Look-Around:
   ```
   let poseUpdateScheduled = false;
   function schedulePoseUpdate() {
     if (poseUpdateScheduled) return;
     poseUpdateScheduled = true;
     requestAnimationFrame(() => {
       poseUpdateScheduled = false;
       onPoseChange(buildCurrentPose());
     });
   }
   ```
2. Alle `onPoseChange(buildCurrentPose())` in Move/Wheel-Handlern ersetzen
3. Reset-Aufrufe NICHT throttlen

**Verifikation:**
- `console.count('boardPoseChange')` — max 1 pro Frame statt 3-5 bei schnellem Drag
- Kamera-Orbit muss sich fluessig anfuehlen

**Impact:** Verhindert redundante Renders pro Frame waehrend Drag.
**Risiko:** Gering. Max 16ms Latenz, visuell unmerkbar.

---

## WP-08: Room-Camera onPoseChange throttlen

**Problem:** Gleich wie WP-07 fuer Room-Kamera (Wheel/Pinch-to-Zoom).

**Dateien:** `src/render/room-camera-controls.ts`

**Aenderungen:**
1. Identisches rAF-Coalescing Pattern wie WP-07
2. In `handleWheel` und `handleTouchMove` ersetzen
3. Entrance/Exit-Animationen NICHT throttlen (laufen bereits in eigenem rAF)

**Verifikation:** Wie WP-07 aber fuer Room-Zoom.

**Impact/Risiko:** Wie WP-07.

---

## WP-09: Lichter auf Low-Tier reduzieren

**Problem:** 2 PointLights (Neon-Rot) verdoppeln Fragment-Shader-Komplexitaet.

**Dateien:** `src/render/lights.ts`, `src/render/scene.ts`

**Aenderungen:**
1. Auf Low-Tier `neonA` und `neonB` nicht zur Scene hinzufuegen
2. `rim.intensity` von 0.40 auf 0.65 erhoehen als Kompensation
3. Nach Room-Load: Neon-Mesh-Materialien auf `emissive = #ff0d05` setzen (Fallback-Glow)

**Verifikation:**
- Low-Tier forcen, Scene-Graph pruefen — keine PointLights
- Visuell: Neon-Streifen gluehen noch via Emissive, weniger dynamisches Rot-Licht-Spill
- Frame-Time Vergleich auf Low-End Geraet

**Impact:** ~28% weniger Fragment-Berechnungen (2 von 7 Lichtern).
**Risiko:** Mittel — visuelle Aenderung sichtbar. Neon-Mesh-Namen in room.glb muessen identifiziert werden.

---

## WP-10: InstancedMesh fuer Schachfiguren

**Problem:** Jede Figur = eigener Draw Call. 32 Figuren = 32 Calls.

**Dateien:** `src/render/pieces.ts`

**Aenderungen:**
1. Figuren nach Typ+Farbe gruppieren (z.B. alle weissen Bauern)
2. Pro Gruppe ein `InstancedMesh` erstellen
3. Per-Instance Transform-Matrix aus Animation-System updaten
4. Capture: Instance auf Scale 0 setzen statt Mesh entfernen
5. Hover/Selection via `instanceColor` Attribut

**Verifikation:**
- Spector.js: Draw Calls ~32 → ~12
- Alle Animationen (Move, Capture, Combat, Hover) muessen funktionieren

**Impact:** ~60% weniger Piece-Draw-Calls. Moderater Impact (Bloom ist groesserer Bottleneck).
**Risiko:** Hoch — grosser Refactor des Piece-Systems. Erst nach stabiler Baseline.

---

## WP-11: Statische Raum-Geometrie mergen

**Problem:** Room-GLB enthaelt viele einzelne Meshes mit gleichem Material.

**Dateien:** `src/render/scene.ts` (oder neues `src/render/room-optimizer.ts`)

**Aenderungen:**
1. Nach Room-Load: Meshes nach Material gruppieren
2. `BufferGeometryUtils.mergeGeometries()` pro Material-Gruppe
3. Ausnahmen: CCTV-Screen Mesh, interaktive Hotspots, Picture-Frame Meshes

**Verifikation:**
- Spector.js: Room Draw Calls vorher/nachher vergleichen
- Visuell identisch, keine fehlenden Meshes
- CCTV und Interaktion funktionieren weiterhin

**Impact:** 50-80% weniger Room-Draw-Calls.
**Risiko:** Hoch — unterschiedliche Vertex-Attribute koennen Merge brechen. Ausfuehrliches visuelles QA noetig.

---

## Reihenfolge

```
WP-01  On-Demand Rendering      ★★★★★  (hoechster Impact, mittleres Risiko)
WP-02  powerPreference           ★☆☆☆☆  (trivial, null Risiko)
WP-03  Shadow 512 Mobile         ★★☆☆☆  (trivial, null Risiko)
WP-04  DPR 1.0 Mobile            ★★★★☆  (einfach, geringes Risiko)
WP-05  Bloom Quarter-Res         ★★★☆☆  (einfach, geringes Risiko)
WP-06  Bloom deaktivieren Low    ★★★★☆  (mittel, geringes Risiko)
WP-07  Throttle Board Camera     ★★☆☆☆  (einfach, geringes Risiko)
WP-08  Throttle Room Camera      ★★☆☆☆  (einfach, geringes Risiko)
WP-09  Lichter reduzieren        ★★☆☆☆  (mittel, mittleres Risiko)
WP-10  InstancedMesh             ★★☆☆☆  (gross, hohes Risiko)
WP-11  Geometrie mergen          ★★☆☆☆  (gross, hohes Risiko)
```

Jedes WP = 1 Commit. Bei Regression einzeln revertbar.
