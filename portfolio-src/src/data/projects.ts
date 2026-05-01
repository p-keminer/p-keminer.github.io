export interface Project {
  id: string;
  title: string;
  description: string;
  link: string;
  coverVariant: "logic" | "iot" | "github" | "robotics" | "education" | "thesis" | "organizer" | "portfolio" | "irremote" | "english";
  tags: string[];
}

export const projects: Project[] = [
  {
    id: "future-robotics",
    title: "Ferngesteuerter Roboterarm",
    description:
      "IMU-gesteuerter 5-DOF-Roboterarm mit ESP32-Wearable, ESP-NOW-Funkstrecke und geplanter KI-Bewegungserkennung.",
    link: "https://github.com/p-keminer/remote-controlled-robot-arm",
    coverVariant: "robotics",
    tags: ["ESP32", "ESP-NOW", "IMU", "Robotik", "C++"],
  },
  {
    id: "universal-ir-remote",
    title: "Universelle IR-Fernbedienung",
    description:
      "ESP32-S3-basierte IR-Fernbedienung mit LCD1602, dokumentiertem Hardware-Aufbau und vorbereitetem Code-Katalog fuer TV- und Media-Profile.",
    link: "https://github.com/p-keminer/universal-ir-fernbedienung",
    coverVariant: "irremote",
    tags: ["ESP32-S3", "IR", "Embedded", "LCD1602", "C++"],
  },
  {
    id: "iot-alarm",
    title: "IoT-Alarmsystem",
    description:
      "IoT-basiertes Alarmsystem mit ESP8266-Nodes, Raspberry-Pi-Integration, eigenen PCBs und 3D-gedruckten Gehaeusen.",
    link: "https://github.com/p-keminer/iot-alarm-system",
    coverVariant: "iot",
    tags: ["ESP8266", "Raspberry Pi", "Sicherheit", "C++"],
  },
  {
    id: "logic-simulator",
    title: "Logic Simulator Studio",
    description:
      "Browserbasierter Simulator fuer digitale Logikschaltungen mit Timing-Analyse, FSM-Workflows und HDL-Export.",
    link: "https://github.com/p-keminer/logic-simulator-studio",
    coverVariant: "logic",
    tags: ["TypeScript", "Simulation", "HDL"],
  },
  {
    id: "techthesis-navigator",
    title: "TechThesis Navigator",
    description:
      "Gefuehrte Thesis-App mit 5 Phasen, 10 methodischen Schritten, Gates, Checklisten und visueller Planung fuer technische Bachelorarbeiten.",
    link: "https://github.com/p-keminer/techthesis-navigator",
    coverVariant: "thesis",
    tags: ["React", "TypeScript", "Zustand", "ECharts", "React Flow"],
  },
  {
    id: "studienorganisator",
    title: "Studienorganisator",
    description:
      "Lokale Desktop-App zur PDF-Extraktion und Strukturierung von Studiendaten mit Wochenplaner fuer THGA-Dokumente und erweiterbarer Parser-Logik.",
    link: "https://github.com/p-keminer/studienorganisator-thga-bochum-bid-bii",
    coverVariant: "organizer",
    tags: ["Tauri", "React", "FastAPI", "SQLite", "PDF Parsing"],
  },
  {
    id: "technical-english-app",
    title: "Technical English App",
    description:
      "Lokale Expo- und React-Native-Lernapp für technisches Englisch.",
    link: "https://github.com/p-keminer/technical-english-app",
    coverVariant: "english",
    tags: ["Expo", "React Native", "TypeScript", "Lernapp"],
  },
  {
    id: "portfolio-site",
    title: "3D Portfolio",
    description:
      "Interaktive 3D-Portfolio-Website mit begehbarem Cyberpunk-Raum, TV-Sektion, spielbarem Schachspiel und eingebetteter React-App.",
    link: "https://github.com/p-keminer/p-keminer.github.io",
    coverVariant: "portfolio",
    tags: ["Three.js", "React", "TypeScript", "Vite", "Framer Motion"],
  },
];
