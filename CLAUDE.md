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

## UI-Overlays und Kaesten

Jedes Overlay, Panel oder Kästchen muss robust umgesetzt werden:

1. **Hoehe nie fest** — immer relativ zum Viewport mit genuegend Reserveplatz fuer Buttons und Footer.
2. **Immer scrollbar** — `overflow-y: auto` auf dem Inhaltscontainer, damit langer Text nicht abgeschnitten wird.
3. **Mobile-first testen** — der kleinste Viewport (375px Breite) bestimmt die Constraints. Media-Query-Overrides muessen nach den Basis-Regeln stehen (CSS-Cascade).
4. **Klare Zonen ohne Ueberlappung** — Header-Zone oben, Content-Zone Mitte (scrollbar), Button-Zone unten, Footer-Zone ganz unten. Diese Bereiche duerfen sich nie gegenseitig verdecken.
5. **z-index Hierarchie einhalten** — interaktive Buttons immer ueber dekorativen Overlays.
6. **Kein `inset`-Shorthand** — explizite `top`/`right`/`bottom`/`left` verwenden, um Cascade-Konflikte mit Media Queries zu vermeiden.

## Uebergabequalitaet

- Halte TODOs, Risiken und neue Annahmen in `progress.md` fest.
- Hinterlasse keine stillschweigenden Strukturentscheidungen.
