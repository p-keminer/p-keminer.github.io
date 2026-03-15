import { useEffect, useRef, useState } from "react";
import { pgEmit, pgOn } from "./bus";

// ─── Style constants ──────────────────────────────────────────────────────────
const C = {
  bg: "rgba(6, 14, 32, 0.97)",
  border: "rgba(0, 180, 255, 0.25)",
  accent: "rgba(0, 180, 255, 0.85)",
  accentSoft: "rgba(0, 180, 255, 0.12)",
  text: "rgba(220, 235, 255, 0.88)",
  textMuted: "rgba(150, 175, 210, 0.60)",
  green: "#4ade80",
  red: "rgba(255,80,80,0.9)",
  sectionTitle: {
    fontSize: "0.6rem",
    letterSpacing: "0.12em",
    color: "rgba(100,160,220,0.6)",
    marginBottom: 8,
    fontFamily: "'JetBrains Mono', monospace",
  } as React.CSSProperties,
  btn: {
    background: "rgba(0,180,255,0.08)",
    border: "1px solid rgba(0,180,255,0.22)",
    borderRadius: 7,
    color: "rgba(200,225,255,0.88)",
    fontSize: "0.72rem",
    padding: "5px 10px",
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
  } as React.CSSProperties,
  btnActive: {
    background: "rgba(0,180,255,0.22)",
    border: "1px solid rgba(0,180,255,0.55)",
    color: "#fff",
  } as React.CSSProperties,
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  } as React.CSSProperties,
};

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: value ? "rgba(0,180,255,0.5)" : "rgba(60,80,100,0.5)",
        border: `1px solid ${value ? "rgba(0,180,255,0.7)" : "rgba(80,120,160,0.3)"}`,
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: value ? 18 : 2,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
        }}
      />
    </div>
  );
}

// ─── Slider Row ───────────────────────────────────────────────────────────────
function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: "0.68rem", color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
          {label}
        </span>
        <span style={{ fontSize: "0.68rem", color: C.accent, fontFamily: "'JetBrains Mono', monospace" }}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "rgba(0,180,255,0.85)", cursor: "pointer" }}
      />
    </div>
  );
}

// ─── Section Title ────────────────────────────────────────────────────────────
function SectionTitle({ children, mt = 14 }: { children: React.ReactNode; mt?: number }) {
  return (
    <div style={{ ...C.sectionTitle, marginTop: mt, marginBottom: 8, textTransform: "uppercase" as const }}>
      {children}
    </div>
  );
}

// ─── Btn ──────────────────────────────────────────────────────────────────────
function Btn({
  children,
  onClick,
  active = false,
  style = {},
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{ ...C.btn, ...(active ? C.btnActive : {}), ...style }}
    >
      {children}
    </button>
  );
}

// ─── Main DevPanel ────────────────────────────────────────────────────────────
export default function DevPanel() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<"zustand" | "szene" | "animation" | "inspect">("zustand");

  // Position
  const [pos, setPos] = useState(() => ({
    top: 20,
    left: (typeof window !== "undefined" ? window.innerWidth : 1260) - 340,
  }));

  // Drag state
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, top: 0, left: 0 });

  // Live game state (received from App via bus)
  const [liveState, setLiveState] = useState({
    isCoderRepaired: false,
    isSha256Solved: false,
    isWifiSolved: false,
    isFlugbahnSolved: false,
    scrapSorted: false,
    isLaserSolved: false,
    isWeldSolderDone: false,
  });

  // Dialog phase override
  const [forcedDialogPhase, setForcedDialogPhase] = useState<number | null>(null);

  // Scene tab state
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Animation tab state
  const [animSpeed, setAnimSpeed] = useState(1);
  const [animCount, setAnimCount] = useState(0);

  // Inspect tab state
  const [viewportW, setViewportW] = useState<number | null>(null);
  const [pickerActive, setPickerActive] = useState(false);
  const [hoveredElem, setHoveredElem] = useState<Element | null>(null);
  const selectedElemRef = useRef<HTMLElement | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedElemRect, setSelectedElemRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [elemTx, setElemTx] = useState(0);
  const [elemTy, setElemTy] = useState(0);
  const [elemSx, setElemSx] = useState(1);
  const [elemSy, setElemSy] = useState(1);
  const [elemInfo, setElemInfo] = useState("");

  // Subscribe to bus events
  useEffect(() => {
    const unsub = pgOn("pg:state", (state) => {
      setLiveState(state as { isCoderRepaired: boolean; isSha256Solved: boolean; isWifiSolved: boolean; isFlugbahnSolved: boolean; scrapSorted: boolean; isLaserSolved: boolean; isWeldSolderDone: boolean });
    });
    return () => { unsub(); };
  }, []);

  // Toggle with F2 (works on all keyboard layouts incl. German)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); setPanelOpen((v) => !v); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Scene zoom/pan via injected CSS
  useEffect(() => {
    let styleEl = document.getElementById("pg-scene-style") as HTMLStyleElement | null;
    if (zoom === 1 && panX === 0 && panY === 0) {
      styleEl?.remove();
      return;
    }
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "pg-scene-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
[data-pg-scene] {
  transform: translate(${panX}px, ${panY}px) scale(${zoom}) !important;
  transform-origin: center center !important;
}`;
  }, [zoom, panX, panY]);

  // Viewport simulation via CSS injection
  useEffect(() => {
    let styleEl = document.getElementById("pg-viewport-style") as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "pg-viewport-style";
      document.head.appendChild(styleEl);
    }
    if (viewportW === null) {
      styleEl.textContent = "";
    } else {
      const scale = (window.innerWidth / viewportW).toFixed(4);
      styleEl.textContent = `
#root {
  width: ${viewportW}px !important;
  max-width: ${viewportW}px !important;
  transform: scale(${scale}) !important;
  transform-origin: top left !important;
  overflow: hidden !important;
}`;
    }
    return () => {
      if (viewportW === null) {
        document.getElementById("pg-viewport-style")?.remove();
      }
    };
  }, [viewportW]);

  // Element picker mode
  useEffect(() => {
    if (!pickerActive) return;
    const panel = document.querySelector("[data-pg-panel]");
    const handleMove = (e: MouseEvent) => {
      const el = e.target as Element;
      if (panel?.contains(el)) { setHoveredElem(null); return; }
      setHoveredElem(el);
    };
    const handleClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if ((document.querySelector("[data-pg-panel]") as HTMLElement)?.contains(el)) return;
      e.preventDefault();
      e.stopPropagation();
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : "";
      const cls = el.className && typeof el.className === "string"
        ? "." + el.className.trim().split(/\s+/).join(".")
        : "";
      setElemInfo(`${tag}${id}${cls}`);
      selectedElemRef.current = el;
      setHasSelection(true);
      const r = el.getBoundingClientRect();
      setSelectedElemRect({ left: r.left, top: r.top, width: r.width, height: r.height });
      setElemTx(0);
      setElemTy(0);
      setElemSx(1);
      setElemSy(1);
      setPickerActive(false);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("click", handleClick, true);
    };
  }, [pickerActive]);

  // Apply transform to selected element
  useEffect(() => {
    const el = selectedElemRef.current;
    if (!el) return;
    el.style.transform = `translate(${elemTx}px, ${elemTy}px) scale(${elemSx}, ${elemSy})`;
    el.style.transformOrigin = "center center";
  }, [hasSelection, elemTx, elemTy, elemSx, elemSy]);

  // Animation count polling
  useEffect(() => {
    if (!panelOpen) return;
    const id = setInterval(() => {
      setAnimCount(document.getAnimations().length);
    }, 1000);
    return () => clearInterval(id);
  }, [panelOpen]);

  // Dragging
  function onHeaderPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, top: pos.top, left: pos.left };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }

  function onHeaderPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPos({ top: dragStart.current.top + dy, left: dragStart.current.left + dx });
  }

  function onHeaderPointerUp() {
    dragging.current = false;
  }

  const tabs: { key: "zustand" | "szene" | "animation" | "inspect"; label: string }[] = [
    { key: "zustand", label: "ZUSTAND" },
    { key: "szene", label: "SZENE" },
    { key: "animation", label: "ANIM" },
    { key: "inspect", label: "INSPECT" },
  ];

  const stateItems = [
    { key: "isCoderRepaired", label: "Schaltkreis-LAB", modal: "latch" as const },
    { key: "isSha256Solved", label: "SHA-256 Cracker", modal: "sha256" as const },
    { key: "isWifiSolved", label: "WLAN-Security", modal: "wifi" as const },
    { key: "isFlugbahnSolved", label: "Abwurf-Kalibrierung", modal: "flugbahn" as const },
    { key: "scrapSorted", label: "Kran-Sortierspiel", modal: "greifarm" as const },
  ] as const;

  const dialogPhaseOptions: Array<{ label: string; value: number | null }> = [
    { label: "Auto", value: null },
    { label: "0", value: 0 },
    { label: "1", value: 1 },
    { label: "2", value: 2 },
    { label: "3", value: 3 },
  ];

  const speedOptions: Array<{ label: string; value: number }> = [
    { label: "⏸ 0×", value: 0 },
    { label: "¼×", value: 0.25 },
    { label: "½×", value: 0.5 },
    { label: "1×", value: 1 },
    { label: "2×", value: 2 },
    { label: "5×", value: 5 },
  ];

  // Always-visible toggle button (bottom-right corner)
  const toggleBtn = (
    <button
      onClick={() => setPanelOpen((v) => !v)}
      title="Dev Playground öffnen (F2)"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: panelOpen ? "rgba(0,180,255,0.28)" : "rgba(6,14,32,0.92)",
        border: "1px solid rgba(0,180,255,0.45)",
        boxShadow: "0 4px 18px rgba(0,0,0,0.55), 0 0 12px rgba(0,180,255,0.18)",
        color: "rgba(0,200,255,0.9)",
        fontSize: "1.1rem",
        cursor: "pointer",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.2s, box-shadow 0.2s",
      }}
    >
      ⚙
    </button>
  );

  if (!panelOpen) return toggleBtn;

  return (
    <>
    {toggleBtn}
    {/* Selected element highlight (green dashed) */}
    {selectedElemRect && (
      <div
        style={{
          position: "fixed",
          left: selectedElemRect.left,
          top: selectedElemRect.top,
          width: selectedElemRect.width,
          height: selectedElemRect.height,
          border: "2px dashed rgba(80,255,160,0.7)",
          pointerEvents: "none",
          zIndex: 99998,
          boxSizing: "border-box",
        }}
      />
    )}

    {/* Hover highlight overlay for element picker */}
    {pickerActive && hoveredElem && (() => {
      const rect = hoveredElem.getBoundingClientRect();
      return (
        <div
          style={{
            position: "fixed",
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            border: "2px solid rgba(0,200,255,0.85)",
            background: "rgba(0,200,255,0.07)",
            pointerEvents: "none",
            zIndex: 99998,
            boxSizing: "border-box",
          }}
        />
      );
    })()}
    {/* Crosshair cursor when picker active */}
    {pickerActive && <style>{`* { cursor: crosshair !important; }`}</style>}

    <div
      data-pg-panel
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: 320,
        background: C.bg,
        border: `1px solid rgba(0, 180, 255, 0.30)`,
        borderRadius: 14,
        boxShadow: "0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,180,255,0.08)",
        zIndex: 99999,
        fontFamily: "Inter, sans-serif",
        color: C.text,
        userSelect: "none",
      }}
    >
      {/* Header */}
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        style={{
          height: 38,
          padding: "0 12px",
          background: "rgba(0, 180, 255, 0.06)",
          borderBottom: "1px solid rgba(0,180,255,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "grab",
          borderRadius: "14px 14px 0 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: C.accent }}>
          <span>⚙</span>
          <span>Dev Playground</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMinimized((v) => !v); }}
            style={{ ...C.btn, padding: "2px 8px", fontSize: "1rem", lineHeight: 1 }}
            title={minimized ? "Aufklappen" : "Minimieren"}
          >
            —
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setPanelOpen(false); }}
            style={{ ...C.btn, padding: "2px 8px", fontSize: "1rem", lineHeight: 1 }}
            title="Schließen"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <>
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              background: "rgba(0,0,0,0.2)",
              borderBottom: "1px solid rgba(0,180,255,0.10)",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab.key ? "2px solid rgba(0,180,255,0.8)" : "2px solid transparent",
                  padding: "8px 4px",
                  fontSize: "0.65rem",
                  letterSpacing: "0.1em",
                  color: activeTab === tab.key ? C.accent : "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: "color 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: 14, maxHeight: "calc(100vh - 160px)", overflowY: "auto" }}>
            {/* ── TAB 1: ZUSTAND ── */}
            {activeTab === "zustand" && (
              <>
                <SectionTitle mt={0}>Spielfortschritt</SectionTitle>

                {/* Laser-Rettung row */}
                <div style={{ ...C.row, marginBottom: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: liveState.isLaserSolved ? C.green : "rgba(120,140,160,0.5)",
                    flexShrink: 0, display: "inline-block",
                    boxShadow: liveState.isLaserSolved ? `0 0 6px ${C.green}` : "none",
                    transition: "background 0.2s",
                  }} />
                  <span style={{ flex: 1, fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace" }}>Laser-Rettung</span>
                  <Toggle
                    value={liveState.isLaserSolved}
                    onChange={(v) => pgEmit("pg:isLaserSolved", v)}
                  />
                  <Btn onClick={() => pgEmit("pg:openModal", "laser")} style={{ fontSize: "0.65rem", padding: "3px 8px" }}>▶</Btn>
                </div>

                {stateItems.map((item) => {
                  const isActive = liveState[item.key];
                  return (
                    <div key={item.key} style={{ ...C.row, marginBottom: 8 }}>
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: isActive ? C.green : "rgba(120,140,160,0.5)",
                        flexShrink: 0,
                        display: "inline-block",
                        boxShadow: isActive ? `0 0 6px ${C.green}` : "none",
                        transition: "background 0.2s",
                      }} />
                      <span style={{ flex: 1, fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</span>
                      <Toggle
                        value={isActive}
                        onChange={(v) => pgEmit(`pg:${item.key}`, v)}
                      />
                      <Btn onClick={() => pgEmit("pg:openModal", item.modal)} style={{ fontSize: "0.65rem", padding: "3px 8px" }}>▶</Btn>
                    </div>
                  );
                })}

                {/* Löt-Schweißtechnik row */}
                <div style={{ ...C.row, marginBottom: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: liveState.isWeldSolderDone ? C.green : "rgba(120,140,160,0.5)",
                    flexShrink: 0, display: "inline-block",
                    boxShadow: liveState.isWeldSolderDone ? `0 0 6px ${C.green}` : "none",
                    transition: "background 0.2s",
                  }} />
                  <span style={{ flex: 1, fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace" }}>Löt-Schweißtechnik</span>
                  <Toggle
                    value={liveState.isWeldSolderDone}
                    onChange={(v) => pgEmit("pg:isWeldSolderDone", v)}
                  />
                  <Btn onClick={() => pgEmit("pg:openModal", "weldsolder")} style={{ fontSize: "0.65rem", padding: "3px 8px" }}>▶</Btn>
                </div>

                <div style={{ display: "flex", gap: 6, marginTop: 10, marginBottom: 4 }}>
                  <Btn
                    onClick={() => {
                      pgEmit("pg:isCoderRepaired", true);
                      pgEmit("pg:isSha256Solved", true);
                      pgEmit("pg:isWifiSolved", true);
                      pgEmit("pg:isFlugbahnSolved", true);
                      pgEmit("pg:scrapSorted", true);
                      pgEmit("pg:isLaserSolved", true);
                      pgEmit("pg:isWeldSolderDone", true);
                    }}
                    style={{ flex: 1, fontSize: "0.65rem" }}
                  >
                    🔓 Alle freischalten
                  </Btn>
                  <Btn
                    onClick={() => pgEmit("pg:resetAll")}
                    style={{ flex: 1, fontSize: "0.65rem" }}
                  >
                    ↺ Zurücksetzen
                  </Btn>
                </div>

                <SectionTitle>Modals direkt</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 4 }}>
                  {[
                    { label: "Laser-Rettung", modal: "laser" },
                    { label: "Schaltkreis", modal: "latch" },
                    { label: "SHA-256", modal: "sha256" },
                    { label: "WLAN-Lab", modal: "wifi" },
                    { label: "Abwurf-Kalib.", modal: "flugbahn" },
                    { label: "Sortier-Kran", modal: "greifarm" },
                    { label: "Fertigungs-Lab", modal: "weldsolder" },
                  ].map((item) => (
                    <Btn key={item.modal} onClick={() => pgEmit("pg:openModal", item.modal)} style={{ fontSize: "0.65rem" }}>
                      {item.label}
                    </Btn>
                  ))}
                </div>

                <SectionTitle>Welder-Dialog</SectionTitle>
                <div style={{ fontSize: "0.65rem", color: C.textMuted, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                  Phase forcieren
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                  {dialogPhaseOptions.map((opt) => (
                    <Btn
                      key={String(opt.value)}
                      active={forcedDialogPhase === opt.value}
                      onClick={() => {
                        setForcedDialogPhase(opt.value);
                        pgEmit("pg:dialogPhase", opt.value);
                      }}
                      style={{ fontSize: "0.65rem", padding: "4px 8px" }}
                    >
                      {opt.label}
                    </Btn>
                  ))}
                </div>

                <SectionTitle>Live-Status</SectionTitle>
                <div style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(0,180,255,0.12)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.65rem",
                  lineHeight: 1.7,
                  color: C.textMuted,
                }}>
                  <div>
                    <span style={{ color: "rgba(150,175,210,0.5)" }}>isCoderRepaired: </span>
                    <span style={{ color: liveState.isCoderRepaired ? C.green : C.red }}>
                      {String(liveState.isCoderRepaired)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "rgba(150,175,210,0.5)" }}>isSha256Solved:  </span>
                    <span style={{ color: liveState.isSha256Solved ? C.green : C.red }}>
                      {String(liveState.isSha256Solved)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "rgba(150,175,210,0.5)" }}>isWifiSolved:    </span>
                    <span style={{ color: liveState.isWifiSolved ? C.green : C.red }}>
                      {String(liveState.isWifiSolved)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "rgba(150,175,210,0.5)" }}>isFlugbahnSolved:</span>
                    <span style={{ color: liveState.isFlugbahnSolved ? C.green : C.red }}>
                      {String(liveState.isFlugbahnSolved)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "rgba(150,175,210,0.5)" }}>scrapSorted:     </span>
                    <span style={{ color: liveState.scrapSorted ? C.green : C.red }}>
                      {String(liveState.scrapSorted)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "rgba(150,175,210,0.5)" }}>isLaserSolved:   </span>
                    <span style={{ color: liveState.isLaserSolved ? C.green : C.red }}>
                      {String(liveState.isLaserSolved)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "rgba(150,175,210,0.5)" }}>isWeldSolderDone:</span>
                    <span style={{ color: liveState.isWeldSolderDone ? C.green : C.red }}>
                      {String(liveState.isWeldSolderDone)}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* ── TAB 2: SZENE ── */}
            {activeTab === "szene" && (
              <>
                <SectionTitle mt={0}>Zoom &amp; Pan</SectionTitle>
                <SliderRow
                  label="Zoom"
                  value={zoom}
                  min={0.4}
                  max={2.5}
                  step={0.05}
                  display={`${Math.round(zoom * 100)}%`}
                  onChange={setZoom}
                />
                <SliderRow
                  label="Pan X"
                  value={panX}
                  min={-400}
                  max={400}
                  step={10}
                  display={`${panX}px`}
                  onChange={setPanX}
                />
                <SliderRow
                  label="Pan Y"
                  value={panY}
                  min={-300}
                  max={300}
                  step={10}
                  display={`${panY}px`}
                  onChange={setPanY}
                />
                <Btn
                  onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}
                  style={{ width: "100%", marginBottom: 10 }}
                >
                  Ansicht zurücksetzen
                </Btn>

                <SectionTitle>Szenen-Elemente</SectionTitle>
                <div style={{ ...C.row }}>
                  <Toggle
                    value={liveState.isWifiSolved}
                    onChange={(v) => pgEmit("pg:isWifiSolved", v)}
                  />
                  <span style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace" }}>
                    Sicherheitsschild erzwingen
                  </span>
                </div>
                <div style={{ fontSize: "0.65rem", color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", marginTop: 8 }}>
                  Weitere Elemente werden über ZUSTAND gesteuert
                </div>
              </>
            )}

            {/* ── TAB 3: ANIMATION ── */}
            {activeTab === "animation" && (
              <>
                <SectionTitle mt={0}>Wiedergabegeschwindigkeit</SectionTitle>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                  {speedOptions.map((opt) => (
                    <Btn
                      key={opt.value}
                      active={animSpeed === opt.value}
                      onClick={() => {
                        setAnimSpeed(opt.value);
                        if (opt.value === 0) {
                          document.getAnimations().forEach((a) => a.pause());
                        } else {
                          document.getAnimations().forEach((a) => {
                            a.playbackRate = opt.value;
                            a.play();
                          });
                        }
                      }}
                      style={{ fontSize: "0.65rem", padding: "4px 8px" }}
                    >
                      {opt.label}
                    </Btn>
                  ))}
                </div>

                <SectionTitle>Animationen</SectionTitle>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <Btn
                    onClick={() => document.getAnimations().forEach((a) => a.pause())}
                    style={{ flex: 1, fontSize: "0.65rem" }}
                  >
                    ⏸ Alle pausieren
                  </Btn>
                  <Btn
                    onClick={() => document.getAnimations().forEach((a) => a.play())}
                    style={{ flex: 1, fontSize: "0.65rem" }}
                  >
                    ▶ Alle fortsetzen
                  </Btn>
                </div>
                <Btn
                  onClick={() => document.getAnimations().forEach((a) => { a.cancel(); a.play(); })}
                  style={{ width: "100%", fontSize: "0.65rem", marginBottom: 10 }}
                >
                  ⟳ Alle neu starten
                </Btn>

                <SectionTitle>CSS Animation Debug</SectionTitle>
                <div style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(0,180,255,0.12)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.68rem",
                  color: C.textMuted,
                }}>
                  Aktive Animationen: <span style={{ color: C.accent }}>{animCount}</span>
                </div>
              </>
            )}

            {/* ── TAB 4: INSPECT ── */}
            {activeTab === "inspect" && (
              <>
                {/* ── Viewport Simulation ── */}
                <SectionTitle mt={0}>Viewport-Simulation</SectionTitle>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                  {([
                    { label: "375 iPhone SE", w: 375 },
                    { label: "390 iPhone 14", w: 390 },
                    { label: "430 iPhone Pro Max", w: 430 },
                    { label: "768 iPad", w: 768 },
                    { label: "1024 Tablet", w: 1024 },
                  ] as { label: string; w: number }[]).map(({ label, w }) => (
                    <Btn
                      key={w}
                      active={viewportW === w}
                      onClick={() => setViewportW(viewportW === w ? null : w)}
                      style={{ fontSize: "0.6rem", padding: "4px 7px" }}
                    >
                      {label}
                    </Btn>
                  ))}
                </div>
                <Btn
                  onClick={() => setViewportW(null)}
                  style={{ width: "100%", fontSize: "0.65rem", marginBottom: 4 }}
                >
                  ✕ Viewport zurücksetzen
                </Btn>
                {viewportW !== null && (
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "0.62rem",
                    color: C.textMuted,
                    marginBottom: 8,
                  }}>
                    Simuliert: <span style={{ color: C.accent }}>{viewportW}px</span>
                    {" · Scale: "}
                    <span style={{ color: C.accent }}>
                      {(window.innerWidth / viewportW).toFixed(2)}×
                    </span>
                  </div>
                )}

                {/* ── Element Picker ── */}
                <SectionTitle>Element-Picker</SectionTitle>
                <Btn
                  active={pickerActive}
                  onClick={() => {
                    if (pickerActive) {
                      setPickerActive(false);
                    } else {
                      selectedElemRef.current = null;
                      setHasSelection(false);
                      setSelectedElemRect(null);
                      setElemInfo("");
                      setPickerActive(true);
                    }
                  }}
                  style={{ width: "100%", marginBottom: 8, fontSize: "0.7rem" }}
                >
                  {pickerActive ? "🎯 Klicke ein Element zum Auswählen..." : "👆 Element auswählen"}
                </Btn>

                {hasSelection && (
                  <>
                    {/* Element info */}
                    <div style={{
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(0,180,255,0.2)",
                      borderRadius: 6,
                      padding: "5px 8px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.58rem",
                      color: "rgba(100,200,255,0.75)",
                      marginBottom: 8,
                      wordBreak: "break-all",
                      lineHeight: 1.5,
                    }}>
                      {elemInfo || "(kein Label)"}
                    </div>

                    {/* Transform sliders */}
                    <SliderRow label="X" value={elemTx} min={-600} max={600} step={1} display={`${elemTx}px`} onChange={setElemTx} />
                    <SliderRow label="Y" value={elemTy} min={-600} max={600} step={1} display={`${elemTy}px`} onChange={setElemTy} />
                    <SliderRow label="Scale X" value={elemSx} min={0.1} max={4} step={0.05} display={`${elemSx.toFixed(2)}×`} onChange={setElemSx} />
                    <SliderRow label="Scale Y" value={elemSy} min={0.1} max={4} step={0.05} display={`${elemSy.toFixed(2)}×`} onChange={setElemSy} />

                    {/* Copy CSS */}
                    <Btn
                      onClick={() => {
                        const css = `transform: translate(${elemTx}px, ${elemTy}px) scale(${elemSx}, ${elemSy});`;
                        navigator.clipboard.writeText(css);
                      }}
                      style={{ width: "100%", fontSize: "0.65rem", marginBottom: 6 }}
                    >
                      📋 CSS kopieren
                    </Btn>

                    <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                      <Btn
                        onClick={() => {
                          setElemTx(0); setElemTy(0); setElemSx(1); setElemSy(1);
                        }}
                        style={{ flex: 1, fontSize: "0.65rem" }}
                      >
                        ↺ Transform reset
                      </Btn>
                      <Btn
                        onClick={() => {
                          if (selectedElemRef.current) selectedElemRef.current.style.transform = "";
                          selectedElemRef.current = null;
                          setHasSelection(false);
                          setSelectedElemRect(null);
                          setElemInfo("");
                        }}
                        style={{ flex: 1, fontSize: "0.65rem" }}
                      >
                        ✕ Abwählen
                      </Btn>
                    </div>

                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
    </>
  );
}
