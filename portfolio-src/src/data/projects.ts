export interface Project {
  id: string;
  title: string;
  description: string;
  link: string;
  coverVariant: "logic" | "iot" | "github" | "robotics" | "education" | "portfolio";
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
    id: "iot-alarm",
    title: "IoT-Alarmsystem",
    description:
      "IoT-basiertes Alarmsystem mit ESP8266-Nodes, Raspberry-Pi-Integration, eigenen PCBs und 3D-gedruckten Gehäusen.",
    link: "https://github.com/p-keminer/iot-alarm-system",
    coverVariant: "iot",
    tags: ["ESP8266", "Raspberry Pi", "Sicherheit", "C++"],
  },
  {
    id: "logic-simulator",
    title: "Logic Simulator Studio",
    description:
      "Browserbasierter Simulator für digitale Logikschaltungen mit Timing-Analyse, FSM-Workflows und HDL-Export.",
    link: "https://github.com/p-keminer/logic-simulator-studio",
    coverVariant: "logic",
    tags: ["TypeScript", "Simulation", "HDL"],
  },
  {
    id: "cs50x-harvard",
    title: "CS50x Harvard",
    description:
      "Übungsrepo zum Harvard-Kurs CS50x mit Aufgaben, Lösungen und dokumentiertem Lernfortschritt in den Grundlagen der Informatik.",
    link: "https://github.com/p-keminer/cs50x-26",
    coverVariant: "education",
    tags: ["CS50x", "Harvard", "Informatik"],
  },
  {
    id: "portfolio-site",
    title: "3D Portfolio",
    description:
      "Interaktive 3D-Portfolio-Website mit begehbarem Cyberpunk-Raum, spielbarem Schachspiel und eingebetteter React-App.",
    link: "https://github.com/p-keminer/p-keminer.github.io",
    coverVariant: "portfolio",
    tags: ["Three.js", "React", "TypeScript", "Vite", "Framer Motion"],
  },
];
