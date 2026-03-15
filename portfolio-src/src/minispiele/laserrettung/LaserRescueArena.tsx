import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

type ArenaPhase = "countdown" | "playing" | "escape";

interface LaserRescueArenaProps {
  onAbort: () => void;
  onComplete: () => void;
}

interface TargetPose {
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

interface ShotEffect {
  id: number;
  x: number;
  y: number;
  hit: boolean;
}

const COUNTDOWN_VALUES = [3, 2, 1] as const;
const ARENA_WIDTH = 760;
const ARENA_HEIGHT = 430;
const REQUIRED_HITS = 5;
const SHOT_ORIGIN = { x: 90, y: ARENA_HEIGHT - 54 };

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function nextTargetPose(previous?: TargetPose): TargetPose {
  const next = {
    x: randomBetween(88, ARENA_WIDTH - 110),
    y: randomBetween(72, ARENA_HEIGHT - 100),
    scale: randomBetween(0.82, 1.22),
    rotate: randomBetween(-16, 16),
  };

  if (!previous) return next;

  const dx = next.x - previous.x;
  const dy = next.y - previous.y;
  return Math.abs(dx) + Math.abs(dy) > 220 ? next : nextTargetPose(undefined);
}

function TargetRedRobot({ escaped = false }: { escaped?: boolean }) {
  return (
    <motion.svg
      width="98"
      height="112"
      viewBox="0 0 98 112"
      initial={false}
      animate={
        escaped
          ? { rotate: -12, y: -126, opacity: 0, scale: 0.72 }
          : { rotate: 0, y: 0, opacity: 1, scale: 1 }
      }
      transition={escaped ? { duration: 1.3, ease: [0.22, 1, 0.36, 1] } : undefined}
      style={{ overflow: "visible", filter: "drop-shadow(0 12px 22px rgba(255, 70, 70, 0.26))" }}
    >
      <ellipse cx="49" cy="99" rx="24" ry="9" fill="rgba(0,0,0,0.22)" />
      <rect x="36" y="69" width="9" height="18" rx="3" fill="#7b110b" />
      <rect x="53" y="69" width="9" height="18" rx="3" fill="#7b110b" />
      <rect x="33" y="36" width="32" height="38" rx="10" fill="#da2d1f" />
      <rect x="38" y="44" width="22" height="13" rx="4" fill="rgba(13,6,10,0.42)" />
      <circle cx="43" cy="50.5" r="3" fill="#ffdd8c" />
      <circle cx="55" cy="50.5" r="3" fill="#ffdd8c" />
      <rect x="42" y="59" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.32)" />
      <rect x="36" y="23" width="26" height="18" rx="7" fill="#aa1b12" />
      <rect x="40" y="28" width="7" height="5" rx="2" fill="rgba(10,0,0,0.58)" />
      <rect x="51" y="28" width="7" height="5" rx="2" fill="rgba(10,0,0,0.58)" />
      <rect x="41" y="29" width="5" height="3" rx="1.2" fill="#ffb290" />
      <rect x="52" y="29" width="5" height="3" rx="1.2" fill="#ffb290" />
      <line x1="49" y1="23" x2="49" y2="15" stroke="#ff9b7e" strokeWidth="1.5" opacity="0.72" />
      <circle cx="49" cy="12" r="3.2" fill="#ffb290" />
      <g>
        <rect x="22" y="42" width="10" height="22" rx="4" fill="#b91f15" />
        <rect x="66" y="42" width="10" height="22" rx="4" fill="#b91f15" />
      </g>
      <g opacity="0.82">
        <path d="M17 39 L28 31" stroke="#ff795f" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M81 39 L70 31" stroke="#ff795f" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </motion.svg>
  );
}

export default function LaserRescueArena({ onAbort, onComplete }: LaserRescueArenaProps) {
  const [phase, setPhase] = useState<ArenaPhase>("countdown");
  const [countdownIndex, setCountdownIndex] = useState(0);
  const [hits, setHits] = useState(0);
  const [targetPose, setTargetPose] = useState<TargetPose>(() => nextTargetPose());
  const [shotEffect, setShotEffect] = useState<ShotEffect | null>(null);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const shotIdRef = useRef(0);

  useEffect(() => {
    if (phase !== "countdown") return undefined;

    const timer = window.setTimeout(() => {
      if (countdownIndex >= COUNTDOWN_VALUES.length - 1) {
        setPhase("playing");
        setTargetPose(nextTargetPose());
        return;
      }
      setCountdownIndex((value) => value + 1);
    }, 760);

    return () => window.clearTimeout(timer);
  }, [countdownIndex, phase]);

  useEffect(() => {
    if (phase !== "playing") return undefined;

    const interval = window.setInterval(() => {
      setTargetPose((current) => nextTargetPose(current));
    }, 620);

    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "escape") return undefined;

    const timer = window.setTimeout(() => {
      onComplete();
    }, 1450);

    return () => window.clearTimeout(timer);
  }, [onComplete, phase]);

  const headline = useMemo(() => {
    if (phase === "countdown") return "Bereitmachen";
    if (phase === "escape") return "Red flieht!";
    return "Treffe Red fünf Mal";
  }, [phase]);

  // Responsive scale: shrink arena on narrow viewports without touching game logic
  const arenaScale = (() => {
    if (typeof window === "undefined") return 1;
    const outerW = Math.min(window.innerWidth - 16, 760);
    const shell = outerW - 30;
    return shell >= ARENA_WIDTH ? 1 : shell / ARENA_WIDTH;
  })();

  const playLaserSound = () => {
    const AudioCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtor();
    }

    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const filterNode = context.createBiquadFilter();

    filterNode.type = "bandpass";
    filterNode.frequency.value = 1820;
    filterNode.Q.value = 8;

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(1240, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(190, context.currentTime + 0.16);

    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.24, context.currentTime + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);

    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
  };

  const isHit = (x: number, y: number) => {
    const rx = 22 * targetPose.scale;
    const ry = 30 * targetPose.scale;
    const cx = targetPose.x + 49 * targetPose.scale;
    const cy = targetPose.y + 56 * targetPose.scale;
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return dx * dx + dy * dy <= 1.08;
  };

  const handleArenaShot = (clientX: number, clientY: number) => {
    if (phase !== "playing" || !arenaRef.current) return;

    const rect = arenaRef.current.getBoundingClientRect();
    // CSS transform scale: getBoundingClientRect returns scaled bounds → divide to get logical coords
    const x = (clientX - rect.left) / arenaScale;
    const y = (clientY - rect.top) / arenaScale;
    const hit = isHit(x, y);

    shotIdRef.current += 1;
    setShotEffect({ id: shotIdRef.current, x, y, hit });
    playLaserSound();
    window.setTimeout(() => {
      setShotEffect((current) => (current?.id === shotIdRef.current ? null : current));
    }, 170);

    if (!hit) return;

    setHits((current) => {
      const next = current + 1;
      if (next >= REQUIRED_HITS) {
        setPhase("escape");
        return next;
      }
      setTargetPose((existing) => nextTargetPose(existing));
      return next;
    });
  };

  return (
    <div
      style={{
        width: "min(calc(100vw - 16px), 760px)",
        maxWidth: 760,
        minHeight: 430,
        borderRadius: 28,
        border: "1px solid rgba(131, 230, 255, 0.18)",
        background:
          "radial-gradient(circle at 50% 20%, rgba(85, 196, 255, 0.10), transparent 34%), linear-gradient(180deg, rgba(8, 12, 24, 0.96) 0%, rgba(4, 7, 16, 0.98) 100%)",
        boxShadow: "0 28px 90px rgba(0,0,0,0.46), inset 0 1px 0 rgba(255,255,255,0.06)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "18px 20px 0",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.7rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(160, 220, 255, 0.7)",
            }}
          >
            Laser-Kalibrierung
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#f4f8ff",
            }}
          >
            {headline}
          </div>
        </div>

        <button
          type="button"
          onClick={onAbort}
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            color: "#dbe8ff",
            borderRadius: 12,
            padding: "10px 14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Schließen
        </button>
      </div>

        {/* Clip wrapper collapses to scaled height on mobile */}
        <div
          style={{
            width: "calc(100% - 30px)",
            height: ARENA_HEIGHT * arenaScale,
            margin: "18px auto 16px",
            borderRadius: 22,
            overflow: "hidden",
            border: "1px solid rgba(116, 209, 255, 0.14)",
          }}
        >
        <div
          ref={arenaRef}
          style={{
            position: "relative",
            width: ARENA_WIDTH,
            height: ARENA_HEIGHT,
            ...(arenaScale < 1 && { transform: `scale(${arenaScale})`, transformOrigin: "top left" }),
            background:
              "radial-gradient(circle at 50% 50%, rgba(19, 44, 78, 0.82) 0%, rgba(7, 13, 29, 0.94) 72%), linear-gradient(180deg, rgba(4, 8, 18, 0.88), rgba(2, 4, 10, 0.98))",
            cursor: phase === "playing" ? "crosshair" : "default",
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            handleArenaShot(event.clientX, event.clientY);
          }}
        >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(98, 156, 255, 0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(98, 156, 255, 0.09) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            opacity: 0.45,
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 16% 18%, rgba(255, 68, 68, 0.14), transparent 20%), radial-gradient(circle at 80% 78%, rgba(120, 220, 255, 0.13), transparent 24%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            display: "flex",
            gap: 10,
            zIndex: 4,
          }}
        >
          {Array.from({ length: REQUIRED_HITS }, (_, index) => (
            <div
              key={index}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: index < hits ? "#6dff8e" : "rgba(255,255,255,0.14)",
                boxShadow: index < hits ? "0 0 14px rgba(109,255,142,0.55)" : "none",
              }}
            />
          ))}
        </div>

        {phase === "countdown" && (
          <motion.div
            key={COUNTDOWN_VALUES[countdownIndex]}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.32 }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 5,
              fontSize: "5rem",
              fontWeight: 800,
              color: "#ffffff",
              textShadow: "0 0 28px rgba(128, 220, 255, 0.42)",
              userSelect: "none",
            }}
          >
            {COUNTDOWN_VALUES[countdownIndex]}
          </motion.div>
        )}

        <motion.div
          animate={{
            x: targetPose.x,
            y: targetPose.y,
            scale: targetPose.scale,
            rotate: targetPose.rotate,
          }}
          transition={
            phase === "escape"
              ? { duration: 0.2 }
              : { duration: 0.44, ease: [0.2, 0.8, 0.2, 1] }
          }
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: 3,
            pointerEvents: "none",
            transformOrigin: "center center",
          }}
        >
          <TargetRedRobot escaped={phase === "escape"} />
        </motion.div>

        {shotEffect ? (
          <svg
            width={ARENA_WIDTH}
            height={ARENA_HEIGHT}
            viewBox={`0 0 ${ARENA_WIDTH} ${ARENA_HEIGHT}`}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 6,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <defs>
              <filter id="laserGameGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <line
              x1={SHOT_ORIGIN.x}
              y1={SHOT_ORIGIN.y}
              x2={shotEffect.x}
              y2={shotEffect.y}
              stroke={shotEffect.hit ? "#74fda3" : "#6dc9ff"}
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#laserGameGlow)"
            />
            <line
              x1={SHOT_ORIGIN.x}
              y1={SHOT_ORIGIN.y}
              x2={shotEffect.x}
              y2={shotEffect.y}
              stroke="#ffffff"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.88"
            />
            <circle cx={shotEffect.x} cy={shotEffect.y} r={shotEffect.hit ? 11 : 8} fill={shotEffect.hit ? "rgba(116,253,163,0.28)" : "rgba(109,201,255,0.22)"} />
            <circle cx={shotEffect.x} cy={shotEffect.y} r={shotEffect.hit ? 5 : 4} fill={shotEffect.hit ? "#74fda3" : "#8ce7ff"} />
          </svg>
        ) : null}

        {phase === "escape" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: "absolute",
              left: "50%",
              bottom: 24,
              transform: "translateX(-50%)",
              zIndex: 5,
              padding: "10px 16px",
              borderRadius: 999,
              background: "rgba(9, 15, 28, 0.9)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "#ebf2ff",
              fontWeight: 700,
              boxShadow: "0 18px 36px rgba(0,0,0,0.3)",
            }}
          >
            Treffer gelandet. Red fliegt davon.
          </motion.div>
        )}
      </div>
        </div>
    </div>
  );
}
