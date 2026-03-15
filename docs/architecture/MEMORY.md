# Architecture Memory

## Festgehaltene Entscheidungen

- Das Projekt wird zuerst als lokal spielbares Schach umgesetzt.
- Legalitaet der Zuege soll ueber `chess.js` laufen.
- Blender-Assets kommen erst nach stabiler Platzhalter-Phase.
- Mapping von Schachfeld zu Weltposition ist ein Kernvertrag.

## Architekturwarnungen

- Keine vermischte Zustandslogik zwischen Engine, Szene und Animation.
- Keine visuellen Spezialfaelle direkt in die Schachregel-Schicht einbauen.
- Keine Asset-Abhaengigkeit in Phase 1 erzwingen.
