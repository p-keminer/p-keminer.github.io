import { useState } from "react";
import { evaluatePassword, formatCrackTime } from "./passwordStrength";

// ── Types ─────────────────────────────────────────────────────────────────────
type SecurityMode = "offen" | "wep" | "wpa" | "wpa2" | "wpa2wpa3" | "wpa3";
type RemoteAccess = "aktiviert" | "deaktiviert";

interface WifiSecurityGameProps {
  onSolved: () => void;
  onAbort: () => void;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "0.66rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "rgba(140, 200, 255, 0.52)",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        borderTop: "1px solid rgba(0, 170, 255, 0.08)",
        margin: "18px 0",
      }}
    />
  );
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minYears: number;
}

function PasswordField({ label, value, onChange, minYears }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const result = evaluatePassword(value);
  const passes = result.years >= minYears;

  return (
    <div style={{ marginBottom: 4 }}>
      <SectionLabel>{label}</SectionLabel>

      {/* Input row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          style={{
            flex: 1,
            background: "rgba(4, 10, 22, 0.9)",
            border: `1px solid ${passes ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.3)"}`,
            borderRadius: 10,
            padding: "9px 13px",
            color: "#ddeeff",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.88rem",
            outline: "none",
            letterSpacing: "0.04em",
            transition: "border-color 0.2s",
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          title={show ? "Verbergen" : "Anzeigen"}
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(160,210,255,0.7)",
            cursor: "pointer",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {show ? "✕" : "👁"}
        </button>
      </div>

      {/* Strength bar */}
      <div
        style={{
          marginTop: 8,
          height: 4,
          borderRadius: 99,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${result.progress}%`,
            height: "100%",
            background: result.color,
            borderRadius: 99,
            transition: "width 0.35s ease, background 0.35s ease",
          }}
        />
      </div>

      {/* Strength label row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 5,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.71rem",
        }}
      >
        <span style={{ color: result.color, fontWeight: 600 }}>{result.label}</span>
        <span style={{ color: "rgba(140,190,255,0.5)" }}>
          ~{formatCrackTime(result.years)}
        </span>
      </div>

      {/* Feedback hints — show only first two to keep it compact */}
      {result.feedback.length > 0 && (
        <div style={{ marginTop: 5 }}>
          {result.feedback.slice(0, 2).map((f, i) => (
            <div
              key={i}
              style={{
                fontSize: "0.7rem",
                color: "rgba(255, 160, 100, 0.75)",
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.5,
              }}
            >
              ⚠ {f}
            </div>
          ))}
        </div>
      )}

      {/* Threshold info */}
      <div
        style={{
          marginTop: 4,
          fontSize: "0.68rem",
          color: passes
            ? "rgba(34, 197, 94, 0.7)"
            : "rgba(140, 190, 255, 0.38)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        Ziel: ≥ {minYears} Jahre bis Brute-Force
      </div>
    </div>
  );
}

interface DropdownFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  correct: string;
}

function DropdownField({ label, value, options, onChange, correct }: DropdownFieldProps) {
  const ok = value === correct;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.72rem",
          color: "rgba(160, 210, 255, 0.72)",
          letterSpacing: "0.06em",
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "rgba(4, 10, 22, 0.9)",
          border: `1px solid ${ok ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.28)"}`,
          borderRadius: 9,
          padding: "7px 10px",
          color: "#c8ddf5",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.78rem",
          cursor: "pointer",
          outline: "none",
          minWidth: 160,
          transition: "border-color 0.2s",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#08101e" }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  safeWhenOff: boolean; // true = safe state is OFF
}

function ToggleRow({ label, description, enabled, onToggle, safeWhenOff }: ToggleRowProps) {
  const safe = safeWhenOff ? !enabled : enabled;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.72rem",
            color: "rgba(160, 210, 255, 0.72)",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "0.65rem",
            color: "rgba(120, 170, 220, 0.45)",
            fontFamily: "'JetBrains Mono', monospace",
            marginTop: 2,
          }}
        >
          {description}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        style={{
          position: "relative",
          width: 46,
          height: 24,
          borderRadius: 99,
          border: `1.5px solid ${safe ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.35)"}`,
          background: enabled
            ? safe
              ? "rgba(34, 197, 94, 0.2)"
              : "rgba(239, 68, 68, 0.18)"
            : safe
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(239, 68, 68, 0.08)",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background 0.2s, border-color 0.2s",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: enabled ? 24 : 4,
            width: 15,
            height: 15,
            borderRadius: "50%",
            background: safe ? "#22c55e" : "#ef4444",
            transition: "left 0.2s ease, background 0.2s",
            display: "block",
          }}
        />
      </button>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.68rem",
          color: safe ? "rgba(34, 197, 94, 0.75)" : "rgba(239, 68, 68, 0.65)",
          minWidth: 48,
          textAlign: "right",
        }}
      >
        {enabled ? "EIN" : "AUS"}
      </span>
    </div>
  );
}

interface CheckItemProps {
  ok: boolean;
  text: string;
  detail?: string;
}

function CheckItem({ ok, text, detail }: CheckItemProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 9,
        marginBottom: 7,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "0.72rem",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          marginTop: 1,
          color: ok ? "#22c55e" : "#ef4444",
          fontWeight: 700,
        }}
      >
        {ok ? "✓" : "✗"}
      </span>
      <div>
        <span style={{ color: ok ? "rgba(160, 240, 180, 0.85)" : "rgba(230, 140, 140, 0.8)" }}>
          {text}
        </span>
        {detail && !ok && (
          <span style={{ color: "rgba(200, 140, 100, 0.65)", marginLeft: 6 }}>
            — {detail}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main game component ───────────────────────────────────────────────────────
export default function WifiSecurityGame({ onSolved, onAbort }: WifiSecurityGameProps) {
  const [wlanPw, setWlanPw]           = useState("wlan1234");
  const [adminPw, setAdminPw]         = useState("admin");
  const [secMode, setSecMode]         = useState<SecurityMode>("wpa2");
  const [remoteAccess, setRemoteAccess] = useState<RemoteAccess>("aktiviert");
  const [wpsOn, setWpsOn]             = useState(true);
  const [guestSeparated, setGuestSeparated] = useState(false);
  const [attempted, setAttempted]     = useState(false);

  // ── Real-time checks ──────────────────────────────────────────────────────
  const wlanResult  = evaluatePassword(wlanPw);
  const adminResult = evaluatePassword(adminPw);

  const checks = {
    wlan:   wlanResult.years >= 10,
    admin:  adminResult.years >= 15,
    mode:   secMode === "wpa3",
    remote: remoteAccess === "deaktiviert",
    wps:    !wpsOn,
    guest:  guestSeparated,
  };
  const allOk = Object.values(checks).every(Boolean);

  const handleApply = () => {
    setAttempted(true);
    if (allOk) onSolved();
  };

  // ── Security mode options ─────────────────────────────────────────────────
  const secModeOptions: { value: SecurityMode; label: string }[] = [
    { value: "offen",    label: "Offen (kein Passwort)" },
    { value: "wep",      label: "WEP (veraltet)" },
    { value: "wpa",      label: "WPA (veraltet)" },
    { value: "wpa2",     label: "WPA2" },
    { value: "wpa2wpa3", label: "WPA2 / WPA3 (Übergang)" },
    { value: "wpa3",     label: "WPA3 (empfohlen)" },
  ];

  const remoteOptions: { value: RemoteAccess; label: string }[] = [
    { value: "aktiviert",    label: "Aktiviert" },
    { value: "deaktiviert",  label: "Deaktiviert" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "relative",
        width: "min(calc(100vw - 16px), 640px)",
        maxHeight: "min(90svh, 860px)",
        overflowY: "auto",
        borderRadius: 22,
        border: "1px solid rgba(0, 170, 255, 0.16)",
        background:
          "linear-gradient(180deg, rgba(6, 11, 22, 0.98) 0%, rgba(4, 8, 18, 0.99) 100%)",
        boxShadow:
          "0 0 0 1px rgba(0,100,200,0.08), 0 32px 100px rgba(0,0,0,0.55), 0 0 60px rgba(0, 100, 255, 0.04)",
        padding: "20px 20px 22px",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.65rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(0, 200, 255, 0.55)",
              marginBottom: 4,
            }}
          >
            WLAN · Security Lab
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.22rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#e8f4ff",
            }}
          >
            Access-Point-Härtung
          </h2>
        </div>
        {/* Status indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 12px",
            borderRadius: 99,
            border: `1px solid ${allOk ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.25)"}`,
            background: allOk
              ? "rgba(34, 197, 94, 0.08)"
              : "rgba(239, 68, 68, 0.06)",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: allOk ? "#22c55e" : "#ef4444",
              boxShadow: allOk
                ? "0 0 8px rgba(34, 197, 94, 0.7)"
                : "0 0 8px rgba(239, 68, 68, 0.5)",
              display: "block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.65rem",
              color: allOk ? "rgba(120, 220, 140, 0.9)" : "rgba(220, 100, 100, 0.8)",
              letterSpacing: "0.08em",
            }}
          >
            {allOk ? "GESICHERT" : "UNSICHER"}
          </span>
        </div>
      </div>

      <Divider />

      {/* ── WLAN Password ── */}
      <PasswordField
        label="WLAN-Passwort"
        value={wlanPw}
        onChange={setWlanPw}
        minYears={10}
      />

      <Divider />

      {/* ── Admin Password ── */}
      <PasswordField
        label="Router-Admin-Passwort"
        value={adminPw}
        onChange={setAdminPw}
        minYears={15}
      />

      <Divider />

      {/* ── Dropdowns ── */}
      <SectionLabel>Netzwerkkonfiguration</SectionLabel>
      <DropdownField
        label="Sicherheitsmodus"
        value={secMode}
        options={secModeOptions}
        onChange={(v) => setSecMode(v as SecurityMode)}
        correct="wpa3"
      />
      <DropdownField
        label="Router-Fernzugriff"
        value={remoteAccess}
        options={remoteOptions}
        onChange={(v) => setRemoteAccess(v as RemoteAccess)}
        correct="deaktiviert"
      />

      <Divider />

      {/* ── Toggles ── */}
      <SectionLabel>Sicherheitsfunktionen</SectionLabel>
      <ToggleRow
        label="WPS"
        description="Wi-Fi Protected Setup — bekannte Sicherheitslücke"
        enabled={wpsOn}
        onToggle={() => setWpsOn((v) => !v)}
        safeWhenOff={true}
      />
      <ToggleRow
        label="Gastnetz getrennt"
        description="Isoliert Gäste vom Heimnetz"
        enabled={guestSeparated}
        onToggle={() => setGuestSeparated((v) => !v)}
        safeWhenOff={false}
      />

      <Divider />

      {/* ── Checklist ── */}
      <SectionLabel>Sicherheitsstatus</SectionLabel>
      <div
        style={{
          background: "rgba(2, 6, 14, 0.6)",
          border: "1px solid rgba(0, 120, 200, 0.1)",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 18,
        }}
      >
        <CheckItem
          ok={checks.wlan}
          text="WLAN-Passwort"
          detail={
            !checks.wlan
              ? `${wlanResult.label} (~${formatCrackTime(wlanResult.years)}) — mind. 10 Jahre nötig`
              : undefined
          }
        />
        <CheckItem
          ok={checks.admin}
          text="Admin-Passwort"
          detail={
            !checks.admin
              ? `${adminResult.label} (~${formatCrackTime(adminResult.years)}) — mind. 15 Jahre nötig`
              : undefined
          }
        />
        <CheckItem
          ok={checks.mode}
          text="Sicherheitsmodus WPA3"
          detail={!checks.mode ? `aktuell: ${secModeOptions.find((o) => o.value === secMode)?.label}` : undefined}
        />
        <CheckItem
          ok={checks.remote}
          text="Fernzugriff deaktiviert"
          detail={!checks.remote ? "Router-Fernzugriff ist aktiv" : undefined}
        />
        <CheckItem
          ok={checks.wps}
          text="WPS deaktiviert"
          detail={!checks.wps ? "WPS erlaubt PIN-Angriffe" : undefined}
        />
        <CheckItem
          ok={checks.guest}
          text="Gastnetz getrennt"
          detail={!checks.guest ? "Gastnetz ist mit Heimnetz verbunden" : undefined}
        />
      </div>

      {/* ── Error hint after failed attempt ── */}
      {attempted && !allOk && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.22)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.71rem",
            color: "rgba(255, 140, 140, 0.85)",
          }}
        >
          ✗ Noch nicht alle Kriterien erfüllt — überprüfe die rot markierten Punkte.
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleApply}
          style={{
            flex: 1,
            minWidth: 160,
            padding: "12px 18px",
            borderRadius: 12,
            border: `1px solid ${allOk ? "rgba(34, 197, 94, 0.4)" : "rgba(0, 170, 255, 0.3)"}`,
            background: allOk
              ? "linear-gradient(180deg, rgba(34, 100, 60, 0.72), rgba(20, 65, 40, 0.85))"
              : "linear-gradient(180deg, rgba(0, 60, 110, 0.72), rgba(0, 35, 70, 0.85))",
            color: allOk ? "#c8ffdc" : "#b0d8ff",
            fontWeight: 700,
            fontSize: "0.86rem",
            cursor: "pointer",
            letterSpacing: "0.02em",
            transition: "all 0.2s",
          }}
        >
          {allOk ? "✓ Konfiguration speichern" : "Konfiguration prüfen"}
        </button>
        <button
          type="button"
          onClick={onAbort}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(160,200,255,0.6)",
            fontWeight: 600,
            fontSize: "0.82rem",
            cursor: "pointer",
          }}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
