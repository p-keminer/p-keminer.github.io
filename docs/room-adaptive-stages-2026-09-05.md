# Zusätzliche Bewegungsauflösung, 2026-09-05

Nach dem Belastungstest ohne Zweitgerät erlaubt der Nutzer eine weitere Auflösungsreduktion, solange die Darstellung passt. Die Automatik verwendet jetzt bei anhaltend langsamer Kamerafahrt zusätzlich 65 Prozent der Basisbreite und -höhe. Materialien, Licht, Geometrie, Kamera und HTML-Oberfläche bleiben unverändert. Im Stillstand kehrt die volle Basisauflösung zurück.

## Verhalten und Vergleich

Die bisherige erste Stufe bleibt bei 80 Prozent. Erst eine getrennte Messreihe unter dieser Stufe kann 65 Prozent aktivieren: zwei Aufwärmintervalle, dann zwölf Intervalle mit Median über 32 ms und zusammen mindestens 350 ms. Bei sehr langsamer Fahrt genügen mindestens vier Intervalle mit Median über 50 ms und zusammen mindestens 400 ms. Jeder tatsächliche Stufenwechsel verwirft die alte Messreihe. Ruhe stellt nach 220 ms die volle Basisauflösung her; die gelernte Bewegungsstufe bleibt bis zu einem echten Resize gespeichert. Kein Wechsel nach oben während laufender Fahrt, kein zusätzlicher Dauerloop oder GPU-Profiler im Produktionsbetrieb.

DEV `?resolution=reference` bildet die bisherige einstufige Automatik ab. Ohne Parameter und im Produktionsbuild gilt die neue Automatik. Die feste 80-Prozent-Vergleichsstufe `resolution=reduced` bleibt unverändert.

## Browsermessung

Intel UHD Graphics P630, ANGLE/D3D11, Three.js 0.183.2, Entwicklungsvorschau 5192. CSS 2560 × 1440, tatsächlicher DPR ≈ 1, Basisbuffer 2560 × 1440. Normale CPU-Leistung. Gesamtzeitmodus `?timing`, keine Passmessung oder Konsolenprofiler während Messfahrten.

ABBA-Blöcke mit frischem Laden und jeweils einer ausgeschlossenen Aufwärmrunde, dann zwei ausgewerteten echten Portfolio-Hin-/Rückfahrten. Je vier Runden pro Variante. Acht ausgewertete Runden mit insgesamt 1147 gültigen GPU-Queries, keine Fehler, Disjoint-Ereignisse, verworfenen oder offenen Queries. Davon 1107 tatsächlich bewegte Frames.

| Messgröße | Bisherige Automatik | Zusätzliche Stufe |
| --- | ---: | ---: |
| Bewegungsbuffer nach Warmup | 2048 × 1152 | 1664 × 936 |
| Bewegte Frames | 505 | 602 |
| Gültige Bildabstände | 497 | 594 |
| Berechnete Renderkadenz | 31,28/s | 37,39/s |
| GPU-Median | 30,61 ms | 23,06 ms |
| GPU-Mittelwert | 28,19 ms | 21,58 ms |
| CPU-Submission, Median | 1,90 ms | 2,00 ms |
| P95 Bildabstand | 55,90 ms | 45,20 ms |

Damit rund 20 Prozent höhere berechnete Renderkadenz und rund 25 Prozent geringerer GPU-Median in dieser Ansicht. Die Kadenz ist 1000 geteilt durch den mittleren Abstand aufeinanderfolgender bewegter Renderstarts, keine Messung tatsächlich am Display präsentierter FPS. CPU-Zeit umfasst die Render-Submission, nicht sämtliche App-Arbeit. Kleine Stichprobe auf einem Rechner; kein allgemeines 60-FPS-Versprechen.

Einzelrunden, Kadenz / GPU-Median:

- Referenz A1: 31,83/s / 30,42 ms; A2: 31,64/s / 30,75 ms.
- Neue Stufe A1: 36,60/s / 24,45 ms; A2: 36,38/s / 23,98 ms.
- Neue Stufe B1: 38,77/s / 22,61 ms; B2: 37,81/s / 23,03 ms.
- Referenz B1: 30,00/s / 31,47 ms; B2: 31,66/s / 30,37 ms.

Die beiden neuen Warmups wechselten 2560 × 1440 → 2048 × 1152 → 1664 × 936. Alle ausgewerteten Bewegungsframes verwendeten anschließend die jeweilige gelernte Stufe; die Ruheansicht wurde wieder mit 2560 × 1440 gezeichnet.

## Darstellung und Funktion

- Ruhe-Screenshots nach identischer Rückfahrt sind bytegleich: beide JPEG 163403 Byte. Das ist ein Vergleich der aufgenommenen JPEGs, keine interne HDR-Buffer-Messung.
- Nach echtem Resize zurück auf CSS 1280 × 720/DPR 1,25 wurde neu gelernt. Warmup blieb bei 80 Prozent; während der folgenden Runde löste ein anhaltend langsamer Abschnitt auch hier 65 Prozent aus. Diese Runde enthielt 17 bewegte Frames bei 1280 × 720 und 189 bei 1040 × 585. Ein dauerhaft unverändertes 80-Prozent-Bild in kleineren Fenstern ist daher ausdrücklich nicht zugesagt.
- Bewegungsansicht im Browser mit beobachtetem 1040 × 585-Buffer kontrolliert: feine Konturen und 3D-Schriften vorübergehend weicher. Raumformen, Farben und Anordnung erhalten; HTML-Kopf-/Fußzeile scharf. Nach Abschluss wieder 1600 × 900.
- Anschließender Ruhetest: 0 neue Szenenframes in 3,005 Sekunden. Portfolio geöffnet und zum Hauptmenü zurückgekehrt. Keine Browserwarnungen oder -fehler.

## Prüfungen und Grenzen

20 gezielte neue Controller-/Budgettests und 24 historische Prüfungen gegen `reference` bestanden, einschließlich Bloom-Abständen bei 65 Prozent. Testskript und JSON mit Quellhash: `output/room-refined/performance-step9/audit-adaptive-stages.mjs` und `audit-adaptive-stages-results.json`. Unabhängiger Source-Review fand keine Blocker in Messfenstern, Timern, Restore, Load-Memory, Resize, Dispose oder DEV-Referenzauswahl.

TypeScript, Produktionsbuild mit statischer Sicherheitsprüfung für zehn Dokumente und `git diff --check` bestanden. Der Build meldet weiterhin die bekannten Kompressionsduplikat-/Bundlegrößenwarnungen. Entwicklungsprofiler und der frühere Lean-Shaderversuch sind nicht im gebauten JavaScript enthalten. Produktionsbrowser lokal auf 5193: App bereit, `__roomTiming` nicht vorhanden, keine Konsolenwarnungen/-fehler. Auch mit `resolution=reference` gilt dort wie vorgesehen die neue Automatik; beobachtete Größenfolge: 2560 × 1440 → 2048 × 1152 → 1664 × 936 → 2560 × 1440 → 1664 × 936 → 2560 × 1440. Temporäre Testtabs und Viewport-Override anschließend entfernt. Kein Commit oder Deployment; reguläre Vorschau auf 5192 bleibt verfügbar.

Die stärkere Reduktion ist ein bewusster Tausch von Bewegungsschärfe gegen geringere Grafiklast. Sie erkennt Bildabstände und kann CPU- von GPU-Engpässen nicht zuverlässig unterscheiden. CPU-bedingte lange Pausen oder Speicher-/Treiberprobleme sind dadurch nicht behoben. Die gespeicherte Stufe bleibt auch bei später leichteren Ansichten erhalten, um wiederholte Auflösungswechsel zu vermeiden. Volle Ruheauflösung bleibt stets das vorhandene, bereits durch Geräte- und Pixelbudgets begrenzte Basisniveau.
