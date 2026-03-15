import { useState } from "react";
import { motion } from "framer-motion";
import SrLatchPuzzle from "./SrLatchPuzzle";

type ModalStage = "prompt" | "puzzle" | "success";

interface InspectorLatchModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export default function InspectorLatchModal({
  onClose,
  onComplete,
}: InspectorLatchModalProps) {
  const [stage, setStage] = useState<ModalStage>("prompt");

  const closeButton = (
    <button
      type="button"
      aria-label="Pruefschaltung schliessen"
      onClick={onClose}
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        zIndex: 2,
        width: 40,
        height: 40,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(8, 12, 20, 0.84)",
        color: "#eef6ff",
        fontSize: "1.2rem",
        lineHeight: 1,
        cursor: "pointer",
        boxShadow: "0 10px 22px rgba(0,0,0,0.28)",
      }}
    >
      X
    </button>
  );

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
        padding: 8,
        background: "rgba(2, 4, 10, 0.72)",
        backdropFilter: "blur(10px)",
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {stage === "prompt" && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{
            position: "relative",
            width: "min(calc(100vw - 16px), 420px)",
            background: "rgba(6,4,18,0.98)",
            border: "1px solid rgba(180,140,255,0.22)",
            borderRadius: 18,
            boxShadow: "0 24px 64px rgba(0,0,0,0.78), 0 0 0 1px rgba(120,80,200,0.08)",
            color: "rgba(220,210,255,0.88)",
            fontFamily: "Inter, sans-serif",
            padding: "32px 28px 28px",
          }}
        >
          {closeButton}

          {/* Icon */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "rgba(160,80,255,0.10)",
            border: "1px solid rgba(190,130,255,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.8rem",
            marginBottom: 18,
          }}>
            ⚡
          </div>

          {/* Label */}
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.62rem",
            color: "rgba(210, 160, 255, 0.72)",
            letterSpacing: "0.14em",
            marginBottom: 8,
          }}>
            SR-LATCH-LAB
          </div>

          {/* Title */}
          <h2 style={{
            margin: "0 0 12px",
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#f2eeff",
            lineHeight: 1.25,
          }}>
            Defekte Schaltung rekonstruieren
          </h2>

          {/* Description */}
          <p style={{
            margin: "0 0 20px",
            fontSize: "0.82rem",
            color: "rgba(190,170,230,0.72)",
            lineHeight: 1.6,
          }}>
            Speicherbaustein ausgefallen — Schaltungsdiagramm korrumpiert.
            Rekonstruiere den SR-Latch aus zwei{" "}
            <strong style={{ color: "rgba(210,180,255,0.90)" }}>2-Eingangs-NAND-Gattern</strong>{" "}
            und stelle die Spannungsversorgung (<strong style={{ color: "rgba(210,180,255,0.90)" }}>VCC / GND</strong>) wieder her.
          </p>

          {/* Info chips */}
          <div style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 24,
          }}>
            {["SR-Latch", "2× NAND-Gatter", "Drag & Drop"].map((c) => (
              <span key={c} style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.58rem",
                color: "rgba(190,150,255,0.82)",
                background: "rgba(100,50,200,0.12)",
                border: "1px solid rgba(150,100,255,0.22)",
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
              onClick={() => setStage("puzzle")}
              style={{
                flex: 1,
                padding: "11px 0",
                background: "rgba(130,60,200,0.16)",
                border: "1px solid rgba(190,130,255,0.52)",
                borderRadius: 10,
                color: "rgba(220,180,255,0.95)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                cursor: "pointer",
                boxShadow: "0 0 14px rgba(160,80,255,0.10)",
              }}
            >
              REKONSTRUKTION STARTEN ▶
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "11px 18px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                color: "rgba(180,160,220,0.55)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Später
            </button>
          </div>
        </motion.div>
      )}

      {stage === "puzzle" && (
        <div style={{ position: "relative" }}>
          {closeButton}
          <SrLatchPuzzle
            onAbort={onClose}
            onSolved={() => {
              onComplete();
              setStage("success");
            }}
          />
        </div>
      )}

      {stage === "success" && (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            width: "min(calc(100vw - 16px), 540px)",
            borderRadius: 26,
            border: "1px solid rgba(125, 244, 181, 0.2)",
            background:
              "linear-gradient(180deg, rgba(8, 14, 24, 0.96) 0%, rgba(4, 8, 14, 0.98) 100%)",
            boxShadow: "0 28px 90px rgba(0,0,0,0.44)",
            padding: 28,
          }}
        >
          {closeButton}
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.76rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(126, 220, 255, 0.76)",
            }}
          >
            Reparatur abgeschlossen
          </div>
          <h2
            style={{
              marginTop: 12,
              fontSize: "1.82rem",
              lineHeight: 1.12,
              letterSpacing: "-0.04em",
              color: "#f5f8ff",
            }}
          >
            Glueckwunsch, du hast Coders Terminal repariert.
          </h2>
          <p
            style={{
              marginTop: 14,
              color: "#a6bad8",
              lineHeight: 1.6,
              maxWidth: 470,
            }}
          >
            Terminal freigegeben!
          </p>

          <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid rgba(111, 225, 153, 0.3)",
                background: "linear-gradient(180deg, rgba(40, 110, 70, 0.72), rgba(21, 66, 42, 0.82))",
                color: "#f5fff8",
                borderRadius: 14,
                padding: "12px 18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Zur Werkstatt
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
