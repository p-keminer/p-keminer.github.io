<a id="top"></a>

<div align="center">

[![Deutsch](https://img.shields.io/badge/🇩🇪_Deutsch-24292f?style=for-the-badge)](#deutsch)
[![English](https://img.shields.io/badge/🇬🇧_English-24292f?style=for-the-badge)](#english)

</div>

---

<a id="deutsch"></a>

<div align="center">

# Portfolio – Philip Keminer

Interaktive 3D-Portfolio-Website mit erkundbarem Arbeitsraum, eingebetteten
Projektseiten und spielbarem Schachbrett.

`TypeScript` · `Three.js` · `chess.js` · `Vite` · `Blender`

</div>

<div align="center">

[![Live-Seite](https://img.shields.io/badge/Live--Seite-24292f?style=for-the-badge)](https://p-keminer.github.io/)
[![Übersicht](https://img.shields.io/badge/%C3%9Cbersicht-24292f?style=for-the-badge)](#de-uebersicht)
[![Bereiche](https://img.shields.io/badge/Bereiche-24292f?style=for-the-badge)](#de-bereiche)
[![Technik](https://img.shields.io/badge/Technik-24292f?style=for-the-badge)](#de-technik)
[![Lokaler Start](https://img.shields.io/badge/Lokaler_Start-24292f?style=for-the-badge)](#de-lokaler-start)
[![Build](https://img.shields.io/badge/Build-24292f?style=for-the-badge)](#de-build)
[![Lizenz](https://img.shields.io/badge/Lizenz-24292f?style=for-the-badge)](#de-lizenz)

</div>

---

<a id="de-uebersicht"></a>

## Übersicht

Die Startseite verbindet einen modellierten 3D-Arbeitsraum mit vier direkt
erreichbaren Inhaltsbereichen. Kamerafahrten und Hotspots führen zu den
eingebetteten Seiten; das Schachbrett bleibt als eigenständige lokale
Zwei-Spieler-Anwendung nutzbar.

| Funktion | Umsetzung |
|---|---|
| 3D-Arbeitsraum | Kamerasteuerung, Hotspots, Licht, Bloom und geräteabhängige Qualitätsstufen |
| Schach | Zugprüfung mit `chess.js`, animierte Schlagzüge und synthetische Audioeffekte |
| Inhalte | Portfolio, Profil, Leistungsnachweise und Zertifikate als lokale Seiten |
| Bedienung | Maus-, Tastatur- und Touch-Unterstützung mit responsiver Oberfläche |

<a id="de-bereiche"></a>

## Bereiche

| Bereich | Inhalt | Direktlink |
|---|---|---|
| Portfolio | Übersicht der veröffentlichten Projekte | [Öffnen](https://p-keminer.github.io/portfolio/) |
| Über mich | Profil, Werdegang und technische Schwerpunkte | [Öffnen](https://p-keminer.github.io/ueber-mich/) |
| Leistungsnachweise | Semesterweise Darstellung der hinterlegten Dokumente | [Öffnen](https://p-keminer.github.io/leistungsnachweise/) |
| Zertifikate | Thematisch geordnete Kurs- und Zertifikatsnachweise | [Öffnen](https://p-keminer.github.io/zertifikate/) |

<a id="de-technik"></a>

## Technik

```text
src/
  app/       Anwendungsablauf und Zustandssteuerung
  audio/     Synthetische Audioeffekte
  chess/     Schachlogik und Board-Mapping
  render/    Three.js-Szene, Modelle, Licht und Kamera
  styles/    Globale Oberflächenstile
  ui/        Bedienelemente und rechtliche Hinweise

public/
  portfolio/            Projektübersicht
  ueber-mich/           Profilbereich
  leistungsnachweise/   Semester- und Dokumentansicht
  zertifikate/          Zertifikatsbereich
  models/               Aktive 3D-Modelle und Texturen
```

Alle Laufzeitressourcen werden lokal ausgeliefert. Der Produktionsbuild prüft
unter anderem Content Security Policies, lokale Assets, veröffentlichte
Dokumente, fehlende Tracker und den selbst gehosteten Draco-Decoder.

<a id="de-lokaler-start"></a>

## Lokaler Start

```bash
git clone https://github.com/p-keminer/p-keminer.github.io.git
cd p-keminer.github.io
npm ci
npm run dev
```

Vite stellt die lokale Entwicklungsumgebung bereit und zeigt die Adresse im
Terminal an.

<a id="de-build"></a>

## Build und Veröffentlichung

```bash
npm run build
npm run preview
```

`npm run build` führt den TypeScript-Check, den Vite-Produktionsbuild und die
statische Sicherheitsprüfung aus. Pushes auf `main` werden anschließend über
GitHub Actions auf GitHub Pages veröffentlicht.

<a id="de-lizenz"></a>

## Lizenz

Der Quellcode steht unter der [MIT-Lizenz](LICENSE). Eingebundene Schriftarten,
Bibliotheken, Modelle und weitere Drittinhalte behalten ihre jeweiligen
Lizenzen.

<div align="center">

[![Nach oben](https://img.shields.io/badge/⬆_Nach_oben-24292f?style=for-the-badge)](#top)

</div>

---

<a id="english"></a>

<div align="center">

# Portfolio – Philip Keminer

Interactive 3D portfolio website with an explorable workspace, embedded
project pages, and a playable chessboard.

`TypeScript` · `Three.js` · `chess.js` · `Vite` · `Blender`

</div>

<div align="center">

[![Live site](https://img.shields.io/badge/Live_site-24292f?style=for-the-badge)](https://p-keminer.github.io/)
[![Overview](https://img.shields.io/badge/Overview-24292f?style=for-the-badge)](#en-overview)
[![Sections](https://img.shields.io/badge/Sections-24292f?style=for-the-badge)](#en-sections)
[![Technology](https://img.shields.io/badge/Technology-24292f?style=for-the-badge)](#en-technology)
[![Local setup](https://img.shields.io/badge/Local_setup-24292f?style=for-the-badge)](#en-local-setup)
[![Build](https://img.shields.io/badge/Build-24292f?style=for-the-badge)](#en-build)
[![License](https://img.shields.io/badge/License-24292f?style=for-the-badge)](#en-license)

</div>

---

<a id="en-overview"></a>

## Overview

The landing page combines a modeled 3D workspace with four directly
accessible content sections. Camera transitions and hotspots lead to the
embedded pages, while the chessboard remains available as a standalone local
two-player application.

| Feature | Implementation |
|---|---|
| 3D workspace | Camera controls, hotspots, lighting, bloom, and device-based quality tiers |
| Chess | Move validation through `chess.js`, animated captures, and synthesized audio effects |
| Content | Portfolio, profile, academic records, and certificates as local pages |
| Controls | Mouse, keyboard, and touch support with a responsive interface |

<a id="en-sections"></a>

## Sections

| Section | Content | Direct link |
|---|---|---|
| Portfolio | Overview of published projects | [Open](https://p-keminer.github.io/portfolio/) |
| About | Profile, background, and technical focus areas | [Open](https://p-keminer.github.io/ueber-mich/) |
| Academic records | Semester-based view of the published documents | [Open](https://p-keminer.github.io/leistungsnachweise/) |
| Certificates | Certificates and course records grouped by topic | [Open](https://p-keminer.github.io/zertifikate/) |

<a id="en-technology"></a>

## Technology

```text
src/
  app/       Application flow and state control
  audio/     Synthesized audio effects
  chess/     Chess logic and board mapping
  render/    Three.js scene, models, lighting, and camera
  styles/    Global interface styles
  ui/        Controls and legal information

public/
  portfolio/            Project overview
  ueber-mich/           Profile section
  leistungsnachweise/   Semester and document view
  zertifikate/          Certificate section
  models/               Active 3D models and textures
```

All runtime resources are served locally. The production build verifies, among
other things, Content Security Policies, local assets, published documents,
the absence of trackers, and the self-hosted Draco decoder.

<a id="en-local-setup"></a>

## Local Setup

```bash
git clone https://github.com/p-keminer/p-keminer.github.io.git
cd p-keminer.github.io
npm ci
npm run dev
```

Vite starts the local development environment and prints its address in the
terminal.

<a id="en-build"></a>

## Build and Deployment

```bash
npm run build
npm run preview
```

`npm run build` runs the TypeScript check, the Vite production build, and the
static security verification. Pushes to `main` are then deployed to GitHub
Pages through GitHub Actions.

<a id="en-license"></a>

## License

The source code is available under the [MIT License](LICENSE). Bundled fonts,
libraries, models, and other third-party content retain their respective
licenses.

<div align="center">

[![Back to top](https://img.shields.io/badge/⬆_Back_to_top-24292f?style=for-the-badge)](#top)

</div>
