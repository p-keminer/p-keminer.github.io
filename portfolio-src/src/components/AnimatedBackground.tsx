import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useAssemblyTimer } from "./assembly-sequence/useAssemblyTimer";
import { AssemblyRearLayer, AssemblyFrontLayer } from "./assembly-sequence/AssemblySequence";
import { isLaughterAway, isRedAway, isUfoActive } from "./assembly-sequence/selectors";

const RobotScene = lazy(() => import("./RobotScene"));

// Computed once — won't react to resize (acceptable: used only for perf reduction)
const PERF_REDUCED = typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;

// True when the viewport is narrower than 16:9 → scene clips horizontally → panning needed.
// Formula: viewport_width / viewport_height < 16/9  ↔  width*9 < height*16
function computeNeedsPan() {
  return typeof window !== "undefined" && window.innerWidth * 9 < window.innerHeight * 16;
}

// ── REMOVED: SceneJoystick ──────────────────────────────────────────────────
// The draggable thumb-pad for horizontal panning was removed because native
// touch-pan (overflowX + touchAction: pan-x) already works.  To restore,
// re-add the SceneJoystick component here and render it below with:
//   {needsPan && <SceneJoystick scrollRef={sceneScrollRef} />}
// The original CSS classes (.scene-joystick, .scene-joystick-pad,
// .scene-joystick-arrows, .scene-joystick-thumb) are still in global.css.
// ─────────────────────────────────────────────────────────────────────────────

interface AnimatedBackgroundProps {
  onVictimClick?: () => void;
  onInspectorClick?: () => void;
  onCoderClick?: () => void;
  onWifiClick?: () => void;
  onGrinderClick?: () => void;
  onCraneClick?: () => void;
  onLaugherClick?: () => void;
  onShooterClick?: () => void;
  coderRepaired?: boolean;
  sha256Solved?: boolean;
  wifiSolved?: boolean;
  flugbahnSolved?: boolean;
  scrapSorted?: boolean;
  weldSolderDone?: boolean;
  laserSolved?: boolean;
  forcedDialogPhase?: number | null;
}

export default function AnimatedBackground({
  onVictimClick,
  onInspectorClick,
  onCoderClick,
  onWifiClick,
  onGrinderClick,
  onCraneClick,
  onLaugherClick,
  onShooterClick,
  coderRepaired,
  sha256Solved,
  wifiSolved,
  flugbahnSolved,
  scrapSorted,
  weldSolderDone,
  laserSolved,
  forcedDialogPhase,
}: AnimatedBackgroundProps) {
  // Ref to the scroll container — used to pan the scene programmatically
  const sceneScrollRef = useRef<HTMLDivElement | null>(null);

  // Reactive: true whenever the viewport is narrower than 16:9
  const [needsPan, setNeedsPan] = useState(computeNeedsPan);

  // Assembly sequence timer — drives the post-scrapSorted visual story
  const assemblyTick = useAssemblyTimer(scrapSorted ?? false, weldSolderDone ?? false);

  // Re-evaluate on every resize / orientation change
  useEffect(() => {
    const handler = () => setNeedsPan(computeNeedsPan());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Centre the scene horizontally whenever panning is active.
  // Runs on mount and re-runs when needsPan flips (e.g. orientation change).
  useEffect(() => {
    if (!needsPan) return;

    const center = () => {
      const el = sceneScrollRef.current;
      if (!el) return;
      // Snap to middle of the pannable range.
      // Uses scrollWidth so it works whether the browser resolved 100svh or 100vh.
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    };

    // Debounce: 150 ms gap filters out URL-bar show/hide micro-resizes on mobile,
    // while still catching deliberate orientation changes.
    let timer: ReturnType<typeof setTimeout>;
    const debouncedCenter = () => {
      clearTimeout(timer);
      timer = setTimeout(() => requestAnimationFrame(center), 150);
    };

    requestAnimationFrame(center); // initial centering after first paint
    window.addEventListener("resize", debouncedCenter);
    return () => {
      window.removeEventListener("resize", debouncedCenter);
      clearTimeout(timer);
    };
  }, [needsPan]); // re-center when panning state changes (e.g. orientation flip)

  return (
    <div
      data-pg-scene
      aria-hidden={onVictimClick || onInspectorClick ? undefined : true}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "auto",
        backgroundColor: "#020408",
      }}
    >
      {/* Dark overlay — stays viewport-relative, darkens everything behind it */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "rgba(2, 4, 10, 0.78)",
        pointerEvents: "none",
      }} />

      {/* Warm gold / cyan aurora tints — viewport-relative, don't scroll */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{
          position: "absolute",
          left: "20%", top: "30%",
          width: 640, height: 380,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(210, 165, 40, 0.07) 0%, transparent 70%)",
          filter: PERF_REDUCED ? "blur(16px)" : "blur(50px)",
          animation: "aurora-drift 22s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute",
          right: "10%", top: "18%",
          width: 520, height: 310,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(72, 210, 255, 0.055) 0%, transparent 70%)",
          filter: PERF_REDUCED ? "blur(14px)" : "blur(46px)",
          animation: "aurora-drift-alt 28s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute",
          left: "44%", top: "56%",
          width: 460, height: 260,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(180, 130, 20, 0.055) 0%, transparent 70%)",
          filter: PERF_REDUCED ? "blur(12px)" : "blur(42px)",
          animation: "aurora-drift-slow 34s ease-in-out infinite",
        }} />
      </div>

      {/* ── Scene layer ──────────────────────────────────────────────────────────
          When the viewport is narrower than 16:9 the scene is clipped; we wrap it
          in a horizontally scrollable container so the full scene is reachable.
          When the full scene fits (wide/landscape viewport) the container is plain
          overflow:hidden and the SVG fills it via xMidYMid slice as usual.
          Aurora / comets / vignette outside this container stay viewport-fixed. */}
      <div
        ref={sceneScrollRef}
        className={needsPan ? "scene-scroll" : undefined}
        style={{
          position: "absolute",
          inset: 0,
          overflowX: needsPan ? "auto" : "hidden",
          overflowY: "hidden",
          ...(needsPan ? {
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x",
          } : {}),
        }}
      >
        <div
          className={needsPan ? "scene-inner-mobile" : undefined}
          style={needsPan ? undefined : { width: "100%", height: "100%", position: "relative" }}
        >
          {/* Circuit-node overlay */}
          <svg
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.22, pointerEvents: "none" }}
          >
            <defs>
              <filter id="nodeGlow">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="cyanLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(104,220,255,0)" />
                <stop offset="50%" stopColor="rgba(104,220,255,0.7)" />
                <stop offset="100%" stopColor="rgba(104,220,255,0)" />
              </linearGradient>
              <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(220,170,50,0)" />
                <stop offset="50%" stopColor="rgba(220,170,50,0.65)" />
                <stop offset="100%" stopColor="rgba(220,170,50,0)" />
              </linearGradient>
            </defs>
            <g opacity="0.8">
              <path d="M 336 506 L 446 424 L 566 474 L 642 406 L 770 442" fill="none" stroke="url(#cyanLine)" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M 642 406 L 748 346 L 872 392 L 1006 336 L 1128 380" fill="none" stroke="url(#goldLine)" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M 770 442 L 884 514 L 1018 466 L 1154 522" fill="none" stroke="url(#cyanLine)" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M 94 246 L 196 202 L 308 248 L 436 208" fill="none" stroke="url(#cyanLine)" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M 1128 204 L 1264 162 L 1388 210 L 1518 178" fill="none" stroke="url(#goldLine)" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M 154 710 L 284 654 L 414 714 L 564 662" fill="none" stroke="url(#cyanLine)" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M 1080 690 L 1210 632 L 1354 694 L 1506 646" fill="none" stroke="url(#goldLine)" strokeWidth="1.3" strokeLinecap="round" />
            </g>
            <g opacity="0.85" filter="url(#nodeGlow)">
              {[
                [196, 202, "#7ee6ff"], [308, 248, "#7ddfff"], [436, 208, "#ddb860"],
                [642, 406, "#ffffff"], [748, 346, "#ddb860"], [770, 442, "#8ceaff"],
                [872, 392, "#ddc070"], [1006, 336, "#ddb860"], [1018, 466, "#92e3ff"],
                [1128, 380, "#ddb860"], [1264, 162, "#ddc070"], [1388, 210, "#ddc070"],
                [284, 654, "#b4f2ff"], [414, 714, "#8ce5ff"], [1210, 632, "#ddb860"],
              ].map(([cx, cy, fill], i) => (
                <circle key={i} cx={cx} cy={cy} r="4" fill={String(fill)} />
              ))}
            </g>
          </svg>

          {/* Robot workshop scene — loaded asynchronously */}
          {/* Assembly sequence: REAR layer sits behind RobotScene ↓ */}
          <AssemblyRearLayer tick={assemblyTick} />
          <Suspense fallback={null}>
            <RobotScene
              onVictimClick={onVictimClick}
              onInspectorClick={onInspectorClick}
              onCoderClick={onCoderClick}
              onWifiClick={onWifiClick}
              onGrinderClick={onGrinderClick}
              onCraneClick={onCraneClick}
              onLaugherClick={onLaugherClick}
              onShooterClick={onShooterClick}
              coderRepaired={coderRepaired}
              sha256Solved={sha256Solved}
              wifiSolved={wifiSolved}
              flugbahnSolved={flugbahnSolved}
              scrapSorted={scrapSorted}
              laserSolved={laserSolved}
              forcedDialogPhase={forcedDialogPhase}
              hideLaugher={isLaughterAway(assemblyTick)}
              hideShooter={isRedAway(assemblyTick)}
              ufoActive={isUfoActive(assemblyTick)}
              dialogPaused={isLaughterAway(assemblyTick)}
              scrapPairsGrabbed={assemblyTick.pairsGrabbed}
            />
          </Suspense>
          {/* Assembly sequence: FRONT layer sits in front of RobotScene ↑ */}
          <AssemblyFrontLayer tick={assemblyTick} />
        </div>
      </div>

      {/* Comets & shooting stars — viewport-relative, don't scroll with scene */}
      {/* Comet 1: von rechts außen → nach links unten, 42s Zyklus */}
      <div style={{
        position: "absolute",
        width: 170, height: 2,
        background: "linear-gradient(to left, transparent, rgba(160,215,255,0.82) 60%, rgba(255,255,255,0.97) 100%)",
        borderRadius: "999px",
        top: "10%", right: "-200px",
        transform: "rotate(28deg)",
        animation: "comet-1 42s linear infinite",
        animationDelay: "3s",
        pointerEvents: "none",
      }} />
      {/* Comet 2: von links außen → nach rechts unten, 62s Zyklus */}
      <div style={{
        position: "absolute",
        width: 210, height: 2.5,
        background: "linear-gradient(to right, transparent, rgba(200,230,255,0.78) 55%, rgba(255,255,255,0.95) 100%)",
        borderRadius: "999px",
        top: "5%", left: "-260px",
        transform: "rotate(-22deg)",
        animation: "comet-2 62s linear infinite",
        animationDelay: "19s",
        pointerEvents: "none",
      }} />
      {/* Shooting stars — skipped on mobile to reduce animation cost */}
      {!PERF_REDUCED && (<>
        {/* Shooting star: schnell, von rechts außen, 34s Zyklus */}
        <div style={{
          position: "absolute",
          width: 85, height: 1.5,
          background: "linear-gradient(to left, transparent, rgba(255,255,230,0.95) 65%, white 100%)",
          borderRadius: "999px",
          top: "20%", right: "-120px",
          transform: "rotate(22deg)",
          animation: "shooting-star 34s linear infinite",
          animationDelay: "9s",
          pointerEvents: "none",
        }} />
        {/* Shooting star 2: von rechts außen, 47s Zyklus */}
        <div style={{
          position: "absolute",
          width: 72, height: 1.5,
          background: "linear-gradient(to left, transparent, rgba(255,240,200,0.9) 65%, white 100%)",
          borderRadius: "999px",
          top: "38%", right: "-100px",
          transform: "rotate(16deg)",
          animation: "shooting-star 47s linear infinite",
          animationDelay: "31s",
          pointerEvents: "none",
        }} />
        {/* Shooting star 3: von links außen, 55s Zyklus */}
        <div style={{
          position: "absolute",
          width: 90, height: 1.5,
          background: "linear-gradient(to right, transparent, rgba(200,230,255,0.88) 60%, white 100%)",
          borderRadius: "999px",
          top: "60%", left: "-130px",
          transform: "rotate(-18deg)",
          animation: "comet-2 55s linear infinite",
          animationDelay: "41s",
          pointerEvents: "none",
        }} />
      </>)}

      {/* Edge vignette */}
      <div style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse at 50% 48%, rgba(255,255,255,0.012), transparent 52%), linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.08) 35%, rgba(0,0,0,0.08) 65%, rgba(0,0,0,0.48) 100%)",
        pointerEvents: "none",
      }} />

      {/* SceneJoystick removed — native pan-x scrolling handles this now */}
    </div>
  );
}
