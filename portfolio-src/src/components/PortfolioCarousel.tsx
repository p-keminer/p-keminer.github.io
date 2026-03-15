import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion } from "framer-motion";
import { projects } from "../data/projects";
import ProjectCard from "./ProjectCard";

const TOUCH_DRAG_DIVISOR = 220;

const CARD_W = 486;
const CARD_H = 606;
const STAGE_SCALE = 0.72;
const RADIUS_X = 620;
const RADIUS_Z = 520;  // deeper Z separation between screens
const RADIUS_Y = 55;
const LINK_ZONE = 84;
const LINK_TOP_MARGIN = 30;
const LINK_HEIGHT = 42;
const LINK_CENTER_NUDGE = -20;
const DRAG_THRESHOLD = 28;
const DRAG_SMOOTHING = 0.28;
const DRAG_DISTANCE_DIVISOR = 1040;
const SNAP_SMOOTHING = 0.08;

// Always use duration: 0 — the RAF loop handles all smoothing itself.
// Using Framer Motion springs here causes two animation systems to fight
// each other on every frame, producing visible jitter during snap.
const INSTANT: { duration: number } = { duration: 0 };

function wrapIndex(value: number, total: number) {
  return ((value % total) + total) % total;
}

function getCircularOffset(index: number, rotation: number, total: number) {
  let raw = index - rotation;

  while (raw > total / 2) {
    raw -= total;
  }

  while (raw < -total / 2) {
    raw += total;
  }

  return raw;
}

function getTransform(offset: number, total: number, isHovered: boolean) {
  const maxDistance = Math.max(1, Math.floor(total / 2));
  const angleStep = Math.PI / maxDistance;
  const angle = offset * angleStep;
  const depth = (Math.cos(angle) + 1) / 2;
  const x = Math.sin(angle) * RADIUS_X;
  const y = (1 - depth) * RADIUS_Y - 16;
  const baseScale = 0.48 + depth * 0.58;
  const isOuterCard = Math.abs(offset) >= 0.7;

  return {
    x,
    y: isHovered && Math.abs(offset) < 0.3 ? y - 12 : y,
    scale: isHovered ? baseScale * 1.04 : baseScale,
    rotateY: isOuterCard ? 0 : -Math.sin(angle) * 30,  // more dramatic screen angle
    rotateX: isOuterCard ? 4 : 8 - depth * 5,
    z: depth * RADIUS_Z - 264,
    opacity: 1,
    zIndex: Math.round(depth * 100),
  };
}

interface DotsProps {
  count: number;
  active: number;
  onSelect: (i: number) => void;
}

function DotIndicators({ count, active, onSelect }: DotsProps) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {Array.from({ length: count }, (_, i) => (
        <motion.button
          key={i}
          onClick={() => onSelect(i)}
          animate={{
            width: i === active ? 22 : 6,
            opacity: i === active ? 1 : 0.3,
          }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          style={{
            height: 6,
            borderRadius: 3,
            background: "var(--accent)",
            border: "none",
            cursor: "pointer",
            padding: 0,
            outline: "none",
          }}
          aria-label={`Go to project ${i + 1}`}
        />
      ))}
    </div>
  );
}

export default function PortfolioCarousel() {
  const detectsTouch =
    typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const initialIndex = useMemo(
    () => projects.findIndex((project) => project.id === "github-profile"),
    [],
  );
  const [rotation, setRotation] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeZoneHovered, setActiveZoneHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTouchDevice] = useState(detectsTouch);
  const isTouchRef = useRef(detectsTouch);
  const [stageScale, setStageScale] = useState(STAGE_SCALE);
  const [isMobile, setIsMobile] = useState(false);
  const isDraggingRef = useRef(false);
  const motionModeRef = useRef<"drag" | "snap" | null>(null);
  const targetRotationRef = useRef(initialIndex >= 0 ? initialIndex : 0);
  const frameRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startRotation: number;
    hasMoved: boolean;
  } | null>(null);

  const activeIndex = wrapIndex(Math.round(rotation), projects.length);

  const stopMotionLoop = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    motionModeRef.current = null;
  };

  const startMotionLoop = (mode: "drag" | "snap") => {
    motionModeRef.current = mode;
    if (frameRef.current !== null) {
      return;
    }

    const tick = () => {
      const mode = motionModeRef.current;
      if (!mode) {
        frameRef.current = null;
        return;
      }

      setRotation((current) => {
        const target = targetRotationRef.current;
        const smoothing = mode === "drag" ? DRAG_SMOOTHING : SNAP_SMOOTHING;
        const next = current + (target - current) * smoothing;

        if (Math.abs(target - next) < 0.001) {
          if (mode === "snap") {
            motionModeRef.current = null;
            frameRef.current = null;
          }
          return target;
        }

        return next;
      });

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const NATURAL_W = (RADIUS_X + CARD_W / 2) * 2; // ≈ 1726 px at scale 1
    const MOBILE_BP = 580;
    const update = () => {
      const w = window.innerWidth;
      if (w < MOBILE_BP) {
        // Mobile: single-card mode — scale so the front card fills ~68 % of screen width
        setIsMobile(true);
        setStageScale(Math.min(0.58, Math.max(0.36, (w * 0.68) / CARD_W)));
      } else {
        // Tablet / desktop: continuous fit, floor at 0.48 so cards stay legible
        setIsMobile(false);
        const available = Math.max(0, w - 96);
        setStageScale(Math.min(STAGE_SCALE, Math.max(0.48, available / NATURAL_W)));
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => () => stopMotionLoop(), []);

  // Scroll wheel navigation
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      stopMotionLoop();
      targetRotationRef.current = Math.round(targetRotationRef.current) + delta;
      startMotionLoop("snap");
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, []);

  const focusProject = (index: number) => {
    stopMotionLoop();
    isDraggingRef.current = false;
    setIsDragging(false);
    targetRotationRef.current = index;
    setActiveZoneHovered(false);
    setHoveredIndex(null);
    startMotionLoop("snap");
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("a")) {
      return;
    }

    event.preventDefault();

    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startRotation: targetRotationRef.current,
      hasMoved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const delta = event.clientX - drag.startX;
    if (!drag.hasMoved && Math.abs(delta) < DRAG_THRESHOLD) {
      return;
    }

    if (!drag.hasMoved) {
      drag.hasMoved = true;
      setActiveZoneHovered(false);
      setHoveredIndex(null);
      isDraggingRef.current = true;
      setIsDragging(true);
      startMotionLoop("drag");
    }

    const divisor = isTouchRef.current ? TOUCH_DRAG_DIVISOR : DRAG_DISTANCE_DIVISOR;
    targetRotationRef.current = drag.startRotation - delta / divisor;
  };

  const finishDrag = (pointerId: number, currentTarget: HTMLDivElement) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== pointerId) {
      return;
    }

    dragState.current = null;
    currentTarget.releasePointerCapture(pointerId);
    if (drag.hasMoved) {
      isDraggingRef.current = false;
      setIsDragging(false);
      stopMotionLoop();
      targetRotationRef.current = Math.round(targetRotationRef.current);
      startMotionLoop("snap");
      return;
    }

    isDraggingRef.current = false;
    setIsDragging(false);
  };

  const cardDragHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) =>
      finishDrag(event.pointerId, event.currentTarget),
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) =>
      finishDrag(event.pointerId, event.currentTarget),
  };

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "18px",
        width: "100%",
        position: "relative",
        zIndex: 1,
        pointerEvents: "none",
      }}
    >
      {/* Sci-fi grid floor */}
      <div className="stage-floor" />
      <div
        ref={stageRef}
        style={{
          position: "relative",
          width: "100%",
          height: CARD_H * stageScale + 84,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          perspective: "1700px",  // tighter perspective = more dramatic 3D
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: CARD_H + 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${stageScale})`,
            transformOrigin: "center center",
            pointerEvents: "none",
          }}
        >
          {projects.map((project, index) => {
            const offset = getCircularOffset(index, rotation, projects.length);
            const isActive = index === activeIndex;
            const isHovered = isActive ? activeZoneHovered : hoveredIndex === index;
            const transform = getTransform(offset, projects.length, isHovered);

            if (isActive) {
              return (
                <motion.div
                  key={project.id}
                  animate={{
                    x: transform.x,
                    y: transform.y - LINK_ZONE / 2,
                    scale: transform.scale,
                    rotateY: transform.rotateY,
                    rotateX: transform.rotateX,
                    z: transform.z,
                    opacity: transform.opacity,
                  }}
                  transition={INSTANT}
                  style={{
                    position: "absolute",
                    width: CARD_W,
                    height: CARD_H + LINK_ZONE,
                    zIndex: transform.zIndex + 20,
                    transformStyle: "preserve-3d",
                    willChange: "transform",
                    pointerEvents: "auto",
                    cursor: isDragging ? "grabbing" : "grab",
                    touchAction: "pan-y",
                  }}
                  {...cardDragHandlers}
                  onMouseEnter={() => {
                    if (!isDragging) {
                      setActiveZoneHovered(true);
                    }
                  }}
                  onMouseLeave={() => setActiveZoneHovered(false)}
                >
                  {(isTouchDevice || activeZoneHovered) ? (
                    <div
                      style={{
                        position: "absolute",
                        top: LINK_TOP_MARGIN,
                        left: 0,
                        width: "100%",
                        display: "flex",
                        justifyContent: "center",
                        pointerEvents: "none",
                        zIndex: 260,
                      }}
                    >
                      <motion.a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={isTouchDevice ? false : { opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.24, ease: "easeOut" }}
                        onPointerDown={(event) => event.stopPropagation()}
                        style={{
                          marginLeft: `${LINK_CENTER_NUDGE}px`,
                          pointerEvents: isDragging ? "none" : "auto",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "10px",
                          height: LINK_HEIGHT,
                          padding: "0 16px",
                          borderRadius: "999px",
                          border: "1px solid rgba(195, 231, 255, 0.18)",
                          background: "rgba(8, 12, 20, 0.88)",
                          boxShadow: "0 16px 38px rgba(0,0,0,0.32)",
                          textDecoration: "none",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontFamily: "'JetBrains Mono', monospace",
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: "rgba(174, 227, 255, 0.72)",
                          }}
                        >
                          Open Project
                        </span>
                        <span
                          style={{
                            fontSize: "0.76rem",
                            color: "#edf4ff",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {project.link.replace("https://", "")}
                        </span>
                        <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                          <path
                            d="M2 8L8 2M8 2H4M8 2V6"
                            stroke="#9fe8ff"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </motion.a>
                    </div>
                  ) : null}

                  {/* Card body — no extra motion.div needed, rotateY/X live on the parent */}
                  <div
                    className="card-active-glow"
                    style={{
                      position: "absolute",
                      top: LINK_ZONE,
                      left: 0,
                      width: CARD_W,
                      height: CARD_H,
                      transformStyle: "preserve-3d",
                      borderRadius: "var(--radius-card)",
                    }}
                  >
                    <ProjectCard
                      project={project}
                      isActive
                      isHovered={activeZoneHovered}
                    />
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={project.id}
                animate={{
                  x: transform.x,
                  y: transform.y,
                  scale: transform.scale,
                  rotateY: transform.rotateY,
                  rotateX: transform.rotateX,
                  z: transform.z,
                  opacity: isMobile ? 0 : transform.opacity,
                }}
                transition={INSTANT}
                onHoverStart={() => !isDragging && setHoveredIndex(index)}
                onHoverEnd={() => setHoveredIndex((value) => (value === index ? null : value))}
                style={{
                  position: "absolute",
                  width: CARD_W,
                  height: CARD_H,
                  zIndex: transform.zIndex,
                  transformStyle: "preserve-3d",
                  boxShadow: "var(--card-shadow)",
                  borderRadius: "var(--radius-card)",
                  willChange: "transform",
                  pointerEvents: isMobile ? "none" : "auto",
                  cursor: isDragging ? "grabbing" : "grab",
                  touchAction: "pan-y",
                }}
                {...cardDragHandlers}
              >
                <ProjectCard
                  project={project}
                  isActive={false}
                  isHovered={hoveredIndex === index}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      <div style={{ pointerEvents: "auto" }}>
        <DotIndicators
          count={projects.length}
          active={activeIndex}
          onSelect={focusProject}
        />
      </div>
    </section>
  );
}
