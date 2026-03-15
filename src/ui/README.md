# UI

Die UI-Schicht macht den Spielzustand sichtbar und bedienbar.

## Verantwortung

- Turn-Anzeige
- Spielstatus und Game-over-Rueckmeldung
- Zugliste in SAN-Notation
- Capture-Anzeige
- Overlays und Hinweise
- Check- und Last-Move-Rueckmeldung
- Controls fuer Undo und Restart
- globaler Review-Toggle fuer das Figuren-Asset-Set `starter | blockout`

## Regeln

- UI besitzt nicht die Regelwahrheit
- UI darf Status visualisieren, aber keine eigene Regelmatrix pflegen
- neue Controls muessen dokumentiert werden
- Dev-Controls duerfen keine zweite Asset-Wahrheit einfuehren; sie schalten nur bestehende Loader-Pfade um
