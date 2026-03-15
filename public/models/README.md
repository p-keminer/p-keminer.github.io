# Models

Hier liegen die aus Blender exportierten GLB-Dateien fuer Brett und Figuren.

## Aktueller Stand

- `board.glb`, `king.glb`, `queen.glb`, `rook.glb`, `bishop.glb`, `knight.glb` und `pawn.glb` wurden lokal per Blender-CLI erzeugt.
- Der Export wird ueber `scripts/export_chess_assets.py` reproduzierbar erzeugt und kann spaeter durch manuell modellierte Blender-Assets ersetzt werden.
- Ein paralleles Review-Set unter `public/models/blockout/` wurde eingefuehrt; aktuell liegen dort `pawn.glb`, `bishop.glb`, `rook.glb`, `knight.glb` und `king.glb`.
- Review-Exporte kommen aktuell teils aus `scripts/export_blockout_assets.py` und teils direkt aus den gesicherten Blender-Projektquellen unter `docs/assets/blender/`.
- Die Web-App laedt diese Dateien asynchron und faellt pro Brett/Figurentyp auf Placeholder zurueck, falls ein Modell fehlt.
- Diese GLBs sind Starter-Assets fuer den funktionalen Kern und noch nicht die finalen thematischen Combat-Figuren.

## Erwartete Dateien

- `board.glb`
- `king.glb`
- `queen.glb`
- `rook.glb`
- `bishop.glb`
- `knight.glb`
- `pawn.glb`
- `blockout/pawn.glb`
- `blockout/bishop.glb`
- `blockout/rook.glb`
- `blockout/knight.glb`
- `blockout/king.glb`

## Konventionen

- gleiche Skalierungslogik fuer alle Figuren
- saubere Pivot-Punkte
- gut lesbare Silhouetten
- Materialstrategie fuer weiss und schwarz dokumentieren
- `starter`-Assets bleiben unter `/models/{piece}.glb`
- `blockout`-Review-Assets liegen unter `/models/blockout/{piece}.glb`
- fehlende Blockout-Dateien duerfen pro Typ auf Starter-GLBs zurueckfallen

## Themenpfad

Der aktuelle Stilpfad ist `Robotik/Cyber-Mech`.

Geplante spaetere Rollenbilder:

- Pawn als Scout bot
- Rook als Heavy Fortress mech
- Knight als agile Assault unit
- Bishop als Precision energy unit
- Queen als Elite combat android
- King als Command mech

Fuer die naechsten Slices gilt weiter:

- zuerst transform-based oder procedural animation
- noch kein Rig-Zwang fuer Brett oder Figuren
- finale thematische Blender-Modelle erst nach Combat-State-Maschine, Combat-Kamera und generischer Capture-Cinematic

## Naechster Ausbau

Die parallele `starter | blockout`-Review-Pipeline deckt jetzt `pawn`, `bishop`, `rook`, `knight` und `king` ab. Der naechste konkrete Asset-Slice ist der noch fehlende `queen`-Blockout. Die Blockout-Modelle bleiben bis dahin bewusst Review-Assets und muessen noch nicht auf finale Kampfchoreos oder rigged Clips festgelegt werden.

Wenn neue Modelle oder Namensaenderungen eingefuehrt werden, muessen `public/models/README.md`, `src/render/loaders.ts` und die lokalen Anweisungsdateien synchronisiert werden.
