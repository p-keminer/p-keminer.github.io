# Blender Pipeline

## Blender MCP Nutzen

Blender MCP hilft hier vor allem bei:

- Brettmodell erzeugen
- Figurenvarianten testen
- Materialien anpassen
- Objekte sauber benennen
- Pivot und Scale pruefen
- GLB-Exporte iterieren

## Nicht Aufgabe von Blender MCP

- Schachlogik
- Browser-UI
- Eventsystem
- Spielfluss

## Exportregeln

- Ursprung sinnvoll setzen
- gemeinsame Massstaebe verwenden
- unnoetige Detailtiefe vermeiden
- Asset-Aenderungen in den Asset-READMEs dokumentieren
- Starter-Assets bleiben unter `public/models/`
- Blockout-Review-Assets liegen parallel unter `public/models/blockout/`
- Freigegebene Blender-Quellen fuer Review-Blockouts werden als Projektkopie unter `docs/assets/blender/` gesichert
- der erste Review-Export laeuft ueber `scripts/export_blockout_assets.py`
- fuer Review-Blockouts gilt eine feste Front-Achsen-Konvention: Blender-Front nach `-Y`, damit der importierte GLB in Template-Space entlang `+Z` liest
- fuer Review-Blockouts erzwingt der Web-Look jetzt eine feste In-Game-Palette auf Basis der Pawn-Familie: ein gemeinsames Weiss, ein gemeinsames Struktur-Dunkelblau und ein gemeinsames Hellblau fuer Augen/Linsen/Visoren sowie ausgewaehlte Signalteile
- fuer dieselben Blockout-Figuren gilt jetzt zusaetzlich ein festes Neon-Set als Laufzeitregel: `sensor` fuer Augen/Linsen/Visoren, `core` fuer Herzen und offene Energiekammern, `command` fuer Embleme/Sigils/Kommandomarker
- `sensor` liest bei Weiss cyan und bei Schwarz als klares Neon-Rot; `core` liest bei Weiss pink-rot und bei Schwarz ebenfalls klares Neon-Rot; `command` liest fuer beide Seiten als amber/orange
- die Neon-Wirkung wird in der Web-App nicht nur ueber Farbe, sondern immer ueber Emission gefahren; diese Teile sollen deshalb in Blender klar benannt bleiben und nicht in grosse Flaechen ausufern
- `blockout/king.glb` ist aktuell die Ausnahme dazu und behaelt fuer weisse Figuren weite Teile seiner exportierten Blender-Materialfarben; nur die Familien-Neons und die aeusseren Trim-Ringe werden gezielt in die Web-Regeln gezogen
- beim King gilt innerhalb dieses Sets eine bewusste Sonderregel: Emblem und Auge laufen beide auf `command`, damit der Kopf denselben neonfarbenen Befehlsakzent wie das Emblem traegt
- `springer_eye_ring` sowie die aeusseren King-Ringe um Auge und Emblem laufen bewusst nicht als Neon, sondern immer ueber `trim`: bei Weiss dunkelblau, bei Schwarz gold
- `rook_core_shield` laeuft trotz Koerperposition bewusst ueber den hellblauen/roten `sensor`-Zweig und nicht ueber `command`
- das weisse Laeufer-Herz laeuft ebenfalls ueber den hellblauen `sensor`-Zweig, damit es in der weissen Familie als cyanfarbener Energieakzent liest
- fuer schwarze `blockout/king.glb`-Figuren bleiben nur Auge und Highlight in ihren exportierten Blender-Farben; die aeusseren Ringe und Crown-Teile laufen bewusst auf das goldene `trim`
- schwarze Blockout-Figuren nutzen dieselbe Familienpalette in einer deutlich abgedunkelten Gegenvariante: neutraler Fast-Schwarz-Koerper plus dunklere Gegenakzente statt warmer Schoko-Brauntoene
- Fuesse, Schultern, normale Shields und aeussere/innere Radteile bleiben in der Grundfarbe und werden nicht in die blaue Strukturgruppe gezogen
