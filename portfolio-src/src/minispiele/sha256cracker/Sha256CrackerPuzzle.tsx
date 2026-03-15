import { useEffect, useRef, useState } from "react";

interface Sha256CrackerPuzzleProps {
  onSolved: () => void;
  onClose: () => void;
}

type Stage = "intro" | "terminal" | "running" | "success" | "failure";

type GapKey = "word" | "char" | "char2" | "encode" | "hexdigest";

const HINTS: Partial<Record<GapKey, string>> = {
  encode: "Konvertiert String → Bytes für hashlib",
  hexdigest: "Gibt den Hash als Hex-String zurück",
};

const CRACKED_PASSWORD = "dragon§!";
const monoFont = "'JetBrains Mono', 'Fira Mono', 'Courier New', monospace";

const C = {
  prompt: "#4ade80",
  cmd: "#f8faff",
  dir: "#7dd3fc",
  dim: "#5a7090",
  err: "#f87171",
  out: "#a3e635",
};

function Prompt() {
  return (
    <span style={{ userSelect: "none" }}>
      <span style={{ color: C.prompt, fontWeight: 700 }}>coder@terminal</span>
      <span style={{ color: C.dim }}>:</span>
      <span style={{ color: C.dir }}>~/crack</span>
      <span style={{ color: C.dim }}>$</span>
      <span> </span>
    </span>
  );
}

// ── Nano editor ──────────────────────────────────────────────────────────────
function NanoEditor({
  gaps,
  setGaps,
  saved,
  confirming,
  onSaveStart,
  onSaveConfirm,
  onSaveCancel,
  onExit,
}: {
  gaps: Record<GapKey, string>;
  setGaps: (g: Record<GapKey, string>) => void;
  saved: boolean;
  confirming: boolean;
  onSaveStart: () => void;
  onSaveConfirm: () => void;
  onSaveCancel: () => void;
  onExit: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "o") { e.preventDefault(); onSaveStart(); }
      if (e.ctrlKey && e.key === "x") { e.preventDefault(); if (!confirming) onExit(); }
      if (e.ctrlKey && e.key === "c") { e.preventDefault(); if (confirming) onSaveCancel(); }
      if (e.key === "Enter" && confirming) { e.preventDefault(); onSaveConfirm(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSaveStart, onSaveConfirm, onSaveCancel, onExit, confirming]);

  const kw = (s: string) => <span style={{ color: "#7dd3fc" }}>{s}</span>;
  const str = (s: string) => <span style={{ color: "#86efac" }}>{s}</span>;
  const fn = (s: string) => <span style={{ color: "#c084fc" }}>{s}</span>;

  const gapInput = (key: GapKey) => (
    <input
      key={key}
      value={gaps[key]}
      onChange={(e) => setGaps({ ...gaps, [key]: e.target.value })}
      style={{
        width: Math.max(54, (gaps[key].length + 2) * 8.4),
        background: "rgba(255,220,60,0.13)",
        border: "1px dashed rgba(255,220,60,0.55)",
        borderRadius: 3,
        color: "#ffe066",
        fontFamily: monoFont,
        fontSize: 13,
        padding: "0 4px",
        outline: "none",
        verticalAlign: "baseline",
        minWidth: 54,
      }}
      spellCheck={false}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Nano title bar */}
      <div style={{
        background: "#1a2740", padding: "3px 12px",
        display: "flex", justifyContent: "space-between",
        fontFamily: monoFont, fontSize: 12, color: "#8aadce",
        flexShrink: 0,
      }}>
        <span>GNU nano 5.4</span>
        <span style={{ color: "#f8faff", fontWeight: 700 }}>sha256.py</span>
        <span style={{ color: saved ? "#4ade80" : "#fbbf24" }}>
          {saved ? "[ Gespeichert ]" : "[ Geändert ]"}
        </span>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Code pane */}
        <div style={{
          flex: 1, padding: "10px 16px", overflowY: "auto",
          background: "rgba(6,12,22,0.98)", minWidth: 0,
        }}>
          <div style={{ fontFamily: monoFont, fontSize: 13, lineHeight: 1.8, color: "#c8daf8", whiteSpace: "pre" }}>
            <div>{kw("password_hash")} = {str('"112aa01926aebb65c5e09cc0a25ce2b5cff2ec5df0e9b123510db6753557e552"')}</div>
            <div>{kw("extra_chars")} = {str('"!§$%&/()=?"')}</div>
            <div>{kw("import")} hashlib</div>
            <div> </div>
            <div>{kw("with")} {fn("open")}({str('"data/dictionary.txt"')}) {kw("as")} file:</div>
            <div>{"    "}{kw("for")} line {kw("in")} file:</div>
            <div>{"        "}word = line.{fn("strip")}()</div>
            <div> </div>
            <div>{"        "}{kw("for")} char {kw("in")} extra_chars:</div>
            <div>{"            "}{kw("for")} char2 {kw("in")} extra_chars:</div>
            <div style={{ whiteSpace: "pre-wrap" }}>
              {"                "}password_word = {gapInput("word")} + {gapInput("char")} + {gapInput("char2")}
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>
              {"                "}{kw("if")} hashlib.sha256(password_word.{gapInput("encode")}()).{gapInput("hexdigest")}() == password_hash:
            </div>
            <div>{"                    "}{fn("print")}(password_word)</div>
            <div>{"                    "}{kw("break")}</div>
          </div>
        </div>

        {/* Hints pane — only encode + hexdigest; hidden on very narrow viewports */}
        {(typeof window === "undefined" || window.innerWidth >= 500) && (
        <div style={{
          width: 200, borderLeft: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(10,18,32,0.98)", padding: "12px",
          display: "flex", flexDirection: "column", gap: 12, flexShrink: 0,
        }}>
          <div style={{
            fontFamily: monoFont, fontSize: 10, letterSpacing: "0.14em",
            color: "rgba(188,212,255,0.45)", textTransform: "uppercase",
          }}>
            Hinweise
          </div>
          {(Object.entries(HINTS) as [GapKey, string][]).map(([key, hint]) => (
            <div key={key}>
              <div style={{
                fontFamily: monoFont, fontSize: 11, color: "#ffe066",
                background: "rgba(255,220,60,0.08)", borderRadius: 3,
                padding: "1px 5px", display: "inline-block", marginBottom: 3,
              }}>
                {key}
              </div>
              <div style={{ fontSize: 11, color: "#7a94b2", lineHeight: 1.4 }}>{hint}</div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Nano status bar — normal or save-confirm */}
      {confirming ? (
        <div style={{
          background: "#1a2740", padding: "4px 12px",
          fontFamily: monoFont, fontSize: 12, color: "#f8faff",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <span>
            <span style={{ color: "#fbbf24" }}>Dateiname zum Schreiben: </span>
            <span style={{ color: "#4ade80", fontWeight: 700 }}>sha256.py</span>
          </span>
          <span style={{ color: "#6b7f9a", fontSize: 11 }}>
            <span style={{ color: "#c8daf8" }}>Enter</span> Bestätigen{"  "}
            <span style={{ color: "#c8daf8" }}>^C</span> Abbrechen
          </span>
        </div>
      ) : (
        <div style={{
          background: "#1a2740", padding: "3px 12px",
          fontFamily: monoFont, fontSize: 11, color: "#6b7f9a",
          display: "flex", gap: 20, flexShrink: 0,
        }}>
          <span><span style={{ color: "#c8daf8" }}>^O</span> Speichern</span>
          <span><span style={{ color: "#c8daf8" }}>^X</span> Schließen</span>
          <span><span style={{ color: "#c8daf8" }}>^G</span> Hilfe</span>
          <span><span style={{ color: "#c8daf8" }}>^C</span> Abbrechen</span>
        </div>
      )}
    </div>
  );
}

// ── Coder robot head with thought bubble ─────────────────────────────────────
function CoderThoughtBubble() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px" }}>
      <svg width="72" height="82" viewBox="0 0 72 82" style={{ flexShrink: 0 }}>
        <rect x="20" y="42" width="32" height="28" rx="4" fill="#20c070" />
        <rect x="14" y="34" width="7" height="10" rx="2" fill="#20c070" />
        <rect x="51" y="34" width="7" height="10" rx="2" fill="#20c070" />
        <rect x="26" y="68" width="8" height="9" rx="2" fill="#158048" />
        <rect x="38" y="68" width="8" height="9" rx="2" fill="#158048" />
        <rect x="30" y="30" width="11" height="7" rx="2" fill="#158048" />
        <rect x="16" y="9" width="40" height="24" rx="5" fill="#c42200" />
        <rect x="21" y="13" width="10" height="7" rx="2" fill="rgba(0,0,0,0.4)" />
        <rect x="41" y="13" width="10" height="7" rx="2" fill="rgba(0,0,0,0.4)" />
        <rect x="23" y="15" width="6" height="4" rx="1" fill="#ff6644" />
        <rect x="43" y="15" width="6" height="4" rx="1" fill="#ff6644" />
        <circle cx="32" cy="7" r="3.5" fill="rgba(210,210,210,0.65)" />
        <circle cx="41" cy="4" r="2.5" fill="rgba(200,200,200,0.55)" />
        <circle cx="58" cy="17" r="2" fill="rgba(255,255,255,0.88)" />
        <circle cx="63" cy="11" r="3" fill="rgba(255,255,255,0.88)" />
      </svg>
      <div style={{
        background: "rgba(255,255,255,0.92)", borderRadius: 10,
        padding: "9px 13px",
        fontFamily: "'Inter', sans-serif", fontSize: 13,
        color: "#1a2035", lineHeight: 1.5, fontWeight: 600,
        position: "relative",
      }}>
        Hmm?! Ich muss mein Script nochmal überprüfen!
        <div style={{
          position: "absolute", left: -7, top: 12,
          width: 0, height: 0,
          borderTop: "7px solid transparent",
          borderBottom: "7px solid transparent",
          borderRight: "7px solid rgba(255,255,255,0.92)",
        }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Sha256CrackerPuzzle({ onSolved, onClose }: Sha256CrackerPuzzleProps) {
  const [stage, setStage] = useState<Stage>("intro");
  const [terminalInput, setTerminalInput] = useState("");
  const [termLines, setTermLines] = useState<{ text: string; color?: string }[]>([
    { text: "coder@terminal:~/crack$ ls", color: C.dim },
    { text: "sha256.py    data/", color: C.cmd },
    { text: "" },
  ]);
  const [gaps, setGaps] = useState<Record<GapKey, string>>({
    word: "", char: "", char2: "", encode: "", hexdigest: "",
  });
  const [nanoOpen, setNanoOpen] = useState(false);
  const [nanoSaved, setNanoSaved] = useState(false);
  const [nanoConfirming, setNanoConfirming] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const termEndRef = useRef<HTMLDivElement>(null);

  // Focus terminal input whenever terminal is active and nano is closed
  useEffect(() => {
    if (stage === "terminal" && !nanoOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [stage, nanoOpen]);

  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [termLines]);

  const addLine = (text: string, color?: string) =>
    setTermLines((prev) => [...prev, { text, color }]);

  const handleTerminalCmd = (cmd: string) => {
    const trimmed = cmd.trim();
    addLine(`coder@terminal:~/crack$ ${trimmed}`, C.dim);
    setTerminalInput("");

    if (trimmed === "nano sha256.py") {
      setNanoOpen(true);
      setNanoSaved(false);
      setNanoConfirming(false);
    } else if (trimmed === "python3 sha256.py") {
      if (!nanoSaved) {
        addLine("Fehler: sha256.py wurde nicht gespeichert.", C.err);
        return;
      }
      const correct =
        gaps.word.trim() === "word" &&
        gaps.char.trim() === "char" &&
        gaps.char2.trim() === "char2" &&
        gaps.encode.trim() === "encode" &&
        gaps.hexdigest.trim() === "hexdigest";

      setStage("running");
      setTimeout(() => {
        if (correct) {
          addLine("", C.dim);
          addLine(CRACKED_PASSWORD, C.out);
          setStage("success");
          setTimeout(onSolved, 1200);
        } else {
          setStage("failure");
        }
      }, 1600);
    } else if (trimmed !== "") {
      addLine(`bash: ${trimmed}: Befehl nicht gefunden.`, C.err);
    }
  };

  const handleRetry = () => {
    setStage("terminal");
    setTermLines([
      { text: "coder@terminal:~/crack$ ls", color: C.dim },
      { text: "sha256.py    data/", color: C.cmd },
      { text: "" },
    ]);
    setNanoSaved(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const isMobile = typeof window !== "undefined" && (window.innerWidth < 900 || navigator.maxTouchPoints > 0);
  const mobileBtnStyle = {
    fontFamily: monoFont,
    fontSize: 12,
    color: "rgba(180,210,255,0.85)",
    background: "rgba(8,18,36,0.95)",
    border: "1px solid rgba(60,110,200,0.30)",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  };
  if (stage === "intro") {
    return (
      <div style={{
        width: "min(calc(100vw - 16px), 420px)",
        background: "rgba(5,12,22,0.98)",
        border: "1px solid rgba(60,200,120,0.24)",
        borderRadius: 18,
        boxShadow: "0 24px 64px rgba(0,0,0,0.78), 0 0 0 1px rgba(30,140,80,0.08)",
        padding: "32px 28px 28px",
        position: "relative",
        fontFamily: "Inter, sans-serif",
        color: "rgba(210,240,220,0.88)",
      }}>
        <button type="button" onClick={onClose} style={{
          position: "absolute", top: 14, right: 14,
          width: 40, height: 40, borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(8,12,20,0.84)",
          color: "#eef6ff", fontSize: "1.2rem",
          cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center",
          zIndex: 2,
        }}>×</button>

        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "rgba(40,180,100,0.10)",
          border: "1px solid rgba(60,200,120,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.8rem", marginBottom: 18,
        }}>🔓</div>

        {/* Label */}
        <div style={{
          fontFamily: monoFont, fontSize: "0.62rem",
          color: "rgba(80,220,140,0.72)",
          letterSpacing: "0.14em", marginBottom: 8,
        }}>
          HASH-ANALYSE · CODER TERMINAL
        </div>

        {/* Title */}
        <h2 style={{
          margin: "0 0 12px",
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "#e8fff2",
          lineHeight: 1.25,
        }}>
          SHA-256 Hash knacken
        </h2>

        {/* Description */}
        <p style={{
          margin: "0 0 20px",
          fontSize: "0.82rem",
          color: "rgba(140,200,170,0.72)",
          lineHeight: 1.6,
        }}>
          Ein SHA-256 Hash wurde abgefangen. Das Passwort setzt sich aus einem
          Wörterbuch-Wort und zwei Sonderzeichen zusammen. Öffne das Script mit{" "}
          <code style={{ fontFamily: monoFont, fontSize: "0.78rem", color: "#ffe066" }}>nano sha256.py</code>,
          fülle die Lücken, speichere und starte mit{" "}
          <code style={{ fontFamily: monoFont, fontSize: "0.78rem", color: "#ffe066" }}>python3 sha256.py</code>.
        </p>

        {/* Info chips */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {["SHA-256", "Dictionary Attack", "Python Script"].map((c) => (
            <span key={c} style={{
              fontFamily: monoFont,
              fontSize: "0.58rem",
              color: "rgba(80,220,140,0.82)",
              background: "rgba(30,140,80,0.12)",
              border: "1px solid rgba(50,200,110,0.22)",
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
          <button type="button" onClick={() => setStage("terminal")} style={{
            flex: 1,
            padding: "11px 0",
            background: "rgba(40,160,90,0.14)",
            border: "1px solid rgba(60,220,120,0.50)",
            borderRadius: 10,
            color: "rgba(130,240,170,0.95)",
            fontFamily: monoFont,
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            cursor: "pointer",
            boxShadow: "0 0 14px rgba(50,200,100,0.10)",
          }}>
            TERMINAL ÖFFNEN ▶
          </button>
          <button type="button" onClick={onClose} style={{
            padding: "11px 18px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10,
            color: "rgba(140,200,170,0.55)",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
          }}>
            Später
          </button>
        </div>
      </div>
    );
  }

  // Terminal / Nano / Running / Success / Failure
  return (
    <div style={{
      width: "min(calc(100vw - 16px), 820px)",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "#07101e",
      boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      position: "relative",
    }}>
      {/* Window titlebar */}
      <div style={{
        background: "#0e1c30", padding: "7px 14px",
        display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
      }}>
        {["#f87171", "#fbbf24", "#4ade80"].map((col) => (
          <div key={col} style={{ width: 10, height: 10, borderRadius: "50%", background: col }} />
        ))}
        <span style={{ fontFamily: monoFont, fontSize: 12, color: "#4a6080", marginLeft: 6 }}>
          {nanoOpen ? "nano — sha256.py" : "coder@terminal: ~/crack"}
        </span>
        <button type="button" onClick={onClose} style={{
          marginLeft: "auto", width: 28, height: 28, borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)", color: "#8aadcc",
          fontSize: "0.82rem", cursor: "pointer", lineHeight: 1,
        }}>✕</button>
      </div>

      {/* Nano editor */}
      {nanoOpen && (
        <>
          <div style={{ height: "min(340px, 48svh)", display: "flex", flexDirection: "column" }}>
            <NanoEditor
              gaps={gaps}
              setGaps={setGaps}
              saved={nanoSaved}
              confirming={nanoConfirming}
              onSaveStart={() => setNanoConfirming(true)}
              onSaveConfirm={() => { setNanoSaved(true); setNanoConfirming(false); }}
              onSaveCancel={() => setNanoConfirming(false)}
              onExit={() => {
                setNanoOpen(false);
                setNanoConfirming(false);
                addLine("", C.dim);
                addLine("[nano geschlossen]", C.dim);
                if (!nanoSaved) addLine("Hinweis: Datei nicht gespeichert. Bitte mit ^O speichern.", C.err);
              }}
            />
          </div>
          {isMobile && (
            <div style={{
              background: "rgba(3,6,14,0.98)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              padding: "8px 12px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexShrink: 0,
              flexWrap: "wrap",
            }}>
              <span style={{ fontFamily: monoFont, fontSize: 10, color: "rgba(100,140,180,0.45)", letterSpacing: "0.08em" }}>MOBILE</span>
              {!nanoConfirming && (
                <>
                  <button type="button" onClick={() => setNanoConfirming(true)} style={mobileBtnStyle}>
                    ^O Speichern
                  </button>
                  <button type="button" onClick={() => {
                    setNanoOpen(false);
                    setNanoConfirming(false);
                    addLine("", C.dim);
                    addLine("[nano geschlossen]", C.dim);
                    if (!nanoSaved) addLine("Hinweis: Datei nicht gespeichert. Bitte mit ^O speichern.", C.err);
                  }} style={mobileBtnStyle}>
                    ^X Schließen
                  </button>
                </>
              )}
              {nanoConfirming && (
                <>
                  <button type="button" onClick={() => { setNanoSaved(true); setNanoConfirming(false); }}
                    style={{ ...mobileBtnStyle, borderColor: "rgba(80,220,120,0.35)", color: "#4ade80" }}>
                    Enter ✓  Bestätigen
                  </button>
                  <button type="button" onClick={() => setNanoConfirming(false)} style={mobileBtnStyle}>
                    ^C Abbrechen
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Terminal output (always present, hidden behind nano) */}
      {!nanoOpen && (
        <>
          <div style={{
            minHeight: 160,
            maxHeight: 260,
            overflowY: "auto",
            padding: "12px 16px 4px",
            background: "rgba(3,6,14,0.98)",
            flexShrink: 0,
          }}>
            {termLines.map((line, i) => (
              <div key={i} style={{
                fontFamily: monoFont, fontSize: 13, lineHeight: 1.65,
                color: line.color ?? C.cmd,
                whiteSpace: "pre-wrap",
              }}>
                {line.text || "\u00A0"}
              </div>
            ))}
            {stage === "running" && (
              <div style={{ fontFamily: monoFont, fontSize: 13, color: C.dim, lineHeight: 1.65 }}>
                ▌ läuft...
              </div>
            )}
            <div ref={termEndRef} />
          </div>

          {/* Prompt input — always at the bottom of the terminal, outside scroll */}
          {stage === "terminal" && (
            <div style={{
              display: "flex", alignItems: "center",
              padding: "6px 16px 10px",
              background: "rgba(3,6,14,0.98)",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              flexShrink: 0,
            }}>
              <Prompt />
              <input
                ref={inputRef}
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleTerminalCmd(terminalInput); }}
                style={{
                  flex: 1, background: "transparent", border: "none",
                  outline: "none", color: C.cmd,
                  fontFamily: monoFont, fontSize: 13, caretColor: C.prompt,
                }}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
              />
            </div>
          )}

          {/* Coder robot — outside terminal, shown on failure */}
          {stage === "failure" && (
            <>
              <div style={{
                padding: "0 16px 4px",
                background: "rgba(3,6,14,0.98)",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                flexShrink: 0,
              }}>
                <div style={{ fontFamily: monoFont, fontSize: 13, color: C.err, lineHeight: 1.65 }}>
                  Kein Ergebnis. Script enthält Fehler.
                </div>
              </div>
              <div style={{
                background: "rgba(8,14,24,0.96)",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                flexShrink: 0,
              }}>
                <CoderThoughtBubble />
                <div style={{ padding: "0 18px 14px" }}>
                  <button type="button" onClick={handleRetry} style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)", color: "#c8daf8",
                    borderRadius: 10, padding: "8px 14px",
                    fontWeight: 700, cursor: "pointer",
                    fontFamily: monoFont, fontSize: 12,
                  }}>
                    Script nochmal öffnen
                  </button>
                </div>
              </div>
            </>
          )}
          {/* ── Mobile action bar — terminal enter button (hidden on desktop) ── */}
          {isMobile && stage === "terminal" && (
            <div style={{
              background: "rgba(3,6,14,0.98)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              padding: "8px 12px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexShrink: 0,
              flexWrap: "wrap",
            }}>
              <span style={{ fontFamily: monoFont, fontSize: 10, color: "rgba(100,140,180,0.45)", letterSpacing: "0.08em" }}>MOBILE</span>
              <button type="button" onClick={() => handleTerminalCmd(terminalInput)}
                style={{ ...mobileBtnStyle, borderColor: "rgba(80,160,255,0.35)", color: "rgba(120,200,255,0.9)" }}>
                ↵ Enter
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
