# AGENTS.md

Scope: `src/render/`

## Regeln fuer Codex

- Diese Schicht rendert, sie regelt nicht.
- Halte Asset-Pfade, Modellnamen und Mapping dokumentiert.
- Wenn Kamera, Licht, Loader oder Mapping-Verhalten geaendert werden, aktualisiere `README.md`, `MEMORY.md` und bei Bedarf `docs/architecture/README.md`.
- Platzhalter-Meshes duerfen durch Assets ersetzt werden, aber nur ueber stabile Schnittstellen.
