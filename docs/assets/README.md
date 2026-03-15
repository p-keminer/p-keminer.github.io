# Assets

Hier wird der geplante Blender- und GLB-Workflow dokumentiert.

## Ziel

Ein Brettmodell und sechs gut lesbare Figurentypen als wiederverwendbare GLB-Assets pflegen.

## Zentrale Dokumente

- `CYBER_MECH_FIGURE_DESIGN_SYSTEM.md` definiert Rollen, Silhouetten, Formmotive und Materiallogik fuer die sechs Figuren vor dem eigentlichen Blender-Blockout.
- `VISION_STYLE_BIBLE.md` macht die Einzelreferenzen unter `public/models/vision/` zur verbindlichen Stilbasis fuer die kommenden Blockout-Slices.
- `BLENDER_PIPELINE.md` beschreibt den technischen Blender- und Export-Workflow.
- `scripts/export_blockout_assets.py` erzeugt das erste parallele Review-Asset unter `public/models/blockout/`.

## Erwartungen

- stilisierte, klar lesbare Modelle
- referenzgebundene Familienkonsistenz
- saubere Skalierung
- sinnvoll gesetzte Pivots
- stabile Dateinamen fuer den Web-Loader

## Dateikonventionen

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
- `blender/bauer.blend`
- `blender/laeufer.blend`
- `blender/turm.blend`
- `blender/springer.blend`
- `blender/koenig.blend`

Wenn Dateinamen oder Exportkonventionen geaendert werden, muessen `public/models/README.md`, die Loader-Dokumentation und die Agent-Dateien mit aktualisiert werden.
