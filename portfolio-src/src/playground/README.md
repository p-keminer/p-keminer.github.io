# Playground

Der Playground unter `src/playground/` bleibt bewusst im Repository, ist aber im normalen Website-Startpfad standardmaessig entkoppelt.

## Aktueller Stand

- `DevPanel.tsx` enthaelt das UI fuer den lokalen Debug- und Fortschritts-Playground.
- `bus.ts` stellt den kleinen Event-Bus zwischen Playground und App bereit.
- Die Live-Seite mountet den Playground aktuell **nicht** automatisch.

## Playground wieder einbinden

### 1. `src/main.tsx`

Den `DevPanel` wieder nur im Dev-Modus mounten:

```tsx
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

const DevPanel = import.meta.env.DEV
  ? lazy(() => import("./playground/DevPanel.tsx"))
  : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    {DevPanel && (
      <Suspense fallback={null}>
        <DevPanel />
      </Suspense>
    )}
  </StrictMode>,
);
```

### 2. `src/App.tsx`

Den Bus wieder importieren:

```tsx
import { pgEmit, pgOn } from "./playground/bus";
```

Dann vier Dinge wieder anschliessen:

#### 2.1 Optionalen Dialog-Override-State wieder anlegen

Wenn das Playground-Panel Dialogphasen forciert steuern soll, braucht `App.tsx` wieder:

```tsx
const [pgDialogPhase, setPgDialogPhase] = useState<number | null>(null);
```

#### 2.2 Listener fuer Playground-Events wieder anschliessen

Der zentrale `useEffect` in `App.tsx` hoert auf die vom Panel gesendeten Events und spiegelt sie in den normalen App-State:

```tsx
useEffect(() => {
  const subs = [
    pgOn("pg:isLaserSolved", (v) => setIsLaserSolved(v as boolean)),
    pgOn("pg:isCoderRepaired", (v) => setIsCoderRepaired(v as boolean)),
    pgOn("pg:isSha256Solved", (v) => setIsSha256Solved(v as boolean)),
    pgOn("pg:isWifiSolved", (v) => setIsWifiSolved(v as boolean)),
    pgOn("pg:isFlugbahnSolved", (v) => setIsFlugbahnSolved(v as boolean)),
    pgOn("pg:scrapSorted", (v) => setScrapSorted(v as boolean)),
    pgOn("pg:isWeldSolderDone", (v) => setIsWeldSolderDone(v as boolean)),
    pgOn("pg:dialogPhase", (v) => setPgDialogPhase(v as number | null)),
    pgOn("pg:openModal", (modal) => {
      if (modal === "laser") setIsLaserRescueOpen(true);
      if (modal === "latch") setIsInspectorLatchOpen(true);

      if (modal === "sha256") {
        setIsCoderRepaired(true);
        setIsSha256Open(true);
      }

      if (modal === "wifi") {
        setIsSha256Solved(true);
        setIsWifiOpen(true);
      }

      if (modal === "flugbahn") setIsFlugbahnOpen(true);

      if (modal === "greifarm") {
        setIsFlugbahnSolved(true);
        setIsGreifarmOpen(true);
      }

      if (modal === "weldsolder") {
        setIsLaserSolved(true);
        setIsWeldSolderOpen(true);
      }
    }),
    pgOn("pg:resetAll", () => {
      setCardsVisible(true);
      setIsLaserRescueOpen(false);
      setIsLaserSolved(false);
      setIsInspectorLatchOpen(false);
      setIsCoderRepaired(false);
      setIsSha256Open(false);
      setIsSha256Solved(false);
      setIsWifiOpen(false);
      setIsWifiSolved(false);
      setIsFlugbahnOpen(false);
      setIsFlugbahnSolved(false);
      setIsGreifarmOpen(false);
      setScrapSorted(false);
      setIsWeldSolderOpen(false);
      setIsWeldSolderDone(false);
      setPgDialogPhase(null);
    }),
  ];

  return () => subs.forEach((unsubscribe) => unsubscribe());
}, []);
```

#### 2.3 Rueckkanal `pg:state` wieder senden

Damit das Panel die echten Fortschrittswerte live anzeigen kann, braucht `App.tsx` ausserdem wieder den Rueckkanal:

```tsx
useEffect(() => {
  pgEmit("pg:state", {
    isCoderRepaired,
    isSha256Solved,
    isWifiSolved,
    isFlugbahnSolved,
    scrapSorted,
    isLaserSolved,
    isWeldSolderDone,
  });
}, [
  isCoderRepaired,
  isSha256Solved,
  isWifiSolved,
  isFlugbahnSolved,
  scrapSorted,
  isLaserSolved,
  isWeldSolderDone,
]);
```

#### 2.4 `forcedDialogPhase` wieder an `AnimatedBackground` durchreichen

Im `AnimatedBackground`-Aufruf in `App.tsx` wieder anhängen:

```tsx
<AnimatedBackground
  ...
  forcedDialogPhase={pgDialogPhase}
/>
```

### 3. `AnimatedBackground`

Wenn Dialogphasen aus dem Playground steuerbar sein sollen, muss `AnimatedBackground` die Prop annehmen und an `RobotScene` weiterreichen.

#### 3.1 Prop im Interface fuehren

```tsx
interface AnimatedBackgroundProps {
  ...
  forcedDialogPhase?: number | null;
}
```

#### 3.2 Prop im Komponenten-Argument entgegennehmen

```tsx
export default function AnimatedBackground({
  ...
  forcedDialogPhase,
}: AnimatedBackgroundProps) {
```

#### 3.3 Prop an `RobotScene` weitergeben

```tsx
<RobotScene
  ...
  forcedDialogPhase={forcedDialogPhase}
/>
```

Hinweis:

- In diesem Projekt ist `AnimatedBackground` bereits fuer `forcedDialogPhase` vorbereitet.
- Wenn nur `App.tsx` entkoppelt wurde, reicht oft schon Schritt 2.4.
- Nur wenn die Prop auch aus `AnimatedBackground` entfernt wurde, brauchst du 3.1 bis 3.3 zusaetzlich.

## Bedienung

- Das Panel selbst nutzt `F2` zum Oeffnen und Schliessen.
- Die Fortschritts-Toggles arbeiten ueber die Event-Namen aus `bus.ts`.
- Fuer neue Spielzustande einfach ein weiteres `pg:*`-Event einfuehren und in `App.tsx` sowie `DevPanel.tsx` anschliessen.

## Vollstaendige Checkliste zum Wiedereinbinden

Wenn du den Playground spaeter noch einmal schnell aktivieren willst, kannst du genau diese Reihenfolge abarbeiten:

1. In `src/main.tsx` `DevPanel` wieder `dev-only` mounten
2. In `src/App.tsx` `pgEmit` und `pgOn` wieder importieren
3. In `src/App.tsx` optional `pgDialogPhase` wieder als State anlegen
4. In `src/App.tsx` den Playground-Listener-`useEffect` wieder einfuegen
5. In `src/App.tsx` den `pg:state`-Rueckkanal wieder einfuegen
6. Im `AnimatedBackground`-Aufruf `forcedDialogPhase={pgDialogPhase}` wieder durchreichen
7. Falls noetig, in `src/components/AnimatedBackground.tsx` sicherstellen, dass `forcedDialogPhase` im Props-Interface, im Komponenten-Argument und im `RobotScene`-Aufruf vorhanden ist
8. Dev-Server starten und mit `F2` pruefen, ob das Panel erscheint

## Welche Events das Panel aktuell benutzt

Die wichtigsten Event-Namen aus `DevPanel.tsx` sind derzeit:

- `pg:isLaserSolved`
- `pg:isCoderRepaired`
- `pg:isSha256Solved`
- `pg:isWifiSolved`
- `pg:isFlugbahnSolved`
- `pg:scrapSorted`
- `pg:isWeldSolderDone`
- `pg:dialogPhase`
- `pg:openModal`
- `pg:resetAll`
- `pg:state`

Wenn du in Zukunft neue Spielfortschritte oder neue Debug-Schalter einbaust, musst du typischerweise genau drei Stellen anfassen:

1. `DevPanel.tsx`
2. `App.tsx`
3. optional `AnimatedBackground.tsx` oder `RobotScene.tsx`, falls eine neue Override-Prop benoetigt wird

## Wie `pg:openModal` aktuell gedacht ist

Das Panel sendet einfache String-Keys an `pg:openModal`. In `App.tsx` muessen diese auf die echten Modals gemappt werden.

Aktuell sind das:

- `laser`
- `latch`
- `sha256`
- `wifi`
- `flugbahn`
- `greifarm`
- `weldsolder`

Wenn ein neues Minispiel dazukommt, braucht es:

1. einen neuen Button im `DevPanel`
2. einen neuen Fall im `pgOn("pg:openModal", ...)`-Handler in `App.tsx`
3. meistens auch einen neuen Fortschrittswert im `pg:state`

## Schnelltest nach der Wiedereinbindung

Wenn alles korrekt angeschlossen ist, sollte dieser Kurztest funktionieren:

1. `npm run dev`
2. Seite im Browser oeffnen
3. `F2` druecken
4. Playground erscheint unten rechts / als Panel
5. Einen Fortschritts-Toggle betaetigen
6. Die Szene oder ein Modal reagiert sofort
7. `Alle freischalten` aktualisiert die Fortschrittszustande sichtbar

## Hinweis

Vor einem Production-Push den Playground wieder entkoppeln, wenn er nicht Teil des aktiven Website-Startpfads sein soll.
