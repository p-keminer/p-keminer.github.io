# Portfolio – Philip Keminer

[![Live](https://img.shields.io/badge/Live-p--keminer.github.io-0d1117?style=flat&logo=github)](https://p-keminer.github.io)

Eine interaktive 3D-Portfolio-Website: Ein modellierter Arbeitsraum verbindet
Projektübersicht, Profil, Leistungsnachweise und Zertifikate mit einem
spielbaren Schachbrett.

---

## Funktionen

- **Interaktiver 3D-Raum** – Kamerafahrten, freie Erkundung und Hotspots führen
  direkt zu den einzelnen Bereichen.
- **Spielbares Schach** – Lokales Zwei-Spieler-Spiel mit vollständiger
  Regelvalidierung, animierten Schlagzügen und synthetischen Audioeffekten.
- **Portfolio-Monitor** – Kompakte Übersicht der veröffentlichten Projekte.
- **Über-mich-Monitor** – Profil, Werdegang und technische Schwerpunkte.
- **Leistungsnachweise** – Semesterweise Ansicht der hinterlegten Dokumente.
- **Zertifikatsbereich** – Thematisch geordnete Zertifikate und Kursnachweise.
- **Adaptive Darstellung** – Die Qualitätsstufen `high`, `medium` und `low`
  passen Schatten, Bloom und Antialiasing an das Gerät an.
- **Responsive Bedienung** – Unterstützung für Maus, Tastatur und Touch-Geräte.

## Technik

`TypeScript` · `Three.js` · `chess.js` · `Vite` · `Blender` · `HTML` · `CSS`

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
  models/               GLB-Modelle und Texturen
```

## Lokal starten

```bash
git clone https://github.com/p-keminer/p-keminer.github.io.git
cd p-keminer.github.io
npm install
npm run dev
```

Produktionsbuild einschließlich der statischen Sicherheitsprüfung:

```bash
npm run build
```
