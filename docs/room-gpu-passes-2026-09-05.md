# Einzelmessung der GPU-Pässe, 05.09.2026

**Der Hauptszenenpass ist der größte gemessene Kostenblock.** Der eigentliche Bloom-Lichtschein belegt nur rund 3 % der segmentiert gemessenen GPU-Zeit. Für diese Messung wurden weder Qualität noch Assets, Materialien, Lichtparameter oder Kamera verändert.

## Ergebnis

Gemessen auf Intel UHD Graphics P630 über ANGLE/Direct3D11 im integrierten Chromium-Browser. CSS 1280 × 720, DPR 1,25. Pro Einstellung eine Aufwärmrunde und drei echte Portfolio-Hin-/Rückfahrten, zwei Sekunden je Richtung. Kein `?profile`-Logging.

| GPU-Pass | Voll 1600 × 900: Mittel, ms | Anteil | Automatik 1280 × 720: Mittel, ms | Anteil |
|---|---:|---:|---:|---:|
| Hauptszene ohne Transmission-Zusatzbild | 14,84 | 77,4 % | 11,28 | 76,6 % |
| Transmission-Zusatzbild inklusive Resolve/Mipmaps | 2,84 | 14,8 % | 2,43 | 16,5 % |
| Bloom: helle Pixel extrahieren | 0,37 | 1,9 % | 0,26 | 1,8 % |
| Bloom: horizontale Unschärfe | 0,11 | 0,6 % | 0,08 | 0,5 % |
| Bloom: vertikale Unschärfe | 0,10 | 0,5 % | 0,08 | 0,5 % |
| Zusammensetzen und AgX-Farbausgabe | 0,90 | 4,7 % | 0,61 | 4,1 % |
| Summe pro Bild | 19,17 | 100 % | 14,72 | 100 % |

Die drei Bloom-Pässe benötigen zusammen etwa **0,59 ms** bei voller beziehungsweise **0,42 ms** bei adaptiver Auflösung. Die abschließende Farbausgabe enthält zusätzlich die für den freigegebenen Look erforderliche AgX-Transformation; sie lässt sich nicht einfach mit dem Lichtschein abschalten.

Ausgewertet wurden **491 vollständige Bewegungsframes** bei voller und **579** bei adaptiver Auflösung. Alle **7.138 GPU-Segmente** der sechs Messrunden waren gültig; keine Fehler, Disjoint-Ergebnisse, ausgelassenen Queries oder offenen Ergebnisse. Das Transmission-Zusatzbild trat in 365/491 beziehungsweise 453/579 Bewegungsframes auf; fehlt es in einer Kameraposition, geht sein tatsächlicher fehlender Durchlauf mit null in den Mittelwert ein. Die sichtbaren Glasobjekte im abschließenden Hauptszenenbild gehören weiterhin zum Hauptpass.

[Messwerte einschließlich Einzelrunden und Kontrollmessungen](../output/room-refined/performance-step7/pass-results.json).

## Messgrenzen

`?timing=passes` misst nicht überlappende `EXT_disjoint_timer_query_webgl2`-Intervalle. Hauptszenen-Segmente vor und nach dem Transmission-Zusatzbild werden je `frameId` addiert. Die Gesamtframe-Query bleibt dabei aus; Queries dürfen nicht verschachtelt werden. Ausstehende Ergebnisse werden asynchron ohne `gl.finish` abgeholt. Ein anfänglicher Aufwärmversuch mit zu kleiner Query-Warteschlange wurde vollständig verworfen; alle berichteten Runden wurden nach neuem Warmup mit dem begrenzten 128-Query-Puffer aufgenommen.

Die Transmission-Grenze nutzt ausschließlich in DEV einen temporären Wrapper der öffentlichen `setRenderTarget`-Funktion. Die geprüfte Signatur gehört zur installierten Three-Version **0.183.2**. Resolve und Mipmap-Erzeugung einschließlich des optionalen zweiten Durchlaufs liegen innerhalb der Grenze. Eine Zielgrößenänderung davor gehört zur Szenenvorphase. Schatten-Neuberechnungen würden ebenfalls zur Hauptszene gehören; die geprüfte Portfolio-Fahrt regeneriert Schatten nicht fortlaufend. Der Original-Setter wird auch bei Fehlern wiederhergestellt.

Drei normale Gesamtmessungen vor der Segmentmessung ergaben im Mittel **21,56 ms**, drei anschließende Kontrollen **19,69 ms**, jeweils bei derselben vollen Auflösung. Die Segment-Summe liegt bei **19,17 ms**. Systemlast, GPU-Takt, Abfragegrenzen und unterschiedlich verteilte Kamerasamples können beitragen; diese Ursachen wurden nicht einzeln isoliert. Die stabilen Größenordnungen begründen die Priorität, jedoch keine präzise FPS- oder Einsparungszusage. Passabstände werden ausdrücklich nicht als Bildrate ausgegeben.

## Konsequenz für den nächsten Versuch

Den Bloom-Look zunächst beibehalten. Sein gemessenes Budget ist klein. Als nächsten begrenzten A/B-Versuch die Materialberechnung bereits gebackener Raumflächen untersuchen, mit gleicher Kamera, voller Vergleichsauflösung und Bildkontrolle.

Der Code verwendet dort weiterhin `MeshStandardMaterial`. Das gebackene diffuse Licht ersetzt die entsprechende Lichtantwort, direkte diffuse Beiträge werden nach der Lichtberechnung auf null gesetzt; Reflexionen, Normalmaps und Schatten bleiben aktiv. Ein konservativer Versuch könnte nur die anschließend verworfenen direkten Diffuse-Beiträge explizit entfernen. **Der Gewinn ist offen**, weil der Shader-Compiler diese Berechnung bereits eliminieren kann. Eine einfache Umstellung auf `MeshBasicMaterial` wäre keine optisch identische Alternative. Der gemessene Hauptpass-Anteil beweist noch keinen bestimmten Materialengpass.

Die Diagnose wird aus dem Produktionsbuild entfernt. TypeScript, sechs Wrapper-Lifecyclechecks, Produktionsbuild und statische Sicherheitsprüfung bestanden; keine Konsolenwarnungen oder -fehler während der gültigen Messrunden. Nach den Kontrollen: 3,009 Sekunden Stillstand, null neue Szenenbilder, 1600 × 900 Renderpuffer. Kein Deployment.
