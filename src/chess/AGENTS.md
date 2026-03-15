# AGENTS.md

Scope: `src/chess/`

## Regeln fuer Codex

- Diese Schicht bleibt engine-zentriert und deterministic.
- Fuege keine Three.js-, DOM- oder UI-Verantwortung hinzu.
- Wenn State-Shape, Legal-Move-Fluss oder Mapping-Kontrakte geaendert werden, aktualisiere `README.md`, `MEMORY.md`, Root-`MEMORY.md` und bei Bedarf `ROADMAP.md`.
- Falls `chess.js` ersetzt oder erweitert wird, muss das explizit dokumentiert werden.
