# AGENTS.md

Scope: `src/app/`

## Regeln fuer Codex

- `app/` komponiert Module, statt Fachlogik zu absorbieren.
- Wenn App-Bootstrap oder Modulverdrahtung geaendert wird, aktualisiere `README.md`, `MEMORY.md` und bei Architekturfolgen auch die Root-Dokumentation.
- Halte die Grenzen zwischen App, Chess, Render und UI sichtbar.
