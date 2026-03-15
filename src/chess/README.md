# Chess

Diese Schicht ist die Wahrheitsquelle fuer Spielregeln und Brettzustand.

## Verantwortung

- Anbindung an `chess.js` als Regel- und Zustandsautoritaet
- Board-State und abgeleitete Piece-Belegung
- Zugvalidierung
- Spielstatus, Result-Texte, Last-Move-Metadaten, Captures und Check-State
- Capture-Metadaten fuer Presentation- und spaetere Combat-Schichten
- Mapping-Konzepte aus Schachsicht

## Regeln

- keine Three.js-Importe
- keine DOM- oder UI-Abhaengigkeiten
- keine Asset-Logik
- Combat darf nur aus Capture-Metadaten gespeist werden
- Zug-Commit und Regelstatus duerfen nie auf Animationsende warten

## Dateien

- `engine.ts` fuer den `chess.js`-Adapter und Zugfluss
- `moves.ts` fuer Move-Utilities
- `state.ts` fuer State-Typen und Snapshots
- `mapping.ts` fuer Feld-Mapping aus Spielsicht

## Naechster Ausbau

Die `Combat-State-Maschine` nutzt jetzt Capture-Metadaten aus dieser Schicht. Der naechste konkrete Slice im Gesamtprojekt ist die `Combat-Kamera`; diese Schicht liefert weiterhin nur Metadaten wie `attacker`, `victim`, `from`, `to` und `capturedSquare`, aber keine Kamera- oder Praesentationslogik.
