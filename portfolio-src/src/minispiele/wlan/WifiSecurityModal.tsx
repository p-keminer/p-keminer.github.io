import { useState } from "react";
import { motion } from "framer-motion";
import WifiSecurityGame from "./WifiSecurityGame";

type ModalStage = "prompt" | "game" | "success";

interface WifiSecurityModalProps {
  onClose: () => void;
  onComplete: () => void;
}

const PANEL: React.CSSProperties = {
  background: "rgba(4,10,24,0.98)",
  border: "1px solid rgba(0,190,255,0.24)",
  borderRadius: 18,
  boxShadow: "0 24px 64px rgba(0,0,0,0.78), 0 0 0 1px rgba(0,120,200,0.08)",
  position: "relative",
  color: "rgba(210,235,255,0.88)",
  fontFamily: "Inter, sans-serif",
};

const CLOSE_BTN: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  zIndex: 2,
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
};

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

export default function WifiSecurityModal({
  onClose,
  onComplete,
}: WifiSecurityModalProps) {
  const [stage, setStage] = useState<ModalStage>("prompt");

  const closeButton = (
    <button type="button" aria-label="Schliessen" onClick={onClose} style={CLOSE_BTN}>
      ×
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
        background: "rgba(2, 4, 10, 0.74)",
        backdropFilter: "blur(10px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* ── Prompt stage ── */}
      {stage === "prompt" && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{ ...PANEL, width: "min(calc(100vw - 16px), 420px)", padding: "28px 20px 24px" }}
        >
          {closeButton}

          {/* Icon */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "rgba(0,160,255,0.10)",
            border: "1px solid rgba(0,200,255,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.8rem",
            marginBottom: 18,
          }}>
            🛡️
          </div>

          {/* Label */}
          <div style={{
            ...MONO,
            fontSize: "0.62rem",
            color: "rgba(0, 200, 255, 0.65)",
            letterSpacing: "0.14em",
            marginBottom: 8,
          }}>
            WLAN · SECURITY LAB
          </div>

          {/* Title */}
          <h2 style={{
            margin: "0 0 12px",
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#e8f4ff",
            lineHeight: 1.25,
          }}>
            Dieser Access Point ist ungesichert.
          </h2>

          {/* Description */}
          <p style={{
            margin: "0 0 20px",
            fontSize: "0.82rem",
            color: "rgba(140,185,220,0.78)",
            lineHeight: 1.6,
          }}>
            Standard-Passwort <strong style={{ color: "rgba(180,225,255,0.90)" }}>wlan1234</strong>,
            WPS aktiv, Gastnetz im selben Segment, Router noch auf WPA2 —
            alle Sicherheitslücken müssen geschlossen werden, bevor jemand
            anderes es tut.
          </p>

          {/* Info chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
            {["WPA2 aktiv", "WPS eingeschaltet", "6 Schwachstellen"].map((c) => (
              <span key={c} style={{
                ...MONO,
                fontSize: "0.58rem",
                color: "rgba(100,200,255,0.82)",
                background: "rgba(0,100,200,0.12)",
                border: "1px solid rgba(0,150,255,0.22)",
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
              onClick={() => setStage("game")}
              style={{
                flex: 1,
                padding: "11px 0",
                background: "rgba(0,140,200,0.16)",
                border: "1px solid rgba(0,200,255,0.50)",
                borderRadius: 10,
                color: "rgba(160,230,255,0.95)",
                ...MONO,
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                cursor: "pointer",
                boxShadow: "0 0 14px rgba(0,180,255,0.10)",
              }}
            >
              LAB STARTEN ▶
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
      )}

      {/* ── Game stage ── */}
      {stage === "game" && (
        <div style={{ position: "relative" }}>
          {closeButton}
          <WifiSecurityGame
            onSolved={() => {
              onComplete();
              setStage("success");
            }}
            onAbort={onClose}
          />
        </div>
      )}

      {/* ── Success stage ── */}
      {stage === "success" && (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            width: "min(calc(100vw - 16px), 520px)",
            borderRadius: 26,
            border: "1px solid rgba(34, 197, 94, 0.22)",
            background:
              "linear-gradient(180deg, rgba(6, 14, 24, 0.97) 0%, rgba(4, 10, 18, 0.99) 100%)",
            boxShadow: "0 32px 90px rgba(0,0,0,0.48), 0 0 60px rgba(0, 200, 100, 0.04)",
            padding: "28px 28px 26px",
          }}
        >
          {closeButton}

          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.67rem",
              letterSpacing: "0.17em",
              textTransform: "uppercase",
              color: "rgba(34, 197, 94, 0.7)",
              marginBottom: 12,
            }}
          >
            Härtung abgeschlossen
          </div>

          <h2
            style={{
              margin: "0 0 14px",
              fontSize: "1.72rem",
              lineHeight: 1.14,
              letterSpacing: "-0.04em",
              color: "#e8fff2",
            }}
          >
            Access Point gehärtet.
          </h2>

          <p
            style={{
              margin: "0 0 20px",
              color: "#7ab898",
              lineHeight: 1.65,
              fontSize: "0.87rem",
              maxWidth: 440,
            }}
          >
            Alle Sicherheitskriterien sind erfüllt. Das Netzwerk ist jetzt
            gegen gängige Angriffsvektoren abgesichert.
          </p>

          {/* Summary checklist */}
          <div
            style={{
              background: "rgba(2, 10, 6, 0.55)",
              border: "1px solid rgba(34, 197, 94, 0.12)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 22,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.72rem",
              color: "rgba(120, 220, 150, 0.8)",
              lineHeight: 1.9,
            }}
          >
            {[
              "WLAN-Passwort      › brute-force-resistent (≥ 10 Jahre)",
              "Admin-Passwort     › brute-force-resistent (≥ 15 Jahre)",
              "Sicherheitsmodus   › WPA3 aktiv",
              "Router-Fernzugriff › deaktiviert",
              "WPS                › deaktiviert",
              "Gastnetz           › getrennt",
            ].map((line) => (
              <div key={line}>
                <span style={{ color: "#22c55e", marginRight: 8 }}>✓</span>
                {line}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid rgba(34, 197, 94, 0.32)",
                background:
                  "linear-gradient(180deg, rgba(30, 90, 55, 0.72), rgba(18, 58, 34, 0.86))",
                color: "#c8ffe0",
                borderRadius: 14,
                padding: "12px 20px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.88rem",
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
