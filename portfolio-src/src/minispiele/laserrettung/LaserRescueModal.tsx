import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LaserRescueArena from "./LaserRescueArena";

type ModalStage = "prompt" | "arena";

interface LaserRescueModalProps {
  onClose: () => void;
  onComplete?: () => void;
}

const PANEL: React.CSSProperties = {
  background: "rgba(4,10,24,0.98)",
  border: "1px solid rgba(0,180,255,0.25)",
  borderRadius: 18,
  boxShadow: "0 24px 64px rgba(0,0,0,0.78), 0 0 0 1px rgba(0,120,200,0.08)",
  position: "relative",
  color: "rgba(210,230,255,0.88)",
  fontFamily: "Inter, sans-serif",
};

const CLOSE_BTN: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(8,12,20,0.84)",
  color: "#eef6ff",
  fontSize: "1.2rem",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2,
};

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

export default function LaserRescueModal({ onClose, onComplete }: LaserRescueModalProps) {
  const [stage, setStage] = useState<ModalStage>("prompt");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "safe center",
        justifyContent: "center",
        overflowY: "auto",
        padding: 8,
        background: "rgba(2, 4, 10, 0.68)",
        backdropFilter: "blur(10px)",
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <AnimatePresence mode="wait">
        {stage === "prompt" ? (
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
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(50,200,100,0.10)",
              border: "1px solid rgba(80,220,130,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.8rem",
              marginBottom: 18,
            }}>
              🎯
            </div>

            {/* Label */}
            <div style={{
              ...MONO,
              fontSize: "0.62rem",
              color: "rgba(126, 220, 255, 0.70)",
              letterSpacing: "0.14em",
              marginBottom: 8,
            }}>
              ABWEHR-MODUL
            </div>

            {/* Title */}
            <h2 style={{
              margin: "0 0 12px",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#e8f4ff",
              lineHeight: 1.25,
            }}>
              Laser Kalibrierung
            </h2>

            {/* Description */}
            <p style={{
              margin: "0 0 20px",
              fontSize: "0.82rem",
              color: "rgba(160,200,240,0.72)",
              lineHeight: 1.6,
            }}>
              Zielobjekt{" "}
              <strong style={{ color: "rgba(230,90,80,0.95)" }}>Red</strong>{" "}
              bewegt sich durch den Erfassungsbereich. Richte den Abwehrlaser
              manuell aus und treffe ihn 5 mal um die Kalibrierung abzuschließen.
            </p>

            {/* Info chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {["Bewegliches Ziel", "Manuell steuern", "Präzision nötig"].map((c) => (
                <span key={c} style={{
                  ...MONO,
                  fontSize: "0.58rem",
                  color: "rgba(100,180,255,0.8)",
                  background: "rgba(0,100,200,0.12)",
                  border: "1px solid rgba(0,130,255,0.2)",
                  borderRadius: 6,
                  padding: "3px 9px",
                  letterSpacing: "0.06em",
                }}>
                  {c}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setStage("arena")}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  background: "rgba(50,180,100,0.14)",
                  border: "1px solid rgba(80,220,130,0.50)",
                  borderRadius: 10,
                  color: "rgba(140,240,180,0.95)",
                  ...MONO,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  boxShadow: "0 0 14px rgba(60,200,110,0.10)",
                }}
              >
                ABWEHR STARTEN ▶
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "11px 18px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10,
                  color: "rgba(160,200,255,0.55)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Später
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="arena"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <LaserRescueArena onAbort={onClose} onComplete={() => { onComplete?.(); onClose(); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
