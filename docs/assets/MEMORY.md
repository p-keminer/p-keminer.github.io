# Assets Memory

## Aktueller Stand

- In Phase 1 werden noch keine finalen Blender-Assets vorausgesetzt.
- Ziel sind sechs wiederverwendbare Figurentypen plus ein Brettmodell.
- Farb- oder Materialunterschiede zwischen weiss und schwarz sollen nach Moeglichkeit im Web oder ueber flexible Materialien abgebildet werden.
- Vor dem naechsten Blender-Pass existiert jetzt ein eigenes Cyber-Mech-Figuren-Design-System als inhaltliche Grundlage fuer Blockouts.
- Die Bilder unter `public/models/vision/` gelten jetzt als feste Stilreferenzen fuer die naechsten Figuren-Prototypen.
- Ein paralleles Review-Set unter `public/models/blockout/` existiert jetzt fuer Pawn-first Blockouts.
- Die freigegebenen Review-Exporte liegen aktuell als `public/models/blockout/pawn.glb`, `public/models/blockout/bishop.glb`, `public/models/blockout/rook.glb`, `public/models/blockout/knight.glb` und `public/models/blockout/king.glb` vor.
- `public/models/blockout/pawn.glb` wird ueber `scripts/export_blockout_assets.py` erzeugt.
- `public/models/blockout/bishop.glb` basiert auf `docs/assets/blender/laeufer.blend`.
- `public/models/blockout/rook.glb` basiert auf `docs/assets/blender/turm.blend`.
- `public/models/blockout/knight.glb` basiert auf `docs/assets/blender/springer.blend`.
- `public/models/blockout/king.glb` basiert auf `docs/assets/blender/koenig.blend`.
- Verbindliche Projektquellen fuer freigegebene Blockouts liegen unter `docs/assets/blender/`, nicht nur auf dem Desktop.

## Merksaetze

- Lesbarkeit vor Detailtiefe.
- Dateinamen als stabile Loader-API behandeln.
- Jede Pivot- oder Scale-Aenderung dokumentieren.
- Erst Formensprache und Rollenlogik stabilisieren, dann finalere Blender-Modelle ausarbeiten.
- Referenzen zuerst festnageln, dann Blockouts bauen.
- Review-Blockouts muessen dieselbe Front-Achsen-Konvention fuer spaetere Combat-Lesbarkeit einhalten.
