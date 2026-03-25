import type { Project } from "../data/projects";

// Per-project screen glow colors
const GLOW: Record<string, { strong: string; soft: string; line: string; led: string }> = {
  logic:    { strong: "hsla(205, 100%, 64%, 0.38)",  soft: "rgba(72, 180, 255, 0.12)",  line: "rgba(72, 180, 255, 0.7)",  led: "#4ade80" },
  iot:      { strong: "rgba(255, 135, 50, 0.36)",  soft: "rgba(255, 135, 50, 0.11)",  line: "rgba(255, 140, 60, 0.7)",  led: "#fb923c" },
  github:   { strong: "rgba(160, 110, 255, 0.36)", soft: "rgba(160, 110, 255, 0.11)", line: "rgba(170, 120, 255, 0.7)", led: "#a78bfa" },
  robotics: { strong: "rgba(50, 220, 190, 0.36)",  soft: "rgba(50, 220, 190, 0.11)",  line: "rgba(60, 225, 195, 0.7)",  led: "#34d399" },
  education:{ strong: "rgba(232, 84, 107, 0.36)",  soft: "rgba(232, 84, 107, 0.11)",  line: "rgba(245, 118, 138, 0.7)", led: "#fca5a5" },
  portfolio:{ strong: "rgba(245, 158, 11, 0.36)",  soft: "rgba(245, 158, 11, 0.11)",  line: "rgba(251, 191, 36, 0.7)",  led: "#fbbf24" },
};

function LogicCover() {
  return (
    <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="lg-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#091327" />
          <stop offset="100%" stopColor="#122b56" />
        </linearGradient>
        <linearGradient id="lg-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3da8ff" stopOpacity="0" />
          <stop offset="48%" stopColor="#71d5ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3da8ff" stopOpacity="0" />
        </linearGradient>
        <filter id="lg-glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="220" fill="url(#lg-bg)" />
      {[40, 80, 120, 160, 200, 240, 280, 320, 360].map((x) => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="220" stroke="#4f7fd8" strokeWidth="0.45" strokeOpacity="0.28" />
      ))}
      {[44, 88, 132, 176].map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#4f7fd8" strokeWidth="0.45" strokeOpacity="0.28" />
      ))}
      <path d="M 56 108 L 122 108 L 122 76 L 204 76" stroke="url(#lg-line)" strokeWidth="1.6" fill="none" />
      <path d="M 56 108 L 122 108 L 122 142 L 204 142" stroke="url(#lg-line)" strokeWidth="1.6" fill="none" />
      <path d="M 246 109 L 346 109" stroke="url(#lg-line)" strokeWidth="1.6" fill="none" />
      <path d="M 246 78 L 292 78 L 292 52 L 346 52" stroke="#5aaeff" strokeWidth="1.1" fill="none" strokeOpacity="0.52" />
      <path d="M 246 140 L 292 140 L 292 168 L 346 168" stroke="#5aaeff" strokeWidth="1.1" fill="none" strokeOpacity="0.52" />
      <g filter="url(#lg-glow)">
        <path d="M 199 60 L 227 60 Q 249 60 249 105 Q 249 150 227 150 L 199 150 Z" fill="none" stroke="#a2ebff" strokeWidth="2.1" />
        <line x1="199" y1="80" x2="199" y2="97" stroke="#a2ebff" strokeWidth="2.1" />
        <line x1="199" y1="113" x2="199" y2="130" stroke="#a2ebff" strokeWidth="2.1" />
      </g>
      {[[56,108],[122,76],[122,142],[346,109],[346,52],[346,168]].map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r="3.6" fill="#7adbff" opacity="0.95" filter="url(#lg-glow)" />
      ))}
      <rect width="400" height="30" fill="rgba(18,33,65,0.28)" />
      <text x="18" y="20" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#c6f2ff" letterSpacing="2">LOGIK SIMULATOR</text>
    </svg>
  );
}

function IotCover() {
  return (
    <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <radialGradient id="iot-bg" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor="#321412" />
          <stop offset="100%" stopColor="#18060a" />
        </radialGradient>
        <filter id="iot-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="220" fill="url(#iot-bg)" />
      {[28, 52, 77, 102, 130].map((r, i) => (
        <circle key={i} cx="200" cy="116" r={r} fill="none" stroke="#ff9b55" strokeWidth="0.95" strokeOpacity={0.72 - i * 0.11} />
      ))}
      <circle cx="200" cy="116" r="8" fill="#ff9d62" filter="url(#iot-glow)" />
      <circle cx="200" cy="116" r="15" fill="none" stroke="#ffb07b" strokeWidth="1.6" strokeOpacity="0.52" />
      <path d="M 80 116 L 162 116" stroke="#ff9b55" strokeWidth="1.1" strokeOpacity="0.42" strokeDasharray="4 3" />
      <path d="M 238 116 L 320 116" stroke="#ff9b55" strokeWidth="1.1" strokeOpacity="0.42" strokeDasharray="4 3" />
      <path d="M 200 42 L 200 98" stroke="#ff9b55" strokeWidth="1.1" strokeOpacity="0.42" strokeDasharray="4 3" />
      <path d="M 200 134 L 200 192" stroke="#ff9b55" strokeWidth="1.1" strokeOpacity="0.42" strokeDasharray="4 3" />
      {[[80,112],[320,112],[196,42],[196,184]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="9" height="9" rx="2" fill="#ff8b4d" opacity="0.88" />
      ))}
      <rect width="400" height="30" fill="rgba(38,10,8,0.26)" />
      <text x="18" y="20" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#ffd0b2" letterSpacing="2">IOT ALARMSYSTEM</text>
    </svg>
  );
}

function GithubCover() {
  return (
    <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="gh-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1b1432" />
          <stop offset="100%" stopColor="#241944" />
        </linearGradient>
        <filter id="gh-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="220" fill="url(#gh-bg)" />
      {[50, 66, 82, 102, 118, 134, 152, 168, 184].map((y, i) => (
        <rect key={i} x={24 + (i % 3) * 7} y={y} width={72 + (i * 20) % 112} height="6" rx="3" fill="#9e7fff" opacity={0.08 + (i % 4) * 0.04} />
      ))}
      {[50, 66, 82, 102, 118, 134, 152, 168, 184].map((y, i) => (
        <rect key={`r${i}`} x={220 - (i % 4) * 6} y={y} width={44 + (i * 16) % 96} height="6" rx="3" fill="#c59dff" opacity={0.06 + (i % 3) * 0.04} />
      ))}
      <g filter="url(#gh-glow)">
        <circle cx="198" cy="54" r="5" fill="#d8c4ff" />
        <line x1="198" y1="60" x2="198" y2="84" stroke="#b88dff" strokeWidth="1.6" />
        <circle cx="198" cy="88" r="5" fill="#cfaeff" />
        <line x1="198" y1="94" x2="198" y2="116" stroke="#b88dff" strokeWidth="1.6" />
        <line x1="198" y1="98" x2="228" y2="114" stroke="#9b77ff" strokeWidth="1.3" strokeOpacity="0.72" />
        <circle cx="198" cy="121" r="5" fill="#d8c4ff" />
        <circle cx="228" cy="120" r="4" fill="#ab87ff" opacity="0.74" />
        <line x1="198" y1="126" x2="198" y2="148" stroke="#b88dff" strokeWidth="1.6" />
        <line x1="228" y1="126" x2="228" y2="146" stroke="#9b77ff" strokeWidth="1.2" strokeOpacity="0.65" />
        <line x1="228" y1="146" x2="198" y2="160" stroke="#9b77ff" strokeWidth="1.2" strokeOpacity="0.65" />
        <circle cx="198" cy="160" r="5" fill="#d8c4ff" />
      </g>
      <rect width="400" height="30" fill="rgba(31,20,58,0.26)" />
      <text x="18" y="20" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#eddfff" letterSpacing="2">GITHUB PROFIL</text>
    </svg>
  );
}

function RoboticsCover() {
  return (
    <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="rb-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#091c1e" />
          <stop offset="100%" stopColor="#0d2c2e" />
        </linearGradient>
        <filter id="rb-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="220" fill="url(#rb-bg)" />
      {[ [182,84],[216,84],[250,84],[164,116],[198,116],[232,116],[266,116],[182,148],[216,148],[250,148] ].map(([cx,cy],i) => {
        const r = 16;
        const pts = Array.from({ length: 6 }, (_, k) => {
          const a = (Math.PI / 3) * k - Math.PI / 6;
          return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
        }).join(" ");
        return <polygon key={i} points={pts} fill="none" stroke="#31c6c3" strokeWidth="0.7" strokeOpacity={0.24 + (i % 3) * 0.08} />;
      })}
      <g filter="url(#rb-glow)">
        <rect x="188" y="180" width="26" height="12" rx="3" fill="#1b9c9b" opacity="0.92" />
        <rect x="197" y="146" width="9" height="37" rx="4" fill="#4ff6e8" opacity="0.84" />
        <circle cx="201" cy="146" r="6" fill="#7ffff0" />
        <line x1="201" y1="146" x2="230" y2="112" stroke="#4ff6e8" strokeWidth="8" strokeLinecap="round" opacity="0.8" />
        <circle cx="230" cy="112" r="5.5" fill="#7ffff0" />
        <line x1="230" y1="112" x2="255" y2="88" stroke="#1fc7be" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
        <line x1="255" y1="88" x2="266" y2="80" stroke="#89fff4" strokeWidth="3" strokeLinecap="round" />
        <line x1="255" y1="88" x2="266" y2="95" stroke="#89fff4" strokeWidth="3" strokeLinecap="round" />
      </g>
      <rect width="400" height="30" fill="rgba(6,30,30,0.24)" />
      <text x="18" y="20" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#c8fff9" letterSpacing="2">FERNGESTEUERTER ROBOTERARM</text>
    </svg>
  );
}

function EducationCover() {
  return (
    <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="ed-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1d0b15" />
          <stop offset="100%" stopColor="#311120" />
        </linearGradient>
        <linearGradient id="ed-book" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
        <filter id="ed-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="220" fill="url(#ed-bg)" />
      {[52, 88, 124, 160].map((y, i) => (
        <line key={i} x1="38" y1={y} x2="362" y2={y} stroke="#5f2440" strokeWidth="0.8" strokeOpacity={0.28 + i * 0.08} />
      ))}
      {[72, 132, 192, 252, 312].map((x, i) => (
        <line key={`v${i}`} x1={x} y1="28" x2={x} y2="192" stroke="#6f2e4b" strokeWidth="0.8" strokeOpacity={0.18 + i * 0.05} />
      ))}
      <g filter="url(#ed-glow)">
        <path d="M 132 150 Q 170 124 200 132 Q 230 124 268 150 L 268 76 Q 232 50 200 60 Q 168 50 132 76 Z" fill="rgba(255,255,255,0.04)" stroke="#f8b4c0" strokeWidth="1.5" />
        <path d="M 140 144 Q 170 122 198 130 L 198 66 Q 170 58 140 78 Z" fill="url(#ed-book)" opacity="0.9" />
        <path d="M 202 130 Q 230 122 260 144 L 260 78 Q 230 58 202 66 Z" fill="#f472b6" opacity="0.82" />
        <line x1="200" y1="66" x2="200" y2="132" stroke="#ffe4e6" strokeWidth="1.4" opacity="0.9" />
        <path d="M 176 104 L 188 116 L 224 84" fill="none" stroke="#fff1f2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <circle cx="108" cy="70" r="4" fill="#fb7185" opacity="0.8" />
      <circle cx="292" cy="66" r="4" fill="#7dd3fc" opacity="0.75" />
      <circle cx="314" cy="148" r="5" fill="#fca5a5" opacity="0.78" />
      <rect width="400" height="30" fill="rgba(44,10,22,0.28)" />
      <text x="18" y="20" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#ffe4e6" letterSpacing="2">CS50X HARVARD</text>
    </svg>
  );
}

function PortfolioCover() {
  return (
    <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="pf-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0c0a04" />
          <stop offset="100%" stopColor="#16120a" />
        </linearGradient>
        <filter id="pf-glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <marker id="pf-arr" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto">
          <polygon points="0 0, 5 2, 0 4" fill="#f59e0b" fillOpacity="0.65" />
        </marker>
      </defs>
      <rect width="400" height="220" fill="url(#pf-bg)" />
      {[80, 160, 240, 320].map((x) => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="220" stroke="#6b4d10" strokeWidth="0.35" strokeOpacity="0.18" />
      ))}
      {[70, 130, 190].map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#6b4d10" strokeWidth="0.35" strokeOpacity="0.18" />
      ))}

      {/* ── TOP ROW: 3D SITE ── */}

      {/* Left panel: Leistungsnachweise */}
      <g filter="url(#pf-glow)">
        <rect x="6" y="33" width="78" height="76" rx="3" fill="rgba(245,158,11,0.05)" stroke="#f59e0b" strokeWidth="0.9" strokeOpacity="0.48" />
        <rect x="6" y="33" width="78" height="11" rx="3" fill="rgba(245,158,11,0.09)" />
        <line x1="6" y1="44" x2="84" y2="44" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.28" />
        <text x="45" y="41.5" fontFamily="JetBrains Mono, monospace" fontSize="4.8" fill="#fcd34d" textAnchor="middle" letterSpacing="0.6">LEISTUNGEN</text>
        <circle cx="16" cy="54" r="3" fill="none" stroke="#fbbf24" strokeWidth="0.9" strokeOpacity="0.65" />
        <path d="M14.5 53.5L15.8 55L18.5 52" stroke="#fbbf24" strokeWidth="0.9" fill="none" strokeOpacity="0.7" />
        <line x1="23" y1="54" x2="78" y2="54" stroke="#fbbf24" strokeWidth="0.6" strokeOpacity="0.28" />
        <line x1="23" y1="58" x2="70" y2="58" stroke="#f59e0b" strokeWidth="0.4" strokeOpacity="0.18" />
        <circle cx="16" cy="67" r="3" fill="none" stroke="#fbbf24" strokeWidth="0.9" strokeOpacity="0.55" />
        <path d="M14.5 66.5L15.8 68L18.5 65" stroke="#fbbf24" strokeWidth="0.9" fill="none" strokeOpacity="0.55" />
        <line x1="23" y1="67" x2="75" y2="67" stroke="#f59e0b" strokeWidth="0.6" strokeOpacity="0.22" />
        <line x1="23" y1="71" x2="66" y2="71" stroke="#f59e0b" strokeWidth="0.4" strokeOpacity="0.15" />
        <circle cx="16" cy="80" r="3" fill="none" stroke="#f59e0b" strokeWidth="0.9" strokeOpacity="0.38" />
        <line x1="23" y1="80" x2="72" y2="80" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.18" />
        <line x1="23" y1="84" x2="60" y2="84" stroke="#f59e0b" strokeWidth="0.4" strokeOpacity="0.13" />
        <text x="45" y="102" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#fbbf24" textAnchor="middle" fillOpacity="0.4">{'\u2605'} {'\u2605'} {'\u2605'}</text>
      </g>

      {/* Arrow: 3D browser → Leistungen */}
      <line x1="92" y1="71" x2="84" y2="71" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.52" markerEnd="url(#pf-arr)" />

      {/* Center top: 3D site browser */}
      <g filter="url(#pf-glow)">
        <rect x="92" y="30" width="216" height="83" rx="4" fill="rgba(245,158,11,0.07)" stroke="#f59e0b" strokeWidth="1.3" strokeOpacity="0.78" />
        <rect x="92" y="30" width="216" height="14" rx="4" fill="rgba(245,158,11,0.12)" />
        <line x1="92" y1="44" x2="308" y2="44" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.32" />
        <circle cx="104" cy="37" r="2.5" fill="#ef4444" opacity="0.65" />
        <circle cx="113" cy="37" r="2.5" fill="#f59e0b" opacity="0.65" />
        <circle cx="122" cy="37" r="2.5" fill="#22c55e" opacity="0.65" />
        <text x="200" y="40.5" fontFamily="JetBrains Mono, monospace" fontSize="5.2" fill="rgba(255,215,130,0.48)" textAnchor="middle">localhost:5173</text>
        {/* Isometric cube */}
        <polygon points="200,50 232,61 200,72 168,61" fill="rgba(245,158,11,0.1)" stroke="#f59e0b" strokeWidth="1.2" strokeOpacity="0.72" />
        <polygon points="168,61 200,72 200,97 168,86" fill="rgba(245,158,11,0.055)" stroke="#f59e0b" strokeWidth="1.2" strokeOpacity="0.52" />
        <polygon points="232,61 200,72 200,97 232,86" fill="rgba(245,158,11,0.03)" stroke="#f59e0b" strokeWidth="1.2" strokeOpacity="0.4" />
        <text x="200" y="59" fontFamily="JetBrains Mono, monospace" fontSize="5.8" fill="#fbbf24" textAnchor="middle" fillOpacity="0.72" letterSpacing="1">THREE.JS 3D</text>
        <text x="200" y="107" fontFamily="JetBrains Mono, monospace" fontSize="4.8" fill="#f59e0b" textAnchor="middle" fillOpacity="0.38">Raum {'\u00b7'} Kamera {'\u00b7'} Hotspots</text>
      </g>

      {/* Arrow: 3D browser → Chess */}
      <line x1="308" y1="71" x2="316" y2="71" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.52" markerEnd="url(#pf-arr)" />

      {/* Right panel: Chess */}
      <g filter="url(#pf-glow)">
        <rect x="316" y="33" width="78" height="76" rx="3" fill="rgba(245,158,11,0.05)" stroke="#f59e0b" strokeWidth="0.9" strokeOpacity="0.48" />
        <rect x="316" y="33" width="78" height="11" rx="3" fill="rgba(245,158,11,0.09)" />
        <line x1="316" y1="44" x2="394" y2="44" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.28" />
        <text x="355" y="41.5" fontFamily="JetBrains Mono, monospace" fontSize="4.8" fill="#fcd34d" textAnchor="middle" letterSpacing="0.6">SCHACHSPIEL</text>
        {/* Chess board 4x4 centered in panel */}
        <rect x="335" y="48" width="10" height="10" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.3" />
        <rect x="345" y="48" width="10" height="10" fill="rgba(245,158,11,0.04)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.2" />
        <rect x="355" y="48" width="10" height="10" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.3" />
        <rect x="365" y="48" width="10" height="10" fill="rgba(245,158,11,0.04)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.2" />
        <rect x="335" y="58" width="10" height="10" fill="rgba(245,158,11,0.04)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.2" />
        <rect x="345" y="58" width="10" height="10" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.3" />
        <rect x="355" y="58" width="10" height="10" fill="rgba(245,158,11,0.04)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.2" />
        <rect x="365" y="58" width="10" height="10" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.3" />
        <rect x="335" y="68" width="10" height="10" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.3" />
        <rect x="345" y="68" width="10" height="10" fill="rgba(245,158,11,0.04)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.2" />
        <rect x="355" y="68" width="10" height="10" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.3" />
        <rect x="365" y="68" width="10" height="10" fill="rgba(245,158,11,0.04)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.2" />
        <rect x="335" y="78" width="10" height="10" fill="rgba(245,158,11,0.04)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.2" />
        <rect x="345" y="78" width="10" height="10" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.3" />
        <rect x="355" y="78" width="10" height="10" fill="rgba(245,158,11,0.04)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.2" />
        <rect x="365" y="78" width="10" height="10" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.3" />
        {/* Pawn piece on board */}
        <circle cx="360" cy="62" r="3.5" fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeOpacity="0.88" />
        <line x1="360" y1="58.5" x2="360" y2="55" stroke="#fbbf24" strokeWidth="1.2" strokeOpacity="0.75" />
        <circle cx="360" cy="53.5" r="2" fill="#fbbf24" fillOpacity="0.72" />
        <text x="355" y="102" fontFamily="JetBrains Mono, monospace" fontSize="4.8" fill="#fbbf24" textAnchor="middle" fillOpacity="0.42">{'\u265f'} 3D Chess</text>
      </g>

      {/* ── CONNECTOR ── */}
      <line x1="200" y1="113" x2="200" y2="127" stroke="#fbbf24" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 2" markerEnd="url(#pf-arr)" />
      <text x="213" y="123" fontFamily="JetBrains Mono, monospace" fontSize="4.5" fill="#fbbf24" fillOpacity="0.42">embeds</text>

      {/* ── BOTTOM ROW: REACT APP ── */}

      {/* Left bottom: Portfolio */}
      <g filter="url(#pf-glow)">
        <rect x="6" y="130" width="78" height="80" rx="3" fill="rgba(245,158,11,0.04)" stroke="#f59e0b" strokeWidth="0.9" strokeOpacity="0.38" />
        <rect x="6" y="130" width="78" height="11" rx="3" fill="rgba(245,158,11,0.07)" />
        <line x1="6" y1="141" x2="84" y2="141" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.22" />
        <text x="45" y="138.5" fontFamily="JetBrains Mono, monospace" fontSize="4.8" fill="#fcd34d" textAnchor="middle" letterSpacing="0.6">PORTFOLIO</text>
        <rect x="10" y="145" width="70" height="16" rx="2" fill="rgba(245,158,11,0.07)" stroke="#f59e0b" strokeWidth="0.6" strokeOpacity="0.32" />
        <line x1="14" y1="149" x2="74" y2="149" stroke="#fbbf24" strokeWidth="0.6" strokeOpacity="0.3" />
        <line x1="14" y1="154" x2="62" y2="154" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.2" />
        <line x1="14" y1="158" x2="55" y2="158" stroke="#f59e0b" strokeWidth="0.4" strokeOpacity="0.15" />
        <rect x="10" y="164" width="70" height="16" rx="2" fill="rgba(245,158,11,0.05)" stroke="#f59e0b" strokeWidth="0.6" strokeOpacity="0.24" />
        <line x1="14" y1="168" x2="74" y2="168" stroke="#fbbf24" strokeWidth="0.5" strokeOpacity="0.22" />
        <line x1="14" y1="173" x2="58" y2="173" stroke="#f59e0b" strokeWidth="0.4" strokeOpacity="0.16" />
        <line x1="14" y1="177" x2="50" y2="177" stroke="#f59e0b" strokeWidth="0.4" strokeOpacity="0.12" />
        <rect x="10" y="183" width="70" height="14" rx="2" fill="rgba(245,158,11,0.03)" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.18" />
        <line x1="14" y1="187" x2="68" y2="187" stroke="#f59e0b" strokeWidth="0.4" strokeOpacity="0.15" />
        <line x1="14" y1="191" x2="52" y2="191" stroke="#f59e0b" strokeWidth="0.4" strokeOpacity="0.11" />
      </g>

      {/* Arrow: React browser → Portfolio */}
      <line x1="92" y1="170" x2="84" y2="170" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.42" markerEnd="url(#pf-arr)" />

      {/* Center bottom: React App browser */}
      <g filter="url(#pf-glow)">
        <rect x="92" y="128" width="216" height="82" rx="4" fill="rgba(245,158,11,0.055)" stroke="#fbbf24" strokeWidth="1.1" strokeOpacity="0.52" />
        <rect x="92" y="128" width="216" height="14" rx="4" fill="rgba(245,158,11,0.08)" />
        <line x1="92" y1="142" x2="308" y2="142" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.26" />
        <circle cx="104" cy="135" r="2.5" fill="#ef4444" opacity="0.55" />
        <circle cx="113" cy="135" r="2.5" fill="#f59e0b" opacity="0.55" />
        <circle cx="122" cy="135" r="2.5" fill="#22c55e" opacity="0.55" />
        <text x="200" y="138.5" fontFamily="JetBrains Mono, monospace" fontSize="5.2" fill="rgba(255,215,130,0.38)" textAnchor="middle">p-keminer.github.io</text>
        <text x="200" y="163" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill="#fcd34d" textAnchor="middle" fillOpacity="0.84">&lt;React App /&gt;</text>
        <text x="200" y="177" fontFamily="JetBrains Mono, monospace" fontSize="5" fill="#fbbf24" textAnchor="middle" fillOpacity="0.38">Framer Motion {'\u00b7'} TypeScript {'\u00b7'} Vite</text>
        <text x="200" y="202" fontFamily="JetBrains Mono, monospace" fontSize="4.5" fill="#f59e0b" textAnchor="middle" fillOpacity="0.28">embedded via iframe</text>
      </g>

      {/* Arrow: React browser → Minispiele */}
      <line x1="308" y1="170" x2="316" y2="170" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.42" markerEnd="url(#pf-arr)" />

      {/* Right bottom: Mini-Spiele */}
      <g filter="url(#pf-glow)">
        <rect x="316" y="130" width="78" height="80" rx="3" fill="rgba(245,158,11,0.04)" stroke="#f59e0b" strokeWidth="0.9" strokeOpacity="0.38" />
        <rect x="316" y="130" width="78" height="11" rx="3" fill="rgba(245,158,11,0.07)" />
        <line x1="316" y1="141" x2="394" y2="141" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.22" />
        <text x="355" y="138.5" fontFamily="JetBrains Mono, monospace" fontSize="4.8" fill="#fcd34d" textAnchor="middle" letterSpacing="0.6">MINI-SPIELE</text>
        <rect x="320" y="146" width="24" height="18" rx="2" fill="rgba(245,158,11,0.09)" stroke="#fbbf24" strokeWidth="0.7" strokeOpacity="0.48" />
        <rect x="348" y="146" width="24" height="18" rx="2" fill="rgba(245,158,11,0.07)" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.38" />
        <circle cx="332" cy="154" r="3" fill="none" stroke="#fbbf24" strokeWidth="0.9" strokeOpacity="0.72" />
        <line x1="332" y1="151" x2="332" y2="148" stroke="#fbbf24" strokeWidth="0.9" strokeOpacity="0.65" />
        <line x1="350" y1="149" x2="350" y2="162" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.6" />
        <circle cx="360" cy="155" r="2" fill="#fbbf24" fillOpacity="0.55" />
        <line x1="370" y1="149" x2="370" y2="162" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.5" />
        <rect x="320" y="168" width="24" height="18" rx="2" fill="rgba(245,158,11,0.06)" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.3" />
        <rect x="348" y="168" width="24" height="18" rx="2" fill="rgba(245,158,11,0.05)" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.25" />
        <path d="M323 171 L323 182 L332 182" stroke="#fbbf24" strokeWidth="0.8" fill="none" strokeOpacity="0.5" />
        <path d="M327 171 L327 178 L335 178" stroke="#fbbf24" strokeWidth="0.8" fill="none" strokeOpacity="0.38" />
        <text x="360" y="179.5" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#fbbf24" textAnchor="middle" fillOpacity="0.5">6+</text>
        <text x="355" y="201" fontFamily="JetBrains Mono, monospace" fontSize="4.8" fill="#fbbf24" textAnchor="middle" fillOpacity="0.36">6 Minispiele</text>
      </g>

      {/* Header */}
      <rect width="400" height="30" fill="rgba(14,10,4,0.28)" />
      <text x="18" y="20" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#fde68a" letterSpacing="2">3D PORTFOLIO</text>
    </svg>
  );
}

const COVER_MAP = {
  logic: LogicCover,
  iot: IotCover,
  github: GithubCover,
  robotics: RoboticsCover,
  education: EducationCover,
  portfolio: PortfolioCover,
} as const;

interface ProjectCardProps {
  project: Project;
  isActive: boolean;
  isHovered: boolean;
}

export default function ProjectCard({ project, isActive, isHovered }: ProjectCardProps) {
  const CoverComponent = COVER_MAP[project.coverVariant];
  const glow = GLOW[project.coverVariant];

  // Inactive cards look like standby monitors (slightly dim)
  const screenBrightness = isActive ? 1 : isHovered ? 0.85 : 0.72;

  return (
    <div
      // Monitor outer bezel
      className={isActive ? "monitor-active" : undefined}
      style={{
        width: "100%",
        height: "100%",
        // CSS custom props for the keyframe animation
        ["--glow-color" as string]: glow.strong,
        ["--glow-soft" as string]: glow.soft,
        background: "linear-gradient(160deg, #1a1b20 0%, #0e0f14 100%)",
        borderRadius: "18px",
        padding: "10px 10px 26px",
        position: "relative",
        border: "1px solid rgba(255,255,255,0.07)",
        // Active: pulsing glow via CSS animation; inactive: soft static glow
        boxShadow: isActive ? undefined : isHovered ? `
          inset 0 1px 0 rgba(255,255,255,0.08),
          0 0 0 1px rgba(255,255,255,0.05),
          0 40px 80px rgba(0,0,0,0.90),
          0 0 42px var(--glow-color),
          0 0 90px var(--glow-soft)
        ` : `
          inset 0 1px 0 rgba(255,255,255,0.06),
          0 0 0 1px rgba(255,255,255,0.04),
          0 36px 72px rgba(0,0,0,0.90),
          0 0 24px var(--glow-color),
          0 0 55px var(--glow-soft)
        `,
        cursor: "inherit",
        userSelect: "none",
        WebkitUserSelect: "none",
        transition: "box-shadow 0.4s ease",
      }}
    >
      {/* Bezel top-edge highlight */}
      <div style={{
        position: "absolute",
        top: 0, left: "12%", right: "12%",
        height: "1px",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
        borderRadius: "1px",
        pointerEvents: "none",
      }} />

      {/* ── Screen area ── */}
      <div
        style={{
          width: "100%",
          height: "calc(100% - 16px)",
          borderRadius: "10px",
          overflow: "hidden",
          background: "#050810",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          boxShadow: `inset 0 0 50px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(0,0,0,0.6)`,
          filter: `brightness(${screenBrightness})`,
          transition: "filter 0.35s ease",
        }}
      >
        {/* Screen corner reflection */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "linear-gradient(148deg, rgba(255,255,255,0.055) 0%, transparent 38%)",
          pointerEvents: "none",
          zIndex: 20,
        }} />

        {/* Scanlines */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.07) 0px, rgba(0,0,0,0.07) 1px, transparent 1px, transparent 4px)",
          pointerEvents: "none",
          zIndex: 19,
        }} />

        {/* Cover art — top section */}
        <div style={{
          flexShrink: 0,
          height: 248,
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            width: "100%",
            height: "100%",
            transform: "scale(1.04)",
            transformOrigin: "center center",
          }}>
            <CoverComponent />
          </div>
        </div>

        {/* Divider line — project's accent color */}
        <div style={{
          flexShrink: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${glow.line} 30%, ${glow.line} 70%, transparent 100%)`,
          opacity: isActive ? 1 : 0.35,
          transition: "opacity 0.4s ease",
        }} />

        {/* Info panel */}
        <div style={{
          flex: 1,
          padding: "15px 20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "9px",
          background: "linear-gradient(180deg, rgba(5,8,18,0.97) 0%, rgba(3,5,12,0.99) 100%)",
          overflow: "hidden",
        }}>
          <h3 style={{
            fontSize: "1.08rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
            flexShrink: 0,
          }}>
            {project.title}
          </h3>

          <p style={{
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            lineHeight: 1.56,
            flex: 1,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical" as const,
          }}>
            {project.description}
          </p>

          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", flexShrink: 0 }}>
            {project.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: "0.67rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? "rgba(112,195,255,0.18)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: "var(--radius-tag)",
                  padding: "2px 7px",
                  letterSpacing: "0.03em",
                  transition: "color 0.3s, border-color 0.3s",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

        </div>
      </div>

      {/* Bezel chin: LED + model label */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
      }}>
        <div style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: glow.led,
          boxShadow: `0 0 ${isActive ? 8 : 4}px ${glow.led}`,
          transition: "box-shadow 0.4s ease",
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: "0.52rem",
          fontFamily: "'JetBrains Mono', monospace",
          color: "rgba(255,255,255,0.18)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}>
          {project.id.slice(0, 10)}
        </span>
      </div>
    </div>
  );
}
