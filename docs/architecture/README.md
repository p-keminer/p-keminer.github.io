# Architecture

Dieses Projekt ist entlang klarer Schichten geplant.

## Kernfluss

1. Input waehlt Figur oder Feld.
2. Schachlogik validiert Zug und Status.
3. Render-Schicht uebernimmt nur die visuelle Synchronisierung.
4. UI spiegelt Status, Historie und moegliche Aktionen.
5. Animationen kommen spaeter als eigene Darstellungsebene hinzu.

## Strikte Trennung

- Game State: autoritativer Spielzustand
- Render State: sichtbare Objekte im 3D-Raum
- Animation State: Uebergaenge, Tweening, Capture-Inszenierung

## Wichtige Kontrakte

- `squareToWorld(square)` bleibt die Bruecke zwischen Brettlogik und Szene.
- `src/chess/` kennt keine Renderdetails.
- `src/render/` erzwingt keine Regeln.
- `src/ui/` bleibt abhaengig vom aktuellen Zustand, aber nicht regelbestimmend.
