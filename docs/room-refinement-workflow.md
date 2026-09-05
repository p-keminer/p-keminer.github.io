# Raumverfeinerung: Blender bis Three.js

Die Verfeinerung erhält das bestehende Raumlayout und arbeitet an den Konturen von Lampen, Maus, Messgeräteknöpfen sowie Sitz- und Rückenpolster. Objektnamen, Elternbeziehungen, Positionen, Rotation, Pivots und die in Blender hinterlegten Materialwerte bleiben erhalten. Die geprüften Außenmaße von Maus und beiden Polstern sind unverändert. Die Three.js-Ansicht ist die maßgebliche Prüfung des Web-Ergebnisses; ein Blender-Vorschaubild allein genügt dafür nicht.

## Quelle und Ausgaben

Nach der Freigabe der neuen Proportionen wurde das Lichtprofil wärmer abgestimmt. `src/render/room-evening-profile.json` enthält die gemeinsame Konfiguration für Blender und die Echtzeitreflexe: eine breite Lichtquelle hinter der Übersichtskamera, zur Rückwand gerichtet, schwächeres Mondlicht und ein warmes Wandfülllicht. `scripts/apply_room_evening.py` wendet sie auf die getrennte Exportkopie an. Die Positionen der modellierten Gegenstände und ihre Materialfarben ändern sich dabei nicht.

Die vorderen Enden von Decke, beiden Seitenwänden und Boden werden in der Exportkopie bis Blender-Y = −10 (glTF-Z = +10) verlängert. Dadurch liegt die Übersichtskamera innerhalb der Raumhülle; die offenen Stirnseiten befinden sich hinter ihr, unabhängig vom Bildschirmformat. Kamera und Einrichtung behalten ihre bisherigen Positionen. Die Verlängerung erfolgt an den ursprünglichen planaren Flächen vor Bevel, UV1-Unwrap und Bake. So entsteht über der früheren Abschlusskante ein zusammenhängender Lichtverlauf. Ein nachträgliches Verlängern im Browser mit konstant fortgeführtem Randlicht erzeugt dort sichtbare helle Übergänge und wird deshalb nicht verwendet.

Auch `Preview_Wall_Wash` liegt hinter der Übersichtskamera bei Blender-Y = −8,7. Seine explizite Höhe von 0,9 m lässt rund 18 cm Abstand zur Deckenunterseite. Die zuvor vom Quellmodell übernommene Leuchtenhöhe schnitt die Decke und erzeugte dort eine harte Helligkeitsgrenze; auf der verlängerten Decke wurde dieser Bake-Fehler im Hochformat sichtbar. Lichtposition und -größe sind deshalb gemeinsam mit der Raumhülle zu prüfen.

Die lokale Quelle ist `docs/assets/blender/room-redesign-graybox.blend`. `scripts/refine_room_geometry.py` öffnet sie, verarbeitet die Szene im Arbeitsspeicher und schreibt eine separate `room-refined.blend` mit den exportierten Assets nach `output/room-refined/` beziehungsweise `--output-dir`. Quelle und Ziel-Blend dürfen nicht dieselbe Datei sein. Die Originaldatei und die bisherigen öffentlichen Raumassets werden nicht überschrieben.

Die `.blend`-Quellen unter `docs/assets/blender/` sowie das komplette `output/`-Verzeichnis sind in `.gitignore` ausgeschlossen. Die Quelle muss deshalb separat gesichert und für einen anderen Arbeitsplatz bereitgestellt werden; ein Git-Checkout allein enthält sie nicht. Für einen neuen Bake einen frischen Ausgabeordner verwenden. Die Bake-/LUT-Helfer schützen vorhandene Ausgaben teilweise ausdrücklich vor Überschreiben.

| Bestandteil | Aufgabe |
|---|---|
| `scripts/refine_room_geometry.py` | Quelle laden, Lampen verfeinern, Teilmodule aufrufen, Geometrie-/Transform-/Materialprüfungen, optional backen, separate Blend und Draco-GLB exportieren |
| `scripts/refine_room_seating.py` | Vorhandene Sitz- und Rückenpolster mit abgerundeter Kontur und leichter Sitzmulde ersetzen |
| `scripts/refine_room_equipment.py` | Mausgehäuse und bestehende, bereits gruppierte Geräteknöpfe abrunden |
| `scripts/extend_room_shell.py` | Vier vorhandene Hüllenteile nach vorn hinter die Kamera verlängern, vor UV1 und Bake |
| `scripts/refine_room_window.py` | Mond und Nachthimmel nach dem Bake außerhalb der Fensterlaibung platzieren; Übersichtprojektion des Mondes erhalten |
| `scripts/bake_room_lighting.py` | Modifier vor UV1-Auslegung auswerten, statische diffuse Beleuchtung in linearem HDR berechnen, entrauschen und als RGBM kodieren |
| `scripts/apply_room_evening.py` | Gemeinsames warmes Lichtprofil auf die Exportkopie anwenden |
| `scripts/export_blender_look.py` | Blenders tatsächliche AgX-Ausgabetransformation als LUT exportieren und mit neutralen Testwerten vergleichen |
| `scripts/publish_room_refinement.py` | Exportmetadaten prüfen, RGBM verlustfrei nach WebP konvertieren und das neue Assetset lokal übernehmen |

Die Geometriemodule markieren bearbeitete Objekte und überspringen sie bei einem erneuten Aufruf. Sie ergänzen keine Raumobjekte oder Materialien. Der Hauptlauf prüft unveränderte Objekttransformationen und Materialwerte und begrenzt den Dreieckszuwachs auf 15 Prozent.

## Reproduzierbarer lokaler Lauf

Die bisherigen Exporte wurden mit **Blender 5.2.0 LTS** erzeugt. Die Befehle werden im Repository-Stamm ausgeführt; `blender` muss im PATH liegen oder durch den Pfad zur lokalen Blender-Installation ersetzt werden.

Der bereits vorhandene vollständige Geometrie-/Bake-Lauf lautet:

```powershell
blender --background --python scripts/refine_room_geometry.py -- --bake --preview --source "docs/assets/blender/room-redesign-graybox.blend" --output-dir "output/room-refined/run-01"
```

`--source` und `--output-dir` sind optional. Ihre Vorgaben sind die oben genannten Quell- und Ausgabeordner. `--size` hat die Vorgabe `2048`, `--samples` die Vorgabe `64`. Ohne `--bake` entsteht ein Geometrievergleich mit den bisherigen Lightmap-UVs; ohne `--preview` entfällt das Blender-Vorschaurendering. Änderungen der Geometrie können bestehende gebackene Schatten leicht verändern, weshalb die Web-Fassung zusammen mit ihrem neu gebackenen Atlas geprüft wird.

Der Komfortlauf erzeugt zusätzlich die LUT und übernimmt die lokalen Webassets:

```powershell
blender --background --python scripts/refine_room_geometry.py -- --bake --publish --preview --output-dir "output/room-refined/run-02"
```

`--publish` erfordert `--bake`, konvertiert den RGBM-Atlas ohne Veränderung seiner RGBA-Werte nach WebP und übernimmt den zusammengehörigen neuen Assetstand nach `public/models/`. Dafür wird ein System-Python mit Pillow benötigt: `--asset-python` hat die Vorgabe `python` und kann einen konkreten Python-Pfad erhalten. Der Helfer dekodiert die erzeugte WebP erneut und vergleicht sämtliche RGBA-Bytes mit der Eingabe, bevor er die lokalen Webassets ersetzt. `--publish` bezeichnet ausschließlich diese lokale Dateiübernahme; es führt weder Git-Push noch Deployment aus.

Die LUT lässt sich auch separat in einen frischen Ordner exportieren:

```powershell
blender --background --python scripts/export_blender_look.py -- --output-dir "output/room-refined/look-01"
```

Für einen bereits vorhandenen vollständigen Export gibt es den separaten Übernahmehelfer:

```powershell
python scripts/publish_room_refinement.py --input-dir "output/room-refined/run-02"
```

Er erwartet dort `room-refined.glb`, `room-redesign-lightmap.png` mit gleichnamiger JSON-Metadatendatei und `look/room-agx-look.png`. Der beibehaltene PNG-Zwischenname bezeichnet hier den **neu erzeugten Atlas im Ausgabeordner**, nicht die alte öffentliche PNG. Mit `--lightmap` und `--look` können eine RGBM-Neukodierung desselben linearen Bake-Archivs beziehungsweise eine zuvor erzeugte LUT angegeben werden. Der Helfer prüft unter anderem RGBM-Kennung, HDR-Skalierung und LUT-Abmessungen; die Voraussetzung, dass GLB und Atlas aus demselben Bake stammen, gilt auch bei diesen Optionen.

## Zusammengehörige Webassets und Rückfall

Die neue Fassung besteht aus:

| Datei in `public/models/` | Bedeutung |
|---|---|
| `room-refined.glb` | Verfeinerte Geometrie, Materialwerte, Anker und die zum Bake gehörenden UV1-Koordinaten; enthält `room_lightmap_scale` |
| `room-refined-lightmap.webp` | Zum GLB passender RGBM-Lichtatlas |
| `room-agx-look.png` | Blender-AgX-LUT mit 64³ Stützstellen, als 4096 × 64 Pixel großes PNG gespeichert |

**GLB und Lichtatlas müssen immer aus demselben Bake stammen.** Der neue Bake packt UV1 für seine geeigneten statischen Flächen neu; UV0 bleibt für Oberflächentexturen verfügbar. Ein neuer Atlas darf deshalb nicht mit dem alten GLB und die alte `room-redesign-lightmap.png` nicht mit einem neu gepackten GLB kombiniert werden. Die LUT gehört zum verwendeten Blender-Look und wird mit der Web-Fassung bereitgestellt.

`src/render/loaders.ts` versucht nacheinander `room-refined.glb` und `room-redesign.glb`. `src/render/room-assets.ts` startet Modell, erwarteten Lichtatlas und optionale LUT parallel. Der tatsächlich verwendete Atlas richtet sich weiterhin nach den Metadaten des geladenen Modells. Falls der neue Atlas nicht geladen werden kann, verwirft die Runtime das verfeinerte Modell und lädt die bisherige Raumvariante mit ihrem zugehörigen Atlas. Die alte PNG wird dadurch nicht auf neu gepackte UV1-Koordinaten gelegt. Falls nur die LUT fehlt, bleibt die vorhandene AgX-Näherung aktiv. Die bereits entfernten Legacy-Modelle werden nicht mehr angefordert.

Die Szene übernimmt die zusammengehörigen Ressourcen erst nach Abschluss ihrer Downloads und wendet den Look vor der Freigabe des Raums an. Nicht benötigte oder nach einem Abbruch eintreffende Texturen werden entsorgt; jeder Atlas wird pro Ladevorgang höchstens einmal angefordert. `?room=original` startet direkt mit der alten Atlasvariante. Diese Ladeoptimierung verändert keine Assets, Materialwerte, Kamera- oder Renderqualität und verkürzt ausschließlich die serielle Wartekette; sie ist keine FPS-Optimierung.

Der Szenenloop in `src/render/demand-frame-loop.ts` fordert im ruhenden Menü und Raum keine weiteren Frames an. Eingaben, Resize, abgeschlossene Downloads und die vorhandenen Kamerasteuerungen wecken ihn über `markDirty` auf. Aktive Figuren- und Kampfkamerabewegungen laufen bis einschließlich ihres Abschlussbilds weiter; in der Schachansicht bleibt die Schleife für die bestehende Lichtdrift aktiv. Verdeckte Browser-Tabs pausieren den Szenenloop und erhalten beim Wiederanzeigen ein frisches Bild ohne aufaddierte Ruhezeit für Animationen. Die Raum- und Kampfabläufe in der App behalten ihre eigenen Zeitsteuerungen. Der Ruhemodus verändert keine Auflösung, Materialien oder Renderpässe. Die aktuell deaktivierten Schwebeanimationen der Figuren werden nicht als Daueranimation behandelt; bei einer späteren Reaktivierung müssen sie als weitere Animationsquelle berücksichtigt werden.

## Auflösung während Kamerabewegungen

`src/render/adaptive-resolution.ts` verwendet die volle Basisauflösung sowie zwei reduzierte Bewegungsstufen. Die Automatik beginnt mit der vollen Basisauflösung und beurteilt ausschließlich tatsächlich gerenderte Bewegungsbilder einer programmierten Kamerafahrt. Zwei Aufwärmintervalle bleiben unberücksichtigt. Acht Messintervalle mit einem Median über 26 ms erkennen eine langsame Fahrt; bei sehr langsamen Fahrten genügen vier Intervalle mit einem Median über 50 ms und zusammen mindestens 400 ms. Einzelne Ausreißer und spärliche Maus-/Mausradeingaben sollen die Einstufung nicht auslösen. Diese Bildabstände messen weder isolierte GPU-Zeit noch eine garantierte Bildrate.

Nach einer solchen Einstufung nutzt die Szene während Kamerabewegungen 80 Prozent der Basisbreite und -höhe, also ungefähr 36 Prozent weniger Renderpixel. Bleibt die Fahrt auch auf dieser Stufe anhaltend langsam, kann sie auf 65 Prozent sinken: zwölf neue Messintervalle mit Median über 32 ms und insgesamt mindestens 350 ms, alternativ die sehr langsame Vier-Intervall-Regel. Jeder Auflösungswechsel leert die Messreihe und beginnt mit neuen Aufwärmintervallen, auch beim Wiederaufnehmen einer Fahrt nach dem scharfen Ruhebild. Vollauflösungs- und Resize-Intervalle werden somit nicht zur Beurteilung der 80-Prozent-Stufe verwendet.

65 Prozent bedeuten weitere rund 34 Prozent weniger Pixel gegenüber der 80-Prozent-Stufe. Während einer Fahrt wird die Auflösung nur abgesenkt, nicht wiederholt erhöht und gesenkt. Nach 220 ms Bewegungsruhe wird einmal wieder die volle Basisauflösung gezeichnet. Die erkannte Bewegungsstufe bleibt für die aktuelle Fenstergröße gespeichert; ein echtes Resize beginnt die Bewertung neu. Die Einstufung kann deshalb auch in kleineren Fenstern greifen und bei später leichteren Fahrten erhalten bleiben. Der Ruhemodus benötigt für die Wiederherstellung nur einen Timer und keinen dauernden Szenenloop. Der [Browservergleich](room-adaptive-stages-2026-09-05.md) dokumentiert Gewinn und Grenzen.

Die Basisauflösung bleibt durch Geräte-DPR, Geräteklasse, Pixelbudget und tatsächliche GPU-Größenlimits begrenzt. Die Pixelbudgets betragen 4 Millionen (high), 2,5 Millionen (medium) und 1,5 Millionen (low). Die frühere DPR-Untergrenze von 0,75 konnte diese Budgets auf sehr großen Bildschirmen überschreiten und entfällt. Deshalb kann dort auch das ruhende Bild etwas weicher wirken. CSS-Oberfläche und Kameraprojektion behalten ihre Größe; die Implementierung trennt Anzeigegröße und Zeichenpuffer entsprechend dem [Three.js-Responsiveness-Handbuch](https://threejs.org/manual/en/responsive.html).

Der Größenwechsel passt nur die vorhandenen Renderziele an. Die Bloom-Abstände werden auf die Basisauflösung bezogen, damit der Leuchtradius beim Wechsel nicht größer wird. Es kommen keine zusätzlichen Renderpässe oder Asset-Texturen hinzu. Feine Konturen und Text im 3D-Raum werden während reduzierter Bewegung weicher, bei 65 Prozent stärker als bei 80 Prozent; die HTML-Navigation behält ihre Schärfe. Weniger Renderpixel bedeuten nicht proportional mehr FPS: Geometrie-, Draw-Call- und CPU-Aufwand bleiben bestehen. Insbesondere CPU-bedingte Pausen sind damit nicht automatisch gelöst.

## Statische Raumteile gemeinsam zeichnen

Nach dem Lichtatlas-, Monitor- und Zertifikatsmaterial-Setup fasst `src/render/room-static-batches.ts` geeignete Flächen des verfeinerten Raums zusammen. Das folgt dem [Three.js-Verfahren zum Zusammenführen statischer Geometrie](https://threejs.org/manual/en/optimize-lots-of-objects.html): mehrere Objekte mit derselben Materialinstanz benötigen anschließend nur einen Zeichenaufruf pro gemeinsamem Renderpass. Zusätzlich müssen Attributformate, Schatten- und Renderflags übereinstimmen. Ein 2,5-Meter-Raster im ursprünglichen X/Z-Raummaß trennt weiter entfernte Teile, damit nicht sämtliche Flächen eines Materials immer gemeinsam sichtbar werden.

Es werden ausschließlich effektiv sichtbare, statische, gebackene und undurchsichtige Leaf-Meshes zusammengefasst. Glas, Schachfiguren, Anker, Zertifikatsflächen, Hauptmonitore, ShaderMaterial, eigene Objekt-Rendercallbacks, Morphs und gespiegelte Transformationen bleiben separat. Die neue Geometrie übernimmt transformierte Positionen und Normalen aus Kopien; UV0/UV1 und Dreiecke werden weder vereinfacht noch neu berechnet. Texturen, Materialien, Farbmanagement und die adaptive Auflösung bleiben erhalten.

Die ursprünglichen Meshes bleiben unsichtbar in der Hierarchie, sodass Namen, Bounds und bestehender Ressourcenbesitz erhalten bleiben. Neue Batch-Geometrien werden separat entsorgt; ihr Controller darf keine gemeinsam genutzten Materialien, Texturen oder importierten Geometrien freigeben. Beim Rückbau stellt er die ursprüngliche Sichtbarkeit wieder her. Spätere Animationen einzelner Raumteile müssen diese ausdrücklich vom Zusammenfassen ausschließen. Diese Optimierung gilt nur für `room-refined.glb`; die bisherigen Fallbackmodelle behalten ihren eigenen Pfad.

Im geprüften Raum werden 147 Meshes zu 29 Batches zusammengefasst, also 118 weniger mögliche Zeichenaufrufe je betroffenem Pass. Die neuen Geometrien umfassen 1.982.292 Byte; ihre Quelldaten bleiben zusätzlich im CPU-Speicher verfügbar. Im Browservergleich der identischen Übersicht bei 1920 × 1080 Renderpixeln sinken die über alle Renderpässe gesammelten Aufrufe von 871 auf 635 (rund 27 Prozent). Die dabei gezählten Dreiecke bleiben bei 226.804, Texturen bei 16 und Shaderprogramme bei 27. Das sind Renderzähler, keine gemessenen FPS. In der Messgeräte-Nahansicht sinken die Aufrufe von 142 auf 102, während die mitgezeichneten Dreiecke durch die gröbere Sichtbarkeitsprüfung von 25.916 auf 38.640 steigen. Das räumliche Raster begrenzt diesen Effekt; diese Abwägung kann je nach Hardware unterschiedlich ausfallen.

## Kleineres Zusatzbild für Glas

Die Glasstufe setzt die öffentliche Three.js-Einstellung [transmissionResolutionScale](https://threejs.org/docs/pages/WebGLRenderer.html#transmissionResolutionScale) auf 0,35 für high und 0,25 für medium/low. Die vorherigen Werte waren 0,5 beziehungsweise 0,35. Das reduziert die Fläche des internen Transmission-Bilds um etwa 51 beziehungsweise 49 Prozent; die Hauptauflösung und die Bloom-Ziele ändern sich dadurch nicht. Die adaptive Auflösung skaliert weiterhin den Hauptpuffer, aus dessen Größe Three.js anschließend das Glasbild ableitet.

Der zusätzliche Szenenpass, seine Zeichenaufrufe und Dreiecke bleiben bestehen. Gespart werden Raster-, Resolve-, Mipmap- und Pufferspeicheraufwand dieses kleineren Bilds. Das interne MSAA bleibt unter Kontrolle von Three.js; Materialwerte, Glasgeometrie, Lichtprofil und Texturen werden nicht verändert. Die Durchsicht auf den Hintergrund kann bei nahen Glasflächen etwas weicher aussehen. Die prozentuale Pixelersparnis ist keine FPS-Messung und bezieht sich ausschließlich auf das Glasbild.

Bei 1920 × 1080 Hauptpixeln ergibt der high-Vergleich rechnerisch 960 × 540 gegenüber 672 × 378 Glaspixeln. Das Browserprofil bestätigt dafür weiterhin 635 Aufrufe, 226.804 Dreiecke, 16 Texturen und 27 Programme in der Raumübersicht. `glass=reference` stellt im Entwicklungsserver nur die vorherige Glasstufe wieder her; `transmissionScale` im Renderprofil zeigt den wirksamen Wert.

## Licht und Farbmanagement

Vor dem UV1-Unwrap müssen Solidify-, Bevel- und Normalen-Modifier bereits in der Bake-Kopie ausgewertet sein. Andernfalls teilen etwa Vorder- und Rückseite der Gardinen dieselben Texel und schreiben unterschiedlich beleuchtete Werte aufeinander. Mehr Samples können diesen Fehler nicht beheben. Die Gardinen verwenden ihre modellierten Falten ohne zusätzliche gekachelte Stoff-Normalmap; ihr ursprüngliches beiges Material bleibt erhalten.

Der Bake enthält direktes und indirektes **diffuses** Licht aus der bestehenden Blender-Szene. Transparente, lichtdurchlässige und selbstleuchtende Materialien werden als Bake-Empfänger ausgeschlossen. Für die Berechnung wird die diffuse Antwort ohne eingebackene Materialfarbe ermittelt; temporäre Materialänderungen werden anschließend zurückgesetzt. Das lineare EXR-Archiv erhält HDR-Werte ohne AgX, Kontrastlook oder eingebackene Belichtung.

Die aktuelle Sqrt-RGBM-Kodierung verteilt die HDR-Genauigkeit pro Pixel: RGB ist sRGB-kodiert, Alpha speichert die **Quadratwurzel des Multiplikators** als linearen Kanal, keine Deckkraft. Die Dekodierung lautet:

```text
lineare Lichtantwort = sRGBDecode(RGB) × Alpha² × room_lightmap_scale
```

Alpha darf weder verworfen noch zur Vormultiplikation der RGB-Werte verwendet werden. Der Browser lädt die neue Textur deshalb mit `createImageBitmap`, `premultiplyAlpha: 'none'` und ohne zusätzliche Farbkonvertierung. Die Three.js-Textur verwendet `SRGBColorSpace`; nur RGB wird dabei dekodiert, Alpha bleibt linear. Eine Bildoptimierung muss diese getrennte Bedeutung der Kanäle erhalten.

Blenders Bake liefert eine diffuse Antwort für eine weiße Oberfläche. Three.js erwartet in der Lightmap Bestrahlungsstärke und wendet im diffusen Materialterm selbst den Faktor `1 / π` an. Deshalb setzt die Runtime `lightMapIntensity = Math.PI * room_lightmap_scale` und multipliziert die dekodierten RGB-Werte zusätzlich mit Alpha². Auf gebackenen Flächen wird weiteres direktes und indirektes diffuses Echtzeitlicht unterdrückt, damit die Szene nicht doppelt beleuchtet wird. Blickabhängige Glanzreflexionen bleiben dynamisch.

Modell und Atlas deklarieren `RGBM-sqrt/sRGB8-alpha-linear` und `room_lightmap_multiplier_power = 2`. Die Runtime liest den Exponenten aus dem Modell; die frühere RGBM-Fassung mit Exponent 1 bleibt lesbar. Der Übernahmehelfer prüft Kodierung, Exponent und Skalierung gemeinsam. Die feineren Multiplikatorstufen beseitigen helle Konturlinien, die beim getrennten Filtern von RGB und Alpha an der alten Alpha-1→2-Grenze entstanden. Dafür genügt eine zusätzliche Multiplikation im bestehenden Shader; Texturauflösung und Renderpässe ändern sich nicht. Vorhandene lineare EXR-Archive können mit `bake_room_lighting.reencode_lightmap` ohne neuen Lichtlauf umkodiert werden.

Erst der abschließende Browser-Composite verarbeitet das lineare Bild mit der Blender-LUT. Sie enthält **AgX / Medium High Contrast, −0,2 EV und die sRGB-Ausgabe** bereits. Die LUT wird als numerische Textur mit `NoColorSpace`, linearem Filter und ohne Mipmaps geladen. Danach darf keine weitere Belichtung, Tonemapping- oder sRGB-Umwandlung folgen.

Für die abgestimmte Browseransicht steht im gemeinsamen Lichtprofil zusätzlich `browserDisplay`: −0,35 EV und lineare RGB-Gewichte `[0.94, 1.0, 1.25]` nehmen Helligkeit und Gelbstich etwas zurück. Diese Korrektur erfolgt **vor** der LUT auf dem linearen Gesamtbild und verändert weder Materialfarben noch den Lichtatlas. Sie benötigt keinen zusätzlichen Renderpass.

Diese Kombination überträgt statische globale Beleuchtung und den Blender-Look in den Browser. Sie ist kein pixelgleiches Pathtracing: Reflexionen, transparente Flächen, Echtzeitschatten, Atlasauflösung und Kameradarstellung können weiterhin abweichen.

Für breite Reflexe auf Glas und Metall übernimmt die Runtime zusätzlich Position, Orientierung, Größe und lineare Lichtfarbe von `Preview_Key` und `Preview_Decor_Lamp` als zwei `RectAreaLight`. Ihre Reflexstärken sind für die Echtzeitdarstellung abgestimmt. Sie benötigen keine zusätzlichen Schattenpässe; auf gebackenen Materialien bleibt ihr diffuser Anteil unterdrückt. Zusammen mit Spiellicht und schwachem Fülllicht sind vier Lichtquellen aktiv. Die Glashülle übernimmt außerdem Blenders `visible_shadow=false`.

## Prüfen im Entwicklungsserver

Nach `npm run dev` können die folgenden Query-Parameter an die angezeigte lokale Adresse angehängt und kombiniert werden. Sie sind ausschließlich unter `import.meta.env.DEV` aktiv:

| Parameter | Wirkung |
|---|---|
| `?room=original` | Überspringt die verfeinerte Fassung und lädt die bisherige Raumvariante |
| `?inspect=chair` | Reproduzierbare Nahansicht des Stuhls |
| `?inspect=lamp` | Nahansicht der linken Dekorlampe |
| `?inspect=mouse` | Nahansicht der Maus |
| `?inspect=instruments` | Nahansicht der Messgeräte |
| `?inspect=curtains` | Ansicht der Gardinen für UV-/Lichtkontrolle |
| `?profile` | Protokolliert Renderaufrufe, Dreiecke, Texturen, Programme, Renderauflösung und beim Einschlafen den CPU-Schrittzähler als `[room idle]` in der Browserkonsole |
| `?resolution=full` | Feste Basisauflösung ohne bewegungsabhängige Reduzierung; Pixelbudget bleibt aktiv |
| `?resolution=reference` | DEV-Vergleich: bisherige Automatik mit ausschließlich 80 Prozent als reduzierter Stufe |
| `?resolution=motion` | Erzwingt die 80-Prozent-Stufe während jeder Kamerabewegung und stellt sie danach zurück; Vergleich auch auf schnellen Geräten |
| `?resolution=reduced` | Feste 80-Prozent-Stufe, auch im Stillstand, für einen direkten Bildvergleich |
| `?roomMerge=off` | Zeichnet die verfeinerte Raumgeometrie zum Vergleich wieder als einzelne Meshes |
| `?glass=reference` | Vorherige Auflösung des Glas-Zusatzbilds, bei sonst gleichen Einstellungen |
| `?timing` | DEV: CPU-/GPU-Zeiten im Speicher über `window.__roomTiming`; zusätzlich native Startzeitmarken, auch im Produktionsbuild |
| `?timing=passes` | DEV: nicht überlappende GPU-Segmente für Hauptszene, Transmission, Bloom-Schwelle, beide Unschärfepässe und Composite |
| `?bakedShader=lean` | Nur DEV-A/B: entfernt zwei später verworfene direkte Diffuse-Beiträge aus gebackenen Materialklonen; kein nachgewiesener Zeitgewinn, daher kein Standard |

Beispiel für dieselbe Ansicht im Original: `?room=original&inspect=chair&profile`. Ohne `resolution`-Parameter gilt die Automatik, ebenso im Produktionsbuild. Mit `?profile` protokollieren `[room resolution]` und `[room buffer]` zusätzlich Stufenwechsel und tatsächliche Puffergrößen. `[room batches]` beschreibt die zusammengefasste Geometrie. `[room ready render]` sowie das Feld `render` in `[room idle]` zeigen die letzten vollständigen Renderzähler auch ohne Daueranimation. Die übrigen Profilwerte werden über die Renderpässe gesammelt und alle 60 gerenderten Frames ausgegeben. Sie sind keine FPS-Messung. Für Bild- oder Leistungsvergleiche dieselbe Kamera, Fenstergröße und Geräteklasse verwenden; etwa `?resolution=full&roomMerge=off&profile` gegenüber `?resolution=full&profile`.

## Nachgewiesene Prüfungen und Grenzen

Für Zeitmessungen `?timing` ohne `?profile` verwenden: dessen Konsolenlogging kann die Bewegungskadenz beeinflussen. `window.__roomTiming.reset('runde')` startet eine Messrunde, `stop()` beendet die Aufnahme, `snapshot()` liefert Rohsamples und Status. Ausstehende GPU-Ergebnisse werden ohne neue Szenenbilder abgeholt; erst bei `counts.pending === 0` auswerten. Ungültige oder nicht unterstützte GPU-Zeiten bleiben `null`. CPU-Zeiten erfassen nur die Render-Submission, Bildabstände nur aufeinanderfolgende programmierte Bewegungsframes. Für belastbare Vergleiche denselben Weg vorwärmen und pro Einstellung mehrfach hin- und zurückfahren. Maximal 2.000 Samples und 32 ausstehende GPU-Queries; nach Abschluss die normale URL ohne Diagnoseparameter laden.

Die nativen `portfolio:*`-Zeitmarken trennen Boot, Asset-Vorbereitung, Shader-Warmup, Raum-Ready, App-Ready und die Entfernung des Ladefensters. Sie werden nur mit `?timing` gesetzt und verwenden weder Speicherung noch Telemetrie. Der GPU-Profiler wird aus dem Produktionsbuild entfernt. Messergebnisse und Grenzen stehen in [der Messung vom 5. September 2026](room-performance-measurement-2026-09-05.md).

Mit `?timing=passes` ersetzt die Segmentmessung die Gesamtquery. `frameId` verbindet alle Segmente eines Bilds; zwei `scene`-Segmente vor und nach dem Glasdurchlauf müssen addiert werden. `intervalMs` bleibt in diesem Modus leer, damit Passabstände nicht als Bildrate erscheinen. Das Limit zählt 2.000 Segmente, daher jede Hin-/Rückrunde einzeln aufnehmen. Bis zu 128 GPU-Queries dürfen auf ihr Ergebnis warten (Gesamtmodus weiterhin 32). Nur vollständig und fehlerfrei abgeholte Frames auswerten.

Die Transmission-Grenze ist eine reine DEV-Diagnose für den installierten Three.js-Renderer 0.183.2: Während des Renderaufrufs erkennt ein temporärer `setRenderTarget`-Wrapper dessen multisampelndes Mipmap-Ziel und beendet das Segment vor dem Zurückbinden des Hauptziels. Resolve und Mipmap-Erzeugung liegen darin; Zielgrößenänderungen davor gehören zur Szenenvorphase. Die Funktion wird im `finally` wiederhergestellt, es werden keine Renderer-Interna oder Materialien verändert. Bei einem Three-Update muss diese Zuordnung erneut geprüft werden. Auswertung: [GPU-Passmessung](room-gpu-passes-2026-09-05.md).

Der Materialversuch `bakedShader=lean` ist auf gebackene Materialklone im Entwicklungsmodus begrenzt. Exakte Shader-Anweisungen und Includes werden vor dem Patch geprüft; bei Abweichungen bleibt die Referenzberechnung erhalten. Ein eigener Programm-Cache-Schlüssel trennt die Varianten. Die vorhandenen Reflexionen, Normalmaps, Schatten und die RGBM-Dekodierung bleiben erhalten. Vergleich: `?resolution=full&timing=passes` gegen dieselbe URL mit `&bakedShader=lean`. Der [A/B-Test](room-baked-shader-test-2026-09-05.md) fand identische Vergleichsscreenshots, aber keinen Zeitgewinn. Die Produktionsfassung verwendet weiterhin die Referenz.

Der unabhängige Vergleich des ersten **Geometrieexports vor dem neuen Bake** mit `public/models/room-redesign.glb` ergab:

- 42.194 → **44.298 Dreiecke**, also **+2.104 / +4,99 %**.
- Unverändert 277 Knoten, 253 Meshes, 255 Primitive und 38 Materialien. Primitive sind keine gemessenen Draw Calls.
- Identische Knotennamen, Hierarchie, Transformationen und exportierte Materialfaktoren; genau 25 erwartete Meshes verändert. Die übrigen 228 komprimierten Geometrieblöcke waren byteidentisch.
- Die bisherigen zwölf UV1-Geometrieblöcke waren byteidentisch. Diese Aussage gilt für den Geometrievergleich; der anschließende neue Bake ersetzt die Atlasbelegung ausdrücklich.
- Gültige, normierte dekodierte Normalen. Maus und beide Polster hatten vor und nach der Änderung exakt dieselben lokalen Bounding-Boxen.

Der exportierte 64³-Look wurde gegen 16 neutrale Blender-Testwerte geprüft. Die größte gemessene Abweichung lag bei etwa **0,734 einer sRGB8-Kanalstufe**. Das prüft den LUT-Transfer, nicht die Übereinstimmung des gesamten gerenderten Raums.

Die Assetkombination wurde in Three.js in der Übersicht und den vier Nahansichten geprüft. Grobe Farbbänder der ersten HDR-Kodierung wurden durch RGBM beseitigt. Sichtbare Rundungen und Stoffflächen wurden kontrolliert; die separaten Maustasten behalten ihre ursprüngliche Form. In sehr nahen Ansichten ist die endliche Atlasauflösung weiterhin erkennbar. Glas- und Displayreflexe bleiben eine Echtzeitnäherung.

PNG und verlustfreies WebP haben nach Dekodierung identische RGBA-Bytes. Die drei aktuellen Raumassets mit Sqrt-RGBM und korrigiertem Fensterhintergrund umfassen 4.779.145 Byte gegenüber 4.854.417 Byte für bisheriges Raum-GLB und PNG (rund 1,6 % weniger; übriges JavaScript und andere Seitenassets nicht eingerechnet). Die genauere Multiplikatorkodierung erhöht den Download gegenüber der vorherigen RGBM-Fassung um rund 1,2 MB; Texturauflösung und GPU-Speicherbedarf bleiben gleich. TypeScript, Python-Syntax, Asset-Paarfallback und Abbruch/Entsorgung wurden geprüft. Es gibt keine FPS-Zusage für unbekannte Hardware.

Der Gardinen-Bake vor der Raumverlängerung wurde mit 64 Samples bei 2048² erzeugt. Gegenüber der freigegebenen ersten Verfeinerung stimmen Knoten, Transformationen, Materialwerte, sämtliche exportierten Außenmaße und alle 44.298 Dreiecke überein. Die Gardinen-Vorder-/Rückseiten teilen im geprüften UV-Layout keine Texel mehr. Der warme Beigeton und das Verschwinden der fleckigen Streifen wurden anschließend in der Three.js-Nahansicht kontrolliert.

Die anschließende Raumverlängerung mit Lichtprofil 3 verwendet ebenfalls 64 Samples bei 2048². Ihr GLB-Vergleich bestätigt unveränderte Knoten, Objekttransformationen, Materialwerte und weiterhin 44.298 Dreiecke; nur die Außenmaße der vier vorgesehenen Hüllenteile ändern sich. Zusätzliche Runtime-Geometrie oder Texturen entstehen nicht. Die verlängerten Flächen teilen sich den bestehenden Atlas, weshalb seine Detailauflösung in Nahansichten weiterhin begrenzt bleibt.

Bei der späteren Fensterkorrektur werden zusätzlich nur die Geometrien von Mond, Sternen und Nachthimmel versetzt. Der Mond liegt mindestens 14,9 cm außerhalb der äußeren Wandfläche; seine Eckpunkte bleiben aus der Übersicht auf denselben Projektionsstrahlen. Der Hintergrund liegt vollständig hinter dem Mond und deckt die Fensteröffnung auch bei schräger Ansicht. Die drei emissiven Objekte sind keine Atlas-Empfänger. Die Korrektur wird nach dem Bake angewendet und verwendet dessen bestehenden indirekten Lichtbeitrag; UV-Koordinaten, Materialwerte, Objektmatrizen und Dreieckszahl bleiben erhalten. Ein neuer Bake aus einer bereits korrigierten Arbeitskopie kann deshalb geringfügig andere indirekte Fensterbeleuchtung liefern als der dokumentierte Lauf aus der Originalquelle.

Das bestehende EXR wurde ohne neuen Bake in Sqrt-RGBM umkodiert. An der zuvor sichtbaren welligen Wandlinie sank der gemessene Filterfehler von +12,75 % auf −0,16 %. Modell und Atlas erhalten gemeinsam Cacheversion 6.
