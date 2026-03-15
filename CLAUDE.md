# CLAUDE.md

Diese Datei richtet sich an Claude Code und gilt projektweit, sofern in Unterordnern nichts Spezifischeres definiert ist.

## Arbeitsmodus

- Folge der vorhandenen Roadmap statt ad hoc neue Richtungen einzuschlagen.
- Bewahre die Trennung zwischen Schachlogik, Rendering, UI und Assets.
- Fuehre neue Komplexitaet erst ein, wenn die darunterliegende Phase stabil ist.
- Halte Dokumentation schlank und zweckgebunden.

## Verbindliche Dokumentationsupdates

- Code wird fuer die eigentliche Umsetzung angepasst.
- `README.md` nur dann aktualisieren, wenn sich das menschliche Verstaendnis eines Features oder Ordners aendert.
- `MEMORY.md` und `ROADMAP.md` nur dann aktualisieren, wenn sich Architektur oder Plan wirklich veraendern.
- `progress.md` fuer sinnvolle Arbeitsbloecke und Uebergaben pflegen.

## Projektregeln

1. Funktion vor Schoenheit.
2. Erst Platzhalter, dann Blender-Assets.
3. Keine Vermischung von Game State, Render State und Animation State.
4. `chess.js` bleibt der Startpunkt fuer legale Zuege und Spielstatus.
5. Blender MCP dient dem Asset-Workflow, nicht der Spiellogik.

## Erwartete Pflege je Ordner

- Wenn Dateinamen, Verantwortung oder API eines Ordners das menschliche Verstaendnis aendern, muessen dessen `README.md` und bei Bedarf `MEMORY.md` angepasst werden.
- Wenn ein neuer Unterordner entsteht, soll er nur dann eigene Doku bekommen, wenn er echte Verantwortung traegt.
- Wenn sich Prioritaeten aendern, muss `ROADMAP.md` mit aktualisiert werden.

## Uebergabequalitaet

- Halte TODOs, Risiken und neue Annahmen in `progress.md` fest.
- Hinterlasse keine stillschweigenden Strukturentscheidungen.
