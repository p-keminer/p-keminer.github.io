# p-keminer.github.io

Persoenliches Portfolio mit React, Vite, TypeScript und Framer Motion.

Die Seite ist als interaktive Single-Page aufgebaut und kombiniert:

- ein 3D-Projektkarussell mit frei drehbarer Buehne
- eine isometrische Robotik-/Werkstatt-Szene im Hintergrund
- eine Mini-Spiel-Progression mit freischaltbaren Modulen
- eine sichtbare Assembly-/UFO-Sequenz als spaeteren Fortschrittszustand
- GitHub-Pages-Deployment per GitHub Actions

Live: [https://p-keminer.github.io](https://p-keminer.github.io)

## Ueberblick

Die Hauptseite ist bewusst kompakt gehalten:

- aktive Projektkarte im Vordergrund
- weitere Karten in einem ringfoermigen 3D-Layout
- Navigation per Drag und Punkt-Navigation
- klickbare Social-Badges oben rechts
- interaktive Szene im Hintergrund mit Robotern, Terminalen und Werkstattobjekten
- mobile Optimierungen fuer Szene, Modals und mehrere Mini-Spiele

## Aktuelle Mini-Spiele

Die Szene entwickelt sich ueber mehrere kleine Aufgaben weiter. Je nach Fortschritt werden weitere Interaktionen freigeschaltet.

Aktuell enthalten:

- **Laser-Rettung**
  Ein Reflexions-/Treffer-Minispiel rund um den verletzten Roboter.

- **Pruefschaltung**
  Ein SR-Latch-Puzzle mit frei verlegbaren Leitungen und Rueckkopplung.

- **SHA-256-Cracker**
  Ein Security-/Terminal-Raetsel mit Code-Luecken und Editor-Workflow.

- **WLAN-Security-Lab**
  Ein Router-Hardening-Minispiel mit Passwortstaerke und Sicherheitsoptionen.

- **Flugbahn-Kalibrierung**
  Ein mechanisches Wurf-/Traegheits-Minispiel mit parametrierter Flugbahn.

- **Greifarm-Sortierung**
  Ein Werkstatt-Minispiel zum Einsammeln und Sortieren von Schrottteilen.

- **Loet- und Schweiss-Technik**
  Ein zweistufiges Fertigungs-Modul fuer Schweiss- und Loetprozesse mit Desktop- und Mobile-Steuerung.

## Besondere Features

- **Assembly-Sequenz in der Szene**
  Nach spaeteren Fortschrittsschritten arbeitet die Werkstattszene sichtbar weiter und fuehrt eine eigene Assembly-/UFO-Sequenz aus.

- **Mobiler Spielbarkeits-Fokus**
  Mehrere Mini-Spiele nutzen mobile Zusatzsteuerungen, groessere Spielflaechen und kompaktere Modal-Layouts.

- **Repo-interner Playground**
  Unter `src/playground/` liegt ein eigener Playground mit DevPanel und Event-Bus fuer lokale Debug-/State-Experimente.
  Er ist bewusst im Repository enthalten, aber aktuell vom laufenden Website-Startpfad entkoppelt.

## Projektstruktur

```text
src/
  App.tsx
  main.tsx
  components/
    AnimatedBackground.tsx
    ChiptunePlayer.tsx
    PortfolioCarousel.tsx
    ProjectCard.tsx
    RobotScene.tsx
    assembly-sequence/
  data/
    projects.ts
  minispiele/
    flugbahn/
    greifarm/
    laserrettung/
    loetschweisstechnik/
    pruefschaltung/
    sha256cracker/
    wlan/
  playground/
    DevPanel.tsx
    bus.ts
  styles/
    global.css

public/
  ags_project-8-bit-219384.mp3

.github/workflows/
  deploy.yml
```

## Wichtige Dateien

- `src/App.tsx`
  Zentrale Layout- und State-Verwaltung fuer Seite, Szene, Freischaltungen und Modals.

- `src/components/RobotScene.tsx`
  Isometrische Szene mit Robotern, Animationen, Interaktionspunkten und Fortschrittsobjekten.

- `src/components/AnimatedBackground.tsx`
  Hintergrund-Layer, Signallinien, Farbverlaeufe, Szene-Integration und zusaetzliche visuelle Overlays.

- `src/components/assembly-sequence/*`
  Eigene Sequenzlogik fuer die spaetere Fertigungs-/UFO-Phase der Werkstatt.

- `src/components/PortfolioCarousel.tsx`
  3D-Karussell, Drag-Logik, Fokuskarte und Link-Badge.

- `src/data/projects.ts`
  Projektkarten-Daten. Neue Karten werden hier gepflegt.

- `src/minispiele/*`
  Modulare Mini-Spiele, jeweils in eigenen Unterordnern organisiert.

- `src/playground/*`
  Lokaler Playground fuer Debug-, State- und Szenen-Experimente; aktuell nicht in die Live-Seite eingebunden.

## Lokale Entwicklung

Abhaengigkeiten installieren:

```bash
npm install
```

Entwicklungsserver starten:

```bash
npm run dev
```

Build pruefen:

```bash
npm run build
```

Linting:

```bash
npm run lint
```

## Deployment auf GitHub Pages

Das Projekt ist fuer eine GitHub User Page gedacht.

Wichtig:

- Repository-Name: `<username>.github.io`
- Pages-Quelle in GitHub: `GitHub Actions`

Der enthaltene Workflow unter `.github/workflows/deploy.yml` baut und deployt die Seite automatisch bei jedem Push auf `main`.

Einmalige Einrichtung auf GitHub:

1. Repository `<username>.github.io` anlegen
2. Projekt nach `main` pushen
3. In GitHub `Settings -> Pages -> Source -> GitHub Actions` setzen

## Projektkarten bearbeiten

Datei:

- `src/data/projects.ts`

Dort werden Titel, Beschreibungen, Links, Cover-Typen und Tags gepflegt.

## Tech Stack

- React 19
- Vite
- TypeScript
- Framer Motion
- ESLint
- Web Audio API

## Lizenz

MIT. Siehe `LICENSE`.

---

## English Version

# p-keminer.github.io

Personal portfolio built with React, Vite, TypeScript, and Framer Motion.

The site is structured as an interactive single page and combines:

- a 3D project carousel with a freely rotatable stage
- an isometric robotics/workshop scene in the background
- a mini-game progression with unlockable modules
- a visible assembly / UFO sequence as a later progression state
- GitHub Pages deployment via GitHub Actions

Live: [https://p-keminer.github.io](https://p-keminer.github.io)

## Overview

The main page is intentionally kept compact:

- active project card in the foreground
- additional cards arranged in a ring-shaped 3D layout
- navigation via drag gestures and dot navigation
- clickable social badges in the top right corner
- interactive background scene with robots, terminals, and workshop objects
- mobile optimizations for the scene, modals, and several mini-games

## Current Mini-Games

The scene evolves through several small tasks. Depending on the player's progress, additional interactions are unlocked.

Currently included:

- **Laser Rescue**
  A reflex / target-hit mini-game centered around the injured robot.

- **Inspection Circuit**
  An SR latch puzzle with freely routed wires and feedback paths.

- **SHA-256 Cracker**
  A security / terminal puzzle with code gaps and an editor workflow.

- **WiFi Security Lab**
  A router hardening mini-game focused on password strength and security settings.

- **Trajectory Calibration**
  A mechanical throw / inertia mini-game with parameter-based trajectory tuning.

- **Grapple Arm Sorting**
  A workshop mini-game about collecting and sorting scrap parts.

- **Soldering and Welding Lab**
  A two-stage fabrication module for welding and soldering, including desktop and mobile controls.

## Special Features

- **Assembly Sequence Inside the Scene**
  After later progression steps, the workshop continues working visually and runs its own assembly / UFO sequence.

- **Mobile Playability Focus**
  Several mini-games use mobile helper controls, larger play areas, and more compact modal layouts.

- **Repository-Local Playground**
  `src/playground/` contains a dedicated playground with a dev panel and event bus for local debugging and state experiments.
  It intentionally remains part of the repository, but is currently decoupled from the live website start path.

## Project Structure

```text
src/
  App.tsx
  main.tsx
  components/
    AnimatedBackground.tsx
    ChiptunePlayer.tsx
    PortfolioCarousel.tsx
    ProjectCard.tsx
    RobotScene.tsx
    assembly-sequence/
  data/
    projects.ts
  minispiele/
    flugbahn/
    greifarm/
    laserrettung/
    loetschweisstechnik/
    pruefschaltung/
    sha256cracker/
    wlan/
  playground/
    DevPanel.tsx
    bus.ts
  styles/
    global.css

public/
  ags_project-8-bit-219384.mp3

.github/workflows/
  deploy.yml
```

## Important Files

- `src/App.tsx`
  Central layout and state management for the page, scene, unlocks, and modals.

- `src/components/RobotScene.tsx`
  Isometric scene with robots, animations, interaction points, and progression objects.

- `src/components/AnimatedBackground.tsx`
  Background layer, signal lines, gradients, scene integration, and additional visual overlays.

- `src/components/assembly-sequence/*`
  Dedicated sequence logic for the later fabrication / UFO phase of the workshop.

- `src/components/PortfolioCarousel.tsx`
  3D carousel, drag logic, focused card handling, and link badge.

- `src/data/projects.ts`
  Project card data. New cards are maintained here.

- `src/minispiele/*`
  Modular mini-games, each organized in its own subfolder.

- `src/playground/*`
  Local playground for debugging, state, and scene experiments; currently not mounted into the live site.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Verify the build:

```bash
npm run build
```

Linting:

```bash
npm run lint
```

## GitHub Pages Deployment

The project is intended for a GitHub user page.

Important:

- Repository name: `<username>.github.io`
- Pages source in GitHub: `GitHub Actions`

The workflow in `.github/workflows/deploy.yml` builds and deploys the site automatically on every push to `main`.

One-time setup on GitHub:

1. Create the repository `<username>.github.io`
2. Push the project to `main`
3. In GitHub, set `Settings -> Pages -> Source -> GitHub Actions`

## Editing Project Cards

File:

- `src/data/projects.ts`

This is where titles, descriptions, links, cover types, and tags are maintained.

## Tech Stack

- React 19
- Vite
- TypeScript
- Framer Motion
- ESLint
- Web Audio API

## License

MIT. See `LICENSE`.
