import { useState, useEffect, useRef, useCallback } from "react";

// ─── Konami code sequence ─────────────────────────────────────────────────────
const KONAMI = [
  "ArrowUp", "ArrowUp",
  "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight",
  "ArrowLeft", "ArrowRight",
  "b", "a",
];

// ─── Random position within visible viewport ──────────────────────────────────
function getRandomPos(boxW: number, boxH: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxX = Math.max(20, vw - boxW - 20);
  const maxY = Math.max(20, vh - boxH - 20);
  return {
    x: 20 + Math.random() * (maxX - 20),
    y: 20 + Math.random() * (maxY - 20),
  };
}

// ─── Annoying video window ────────────────────────────────────────────────────
function CheatSuiteVideoWindow({ onClose }: { onClose: () => void }) {
  const BOX_W = Math.min(480, typeof window !== "undefined" ? window.innerWidth - 32 : 480);
  const BOX_H = 360;

  const [pos, setPos] = useState(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      x: Math.max(16, (vw - BOX_W) / 2),
      y: Math.max(16, (vh - BOX_H) / 2),
    };
  });
  const [canClose, setCanClose] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const closeRef = useRef<HTMLButtonElement>(null);
  const jumping = useRef(false);

  // Countdown to allow close
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          setCanClose(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Proximity detection — jump away from close button
  useEffect(() => {
    if (canClose) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (jumping.current || !closeRef.current) return;
      const rect = closeRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (Math.hypot(e.clientX - cx, e.clientY - cy) < 110) {
        jumping.current = true;
        setPos(getRandomPos(BOX_W, BOX_H));
        setTimeout(() => { jumping.current = false; }, 400);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [canClose, BOX_W]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2100, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          width: BOX_W,
          background: "rgba(4,10,26,0.99)",
          border: "1.5px solid rgba(255,90,40,0.55)",
          borderRadius: 14,
          boxShadow: "0 10px 60px rgba(255,60,10,0.35), 0 0 0 1px rgba(255,80,30,0.1)",
          pointerEvents: "auto",
          overflow: "hidden",
          transition: "left 0.22s cubic-bezier(0.34,1.56,0.64,1), top 0.22s cubic-bezier(0.34,1.56,0.64,1)",
          userSelect: "none",
        }}
      >
        {/* Title bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 14px",
          background: "rgba(255,70,20,0.07)",
          borderBottom: "1px solid rgba(255,90,40,0.22)",
        }}>
          <span style={{
            color: "#ff6644",
            fontSize: "0.82rem",
            fontWeight: 700,
            fontFamily: "'Courier New', monospace",
            letterSpacing: "0.07em",
          }}>
            💀 CHEAT-SUITE.exe
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!canClose && (
              <span style={{
                color: "rgba(255,110,60,0.55)",
                fontSize: "0.7rem",
                fontFamily: "monospace",
                letterSpacing: "0.04em",
              }}>
                {countdown}s
              </span>
            )}
            <button
              ref={closeRef}
              onClick={canClose ? onClose : undefined}
              title={canClose ? "Schließen" : `Noch ${countdown}s warten…`}
              style={{
                background: canClose ? "rgba(255,60,30,0.22)" : "rgba(255,60,30,0.06)",
                border: `1px solid rgba(255,80,40,${canClose ? "0.55" : "0.2"})`,
                borderRadius: 6,
                color: canClose ? "#ff6644" : "rgba(255,90,50,0.3)",
                width: 28,
                height: 28,
                cursor: canClose ? "pointer" : "not-allowed",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                transition: "all 0.25s",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video + transparent blocker so the video itself is never tappable/clickable */}
        <div style={{ position: "relative" }}>
          <video
            src={import.meta.env.BASE_URL + "Cheat-Suite.mp4"}
            autoPlay
            loop
            playsInline
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            style={{
              width: "100%",
              display: "block",
              maxHeight: 300,
              objectFit: "contain",
              background: "#000",
              pointerEvents: "none",
            }}
          />
          {/* Full-size overlay — absorbs all pointer/touch events on the video */}
          <div style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            cursor: "default",
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Konami input modal ───────────────────────────────────────────────────────
export default function CheatSuiteModal({ onClose }: { onClose: () => void }) {
  const [sequence, setSequence] = useState<string[]>([]);
  const [videoOpen, setVideoOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const seqRef = useRef<string[]>([]);
  seqRef.current = sequence;

  const handleInput = useCallback((key: string) => {
    const current = seqRef.current;
    const expected = KONAMI[current.length];
    if (key === expected) {
      const next = [...current, key];
      if (next.length === KONAMI.length) {
        setSequence(next);
        setTimeout(() => setVideoOpen(true), 250);
      } else {
        setSequence(next);
      }
    } else {
      setShake(true);
      setSequence([]);
      setTimeout(() => setShake(false), 520);
    }
  }, []);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        handleInput(e.key);
      } else if (e.key.toLowerCase() === "b") {
        handleInput("b");
      } else if (e.key.toLowerCase() === "a") {
        handleInput("a");
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleInput, onClose]);

  if (videoOpen) {
    return <CheatSuiteVideoWindow onClose={onClose} />;
  }

  const dpadButtons = [
    { key: "ArrowUp",    label: "↑", col: 2, row: 1 },
    { key: "ArrowLeft",  label: "←", col: 1, row: 2 },
    { key: "ArrowRight", label: "→", col: 3, row: 2 },
    { key: "ArrowDown",  label: "↓", col: 2, row: 3 },
  ] as const;

  const actionButtons = [
    { key: "b", label: "B", color: "#5599ff", shadow: "68,136,255" },
    { key: "a", label: "A", color: "#ff4466", shadow: "255,68,100" },
  ] as const;

  return (
    <>
      <style>{`
        @keyframes cheat-shake {
          0%,100% { transform: translateX(0); }
          15%,55%  { transform: translateX(-10px); }
          35%,75%  { transform: translateX(10px); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: "rgba(2,4,10,0.88)",
          backdropFilter: "blur(5px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 2001,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          background: "rgba(6,14,30,0.99)",
          border: "1.5px solid rgba(255,90,40,0.42)",
          borderRadius: 20,
          padding: "30px 34px 26px",
          maxWidth: 420,
          width: "90%",
          boxShadow: "0 20px 80px rgba(255,50,10,0.22), 0 0 0 1px rgba(255,90,40,0.08)",
          pointerEvents: "auto",
          animation: shake ? "cheat-shake 0.52s cubic-bezier(0.36,0.07,0.19,0.97)" : undefined,
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: "1.35rem" }}>🎮</span>
            <span style={{
              color: "#ff6644",
              fontFamily: "'Courier New', monospace",
              fontWeight: 800,
              fontSize: "1.15rem",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}>
              CHEAT-SUITE
            </span>
          </div>
          <p style={{
            color: "rgba(190,215,255,0.78)",
            fontSize: "0.88rem",
            lineHeight: 1.65,
            margin: "0 0 22px",
          }}>
            Um alle Minispiele zu skippen und direkt zum Endboss&#8209;Minispiel zu gelangen, bitte Konami&#8209;Code eingeben.
          </p>

          {/* Progress bar */}
          <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 26 }}>
            {KONAMI.map((_, i) => (
              <div key={i} style={{
                width: 24,
                height: 5,
                borderRadius: 3,
                background: shake
                  ? "rgba(255,60,60,0.45)"
                  : i < sequence.length
                    ? "#ff6644"
                    : "rgba(255,255,255,0.1)",
                transition: "background 0.18s",
                boxShadow: (!shake && i < sequence.length) ? "0 0 7px rgba(255,100,60,0.55)" : "none",
              }} />
            ))}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 36 }}>
            {/* D-Pad */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 44px)",
              gridTemplateRows: "repeat(3, 44px)",
              gap: 4,
            }}>
              {dpadButtons.map(btn => (
                <button
                  key={btn.key}
                  onClick={() => handleInput(btn.key)}
                  style={{
                    gridColumn: btn.col,
                    gridRow: btn.row,
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.07)",
                    border: "1.5px solid rgba(255,255,255,0.14)",
                    color: "rgba(200,220,255,0.85)",
                    fontSize: "1.25rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    transition: "transform 0.08s, background 0.08s",
                  }}
                  onMouseDown={e => {
                    e.currentTarget.style.transform = "scale(0.9)";
                    e.currentTarget.style.background = "rgba(255,100,60,0.22)";
                  }}
                  onMouseUp={e => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  }}
                >
                  {btn.label}
                </button>
              ))}
              {/* Center filler */}
              <div style={{ gridColumn: 2, gridRow: 2, width: 44, height: 44, borderRadius: 6, background: "rgba(255,255,255,0.03)" }} />
            </div>

            {/* A / B buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
              {actionButtons.map(btn => (
                <button
                  key={btn.key}
                  onClick={() => handleInput(btn.key)}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    background: `rgba(${btn.shadow}, 0.13)`,
                    border: `1.5px solid rgba(${btn.shadow}, 0.38)`,
                    color: btn.color,
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    fontFamily: "monospace",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    transition: "transform 0.08s",
                  }}
                  onMouseDown={e => { e.currentTarget.style.transform = "scale(0.9)"; }}
                  onMouseUp={e => { e.currentTarget.style.transform = ""; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {shake && (
            <div style={{
              textAlign: "center",
              marginTop: 18,
              color: "rgba(255,80,60,0.7)",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              letterSpacing: "0.06em",
            }}>
              ✗ FALSCHER CODE — SEQUENCE RESET
            </div>
          )}

          {/* Cancel */}
          <button
            onClick={onClose}
            style={{
              marginTop: 22,
              display: "block",
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "rgba(130,155,190,0.38)",
              cursor: "pointer",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              letterSpacing: "0.04em",
            }}
          >
            [ESC] Abbrechen
          </button>
        </div>
      </div>
    </>
  );
}
