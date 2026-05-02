import type { Project } from "../data/projects";

// Per-project screen glow colors
const GLOW: Record<string, { strong: string; soft: string; line: string; led: string }> = {
  logic:    { strong: "hsla(205, 100%, 64%, 0.38)",  soft: "rgba(72, 180, 255, 0.12)",  line: "rgba(72, 180, 255, 0.7)",  led: "#4ade80" },
  iot:      { strong: "rgba(255, 135, 50, 0.36)",  soft: "rgba(255, 135, 50, 0.11)",  line: "rgba(255, 140, 60, 0.7)",  led: "#fb923c" },
  github:   { strong: "rgba(160, 110, 255, 0.36)", soft: "rgba(160, 110, 255, 0.11)", line: "rgba(170, 120, 255, 0.7)", led: "#a78bfa" },
  robotics: { strong: "rgba(50, 220, 190, 0.36)",  soft: "rgba(50, 220, 190, 0.11)",  line: "rgba(60, 225, 195, 0.7)",  led: "#34d399" },
  education:{ strong: "rgba(232, 84, 107, 0.36)",  soft: "rgba(232, 84, 107, 0.11)",  line: "rgba(245, 118, 138, 0.7)", led: "#fca5a5" },
  thesis:   { strong: "rgba(76, 212, 164, 0.34)",  soft: "rgba(76, 212, 164, 0.11)",  line: "rgba(110, 235, 191, 0.72)", led: "#6ee7b7" },
  organizer:{ strong: "rgba(244, 114, 182, 0.34)", soft: "rgba(244, 114, 182, 0.12)", line: "rgba(251, 146, 203, 0.7)", led: "#f472b6" },
  portfolio:{ strong: "rgba(245, 158, 11, 0.36)",  soft: "rgba(245, 158, 11, 0.11)",  line: "rgba(251, 191, 36, 0.7)",  led: "#fbbf24" },
  irremote: { strong: "rgba(244, 114, 182, 0.34)", soft: "rgba(244, 114, 182, 0.12)", line: "rgba(251, 146, 203, 0.7)", led: "#f472b6" },
  english:  { strong: "rgba(96, 165, 250, 0.34)",  soft: "rgba(96, 165, 250, 0.12)",  line: "rgba(125, 211, 252, 0.72)", led: "#7dd3fc" },
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
          <stop offset="0%" stopColor="#2b130f" />
          <stop offset="100%" stopColor="#17070a" />
        </radialGradient>
        <linearGradient id="iot-shield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,186,122,0.22)" />
          <stop offset="100%" stopColor="rgba(255,138,76,0.06)" />
        </linearGradient>
        <filter id="iot-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="220" fill="url(#iot-bg)" />
      {[54, 92, 130, 168].map((y, i) => (
        <line key={i} x1="42" y1={y} x2="358" y2={y} stroke="#6a2d18" strokeWidth="0.8" strokeOpacity={0.14 + i * 0.04} />
      ))}
      <g filter="url(#iot-glow)">
        <path d="M200 42 L276 72 L258 154 L200 186 L142 154 L124 72 Z" fill="url(#iot-shield)" stroke="#ffb071" strokeWidth="1.5" strokeOpacity="0.78" />
        <path d="M200 68 L250 88 L238 144 L200 166 L162 144 L150 88 Z" fill="rgba(255,176,113,0.04)" stroke="#ff9f66" strokeWidth="1.1" strokeOpacity="0.42" />
        <path d="M178 104 Q178 84 200 84 Q222 84 222 104" fill="none" stroke="#ffd3ad" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.82" />
        <rect x="170" y="102" width="60" height="40" rx="10" fill="rgba(255,176,113,0.12)" stroke="#ffd3ad" strokeWidth="1.6" strokeOpacity="0.84" />
        <circle cx="200" cy="120" r="6" fill="none" stroke="#ffd3ad" strokeWidth="1.4" strokeOpacity="0.82" />
        <line x1="200" y1="126" x2="200" y2="134" stroke="#ffd3ad" strokeWidth="1.4" strokeOpacity="0.82" />
        <path d="M148 82 L116 64" stroke="#ff9b55" strokeWidth="1.2" strokeDasharray="4 4" strokeOpacity="0.46" />
        <path d="M252 82 L284 64" stroke="#ff9b55" strokeWidth="1.2" strokeDasharray="4 4" strokeOpacity="0.46" />
        <path d="M164 154 L126 172" stroke="#ff9b55" strokeWidth="1.2" strokeDasharray="4 4" strokeOpacity="0.36" />
        <path d="M236 154 L274 172" stroke="#ff9b55" strokeWidth="1.2" strokeDasharray="4 4" strokeOpacity="0.36" />
        {[[108,60],[292,60],[120,174],[280,174]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="6" fill="rgba(255,155,85,0.16)" stroke="#ff9b55" strokeWidth="1.2" strokeOpacity="0.68" />
        ))}
      </g>
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


function ThesisCover() {
  return (
    <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="th-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#061616" />
          <stop offset="100%" stopColor="#0d2621" />
        </linearGradient>
        <filter id="th-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="220" fill="url(#th-bg)" />
      {[62, 104, 146, 188].map((y, i) => (
        <line key={i} x1="44" y1={y} x2="356" y2={y} stroke="#245a4e" strokeWidth="0.8" strokeOpacity={0.2 + i * 0.06} />
      ))}
      <g filter="url(#th-glow)">
        <rect x="54" y="56" width="84" height="108" rx="9" fill="rgba(110,231,183,0.08)" stroke="#6ee7b7" strokeWidth="1.4" strokeOpacity="0.72" />
        <line x1="72" y1="82" x2="120" y2="82" stroke="#a7f3d0" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="72" y1="98" x2="120" y2="98" stroke="#6ee7b7" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.85" />
        <line x1="72" y1="114" x2="112" y2="114" stroke="#6ee7b7" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.72" />
        <line x1="138" y1="110" x2="186" y2="110" stroke="#6ee7b7" strokeWidth="1.2" strokeDasharray="4 4" strokeOpacity="0.48" />
        <line x1="224" y1="108" x2="270" y2="108" stroke="#6ee7b7" strokeWidth="1.2" strokeDasharray="4 4" strokeOpacity="0.42" />
        <circle cx="204" cy="108" r="15" fill="rgba(110,231,183,0.05)" stroke="#a7f3d0" strokeWidth="1.45" strokeOpacity="0.82" />
        <path d="M197 108 L202 113 L213 101" fill="none" stroke="#a7f3d0" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M262 56 Q287 45 312 56 L312 166 Q287 154 262 166 Z" fill="rgba(110,231,183,0.08)" stroke="#6ee7b7" strokeWidth="1.25" strokeOpacity="0.72" />
        <path d="M312 56 Q337 45 362 56 L362 166 Q337 154 312 166 Z" fill="rgba(110,231,183,0.14)" stroke="#a7f3d0" strokeWidth="1.25" strokeOpacity="0.78" />
        <line x1="275" y1="84" x2="301" y2="84" stroke="#d1fae5" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="275" y1="96" x2="299" y2="96" stroke="#6ee7b7" strokeWidth="1.05" strokeLinecap="round" strokeOpacity="0.68" />
        <line x1="275" y1="108" x2="298" y2="108" stroke="#6ee7b7" strokeWidth="1.05" strokeLinecap="round" strokeOpacity="0.58" />
        <line x1="323" y1="84" x2="349" y2="84" stroke="#d1fae5" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="323" y1="96" x2="347" y2="96" stroke="#6ee7b7" strokeWidth="1.05" strokeLinecap="round" strokeOpacity="0.68" />
        <line x1="323" y1="108" x2="346" y2="108" stroke="#6ee7b7" strokeWidth="1.05" strokeLinecap="round" strokeOpacity="0.58" />
        <text x="288" y="135" fontFamily="JetBrains Mono, monospace" fontSize="6.4" fill="#d1fae5" textAnchor="middle" letterSpacing="1.1">THESIS</text>
      </g>
      <rect width="400" height="30" fill="rgba(8,24,20,0.26)" />
      <text x="18" y="20" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#d1fae5" letterSpacing="2">TECHTHESIS NAVIGATOR</text>
    </svg>
  );
}

function OrganizerCover() {
  return (
    <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="org-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#190a16" />
          <stop offset="100%" stopColor="#2a1021" />
        </linearGradient>
        <filter id="org-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="220" fill="url(#org-bg)" />
      {[70, 110, 150].map((y, i) => (
        <line key={i} x1="38" y1={y} x2="362" y2={y} stroke="#6b214f" strokeWidth="0.8" strokeOpacity={0.26 + i * 0.08} />
      ))}
      {[94, 146, 198, 250, 302].map((x, i) => (
        <line key={`v${i}`} x1={x} y1="44" x2={x} y2="190" stroke="#6b214f" strokeWidth="0.75" strokeOpacity={0.16 + i * 0.05} />
      ))}
      <g filter="url(#org-glow)">
        <rect x="60" y="58" width="120" height="94" rx="12" fill="rgba(251,207,232,0.08)" stroke="#f9a8d4" strokeWidth="1.3" strokeOpacity="0.75" />
        <rect x="78" y="78" width="84" height="12" rx="5" fill="rgba(251,207,232,0.18)" />
        <rect x="78" y="98" width="56" height="8" rx="4" fill="rgba(251,207,232,0.16)" />
        <rect x="78" y="112" width="72" height="8" rx="4" fill="rgba(244,114,182,0.15)" />
        <rect x="226" y="62" width="108" height="118" rx="10" fill="rgba(251,207,232,0.06)" stroke="#f9a8d4" strokeWidth="1.2" strokeOpacity="0.68" />
        {[0,1,2].map((row) => (
          [0,1,2].map((col) => (
            <rect key={`${row}-${col}`} x={244 + col * 24} y={84 + row * 24} width="16" height="16" rx="3" fill={row === 1 && col === 1 ? 'rgba(251,113,133,0.28)' : 'rgba(244,114,182,0.12)'} stroke="rgba(249,168,212,0.24)" strokeWidth="0.6" />
          ))
        ))}
      </g>
      <rect width="400" height="30" fill="rgba(36,8,28,0.3)" />
      <text x="18" y="20" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#fce7f3" letterSpacing="2">STUDIENORGANISATOR</text>
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
          <feGaussianBlur stdDeviation="2.2" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="220" fill="url(#pf-bg)" />
      {[74, 118, 162].map((y, i) => (
        <line key={i} x1="32" y1={y} x2="368" y2={y} stroke="#6b4d10" strokeWidth="0.55" strokeOpacity={0.16 + i * 0.04} />
      ))}
      {[76, 138, 200, 262, 324].map((x, i) => (
        <line key={`v${i}`} x1={x} y1="34" x2={x} y2="188" stroke="#6b4d10" strokeWidth="0.45" strokeOpacity={0.1 + i * 0.03} />
      ))}
      <g filter="url(#pf-glow)">
        <rect x="74" y="38" width="252" height="168" rx="8" fill="rgba(245,158,11,0.06)" stroke="#f59e0b" strokeWidth="1.4" strokeOpacity="0.76" />
        <rect x="74" y="38" width="252" height="18" rx="8" fill="rgba(245,158,11,0.11)" />
        <line x1="74" y1="56" x2="326" y2="56" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.28" />
        <circle cx="88" cy="47" r="2.7" fill="#ef4444" opacity="0.68" />
        <circle cx="98" cy="47" r="2.7" fill="#f59e0b" opacity="0.68" />
        <circle cx="108" cy="47" r="2.7" fill="#22c55e" opacity="0.68" />
        <text x="200" y="50.5" fontFamily="JetBrains Mono, monospace" fontSize="5.3" fill="rgba(255,221,154,0.48)" textAnchor="middle">p-keminer.github.io</text>
        <polygon points="200,72 232,84 200,96 168,84" fill="rgba(245,158,11,0.11)" stroke="#fbbf24" strokeWidth="1.2" strokeOpacity="0.72" />
        <polygon points="168,84 200,96 200,126 168,114" fill="rgba(245,158,11,0.05)" stroke="#f59e0b" strokeWidth="1.1" strokeOpacity="0.5" />
        <polygon points="232,84 200,96 200,126 232,114" fill="rgba(245,158,11,0.03)" stroke="#f59e0b" strokeWidth="1.1" strokeOpacity="0.42" />
        <text x="200" y="150" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#fcd34d" textAnchor="middle" fillOpacity="0.86">3D + React Portfolio</text>
        <text x="200" y="165" fontFamily="JetBrains Mono, monospace" fontSize="5" fill="#fbbf24" textAnchor="middle" fillOpacity="0.4">Room - Portfolio App - Mini Games</text>
        <rect x="102" y="168" width="54" height="14" rx="4" fill="rgba(245,158,11,0.08)" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.34" />
        <rect x="173" y="168" width="54" height="14" rx="4" fill="rgba(245,158,11,0.08)" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.34" />
        <rect x="244" y="168" width="54" height="14" rx="4" fill="rgba(245,158,11,0.08)" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.34" />
        <text x="129" y="177.5" fontFamily="JetBrains Mono, monospace" fontSize="4.4" fill="#fde68a" textAnchor="middle">THREE.JS</text>
        <text x="200" y="177.5" fontFamily="JetBrains Mono, monospace" fontSize="4.4" fill="#fde68a" textAnchor="middle">EMBED APP</text>
        <text x="271" y="177.5" fontFamily="JetBrains Mono, monospace" fontSize="4.4" fill="#fde68a" textAnchor="middle">GAMES</text>
      </g>
      <rect width="400" height="30" fill="rgba(14,10,4,0.28)" />
      <text x="18" y="20" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#fde68a" letterSpacing="2">3D PORTFOLIO</text>
    </svg>
  );
}

function IrRemoteCover() {
  return (
    <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="ir-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#190a16" />
          <stop offset="100%" stopColor="#2a1021" />
        </linearGradient>
        <linearGradient id="ir-remote" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(251,146,203,0.18)" />
          <stop offset="100%" stopColor="rgba(244,114,182,0.05)" />
        </linearGradient>
        <filter id="ir-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="220" fill="url(#ir-bg)" />
      {[56, 94, 132, 170].map((y, i) => (
        <line key={i} x1="42" y1={y} x2="358" y2={y} stroke="#6b214f" strokeWidth="0.8" strokeOpacity={0.16 + i * 0.05} />
      ))}
      {[82, 140, 198, 256, 314].map((x, i) => (
        <line key={`v${i}`} x1={x} y1="34" x2={x} y2="188" stroke="#6b214f" strokeWidth="0.7" strokeOpacity={0.08 + i * 0.04} />
      ))}
      <g filter="url(#ir-glow)">
        <rect x="56" y="74" width="86" height="72" rx="14" fill="url(#ir-remote)" stroke="#f9a8d4" strokeWidth="1.4" strokeOpacity="0.82" />
        <text x="99" y="98" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#fce7f3" textAnchor="middle">ESP32-S3</text>
        <text x="99" y="116" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#f9a8d4" textAnchor="middle">AP 192.168.4.1</text>
        <circle cx="99" cy="132" r="4" fill="#f472b6" />
        <path d="M74 60 Q99 42 124 60" fill="none" stroke="#f9a8d4" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.75" />
        <path d="M82 66 Q99 56 116 66" fill="none" stroke="#fbcfe8" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.62" />
        <rect x="188" y="52" width="154" height="130" rx="14" fill="rgba(251,207,232,0.08)" stroke="#f9a8d4" strokeWidth="1.4" strokeOpacity="0.78" />
        <rect x="204" y="70" width="122" height="16" rx="5" fill="rgba(244,114,182,0.16)" stroke="#fbcfe8" strokeWidth="0.9" strokeOpacity="0.58" />
        <text x="265" y="82" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#fce7f3" textAnchor="middle">IR REMOTE DASHBOARD</text>
        <rect x="204" y="98" width="48" height="28" rx="7" fill="rgba(244,114,182,0.14)" stroke="#f9a8d4" strokeWidth="0.9" strokeOpacity="0.68" />
        <rect x="260" y="98" width="48" height="28" rx="7" fill="rgba(244,114,182,0.12)" stroke="#f9a8d4" strokeWidth="0.9" strokeOpacity="0.58" />
        <text x="228" y="114" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#fce7f3" textAnchor="middle">TV</text>
        <text x="284" y="114" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#fce7f3" textAnchor="middle">MEDIA</text>
        {[0, 1].map((row) => (
          [0, 1, 2].map((col) => (
            <circle
              key={`${row}-${col}`}
              cx={218 + col * 34}
              cy={144 + row * 18}
              r="5.2"
              fill="rgba(244,114,182,0.18)"
              stroke="#f9a8d4"
              strokeWidth="0.9"
              strokeOpacity="0.72"
            />
          ))
        ))}
        <path d="M145 112 Q166 92 188 104" fill="none" stroke="#f9a8d4" strokeWidth="2.1" strokeLinecap="round" strokeOpacity="0.82" />
        <path d="M152 125 Q171 112 188 116" fill="none" stroke="#fbcfe8" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.72" />
        <path d="M145 148 Q166 166 188 154" fill="none" stroke="#fdf2f8" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.6" />
      </g>
      <rect width="400" height="30" fill="rgba(36,8,28,0.3)" />
      <text x="18" y="20" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#fce7f3" letterSpacing="2">IR WEB REMOTE</text>
    </svg>
  );
}

function EnglishAppCover() {
  return (
    <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="eng-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#071425" />
          <stop offset="100%" stopColor="#0c1f39" />
        </linearGradient>
        <linearGradient id="eng-screen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(125,211,252,0.2)" />
          <stop offset="100%" stopColor="rgba(96,165,250,0.06)" />
        </linearGradient>
        <filter id="eng-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="220" fill="url(#eng-bg)" />
      {[50, 84, 118, 152, 186].map((y, i) => (
        <line key={i} x1="36" y1={y} x2="364" y2={y} stroke="#1d4f7f" strokeWidth="0.8" strokeOpacity={0.14 + i * 0.04} />
      ))}
      <g filter="url(#eng-glow)">
        <rect x="58" y="56" width="120" height="110" rx="12" fill="rgba(125,211,252,0.06)" stroke="#7dd3fc" strokeWidth="1.3" strokeOpacity="0.78" />
        <path d="M74 84 Q96 70 118 84 L118 146 Q96 132 74 146 Z" fill="rgba(125,211,252,0.2)" stroke="#bae6fd" strokeWidth="1.1" strokeOpacity="0.85" />
        <path d="M118 84 Q140 70 162 84 L162 146 Q140 132 118 146 Z" fill="rgba(96,165,250,0.15)" stroke="#93c5fd" strokeWidth="1.1" strokeOpacity="0.72" />
        <line x1="118" y1="84" x2="118" y2="146" stroke="#e0f2fe" strokeWidth="1" strokeOpacity="0.82" />
        <line x1="84" y1="98" x2="108" y2="98" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="84" y1="110" x2="106" y2="110" stroke="#7dd3fc" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.82" />
        <line x1="128" y1="98" x2="152" y2="98" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="128" y1="110" x2="148" y2="110" stroke="#7dd3fc" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.82" />
        <path d="M224 70 H304 Q320 70 320 86 V124 Q320 140 304 140 H252 L226 158 V140 H224 Q208 140 208 124 V86 Q208 70 224 70 Z" fill="url(#eng-screen)" stroke="#7dd3fc" strokeWidth="1.3" strokeOpacity="0.78" />
        <text x="264" y="98" fontFamily="JetBrains Mono, monospace" fontSize="16" fill="#e0f2fe" textAnchor="middle">EN</text>
        <text x="264" y="119" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#7dd3fc" textAnchor="middle">app</text>
      </g>
      <rect width="400" height="30" fill="rgba(5,17,33,0.3)" />
      <text x="18" y="20" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#dbeafe" letterSpacing="2">TECHNICAL ENGLISH APP</text>
    </svg>
  );
}

const COVER_MAP = {
  logic: LogicCover,
  iot: IotCover,
  github: GithubCover,
  robotics: RoboticsCover,
  education: EducationCover,
  thesis: ThesisCover,
  organizer: OrganizerCover,
  portfolio: PortfolioCover,
  irremote: IrRemoteCover,
  english: EnglishAppCover,
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

      {/* â”€â”€ Screen area â”€â”€ */}
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

        {/* Cover art â€” top section */}
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

        {/* Divider line â€” project's accent color */}
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
