# Source

Quellcode ist in fachliche Schichten getrennt, damit das Projekt erweiterbar bleibt.

## Schichten

- `app/` bootstrapped die Anwendung
- `chess/` verwaltet Spielzustand und Regellogik
- `render/` kapselt 3D-Szene und Asset-Integration
- `ui/` spiegelt HUD, Listen und Overlays
- `utils/` enthaelt kleine Hilfsfunktionen
- `styles/` enthaelt globale Styles

## Grundregel

Die Trennung zwischen Schach, Rendering und UI darf nicht verwischt werden.
