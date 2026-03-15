import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScrapSorterGame from "./ScrapSorterGame";

type ModalStage = "prompt" | "game";

interface ScrapSorterModalProps {
  onClose: () => void;
  onComplete?: () => void;
}

const PANEL: React.CSSProperties = {
  background: "rgba(4,10,24,0.98)",
  border: "1px solid rgba(0,160,255,0.28)",
  borderRadius: 18,
  boxShadow: "0 24px 64px rgba(0,0,0,0.78), 0 0 0 1px rgba(0,120,200,0.08)",
  position: "relative",
  color: "rgba(210,230,255,0.88)",
  fontFamily: "Inter, sans-serif",
};

const CLOSE_BTN: React.CSSProperties = {
  position: "absolute", top: 14, right: 14,
  width: 40, height: 40, borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(8,12,20,0.84)",
  color: "#eef6ff", fontSize: "1.2rem",
  cursor: "pointer", display: "flex",
  alignItems: "center", justifyContent: "center",
  zIndex: 2,
};

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

export default function ScrapSorterModal({ onClose, onComplete }: ScrapSorterModalProps) {
  const [stage, setStage] = useState<ModalStage>("prompt");

  const handleComplete = () => {
    onComplete?.();
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 64,
        display: "flex", alignItems: "safe center", justifyContent: "center",
        overflowY: "auto",
        background: "rgba(2,4,10,0.72)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        padding: 8,
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <AnimatePresence mode="wait">

        {/* ── PROMPT STAGE ── */}
        {stage === "prompt" && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{ ...PANEL, width: "min(calc(100vw - 16px), 420px)", padding: "28px 20px 24px" }}
          >
            <button style={CLOSE_BTN} onClick={onClose}>×</button>

            {/* Icon */}
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "rgba(0,120,200,0.14)",
              border: "1px solid rgba(0,160,255,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.8rem", marginBottom: 18,
            }}>
              🏗️
            </div>

            {/* Label */}
            <div style={{
              ...MONO, fontSize: "0.62rem",
              color: "rgba(0,160,255,0.7)",
              letterSpacing: "0.14em", marginBottom: 8,
            }}>
              SORTIERANLAGE
            </div>

            {/* Title */}
            <h2 style={{
              margin: "0 0 12px", fontSize: "1.25rem",
              fontWeight: 700, color: "#e8f4ff",
              lineHeight: 1.25,
            }}>
              Schrottteile sortieren
            </h2>

            {/* Description */}
            <p style={{
              margin: "0 0 20px", fontSize: "0.82rem",
              color: "rgba(160,200,240,0.72)", lineHeight: 1.6,
            }}>
              Cranee muss Schrottteile einsammeln und in die
              Sortierzone transportieren — Sei dabei Vorsichtig mit den Teilen, aus denen wollen wir ein Raumschiff bauen.
            </p>

            {/* Chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {["4 Teile", "3D Isometrie", "Pfeiltasten + WASD"].map((c) => (
                <span key={c} style={{
                  ...MONO, fontSize: "0.58rem",
                  color: "rgba(100,180,255,0.8)",
                  background: "rgba(0,100,200,0.12)",
                  border: "1px solid rgba(0,130,255,0.2)",
                  borderRadius: 6, padding: "3px 9px",
                  letterSpacing: "0.06em",
                }}>
                  {c}
                </span>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => setStage("game")}
              style={{
                width: "100%", padding: "11px 0",
                background: "rgba(0,120,200,0.16)",
                border: "1px solid rgba(0,160,255,0.55)",
                borderRadius: 10,
                color: "rgba(160,216,255,0.95)",
                ...MONO, fontSize: "0.78rem",
                fontWeight: 700, letterSpacing: "0.08em",
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(0,160,255,0.12)",
              }}
            >
              SORTIERUNG STARTEN ▶
            </button>
          </motion.div>
        )}

        {/* ── GAME STAGE ── */}
        {stage === "game" && (
          <motion.div
            key="game"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ ...PANEL, width: "min(calc(100vw - 16px), 1116px)", padding: "18px 18px 16px", overflowX: "auto" }}
          >
            <button style={CLOSE_BTN} onClick={onClose}>×</button>

            {/* Title bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
            }}>
              <span style={{
                ...MONO, fontSize: "0.6rem",
                color: "rgba(0,160,255,0.55)", letterSpacing: "0.12em",
              }}>
                SORTIERANLAGE
              </span>
              <span style={{
                ...MONO, fontSize: "0.6rem",
                color: "rgba(100,160,220,0.4)",
              }}>
                — Greifarm-Kalibrierung
              </span>
            </div>

            <ScrapSorterGame onComplete={handleComplete} />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
