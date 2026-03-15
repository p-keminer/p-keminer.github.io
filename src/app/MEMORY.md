# App Memory

## Startzustand

- `main.ts` bootet die aktuelle Spiel-App in den Root-Container.
- `game.ts` komponiert Engine-, Render- und UI-Schicht und bleibt fuer Praesentations-Orchestrierung zustaendig, nicht fuer Regeln.

## Spaeter wichtig

- Capture-Praesentationen werden in `app/` nur als Modus- und Phasenfluss orchestriert.
- `undo()` und `restart()` muessen Combat- und Cinematic-State sofort hart zuruecksetzen.
- Die Combat-Phasen `intro`, `attack`, `impact`, `resolve`, `return` sind jetzt App-getrieben und werden an Render und Kamera weitergereicht.
- Spaetere figurtyp-spezifische Bewegungsprofile sollen an denselben Flow andocken, ohne `chess.js` oder Render zur zweiten Wahrheitsquelle zu machen.
