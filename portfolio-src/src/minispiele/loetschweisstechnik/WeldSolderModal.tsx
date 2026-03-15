import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WeldingGame from "./WeldingGame";
import SolderingGame from "./SolderingGame";

type Stage = "intro" | "welding" | "soldering";

interface WeldSolderModalProps {
  onClose: () => void;
  onComplete: () => void;
}

const PANEL: React.CSSProperties = {
  background: "rgba(4,10,24,0.98)",
  border: "1px solid rgba(255,140,40,0.26)",
  borderRadius: 18,
  boxShadow: "0 24px 64px rgba(0,0,0,0.78), 0 0 0 1px rgba(200,100,20,0.08)",
  position: "relative",
  color: "rgba(255,220,180,0.88)",
  fontFamily: "Inter, sans-serif",
};

const CLOSE_BTN: React.CSSProperties = {
  position: "absolute",
  top: 14, right: 14,
  width: 40, height: 40,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(8,12,20,0.84)",
  color: "#eef6ff",
  fontSize: "1.2rem",
  cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 2,
};

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

export default function WeldSolderModal({ onClose, onComplete }: WeldSolderModalProps) {
  const [stage, setStage] = useState<Stage>("intro");

  const handleSolderingComplete = () => {
    onComplete();
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
        zIndex: 60,
        display: "flex",
        alignItems: "safe center",
        justifyContent: "center",
        overflowY: "auto",
        padding: 8,
        background: "rgba(2,4,10,0.68)",
        backdropFilter: "blur(10px)",
      }}
      onMouseDown={(event) => {
        if (stage === "intro" && event.target === event.currentTarget) onClose();
      }}
    >
      <AnimatePresence mode="wait">
        {stage === "intro" && (
          <motion.div
            key="intro"
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
              background: "rgba(255,140,20,0.10)",
              border: "1px solid rgba(255,160,40,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.8rem", marginBottom: 18,
            }}>
              🔧
            </div>

            {/* Lab label */}
            <div style={{
              ...MONO,
              fontSize: "0.62rem",
              color: "rgba(255,180,80,0.72)",
              letterSpacing: "0.14em",
              marginBottom: 8,
            }}>
              FERTIGUNGSMODUL · ASSEMBLY LAB
            </div>

            {/* Title */}
            <h2 style={{
              margin: "0 0 12px",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#fff5e8",
              lineHeight: 1.25,
            }}>
              Löt- &amp; Schweißtechnik
            </h2>

            {/* Description */}
            <p style={{
              margin: "0 0 20px",
              fontSize: "0.82rem",
              color: "rgba(220,180,130,0.72)",
              lineHeight: 1.6,
            }}>
              Zwei Metallteile müssen per Schutzgasschweißung verbunden werden — präzise
              innerhalb der Zielnaht, mit nachgeführter Schweißmaske. Anschließend wird eine
              PCB-Platine mit drei Bauteilen gelötet: Lötkolben positionieren, Pad gleichmäßig
              erwärmen, Lötzinn kontrolliert zuführen.
            </p>

            {/* Info chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {["2 Level", "Präzisionsarbeit", "Wärmemanagement", "Schutzmaske"].map((c) => (
                <span key={c} style={{
                  ...MONO,
                  fontSize: "0.58rem",
                  color: "rgba(255,190,80,0.82)",
                  background: "rgba(200,100,20,0.10)",
                  border: "1px solid rgba(220,130,30,0.22)",
                  borderRadius: 6,
                  padding: "3px 9px",
                  letterSpacing: "0.06em",
                }}>
                  {c}
                </span>
              ))}
            </div>

            {/* Level overview */}
            <div style={{
              display: "flex", flexDirection: "column", gap: 8, marginBottom: 22,
            }}>
              {[
                {
                  n: "01", title: "Schweißen",
                  desc: "Naht entlang Sollbereich führen · Maske nachziehen · Tempo kontrollieren",
                  color: "rgba(255,140,30,0.8)",
                },
                {
                  n: "02", title: "Löten",
                  desc: "3 Lötpads erwärmen · Lötzinn präzise dosieren · Überhitzung vermeiden",
                  color: "rgba(60,200,140,0.75)",
                },
              ].map(l => (
                <div key={l.n} style={{
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10,
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <span style={{
                    ...MONO, fontSize: "0.65rem",
                    color: l.color, fontWeight: 700,
                    paddingTop: 2, flexShrink: 0,
                  }}>
                    {l.n}
                  </span>
                  <div>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "rgba(255,240,210,0.9)", marginBottom: 3 }}>
                      {l.title}
                    </div>
                    <div style={{ ...MONO, fontSize: "0.62rem", color: "rgba(200,170,120,0.55)", lineHeight: 1.5 }}>
                      {l.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setStage("welding")}
                style={{
                  flex: 1, padding: "11px 0",
                  background: "rgba(200,100,20,0.14)",
                  border: "1px solid rgba(255,150,50,0.50)",
                  borderRadius: 10,
                  color: "rgba(255,200,100,0.95)",
                  ...MONO,
                  fontSize: "0.78rem", fontWeight: 700,
                  letterSpacing: "0.08em", cursor: "pointer",
                  boxShadow: "0 0 14px rgba(220,120,20,0.10)",
                }}
              >
                FERTIGUNGSMODUL STARTEN ▶
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "11px 18px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10,
                  color: "rgba(200,170,120,0.55)",
                  fontSize: "0.82rem", fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Später
              </button>
            </div>
          </motion.div>
        )}

        {stage === "welding" && (
          <motion.div
            key="welding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <WeldingGame
              onComplete={() => setStage("soldering")}
              onAbort={onClose}
            />
          </motion.div>
        )}

        {stage === "soldering" && (
          <motion.div
            key="soldering"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <SolderingGame
              onComplete={handleSolderingComplete}
              onAbort={onClose}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
