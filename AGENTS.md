# AGENTS.md

Diese Anweisungen gelten fuer Codex im gesamten Projekt, sofern in Unterordnern nichts Spezifischeres steht.

## Pflichtlektuere vor groesseren Aenderungen

Lies zuerst:

- `README.md`
- `ROADMAP.md`
- `MEMORY.md`
- `progress.md`
- das lokale `README.md` des Zielordners
- das lokale `MEMORY.md` des Zielordners, falls vorhanden

## Nicht verhandelbare Regeln

1. Halte dich an die Roadmap-Reihenfolge, ausser der Nutzer priorisiert bewusst um.
2. Behandle `chess.js` als Regelinstanz, nicht die Rendering-Schicht.
3. Vermische niemals Game State, Render State und Animation State.
4. Starte Features mit funktionalen Platzhaltern, bevor du sie optisch veredelst.
5. Dokumentiere nur dann, wenn sich menschliches Verstaendnis, Architektur oder Plan wirklich aendern.

## Dokumentationspflicht

- Code wird fuer die eigentliche Umsetzung angepasst.
- `README.md` wird nur aktualisiert, wenn sich das menschliche Verstaendnis eines Ordners oder Features aendert.
- `MEMORY.md` und `ROADMAP.md` werden nur angepasst, wenn sich Architekturentscheidungen oder die Umsetzungsplanung veraendern.
- `progress.md` wird nach sinnvollen Arbeitsbloecken aktualisiert.

## Modulgrenzen

- `src/chess/` darf keine Three.js-, DOM- oder UI-Verantwortung uebernehmen.
- `src/render/` darf keine Schachregeln zur Wahrheitsquelle machen.
- `src/ui/` darf Regeln nicht duplizieren, sondern nur Zustand und Aktionen spiegeln.
- `public/models/` muss mit dokumentierten Dateinamen, Pivot- und Skalierungskonventionen arbeiten.

## Validierung

Wenn das Spiel implementiert wird:

- halte die Web-Game-Schritte klein und iterativ
- fuehre Browser-Checks fuer sinnvolle UI- und Rendering-Aenderungen aus
- dokumentiere neue Testoberflaechen nur, wenn sie den Testablauf erweitern

## Uebergaben

Am Ende jedes relevanten Arbeitsblocks:

- `progress.md` aktualisieren
- offene Risiken oder TODOs notieren
- keine impliziten Architekturentscheidungen undokumentiert lassen
