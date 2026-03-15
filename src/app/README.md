# App

`app/` verbindet die Fachschichten und startet die Anwendung.

## Verantwortung

- Einstiegspunkt fuer Vite
- Zusammensetzen der Module
- Start der Szene und UI-Verkabelung
- Synchronisation zwischen Engine-Snapshot, Render-Schicht und UI
- Orchestrierung der Szenenmodi `board` und `combat`
- Orchestrierung der generischen Combat-Phasen `intro`, `attack`, `impact`, `resolve`, `return`
- Interaktionssperre waehrend Combat und saubere Rueckkehr zum normalen Spiel
- UI-seitige Ausloeser fuer Kamera-Reset und andere leichte Board-Inspect-Hilfen

## Nicht hier hinein

- keine Schachregeln
- keine tiefen Renderdetails
- keine Asset-spezifischen Sonderfaelle
- keine Combat-Regelentscheidungen oder Kamera-Autoritaet

## Naechster Ausbau

Die `Combat-State-Maschine`, ihre expliziten Combat-Phasen, die Verdrahtung der `Combat-Kamera`, die generische `Capture-Cinematic` und der Kamera-Reset fuer den Board-Inspect-Modus sind jetzt in dieser Schicht verankert. Der naechste konkrete Slice fuer `app/` sind figurtyp-spezifische Bewegungsprofile, waehrend `app/` weiter nur Presentation- und Camera-Zustaende orchestriert und `chess/` die Regelwahrheit behaelt.
