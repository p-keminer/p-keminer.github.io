# Portfolio — Philip Keminer

[![Live](https://img.shields.io/badge/Live-p--keminer.github.io-0d1117?style=flat&logo=github)](https://p-keminer.github.io)

Eine interaktive 3D-Portfolio-Website. Kein klassisches Layout — stattdessen ein begehbarer Cyberpunk-Arbeitsraum im Browser mit kinematischen Kamerafahrten, einem spielbaren Schachspiel und einer eingebetteten React-App.

---

## Tech Stack

**3D-Shell** — TypeScript · Three.js · chess.js · Vite · Blender
**Portfolio** — React · Framer Motion · TypeScript · Vite

---

## Features

- **Begehbarer 3D-Raum** — Blender-modellierter Cyberpunk-Arbeitsraum mit freier Kamerasteuerung und 3D-Hotspot-Navigation
- **Spielbares Schachspiel** — Lokales Zwei-Spieler-Schach mit vollstaendiger Regelvalidierung, Kampfsequenzen bei Schlagzuegen und prozeduralem Audio
- **Eingebettetes Portfolio** — React-App mit Projektkarussell, eingebettet per iframe im Workbench-Monitor
- **Bilderrahmen-Galerie** — 8 interaktive Rahmen mit Einzelzoom fuer Leistungsnachweise
- **Zertifikatsvitrine** — Praesentation von Zertifikaten und Achievements
- **Custom Render-Pipeline** — HDR-Bloom (eigene GLSL-Shader), Schatten, Neon-Beleuchtung, ACES Tonemapping
- **Adaptive Performance** — Drei Device-Tiers (high/mid/low) mit angepassten Schatten, Bloom und Antialias
- **Responsive** — Touch-Steuerung, Landscape-Lock auf Mobile, Tablet-Support

---

## Projektstruktur

```
src/
  app/        Orchestrierung, Start Flow, Combat-State-Machine
  chess/      chess.js-Wrapper, Zustandstypen, Board-Mapping
  render/     Three.js-Szene, Bloom, Kamera, Figuren, Licht
  ui/         Steuerleiste, HUD, Overlays
  audio/      Web Audio API — synthetische Combat-Cues
  styles/     Globales CSS

portfolio-src/  React-Portfolio (eigenstaendige App)
public/models/  GLB-Assets (Raum, Brett, Figuren)
```

---

## Lokal starten

```bash
git clone https://github.com/p-keminer/p-keminer.github.io.git
cd p-keminer.github.io
npm install
npm run dev
```

Portfolio-App separat bauen (nach Aenderungen in `portfolio-src/`):

```bash
cd portfolio-src
npm install
npm run build    # Output → public/portfolio/
```

---
