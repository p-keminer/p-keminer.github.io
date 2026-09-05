# A/B-Test gebackener Materialien, 05.09.2026

**Die Testvariante bringt auf dem gemessenen Gerät keinen nachgewiesenen Zeitgewinn.** Die bisherige Materialfassung bleibt Standard und wird unverändert für die Produktionsseite verwendet. Die alternative Berechnung ist ausschließlich über `?bakedShader=lean` im Entwicklungsmodus verfügbar.

## Veränderung im Versuch

Die gebackenen Materialklone verwenden weiterhin `MeshStandardMaterial`. Der bestehende Shader verwirft direktes diffuses Echtzeitlicht nach der Lichtberechnung, weil dieser Anteil bereits im Blender-Lichtatlas steckt. Die Testvariante entfernt nur die beiden vorhergehenden Additionen dieses verworfenen Beitrags: für RectArea-Licht sowie gerichtetes/Punkt-/Spot-Licht. Sie verändert weder gebackenes Licht noch direkte oder indirekte Reflexionen, Schatten, Normalmaps, Clearcoat, Sheen oder Anisotropie.

Der lokale Physical-Shaderchunk wird kopiert; globale Three-Shaderchunks werden nicht verändert. Exakte Statements, Include und bestehender Reset werden geprüft. Bei unerwartetem Shaderaufbau bleibt die Referenzberechnung erhalten. Die Variante verwendet einen getrennten Programm-Cache-Schlüssel.

## Messung und Ergebnis

Intel UHD Graphics P630, ANGLE/Direct3D11 im integrierten Chromium-Browser. CSS 1280 × 720, DPR 1,25, feste Renderauflösung 1600 × 900. Dieselbe Portfolio-Hin-/Rückfahrt mit zwei Sekunden je Richtung. Reihenfolge A–B–B–A; je Block eine frische Navigation, eine Aufwärmrunde und zwei Messrunden. Insgesamt vier ausgewertete Runden pro Variante, ohne laufendes Konsolenprofiling.

| Messwert | Bisherige Fassung | Testvariante |
|---|---:|---:|
| Vollständige Bewegungsframes | 651 | 641 |
| Hauptpass GPU-Mittel | 14,60 ms | 14,97 ms |
| Hauptpass GPU-Median | 15,47 ms | 15,99 ms |
| Hauptpass GPU-P95 | 28,45 ms | 30,87 ms |
| GPU-Summe aller Passsegmente, Mittel | 19,08 ms | 19,48 ms |
| Hauptpass CPU-Submission, Median | 1,50 ms | 1,50 ms |

Alle **8.545 GPU-Abfragen** waren gültig, ohne Fehler, Disjoint-Ergebnisse oder offene Queries. Der Hauptpass wurde aus seinen Segmenten vor und nach Transmission summiert. Es wird keine Bildratensteigerung aus Quellcodegröße oder Passabständen abgeleitet.

Die Rundenmittel des Hauptpasses lagen bei der Referenz zwischen 14,38 und 14,76 ms, bei der Testvariante zwischen 14,55 und 15,86 ms. Die Bereiche überlappen. Die etwas höheren zusammengefassten Werte der Testvariante sind kein allgemeiner Nachweis einer Verschlechterung; ein Vorteil ist in diesen Messungen jedoch nicht erkennbar. Dass der GPU-Compiler die verworfenen Ausdrücke bereits eliminiert, ist eine plausible, nicht direkt nachgewiesene Erklärung.

## Bildkontrolle und Validierung

Die Browser-Screenshots waren **byteweise identisch**:

- Raumübersicht: beide JPEG-Aufnahmen 77.539 Byte bei 1280 × 720.
- Lampen-Nahansicht: beide JPEG-Aufnahmen 53.380 Byte bei 1280 × 720.

Das belegt identische Vergleichsaufnahmen in diesen Ansichten, keinen Vergleich interner HDR-Puffer oder fertiger GPU-Programme. Die aktive Testvariante wurde über ihre einmalige Kompilierungsmeldung bestätigt; keine Browserwarnungen oder -fehler.

Zwölf unabhängige Checks mit dem echten `room-quality.ts` und echten Three-Materialien bestätigen die exakte Shaderänderung, unveränderte übrige Shader-/Material-/Normaltexturdaten, Materialauswahl, RGBM-Varianten, Produktionsausschluss, Cachekeys und Rückfälle. [Testskript](../output/room-refined/performance-step8/audit-baked-shader.mjs), [Checkergebnis](../output/room-refined/performance-step8/audit-baked-shader-results.json), [Browser-Messwerte](../output/room-refined/performance-step8/browser-results.json).

TypeScript, Produktionsbuild, statische Sicherheitsprüfung und `git diff --check` bestanden. Der gebaute JavaScript-Code enthält weder Testschalter noch Lean-Cachekey oder GPU-Profiler. Der Produktionsbrowser startet auch mit den Testparametern fehlerfrei in die normale Fassung; keine Lean-Kompilierungsmeldung und kein aktiver Profiler.

Dieser Versuch ist abgeschlossen. Er rechtfertigt keine Umstellung des Standardmaterials. Weitergehende Materialvereinfachungen würden eine eigene Bild- und Zeitprüfung erfordern.
