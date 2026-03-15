import { useEffect, useRef, useState } from "react";

export default function ChiptunePlayer() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(import.meta.env.BASE_URL + "ags_project-8-bit-219384.mp3");
    audio.loop = true;
    audio.volume = 0.55;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <button
      onClick={toggle}
      title={playing ? "Musik stoppen" : "Musik starten"}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 100,
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: playing ? "#dc2626" : "#991b1b",
        border: "2px solid rgba(255,255,255,0.18)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: playing
          ? "0 0 18px rgba(220,38,38,0.55), 0 4px 16px rgba(0,0,0,0.45)"
          : "0 4px 14px rgba(0,0,0,0.4)",
        transition: "background 0.2s, box-shadow 0.2s",
        outline: "none",
        padding: 0,
        // Mobile: etwas größer für bessere Touchfläche
        minWidth: 44,
        minHeight: 44,
      }}
    >
      {playing ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
          <rect x="2" y="1" width="4" height="12" rx="1" />
          <rect x="8" y="1" width="4" height="12" rx="1" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
          <polygon points="3,1 13,7 3,13" />
        </svg>
      )}
    </button>
  );
}
