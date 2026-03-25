# Hardening – Arbeitsplan

Stand: 2026-03-24
Ziel: Polishing-Runde vor finalem Release. Funktion bleibt Priorität, aber alle Pakete sollen die Seite auf ein professionelles Niveau heben.

---

## Paket 1 – Impressum & Datenschutzerklärung ✅

**Status: Erledigt**

**Was umgesetzt wurde:**
- [x] Google Fonts self-hosted via `@fontsource` (kein CDN mehr)
- [x] Alle GLB-Modelle Draco-komprimiert (Draco-only, Material-Namen erhalten)
- [x] Impressum- und Datenschutz-Texte als Konstanten in `src/ui/legal-overlay.ts`
- [x] Footer-Buttons „Impressum" / „Datenschutz" in `index.html` (disabled außerhalb menu/roomExplore)
- [x] `legalWall` als Room-Focus-Target mit quadratischer Bézier-Kamerafahrt
- [x] Frontale Kamera-Position auf die rechte Wand (wie Workbench-Muster)
- [x] Overlay: transparenter Hintergrund, neon-weiße Schrift, Tab-Wechsel
- [x] HUD-Buttons „Zur Übersicht" / „Zum Hauptmenü" (z-index über Overlay)
- [x] Header + Footer erst nach Asset-Load einblenden (kein brauner Flash)
- [x] Footer mobile: kleinere Schrift, Padding, nowrap
- [x] Overlay mobile: responsive Höhe, scrollbar, kleinere Schrift

**Dateien:** `index.html`, `src/app/main.ts`, `src/app/game.ts`, `src/render/scene.ts`, `src/ui/legal-overlay.ts`, `src/styles/main.css`, `public/models/*.glb`

**Offene Punkte:**
- Adress-Entscheidung: aktuell Name + Stadt (Grauzone) — Virtualadresse optional nachrüsten

---

## Paket 2 – Responsive Layout & Querformat-Handling

**Status: Offen**

**Aufgaben:**
- [ ] Breakpoint-Matrix definieren: `≤560px portrait`, `≤900px landscape` (Handy quer), `560–1024px tablet`, `>1024px desktop`
- [ ] `index.html` + `src/styles/main.css`: alle bestehenden `@media`-Queries durchgehen und fehlende `orientation: landscape`-Regeln ergänzen
- [ ] Header-Höhe auf kleinen Querformat-Geräten anpassen (aktuell 70px, zu viel vertikaler Platz)
- [ ] Canvas/Viewport-Größe im Querformat korrekt berechnen (minus Header + Footer)
- [ ] HUD-Panels (Zugliste, gefangene Figuren) im Landscape-Modus ggf. kollabierbar oder seitlich anordnen
- [ ] Room-Hotspot-Positionen auf allen Viewports testen und ggf. Offset-Logik anpassen
- [ ] `404.html` im Querformat (robot-row Layout) prüfen und Abstände korrigieren
- [ ] Portfolio-Overlay (`/portfolio/`) im Querformat prüfen

**Dateien:** `src/styles/main.css`, `index.html`, `404.html`
**Abhängigkeiten:** Paket 8 (Kamera/Boden) hat Overlap – koordinieren.

---

## Paket 3 – Performance-Optimierung Webseite

**Status: Erledigt ✅**

### Ist-Zustand (analysiert 2026-03-24)

| Bereich | Aktueller Wert | Bewertung |
|---|---|---|
| pixelRatio | `Math.min(dpr, 2)` | ✅ bereits gedeckelt |
| antialias | `true` (natives MSAA) | ⚠️ teuer auf Mobile |
| Shadows | `PCFShadowMap`, 1024×1024 | ⚠️ kein Mobile-Fallback |
| Bloom | 4 Extra-Passes, halbe Auflösung | ⚠️ kein Mobile-Budget |
| Tone Mapping | ACESFilmic | ✅ ok |
| Delta-Clamp | `Math.min(delta, 0.032)` | ✅ bereits vorhanden |
| Asset Loading | lazy, non-blocking | ✅ ok |
| Vite Config | minimal, keine Kompression | ⚠️ kein Gzip/Brotli |
| Adaptive Quality | nicht vorhanden | ⚠️ alle Geräte gleich |

### Strukturierte Vorgehensweise

Jeder Schritt wird einzeln umgesetzt und manuell verifiziert, bevor der nächste beginnt. Kein Schritt darf bestehende visuelle Ergebnisse auf Desktop verändern.

---

#### Phase 1 – Baseline messen (kein Code-Change)

- [ ] **1.1** Lighthouse-Run lokal (Desktop + Mobile) → Scores dokumentieren
- [ ] **1.2** `performance.now()` Timestamps für: Renderer-Init, erstes Frame, Asset-Load-Ende → in Konsole loggen
- [ ] **1.3** FPS-Counter temporär einbauen (`stats.js` oder manuell) → 10s Durchschnitt auf Desktop + Mobile notieren

**Verifikation:** Nur Messwerte, kein visueller Unterschied. Screenshots vorher/nachher vergleichen.

---

#### Phase 2 – Device-Tier-Erkennung einführen

- [ ] **2.1** Utility-Funktion `getDeviceTier()` in `src/render/device-tier.ts`:
  ```
  'low'    → mobile + DPR ≤ 1.5  ODER  canvas-Benchmark < Schwelle
  'medium' → mobile + DPR > 1.5  ODER  Tablet
  'high'   → Desktop
  ```
- [ ] **2.2** Funktion einmal beim Start aufrufen, Ergebnis als Konstante exportieren
- [ ] **2.3** Keine Rendering-Änderung in diesem Schritt — nur die Erkennung

**Verifikation:** `console.log(deviceTier)` auf Desktop → `'high'`, auf Mobile → `'low'` oder `'medium'`. Kein visueller Unterschied.

---

#### Phase 3 – Antialias conditional

- [ ] **3.1** `antialias` im Renderer nur auf `deviceTier === 'high'` setzen
- [ ] **3.2** Für `'low'`/`'medium'`: `antialias: false` (kein FXAA-Pass nötig bei DPR ≥ 2)

**Verifikation:** Desktop: Screenshot vergleichen → identisch. Mobile: leicht glattere Kanten weg, aber deutlich schneller. FPS-Counter prüfen.

---

#### Phase 4 – Shadow-Map Mobile-Fallback

- [ ] **4.1** Shadow-Map-Type: `PCFSoftShadowMap` nur bei `'high'`, sonst `PCFShadowMap` (bereits der Fall)
- [ ] **4.2** Shadow-Map-Größe: `1024` bei `'high'`, `512` bei `'medium'`/`'low'`
- [ ] **4.3** Optional: Schatten auf `'low'` komplett deaktivieren (falls FPS-Gewinn > 20%)

**Verifikation:** Desktop: identische Schatten. Mobile: Schatten etwas weicher/pixeliger, aber Szene sieht professionell aus. Screenshot-Vergleich.

---

#### Phase 5 – Bloom-Budget reduzieren

- [ ] **5.1** Bloom-Auflösung auf `'low'`: Viertel-Auflösung statt halbe
- [ ] **5.2** Bloom-Iterations auf `'low'`: 2 statt 4 Passes
- [ ] **5.3** Bloom-Strength/Radius-Werte beibehalten (visueller Eindruck soll gleich bleiben)

**Verifikation:** Desktop: identischer Bloom. Mobile: Bloom minimal weicher, kein sichtbarer Qualitätsverlust bei normalem Betrachten. FPS-Gewinn messen.

---

#### Phase 6 – Vite Build-Optimierung

- [ ] **6.1** `vite-plugin-compression` (Gzip + Brotli) installieren und in `vite.config.ts` einbinden
- [ ] **6.2** Chunk-Splitting prüfen: Three.js als separater Chunk (`manualChunks`)
- [ ] **6.3** `build.rollupOptions.output.manualChunks` konfigurieren
- [ ] **6.4** Bundle-Größen vorher/nachher dokumentieren (`vite build --report` oder `source-map-explorer`)

**Verifikation:** `npm run build` erfolgreich. Keine Runtime-Fehler. Asset-Größen kleiner. Lighthouse-Score verbessert.

---

#### Phase 7 – Abschluss-Messung

- [ ] **7.1** Lighthouse erneut (Desktop + Mobile) → Vergleich mit Phase-1-Werten
- [ ] **7.2** FPS-Counter erneut → Vergleich mit Phase-1-Werten
- [ ] **7.3** Temporäre Debug-Tools (FPS-Counter, Timestamps) entfernen
- [ ] **7.4** Ergebnisse in `progress.md` dokumentieren

**Verifikation:** Desktop visuell identisch zu Baseline. Mobile spürbar flüssiger. Keine Regressions.

---

### Rote Linien (nicht anfassen)

- Kein Eingriff in Schachlogik (`src/chess/`)
- Kein Eingriff in Kamera-Transitions (`src/render/camera.ts`, `scene.ts` Preset-Logik)
- Kein Eingriff in Material/Farb-System (`pieces.ts` Palette)
- Kein Eingriff in UI-Overlays oder State-Machine
- Bloom/Schatten auf Desktop dürfen sich visuell **nicht** verändern

**Dateien:** `src/render/scene.ts`, `src/render/bloom.ts`, `src/render/lights.ts`, `src/render/loaders.ts`, `src/render/device-tier.ts` (neu), `vite.config.ts`

---

## Paket 4 – Schachspiel-Optimierung

**Status: Offen**

**Aufgaben:**
- [ ] **Interaktions-Latenz messen:** Raycasting-Frequenz ggf. auf `pointermove` throttlen
- [ ] **Highlight-System:** Highlight-Meshes nur bei State-Change neu setzen
- [ ] **Figur-Instancing prüfen:** auf `InstancedMesh` umstellen falls noch nicht geschehen
- [ ] **Capture-Animation-Queue:** Prüfen ob mehrere gleichzeitige Animationen sich blockieren
- [ ] **Promotion-Dialog:** UI-Flow prüfen, ggf. responsiver gestalten
- [ ] **Undo-Performance:** Diff statt Full-Rebuild nach Undo
- [ ] **KI-Platzhalter** (optional): einfachen Minimax-Bot (Tiefe 2–3) vorbereiten

**Dateien:** `src/chess/engine.ts`, `src/render/pieces.ts`, `src/render/interaction.ts`, `src/render/capture-animations.ts`

---

## Paket 5 – 404-Seite Redesign ✅

**Status: Erledigt**

**Was umgesetzt wurde:**
- [x] Schriften, Farben, Header/Footer von Hauptseite übernommen
- [x] Roboter + Spotlight + Scanlines entfernt, schlichte statische Seite
- [x] Button im gleichen HUD-Stil (dunkelrot, #ffd4d4 Schrift)
- [x] Mobile-Layout responsive mit 560px Breakpoint
- [x] Kein JS/GLB mehr nötig

**Dateien:** `404.html`

---

## Paket 6 – Kamerafahrt Ladesequenz → Raum erkunden

**Status: Offen**

**Aufgaben:**
- [ ] Ist-Zustand dokumentieren: Start-Flow Kamera-Preset-Übergänge kartieren
- [ ] Timing + Easing-Kurve anpassen (Smooth-Damp oder kubische Bezier)
- [ ] Startposition und Orientierungspunkt prüfen
- [ ] Intro-Overlay-Fade nahtlos gestalten
- [ ] Mobile: Kamerafahrt auf kleinen Viewports testen

**Dateien:** `src/render/scene.ts`, `src/render/camera.ts`, `src/app/main.ts`, `src/app/game.ts`
**Abhängigkeiten:** Paket 3 (Performance), Paket 7 (Room-Geometrie)

---

## Paket 7 – Blender Raum überarbeiten ✅

**Status: Erledigt**

**Was umgesetzt wurde:**
- [x] Überlappende Geometrie in Blender bereinigt (Ursache für Shadow-Artefakte / grauen Schleier)
- [x] Einzelne Objekte separiert (merged wall panel, merged accent teal)
- [x] Unnötige Elemente entfernt
- [x] Neuer Export als `room.glb` (Draco-komprimiert aus Blender)

**Dateien:** `public/models/room.glb`

---

## Paket 8 – Kamera-Rotation Mobil / Boden-Clipping ✅

**Status: Erledigt**

**Was umgesetzt wurde:**
- [x] Key-Light von DirectionalLight auf SpotLight umgebaut (kein grauer Schleier mehr auf Boden)
- [x] SpotLight shadow.bias und normalBias angepasst (keine Shadow-Acne Artefakte)
- [x] Mobile SpotLight-Intensität reduziert (weniger aufdringlich)
- [x] Rechter Yaw-Limit im Raum-Erkunden weiter eingeschränkt (leerer Bereich nicht sichtbar)
- [x] Licht-Animation auf statische Position gesetzt (kein Dreh-Effekt)

**Dateien:** `src/render/lights.ts`, `src/render/scene.ts`, `src/render/room-camera-controls.ts`

---

## Paket 9 – Kamera-Fallback (Zustandsbasierte Rücknavigation)

**⚠️ HINWEIS: Vor Umsetzung Rückfragen stellen! Nicht eigenständig implementieren.**

**Status: Offen**

**Problem:** Wenn man auf Mobile die Kamera manuell schwenkt (links/rechts) und dann einen Viewpoint anklickt oder auf einen anderen Zustand zurücknavigiert, fährt die Kamera zuerst über den Standard-Ausgangspunkt (z.B. Overview-Preset) statt vom aktuellen Kamera-Standort aus zu starten. Das erzeugt einen unnatürlichen Sprung.

**Gewünschtes Verhalten:**
- Kamera-Transitionen sollen immer vom **aktuellen Kamera-Zustand** ausgehen (Position + LookAt), nicht vom gespeicherten Preset des vorherigen Zustands.
- Bei Rücknavigation (z.B. legalWall → overview, boardFocus → roomExplore) soll die Kamera auf den **letzten tatsächlichen Kamera-Zustand** zurückfallen, nicht auf ein festes Preset.
- Mobile Schwenk-Offsets (Touch-Rotation) müssen als aktueller Zustand in die Transition einfließen.

**Betrifft:** `src/render/scene.ts` (Kamera-Presets, Transition-Logik), ggf. `src/app/game.ts` (Zustandswechsel)

**Offene Fragen (vor Umsetzung klären):**
- Soll der manuelle Schwenk-Offset nach einer Transition zurückgesetzt werden?
- Soll die Rückkehr-Animation ebenfalls Bézier-geschwenkt sein oder reicht lineares Lerp?
- Wie verhält sich das bei verschachtelten Zuständen (z.B. legalWall → overview → menu)?

---

## Reihenfolge-Empfehlung

```
Parallel starten (unabhängig):
  Paket 5 (404 Redesign)

Dann:
  Paket 3 (Performance) → Basis für alle weiteren
  Paket 8 (Kamera-Boden) → schnell fixbar, hoher visueller Impact

Dann:
  Paket 2 (Responsive) → baut auf stabilem Layout auf
  Paket 4 (Schach-Optimierung) → baut auf Performance-Basis auf
  Paket 9 (Kamera-Fallback) → baut auf Kamera-Verständnis auf

Zuletzt (Blender-abhängig):
  Paket 7 (Raum überarbeiten)
  Paket 6 (Kamerafahrt) → erst sinnvoll nach finalem Room-GLB
```

---

## Offene Fragen (vor Start klären)

1. **Paket 7:** Welche konkreten Objekte im Raum sollen entfernt werden?
2. **Paket 5:** Soll der Roboter komplett entfernt oder nur optisch reduziert werden?
3. **Paket 6:** Gibt es eine Vorstellung wie die Kamerafahrt aussehen soll (Beschreibung oder Referenz)?
