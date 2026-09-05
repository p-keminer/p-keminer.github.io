# Portfolio - Philip Keminer

[![Live](https://img.shields.io/badge/Live-p--keminer.github.io-0d1117?style=flat&logo=github)](https://p-keminer.github.io)

Eine interaktive 3D-Portfolio-Website. Kein klassisches Layout - stattdessen ein begehbarer Arbeitsraum im Browser mit kinematischen Kamerafahrten, einem spielbaren Schachspiel und eigenstaendigen Monitorseiten fuer Portfolio, Leistungsnachweise und den kuenftigen Ueber-mich-Bereich.

---

## Tech Stack

**3D-Shell** - TypeScript · Three.js · chess.js · Vite · Blender  
**Monitorseiten** - HTML · CSS · JavaScript · responsive iframe-Einbettungen

---

## Features

- **Begehbarer 3D-Raum** - Blender-modellierter Cyberpunk-Arbeitsraum mit freier Kamerasteuerung und 3D-Hotspot-Navigation
- **Spielbares Schachspiel** - Lokales Zwei-Spieler-Schach mit vollstaendiger Regelvalidierung, Kampfsequenzen bei Schlagzuegen und prozeduralem Audio
- **Portfolio im Monitor** - Eigene videofreie Platzhalterseite mit direkter Kamerafahrt und vorbereitetem Projektraster
- **Leistungsnachweise im Monitor** - Eigene eingebettete Semesteransicht mit direkter Kamerafahrt, Platzhaltern und Vor-/Zurueck-Navigation
- **Ueber mich im Monitor** - Eigene videofreie Platzhalterseite mit direkter Fahrt in den rechten Monitor und Ruecknavigation zum Raum oder Hauptmenue
- **Zertifikatsvitrine** - Praesentation von Zertifikaten und Achievements
- **Custom Render-Pipeline** - HDR-Bloom (eigene GLSL-Shader), Schatten, Neon-Beleuchtung, ACES Tonemapping
- **Adaptive Performance** - Drei Geräteklassen mit angepassten Renderparametern, Ruhemodus für statische Raumansichten und bedarfsgerecht reduzierter Auflösung während Kamerafahrten; anschließend wieder volle Basisauflösung
- **Responsive** - Touch-Steuerung, Landscape-Lock auf Mobile, Tablet-Support

---

## Projektstruktur

```text
src/
  app/        Orchestrierung, Start Flow, Combat-State-Machine
  chess/      chess.js-Wrapper, Zustandstypen, Board-Mapping
  render/     Three.js-Szene, Bloom, Kamera, Figuren, Licht
  ui/         Steuerleiste, HUD, Overlays
  audio/      Web Audio API - synthetische Combat-Cues
  styles/     Globales CSS

public/portfolio-platzhalter/ Eigenstaendige Portfolio-Projektseite
public/comic-film/   Nicht verlinkter Legacy-Comic mit Szenenlogik, Timeline und Overlays
public/leistungsnachweise/ Eigenstaendige Semester- und Dokumentansicht
public/ueber-mich/   Eigenstaendige videofreie Platzhalterseite
public/horror-film/  Nicht verlinkter Legacy-Trailer mit eigenen Controls
public/models/       GLB-Assets (Raum, Brett, Figuren)
```

---

## Lokal starten

```bash
git clone https://github.com/p-keminer/p-keminer.github.io.git
cd p-keminer.github.io
npm install
npm run dev
```

Gesamtes Projekt vor dem Deploy pruefen:

```bash
npm run build
```

Die [Blender-zu-Three.js-Pipeline für die Raumverfeinerung](docs/room-refinement-workflow.md) beschreibt den separaten Geometrieexport, den passenden Lichtatlas, den AgX-Look und die lokalen Vergleichsansichten.

---
