import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TrajectoryCalibrationGame from "./TrajectoryCalibrationGame";

type ModalStage = "prompt" | "game";

interface TrajectoryCalibrationModalProps {
  onClose: () => void;
  onComplete?: () => void;
}

const PANEL_STYLE: React.CSSProperties = {
  background: "rgba(6,14,32,0.98)",
  border: "1px solid rgba(0,180,255,0.28)",
  borderRadius: 18,
  boxShadow: "0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,180,255,0.08)",
  position: "relative",
  color: "rgba(220,235,255,0.88)",
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
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2,
};

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

export default function TrajectoryCalibrationModal({
  onClose,
  onComplete,
}: TrajectoryCalibrationModalProps) {
  const [stage, setStage] = useState<ModalStage>("prompt");

  const handleComplete = () => {
    onComplete?.();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 64,
        display: "flex",
        alignItems: "safe center",
        justifyContent: "center",
        overflowY: "auto",
        padding: "8px",
        background: "rgba(2,4,10,0.72)",
        backdropFilter: "blur(10px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <AnimatePresence mode="wait">
        {/* ── Prompt stage ── */}
        {stage === "prompt" && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ ...PANEL_STYLE, width: "min(calc(100vw - 16px), 420px)", padding: "28px 24px 26px" }}
          >
            <button onClick={onClose} style={CLOSE_BTN} aria-label="Schließen">×</button>

            {/* Robot icon */}
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "rgba(220,50,30,0.12)",
              border: "1px solid rgba(220,80,50,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
              fontSize: "1.6rem",
            }}>
              🎯
            </div>

            {/* Label */}
            <div style={{
              ...MONO,
              fontSize: "0.6rem",
              letterSpacing: "0.14em",
              color: "rgba(220,80,50,0.8)",
              marginBottom: 8,
            }}>
              ABWURF-EINHEIT
            </div>

            <h2 style={{
              fontSize: "1.15rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#eef4ff",
              margin: "0 0 12px",
            }}>
              Kalibrierung erforderlich
            </h2>

            <p style={{
              fontSize: "0.85rem",
              lineHeight: 1.65,
              color: "rgba(160,185,220,0.85)",
              margin: "0 0 10px",
            }}>
              Meine Abwurfeinheit ist dejustiert — Hilfst du mir, die Parameter neu einzustellen?
            </p>
            <p style={{
              fontSize: "0.82rem",
              lineHeight: 1.6,
              color: "rgba(140,170,210,0.7)",
              margin: "0 0 24px",
            }}>
              Stelle <strong style={{ color: "rgba(200,225,255,0.85)" }}>Drehzahl</strong>,{" "}
              <strong style={{ color: "rgba(200,225,255,0.85)" }}>Loslasspunkt</strong>,{" "}
              <strong style={{ color: "rgba(200,225,255,0.85)" }}>Wurfmasse</strong> und{" "}
              <strong style={{ color: "rgba(200,225,255,0.85)" }}>Winkel</strong> so ein,
              dass du den Roomba{" "}
              <strong style={{ color: "rgba(200,225,255,0.85)" }}>3× triffst</strong>.
            </p>

            {/* Info chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 26 }}>
              {["4 Parameter", "3 Treffer nötig", "Physik-Simulation"].map((label) => (
                <span key={label} style={{
                  ...MONO,
                  fontSize: "0.62rem",
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "rgba(0,180,255,0.08)",
                  border: "1px solid rgba(0,180,255,0.2)",
                  color: "rgba(120,190,255,0.8)",
                }}>
                  {label}
                </span>
              ))}
            </div>

            <button
              onClick={() => setStage("game")}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                border: "1px solid rgba(255,180,40,0.5)",
                background: "rgba(255,180,40,0.1)",
                color: "#ffb830",
                fontSize: "0.82rem",
                fontWeight: 700,
                ...MONO,
                letterSpacing: "0.08em",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,180,40,0.18)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(255,180,40,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,180,40,0.1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              KALIBRIERUNG STARTEN ▶
            </button>
          </motion.div>
        )}

        {/* ── Game stage ── */}
        {stage === "game" && (
          <motion.div
            key="game"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ ...PANEL_STYLE, width: "min(calc(100vw - 16px), 744px)", overflow: "hidden" }}
          >
            <button onClick={onClose} style={CLOSE_BTN} aria-label="Schließen">×</button>

            {/* Header */}
            <div style={{
              padding: "16px 22px 14px",
              borderBottom: "1px solid rgba(0,180,255,0.12)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ffb830",
                boxShadow: "0 0 8px rgba(255,180,40,0.6)",
                flexShrink: 0,
              }} />
              <span style={{ ...MONO, fontSize: "0.7rem", letterSpacing: "0.1em", color: "rgba(0,180,255,0.85)" }}>
                ABWURF-KALIBRIERUNG
              </span>
              <span style={{ ...MONO, fontSize: "0.6rem", color: "rgba(100,140,200,0.5)", marginLeft: "auto", marginRight: 48 }}>
                TRAJEKTORIE-LAB
              </span>
            </div>

            {/* Game content */}
            <div style={{ padding: "16px 18px 18px" }}>
              <TrajectoryCalibrationGame onComplete={handleComplete} />
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
