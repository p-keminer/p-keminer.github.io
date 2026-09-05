# Belastungstest ohne Zweitgerät, 2026-09-05

Der Nutzer hat kein schwächeres Gerät. Die vorhandene Intel UHD Graphics P630 wurde deshalb mit CPU-Drosselung und größeren Renderflächen geprüft. Keine Quellcode-, Material-, Asset- oder Qualitätsänderung; die akzeptierte Automatik war während aller Tests aktiv.

## Verfahren

- Vite-Entwicklungsvorschau `http://127.0.0.1:5192/?v=12&timing`, Three.js 0.183.2, ANGLE/D3D11, WebGL2-Gesamtzeitmessung. Kein Passmodus und kein laufendes Profil-Logging.
- Je Runde dieselbe echte Portfolio-Hin-/Rückfahrt über die sichtbaren Buttons. Menü und Portfolio-Inhalt jeweils geprüft. Vier Konfigurationen mit je zwei ausgewerteten Runden; Aufwärmrunden ausgeschlossen. Normale Kontrollrunde vor und nach dem CPU-Block.
- CPU-Drosselung über CDP `Emulation.setCPUThrottlingRate`, Faktor 1 bzw. 4. Keine Drosselung des gesamten Windows-Systems.
- Standardviewport CSS 1280 × 720, DPR 1,25. Der Browser-Viewport-Override stellte bei 1920 × 1080 und 2560 × 1440 tatsächlich DPR ≈ 1 ein. Die Auswertung verwendet die beobachteten Renderbuffer, keine aus dem alten DPR geschätzten Größen.
- Die Bewegungspuffer blieben innerhalb jeder ausgewerteten Konfiguration konstant. Auflösung nach dem Aufwärmen bereits reduziert; nach tatsächlichem Resize lernte die Automatik erneut.

## Ergebnisse

| Konfiguration | Ruhebuffer | Bewegungsbuffer | Bewegungsframes | Renderkadenz¹ | CPU-Median² | GPU-Median | P95 Bildabstand |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Standard, CPU 1× | 1600 × 900 | 1280 × 720 | 382 | 47,61/s | 2,20 ms | 16,32 ms | 32,10 ms |
| Standard, CPU 4× | 1600 × 900 | 1280 × 720 | 249 | 32,11/s | 17,50 ms | 14,55 ms | 89,60 ms |
| CSS 1920 × 1080, CPU 1× | 1920 × 1080 | 1536 × 864 | 332 | 41,24/s | 2,00 ms | 20,79 ms | 38,70 ms |
| CSS 2560 × 1440, CPU 1× | 2560 × 1440 | 2048 × 1152 | 245 | 30,45/s | 2,00 ms | 31,89 ms | 61,50 ms |

¹ 1000 geteilt durch den Mittelwert gültiger Abstände zwischen aufeinanderfolgenden bewegten, kontinuierlichen Renderstarts. Keine Messung tatsächlich präsentierter Display-FPS. Zusammengefasste Samples beider Runden; die größeren Ansichten enthalten 1,44× bzw. 2,56× so viele Bewegungspixel wie die Standardansicht. Beide behielten das Seitenverhältnis 16:9; CSS-Größen können auch das DOM-Layout beeinflussen.

² CPU-Zeit umfasst die Render-Submission, nicht den gesamten Mainthread einschließlich Game/UI/Resize. CPU-Drosselung verändert auch Scheduling und die Zuführung der Grafikbefehle; GPU-Query-Zeiten unter Drosselung sind deshalb kein isolierter Vergleich der Grafikleistung.

Einzelrunden, jeweils Renderkadenz / CPU-Median / GPU-Median:

- Standard A: 47,71/s / 2,20 ms / 16,32 ms; B: 47,51/s / 2,30 ms / 16,23 ms.
- CPU 4× A: 27,46/s / 21,00 ms / 15,63 ms; B: 36,88/s / 15,00 ms / 13,67 ms. Die deutliche Streuung und lange Bildabstände gehören zum Ergebnis, kein stabiler 32-FPS-Betrieb zugesagt.
- 1920 A: 41,87/s / 2,00 ms / 20,48 ms; B: 40,61/s / 1,90 ms / 21,46 ms.
- 2560 A: 30,37/s / 2,10 ms / 32,86 ms; B: 30,52/s / 2,00 ms / 31,81 ms.

Alle 1252 Queries der acht ausgewerteten Runden gültig, keine Fehler, verworfenen/offenen Queries oder Disjoint-Ereignisse. Davon 1208 bewegte Frames und 1192 gültige Bildabstände. Die Warmups und eine separate Erholungsfahrt sind in diesen Zahlen nicht enthalten.

## Funktion und Erholung

Nach Rücksetzen des Viewports wurde noch einmal mit CPU 4× gefahren. Voller 1600 × 900-Buffer anschließend bestätigt. Danach Aufnahme ohne Interaktion: 0 neue Szenenframes in tatsächlich 4,875 Sekunden, Dokument sichtbar. Der auf 3 Sekunden angelegte Prüftimer wurde unter Drosselung verspätet ausgeführt; ausgewiesen ist die beobachtete Dauer. Keine Aussage, dass der komplette Browser oder andere Seitenprozesse keine Arbeit verrichteten.

Keine Konsolenwarnungen/-fehler im Testtab. Die abschließende Raumansicht wurde visuell geprüft. CPU auf Faktor 1 zurückgesetzt, Viewport-Override entfernt, temporären Testtab geschlossen; beide vorhandenen Nutzertabs erhalten. Der lokale Server bleibt verfügbar.

## Schlussfolgerung und Grenzen

Ein Zweitgerät ist für weitere gezielte Lasttests nicht erforderlich. Die vorhandene integrierte Grafik zeigt bereits einen relevanten Grenzfall: höhere Pixelzahl erhöht bei ähnlicher CPU-Submission deutlich die GPU-Zeit. Die bestehende Reduktion auf 80 % je Achse reicht bei der größeren Ansicht nicht für eine gleichmäßig schnelle Kamerafahrt.

Sinnvoller nächster A/B-Kandidat ist eine zusätzliche, stärker reduzierte Bewegungsauflösung bei anhaltend hoher Last, mit voller Schärfe im Stillstand. Diese Stufe ist noch nicht umgesetzt. Im CPU-lastigen Fall kann weniger Auflösung allein die langen Mainthread-Pausen nicht beheben; hierfür wäre bei Bedarf eine separate CPU-Profilierung sinnvoll.

Dies ist ein kurzer Belastungstest des vorhandenen Rechners, kein emuliertes bestimmtes Handy und kein vollständiger Geräte- oder Produktionsbenchmark. Speicherknappheit, mobile Treiber, andere GPU-Architekturen, lange thermische Belastung und langsames Netz sind nicht getestet. Die Grenzen der Geräteemulation beschreibt auch [ChromeDriver](https://developer.chrome.com/docs/chromedriver/mobile-emulation#mobile-emulation-versus-real-devices); zur CPU-Drosselung siehe [Chrome DevTools](https://developer.chrome.com/docs/devtools/settings/throttling/).
