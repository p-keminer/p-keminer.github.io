# Raum-Performance: Messung vom 05.09.2026

Die bestehende automatische Auflösungsregelung verbessert auf dem gemessenen Gerät die Bewegungskadenz um rund **23 %** und senkt die mediane GPU-Zeit um rund **27 %** gegenüber der aktuellen Darstellung mit voller Auflösung. Für die beiden jüngsten Optimierungen zusammen – statische Raum-Batches und kleineres Glas-Zusatzbild – ist bei voller Auflösung in diesem Test kein belastbarer Zeitvorteil nachgewiesen. Für die Messung wurde keine weitere Qualitätsänderung vorgenommen.

Gemessen wurde im integrierten Chromium-Browser mit **ANGLE, Intel UHD Graphics P630, Direct3D11**. Der CSS-Viewport betrug 1280 × 720 bei DPR 1,25. Volle Renderauflösung: 1600 × 900; Automatik während der gemessenen Bewegung: 1280 × 720, anschließend wieder 1600 × 900.

## Rendervergleich

Je Variante erfolgten nach einer Aufwärmrunde drei Portfolio-Hin-/Zurückrunden mit jeweils zwei Sekunden Kamerafahrt pro Richtung. Die Messung lief ohne `?profile`-Konsolenprotokolle. Die Referenz verwendet denselben verfeinerten Raum: ausschließlich `roomMerge=off`, `glass=reference` und volle Auflösung; sie ist **keine historische Originalversion**. Die [Messwerte je Runde](../output/room-refined/performance-step6/render-results.json) wurden in Gruppen aufgenommen: aktuell voll, Referenz voll, Automatik. Schwankungen durch Systemlast oder GPU-Takt sind möglich; die Automatik hatte ihre Auflösungsentscheidung bereits in der Aufwärmrunde gelernt.

| Variante | Bewegungs-Samples | CPU Median / P95, ms | GPU Median / P95, ms | GPU Mittel, ms |
|---|---:|---:|---:|---:|
| Referenz, voll | 457 | 2,2 / 10,0 | 22,26 / 39,65 | 21,03 |
| Aktuell, voll | 458 | 2,2 / 9,9 | 21,99 / 38,75 | 20,68 |
| Aktuell, automatisch | 560 | 2,2 / 9,6 | 16,10 / 27,45 | 14,81 |

| Variante | Bewegungskadenz, Render/s | Intervall Mittel / P95, ms |
|---|---:|---:|
| Referenz, voll | 37,71 | 26,52 / 44,9 |
| Aktuell, voll | 37,74 | 26,50 / 44,8 |
| Aktuell, automatisch | 46,52 | 21,49 / 32,9 |

Die Kadenz ist der Kehrwert des mittleren, ungekappten Abstands aufeinanderfolgender Bewegungsrenders. Sie misst **keine tatsächlich angezeigten Bildschirm-FPS**; Ruhephasen sind ausgeschlossen. P95 bezeichnet das 95. Perzentil.

GPU-Zeiten wurden mit `EXT_disjoint_timer_query_webgl2` asynchron über die gesamte Bloom-Renderfunktion einschließlich ihrer Szenenpässe erfasst. Alle **1.511 GPU-Abfragen** waren gültig: keine Fehler, Disjoint-Ergebnisse oder offenen Abfragen. Die CPU-Messung umfasst die Render-Submission, jedoch weder `scene.step` noch UI-Arbeit oder Resize. Sie ist deshalb keine Messung der gesamten CPU-Arbeit pro Frame.

Im anschließenden **3.012-ms-Ruhefenster entstanden null Szenenrenders**; die Auflösung war auf 1600 × 900 zurückgestellt.

## Lokaler Produktionsstart

Grundlage: [Lademesswerte](../output/room-refined/performance-step6/load-results.json), Produktionsbuild unter `http://127.0.0.1:5193/?timing`, ohne künstliche Drosselung. Drei Läufe je HTTP-Cache-Einstellung wurden abwechselnd durchgeführt. Browser-/GPU-Shadercaches wurden nicht geleert; „Cache aus“ bedeutet deshalb keinen vollständig kalten Rechnerstart.

| Messgröße, ms | HTTP-Cache aus: Median [Min–Max] | Cache an: Median [Min–Max] |
|---|---:|---:|
| Bedienbereit ab Navigation | 1.041,2 [1.028,6–1.182,2] | 1.163,7 [939,8–1.234,0] |
| Overlay entfernt ab Navigation | 1.632,8 [1.612,0–1.765,3] | 1.731,9 [1.522,8–1.817,2] |
| Assetvorbereitung, Dauer | 519,3 [505,0–561,1] | 597,4 [504,8–702,5] |
| Shader-Vorbereitung, Dauer | 266,5 [265,5–268,8] | 267,7 [264,4–272,7] |

Native `performance.mark`-Signale trennen Boot, Assets, Shader-Vorbereitung, Raum-Bereitschaft, Bedienbereitschaft und Overlay-Entfernung. Assetvorbereitung enthält Initialisierung, Download-Wartezeit, Dekodierung und Material-/Mesh-Aufbau. Die rund 267 ms Shader-Vorbereitung sind verstrichene `compileAsync`-Wartezeit, keine reine CPU-Zeit. Render plus zwei `requestAnimationFrame`-Callbacks bildet keine direkte GPU-Fertigstellungsschranke. Der Overlay-Fade erklärt einen weiteren Teil der sichtbaren Ladezeit.

Ohne HTTP-Cache wurden **6.483.280 Byte Ressourcen plus 11.537 Byte Hauptnavigation** übertragen. Der Lichtatlas mit 3.941.996 Byte entspricht rund **61 %** der 6.476.680 Byte kodierten Ressourceninhalte. Mit Cache wurden Ressourcen revalidiert: jeweils 300 Transfer-Byte pro entsprechender Anfrage bedeuten keinen erneuten vollständigen Body-Download. Gleichzeitige Download-Dauern dürfen nicht addiert werden. Die kleine Stichprobe belegt keinen Geschwindigkeitsnachteil des Caches.

## Grenzen und nächster Schritt

Diese Ergebnisse gelten für dieses Gerät, diesen Browser und diese Kamerafahrt. Es wurden weder GitHub Pages noch andere Geräte vermessen und nichts bereitgestellt. Startup-Marken sind mit `?timing` auch im Produktionsbuild verfügbar; GPU-Diagnose bleibt auf den Entwicklungsmodus beschränkt. Keine Speicherung oder Telemetrie.

Als Nächstes sollten einzelne GPU-Pässe, insbesondere Bloom, gezielt gegeneinander gemessen werden. Ein weiterer **ungeprüfter Startup-Kandidat** ist das spätere Laden des unsichtbaren Cyber-Bretts mit 114 Draco-Primitiven. Zuerst dessen tatsächlichen Zeitanteil nachweisen; aus Dateigröße oder Primitive-Anzahl allein folgt kein gesicherter Gewinn.
