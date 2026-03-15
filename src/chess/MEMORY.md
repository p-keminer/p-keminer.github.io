# Chess Memory

## Festgehalten

- `chess.js` ist jetzt die einzige Regel- und Zustandsquelle fuer Brett, Turn und legale Zuege.
- Der Zustand muss serialisierbar und UI-unabhaengig bleiben.
- `squareToWorld` ist zwar fuer Rendering wichtig, darf aber als Brettkonzept sauber dokumentiert werden.

## Warnungen

- keine Renderobjekte im State halten
- keine visuellen Effekte als Regelstatus speichern
- keine zweite autoritative Piece-Liste neben `chess.js` pflegen
