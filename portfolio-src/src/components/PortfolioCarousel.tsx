import { useMemo, useRef, useState, useEffect } from "react";
import { projects } from "../data/projects";
import ProjectCard from "./ProjectCard";

const CARD_W = 486;
const CARD_H = 606;

export default function PortfolioCarousel() {
  const initialIndex = useMemo(
    () => Math.max(0, projects.findIndex((p) => p.id === "iot-alarm")),
    [],
  );
  const [active, setActive] = useState(initialIndex);
  const [stageScale, setStageScale] = useState(0.72);
  const [isMobile, setIsMobile] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 580) {
        setIsMobile(true);
        setStageScale(Math.min(0.58, Math.max(0.36, (w * 0.68) / CARD_W)));
      } else {
        setIsMobile(false);
        const natural = (CARD_W + 300) * 2;
        setStageScale(Math.min(0.72, Math.max(0.48, Math.max(0, w - 96) / natural)));
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % projects.length);
      else if (e.key === "ArrowLeft") setActive((i) => (i - 1 + projects.length) % projects.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const total = projects.length;

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        width: "100%",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div className="stage-floor" />

      {/* Coverflow stage */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: CARD_H * stageScale + 40,
          perspective: "1800px",
          perspectiveOrigin: "50% 40%",
          overflow: "visible",
        }}
        onWheel={(e) => {
          e.preventDefault();
          setActive((i) => {
            const next = i + (e.deltaY > 0 ? 1 : -1);
            return ((next % total) + total) % total;
          });
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchStart.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          if (!touchStart.current) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - touchStart.current.x;
          const dy = t.clientY - touchStart.current.y;
          touchStart.current = null;
          if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
          setActive((i) => {
            const next = i + (dx < 0 ? 1 : -1);
            return ((next % total) + total) % total;
          });
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${stageScale})`,
            transformOrigin: "center center",
          }}
        >
          {projects.map((project, index) => {
            // Circular offset
            let offset = index - active;
            while (offset > total / 2) offset -= total;
            while (offset < -total / 2) offset += total;

            if (isMobile && offset !== 0) return null;

            const isCenter = offset === 0;
            const absOff = Math.abs(offset);

            // Position: center card at 0, others spread out with gap
            const x = offset * 320;
            const z = isCenter ? 200 : 200 - absOff * 120;
            const rotateY = 0;
            const scale = isCenter ? 1 : Math.max(0.65, 1 - absOff * 0.15);
            const opacity = absOff > 2 ? 0 : 1;
            const zIndex = 100 - absOff * 10;

            return (
              <div
                key={project.id}
                onClick={() => !isCenter && setActive(index)}
                style={{
                  position: "absolute",
                  width: CARD_W,
                  height: CARD_H,
                  transform: `translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  transition: "transform 0.45s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.35s ease",
                  cursor: isCenter ? "default" : "pointer",
                  borderRadius: "var(--radius-card, 16px)",
                  overflow: "visible",
                  transformStyle: "preserve-3d",
                  pointerEvents: opacity === 0 ? "none" : "auto",
                }}
              >
                <ProjectCard
                  project={project}
                  isActive={isCenter}
                  isHovered={false}
                />

                {/* Link — only on center card, above the card */}
                {isCenter && (
                  <div
                    style={{
                      position: "absolute",
                      top: -52,
                      left: 0,
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      zIndex: 300,
                    }}
                  >
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "10px",
                        height: 40,
                        padding: "0 16px",
                        borderRadius: "999px",
                        border: "1px solid rgba(195, 231, 255, 0.18)",
                        background: "rgba(8, 12, 20, 0.88)",
                        boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
                        textDecoration: "none",
                        userSelect: "none",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.66rem",
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
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {projects.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              width: i === active ? 22 : 6,
              height: 6,
              borderRadius: 3,
              background: "var(--accent, #4ade80)",
              border: "none",
              cursor: "pointer",
              padding: 0,
              outline: "none",
              opacity: i === active ? 1 : 0.3,
              transition: "width 0.25s ease, opacity 0.25s ease",
            }}
            aria-label={`Go to project ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
