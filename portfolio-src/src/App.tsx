import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AnimatedBackground from "./components/AnimatedBackground";
import ChiptunePlayer from "./components/ChiptunePlayer";
import PortfolioCarousel from "./components/PortfolioCarousel";
// ── Minispiel modals — loaded on demand (lazy) ───────────────────────────────
const LaserRescueModal           = lazy(() => import("./minispiele/laserrettung/LaserRescueModal"));
const InspectorLatchModal        = lazy(() => import("./minispiele/pruefschaltung/InspectorLatchModal"));
const Sha256CrackerModal         = lazy(() => import("./minispiele/sha256cracker/Sha256CrackerModal"));
const WifiSecurityModal          = lazy(() => import("./minispiele/wlan/WifiSecurityModal"));
const TrajectoryCalibrationModal = lazy(() => import("./minispiele/flugbahn/TrajectoryCalibrationModal"));
const ScrapSorterModal           = lazy(() => import("./minispiele/greifarm/ScrapSorterModal"));
const WeldSolderModal            = lazy(() => import("./minispiele/loetschweisstechnik/WeldSolderModal"));
const CheatSuiteModal            = lazy(() => import("./minispiele/cheatsuite/CheatSuiteModal"));

/** Shown for ~100 ms while a modal chunk loads for the first time */
function ModalFallback() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(2,4,10,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: "50%",
        background: "rgba(0,180,255,0.55)",
        boxShadow: "0 0 14px rgba(0,180,255,0.35)",
        animation: "unlock-pulse 1.1s ease-out infinite",
      }} />
    </div>
  );
}
import "./styles/global.css";

function GithubIcon({ color = "#111827" }: { color?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ color, flexShrink: 0 }}>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 7.07a9.573 9.573 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2" />
      <path d="M7 10v7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="7.5" r="1.2" fill="#fff" />
      <path d="M11 17v-4c0-1.1.9-2 2-2s2 .9 2 2v4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 13v4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SocialBadge({
  href,
  label,
  icon,
  textColor,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  textColor?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "0.82rem",
        color: textColor ?? "#111827",
        textDecoration: "none",
        padding: "8px 16px",
        borderRadius: "999px",
        border: "1px solid rgba(255,255,255,0.85)",
        background: "rgba(255,255,255,0.96)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(-1px)";
        el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.26), 0 1px 3px rgba(0,0,0,0.1)";
        el.style.background = "rgba(255,255,255,1)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1)";
        el.style.background = "rgba(255,255,255,0.96)";
      }}
    >
      {icon}
      {label}
    </a>
  );
}

function SocialMenuLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "12px",
        color: "#f3f6ff",
        textDecoration: "none",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        fontSize: "0.86rem",
        fontWeight: 600,
      }}
    >
      {icon}
      {label}
    </a>
  );
}

function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!mobileMenuRef.current?.contains(target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMobileMenuOpen]);

  return (
    <header
      style={{
        position: "relative",
        zIndex: 10,
        padding: "0 40px",
        height: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(180, 229, 255, 0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Avatar */}
        <div
          className="header-avatar"
          style={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.02em",
            flexShrink: 0,
            boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 4px 12px rgba(58, 142, 255, 0.3)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          pk
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div
            className="gradient-text"
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            p-keminer
          </div>
          <div
            style={{
              fontSize: "0.67rem",
              color: "var(--text-muted)",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#4ade80",
                boxShadow: "0 0 6px rgba(74, 222, 128, 0.7)",
                flexShrink: 0,
              }}
            />
            cs, robotics, ki & iot | tech career changer
          </div>
        </div>
      </div>

      <div className="desktop-socials" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <SocialBadge
          href="https://github.com/"
          label="GitHub"
          icon={<GithubIcon />}
        />
        <SocialBadge
          href="#"
          label="LinkedIn"
          icon={<LinkedInIcon />}
        />
      </div>

      <div className="mobile-social-menu" ref={mobileMenuRef}>
        <button
          type="button"
          aria-label="Soziale Links öffnen"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 42,
            height: 42,
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(12,18,32,0.82)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
            cursor: "pointer",
            color: "#f3f6ff",
            padding: 0,
            outline: "none",
          }}
        >
          <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>⋯</span>
        </button>
        {isMobileMenuOpen && (
          <div className="mobile-social-panel">
            <SocialMenuLink
              href="https://github.com/"
              label="GitHub"
              icon={<GithubIcon color="#f3f6ff" />}
            />
            <SocialMenuLink
              href="#"
              label="LinkedIn"
              icon={<LinkedInIcon />}
            />
          </div>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer
      style={{
        position: "relative",
        zIndex: 1,
        padding: "16px 40px",
        borderTop: "1px solid rgba(180, 229, 255, 0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontSize: "0.7rem",
          color: "var(--text-muted)",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.04em",
        }}
      >
        p-keminer
      </span>
      <span style={{ color: "rgba(112, 195, 255, 0.2)", fontSize: "0.6rem" }}>◆</span>
      <span
        style={{
          fontSize: "0.7rem",
          color: "var(--text-muted)",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.04em",
        }}
      >
        built with React + Vite
      </span>
    </footer>
  );
}

export default function App() {
  const [cardsVisible, setCardsVisible] = useState(true);
  const [isLaserRescueOpen, setIsLaserRescueOpen] = useState(false);
  const [isLaserSolved, setIsLaserSolved] = useState(false);
  const [isInspectorLatchOpen, setIsInspectorLatchOpen] = useState(false);
  const [isCoderRepaired, setIsCoderRepaired] = useState(false);
  const [isSha256Open, setIsSha256Open] = useState(false);
  const [isSha256Solved, setIsSha256Solved] = useState(false);
  const [isWifiOpen, setIsWifiOpen] = useState(false);
  const [isWifiSolved, setIsWifiSolved] = useState(false);
  const [isFlugbahnOpen, setIsFlugbahnOpen] = useState(false);
  const [isFlugbahnSolved, setIsFlugbahnSolved] = useState(false);
  const [isGreifarmOpen, setIsGreifarmOpen] = useState(false);
  const [scrapSorted, setScrapSorted] = useState(false);
  const [isWeldSolderOpen, setIsWeldSolderOpen] = useState(false);
  const [isWeldSolderDone, setIsWeldSolderDone] = useState(false);
  const [isCheatSuiteOpen, setIsCheatSuiteOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <AnimatedBackground
        onVictimClick={() => setIsLaserRescueOpen(true)}
        onInspectorClick={() => setIsInspectorLatchOpen(true)}
        onCoderClick={isCoderRepaired ? () => setIsSha256Open(true) : undefined}
        onWifiClick={isSha256Solved ? () => setIsWifiOpen(true) : undefined}
        onGrinderClick={() => setIsFlugbahnOpen(true)}
        onCraneClick={isFlugbahnSolved ? () => setIsGreifarmOpen(true) : undefined}
        onLaugherClick={isLaserSolved ? () => setIsWeldSolderOpen(true) : undefined}
        onShooterClick={() => setIsCheatSuiteOpen(true)}
        coderRepaired={isCoderRepaired}
        sha256Solved={isSha256Solved}
        wifiSolved={isWifiSolved}
        flugbahnSolved={isFlugbahnSolved}
        scrapSorted={scrapSorted}
        weldSolderDone={isWeldSolderDone}
        laserSolved={isLaserSolved}
      />
      <ChiptunePlayer />
      <Header />

      <AnimatePresence>
        {cardsVisible && (
          <motion.main
            key="carousel"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 0 20px",
              marginTop: "-14px",
              overflow: "hidden",
              position: "relative",
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <PortfolioCarousel />
          </motion.main>
        )}
      </AnimatePresence>

      <Footer />

      {/* ── Cards toggle button ── */}
      <button
        type="button"
        aria-label={cardsVisible ? "Karten ausblenden" : "Karten einblenden"}
        title={cardsVisible ? "Karten ausblenden" : "Karten einblenden"}
        onClick={() => setCardsVisible((v) => !v)}
        className="cards-toggle-btn"
        style={{
          position: "fixed",
          bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
          right: 75,
          zIndex: 100,
          width: 40,
          height: 40,
          minWidth: 44,
          minHeight: 44,
          borderRadius: "50%",
          border: `2px solid ${cardsVisible ? "rgba(220,38,38,0.45)" : "rgba(255,255,255,0.18)"}`,
          background: cardsVisible ? "#991b1b" : "rgba(30,30,40,0.82)",
          color: cardsVisible ? "rgba(255,255,255,0.9)" : "rgba(120,140,170,0.50)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: cardsVisible
            ? "0 0 18px rgba(220,38,38,0.40), 0 4px 16px rgba(0,0,0,0.45)"
            : "0 4px 14px rgba(0,0,0,0.4)",
          transition: "background 0.2s, box-shadow 0.2s, border-color 0.2s, color 0.2s",
          outline: "none",
          padding: 0,
        }}
      >
        {/* Disable / Prohibition icon (circle with diagonal line) */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.8"/>
          <line x1="3.4" y1="3.4" x2="12.6" y2="12.6" stroke="currentColor" strokeWidth="1.8"/>
        </svg>
      </button>
      {isLaserRescueOpen && (
        <Suspense fallback={<ModalFallback />}>
          <LaserRescueModal
            onClose={() => setIsLaserRescueOpen(false)}
            onComplete={() => setIsLaserSolved(true)}
          />
        </Suspense>
      )}
      {isInspectorLatchOpen && (
        <Suspense fallback={<ModalFallback />}>
          <InspectorLatchModal
            onClose={() => setIsInspectorLatchOpen(false)}
            onComplete={() => setIsCoderRepaired(true)}
          />
        </Suspense>
      )}
      {isSha256Open && (
        <Suspense fallback={<ModalFallback />}>
          <Sha256CrackerModal
            onClose={() => setIsSha256Open(false)}
            onComplete={() => setIsSha256Solved(true)}
          />
        </Suspense>
      )}
      {isWifiOpen && (
        <Suspense fallback={<ModalFallback />}>
          <WifiSecurityModal
            onClose={() => setIsWifiOpen(false)}
            onComplete={() => setIsWifiSolved(true)}
          />
        </Suspense>
      )}
      {isFlugbahnOpen && (
        <Suspense fallback={<ModalFallback />}>
          <TrajectoryCalibrationModal
            onClose={() => setIsFlugbahnOpen(false)}
            onComplete={() => setIsFlugbahnSolved(true)}
          />
        </Suspense>
      )}
      {isGreifarmOpen && (
        <Suspense fallback={<ModalFallback />}>
          <ScrapSorterModal
            onClose={() => setIsGreifarmOpen(false)}
            onComplete={() => setScrapSorted(true)}
          />
        </Suspense>
      )}
      {isWeldSolderOpen && (
        <Suspense fallback={<ModalFallback />}>
          <WeldSolderModal
            onClose={() => setIsWeldSolderOpen(false)}
            onComplete={() => setIsWeldSolderDone(true)}
          />
        </Suspense>
      )}
      {isCheatSuiteOpen && (
        <Suspense fallback={<ModalFallback />}>
          <CheatSuiteModal
            onClose={() => setIsCheatSuiteOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
