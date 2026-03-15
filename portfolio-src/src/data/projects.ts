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
    id: "future-robotics",
    title: "Zukünftiges Robotikprojekt",
    description:
      "Geplantes Roboterarm-Projekt mit Fernsteuerung und möglicher KI-gestützter Bewegungserkennung.",
    link: "https://github.com/p-keminer",
    coverVariant: "robotics",
    tags: ["Robotik", "KI", "Mechanik"],
  },
  {
    id: "portfolio-site",
    title: "3D Portfolio",
    description:
      "Vorgeschaltetes 3D-Erlebnis in Three.js – begehbarer Raum mit Schachspiel als Einstiegspunkt. Dahinter eingebettet: React-Portfolio mit Projektkarussell und Framer Motion-Animationen. Deployed via GitHub Pages.",
    link: "https://github.com/p-keminer/p-keminer.github.io",
    coverVariant: "portfolio",
    tags: ["Three.js", "React", "TypeScript", "Vite", "Framer Motion"],
  },
  {
    id: "github-profile",
    title: "GitHub-Profil",
    description:
      "Überblick über meine Repositories, Projekte und meinen technischen Lernweg.",
    link: "https://github.com/p-keminer",
    coverVariant: "github",
    tags: ["Open Source", "Projekte", "Lernen"],
  },
];
