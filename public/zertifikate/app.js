const topics = [
  {
    id: "cs50",
    label: "CS50",
    theme: "cs50",
    context: "OpenCourseWare",
    description: "Zertifikate und Kursnachweise werden hier gesammelt.",
    mark: "CS50",
    certificates: [
      {
        title: "CS50x: Introduction to Computer Science",
        issuer: "Harvard University · CS50",
        issued: "2026",
        source: "./nachweise/cs50/cs50x-2026.pdf",
        preview: "./nachweise/cs50/cs50x-2026.png",
        previewWidth: 1188,
        previewHeight: 918,
        verification: "https://cs50.harvard.edu/certificates/e991f924-54c8-4380-8a77-40660288d241",
      },
      {
        title: "CS50's Introduction to Programming with Python",
        issuer: "Harvard University · CS50",
        issued: "2026",
        source: "./nachweise/cs50/cs50-python-2026.pdf",
        preview: "./nachweise/cs50/cs50-python-2026.png",
        previewWidth: 1188,
        previewHeight: 918,
        verification: "https://cs50.harvard.edu/certificates/ce4d51a5-ebc8-4e0b-bd7f-2add0e487b81",
      },
      {
        title: "CS50's Introduction to Databases with SQL",
        issuer: "Harvard University · CS50",
        issued: "2026",
        source: "./nachweise/cs50/cs50-sql-2026.pdf",
        preview: "./nachweise/cs50/cs50-sql-2026.png",
        previewWidth: 1188,
        previewHeight: 918,
        verification: "https://cs50.harvard.edu/certificates/e9eb142f-a1df-4093-9cca-8a65a5637245",
      },
    ],
  },
  {
    id: "cisco",
    label: "Cisco",
    theme: "cisco",
    context: "Learning & Certifications",
    description: "Zertifikate und geprüfte digitale Nachweise werden hier gesammelt.",
    mark: "CISCO",
    certificates: [
      {
        title: "Linux Essentials",
        issuer: "Cisco Networking Academy · NDG",
        issued: "23. Juli 2026",
        source: "./nachweise/cisco/linux-essentials-2026.pdf",
        preview: "./nachweise/cisco/linux-essentials-2026.png",
        previewWidth: 1188,
        previewHeight: 918,
      },
      {
        title: "Networking Basics",
        issuer: "Cisco Networking Academy",
        issued: "22. August 2026",
        credential: "Cert ID: 40981be6-59fd-4318-8ca2-b7c189a13a36",
        source: "./nachweise/cisco/networking-basics-2026.pdf",
        preview: "./nachweise/cisco/networking-basics-2026.png",
        previewWidth: 1188,
        previewHeight: 805,
        verification: "https://www.netacad.com/recognitions/verify/40981be6-59fd-4318-8ca2-b7c189a13a36",
      },
    ],
  },
  {
    id: "tryhackme",
    label: "TryHackMe",
    theme: "tryhackme",
    context: "Cyber Security Training",
    description: "Zertifikate und Lernpfad-Nachweise werden hier gesammelt.",
    mark: "THM",
    certificates: [
      {
        title: "Pre Security Learning Path",
        issuer: "TryHackMe",
        issued: "24. Juli 2026",
        credential: "THM-ACMVJKTXLI",
        source: "./nachweise/tryhackme/pre-security-2026.pdf",
        preview: "./nachweise/tryhackme/pre-security-2026.png",
        previewWidth: 975,
        previewHeight: 691,
      },
    ],
  },
  {
    id: "jetbrains",
    label: "JetBrains",
    theme: "jetbrains",
    context: "Developer Tools & Learning",
    description: "Zertifikate und geprüfte Lernnachweise werden hier gesammelt.",
    mark: "LEARNING",
    certificates: [],
  },
  ...Array.from({ length: 3 }, (_, index) => {
    const number = index + 6;
    return {
      id: `topic-${String(number).padStart(2, "0")}`,
      label: `Thema ${String(number).padStart(2, "0")}`,
      theme: "neutral",
      context: "Thema noch offen",
      description: "Dieser Bereich bleibt neutral, bis ein geprüfter Nachweis vorliegt.",
      mark: String(number).padStart(2, "0"),
      certificates: [],
      locked: true,
    };
  }),
];

const availableTopics = topics.filter((topic) => !topic.locked);
const topicAliases = new Map([
  ["topic-05", "jetbrains"],
]);

const topicButtons = Array.from(document.querySelectorAll("[data-topic]"));
const previousButton = document.querySelector("#previous-topic");
const nextButton = document.querySelector("#next-topic");
const statusOutput = document.querySelector("#topic-status");
const topicKicker = document.querySelector("#certificate-kicker");
const topicTitle = document.querySelector("#certificate-title");
const topicDescription = document.querySelector("#certificate-description");
const topicViewer = document.querySelector("#certificate-viewer");
const portalTopic = document.querySelector("#portal-topic");
const themeIndex = document.querySelector("#theme-index");
const themeWordmark = document.querySelector("#theme-wordmark");
const certificateCount = document.querySelector("#certificate-count");
const certificateList = document.querySelector("#certificate-list");
const certificateEmpty = document.querySelector("#certificate-empty");
const emptyTitle = document.querySelector("#empty-title");
const emptyMark = document.querySelector("#empty-mark");
const themeColor = document.querySelector('meta[name="theme-color"]');

const themeColors = {
  cs50: "#212529",
  cisco: "#f2f5f7",
  tryhackme: "#151c2b",
  jetbrains: "#f4f4f4",
  neutral: "#15191f",
};

let activeTopicIndex = 0;

function findAdjacentTopicIndex(index, direction) {
  for (
    let candidateIndex = index + direction;
    candidateIndex >= 0 && candidateIndex < topics.length;
    candidateIndex += direction
  ) {
    if (!topics[candidateIndex].locked) {
      return candidateIndex;
    }
  }

  return -1;
}

function findRequestedTopicIndex(topicId) {
  const canonicalTopicId = topicAliases.get(topicId) ?? topicId;
  return topics.findIndex((topic) => topic.id === canonicalTopicId);
}

function renderCertificates(topic) {
  certificateList.replaceChildren();
  const hasCertificates = topic.certificates.length > 0;

  certificateList.hidden = !hasCertificates;
  certificateEmpty.hidden = hasCertificates;
  certificateCount.textContent = `${topic.certificates.length} ${topic.certificates.length === 1 ? "Nachweis" : "Nachweise"}`;
  emptyTitle.textContent = hasCertificates
    ? ""
    : topic.theme === "neutral"
      ? "Noch keine Nachweise veröffentlicht"
      : `Noch keine ${topic.label}-Nachweise veröffentlicht`;
  emptyMark.textContent = topic.mark;

  topic.certificates.forEach((certificate) => {
    const item = document.createElement("li");
    const entry = document.createElement("article");
    entry.className = "certificate-entry";

    const previewLink = document.createElement("a");
    previewLink.className = "certificate-entry__preview-link";
    previewLink.href = certificate.source;
    previewLink.target = "_blank";
    previewLink.rel = "noopener noreferrer";
    previewLink.setAttribute("aria-label", `${certificate.title} als PDF ansehen`);

    const preview = document.createElement("img");
    preview.className = "certificate-entry__preview";
    preview.src = certificate.preview;
    preview.alt = `Vorschau: ${certificate.title}`;
    preview.width = certificate.previewWidth;
    preview.height = certificate.previewHeight;
    preview.loading = "lazy";
    preview.decoding = "async";
    previewLink.append(preview);

    const copy = document.createElement("div");
    copy.className = "certificate-entry__copy";

    const title = document.createElement("h3");
    title.textContent = certificate.title;

    const metadata = document.createElement("p");
    metadata.className = "certificate-entry__metadata";
    metadata.textContent = `${certificate.issuer} · ${certificate.issued}`;

    copy.append(title, metadata);

    if (certificate.credential) {
      const credential = document.createElement("p");
      credential.className = "certificate-entry__credential";
      credential.textContent = certificate.credential;
      copy.append(credential);
    }

    const actions = document.createElement("div");
    actions.className = "certificate-entry__actions";

    const viewLink = document.createElement("a");
    viewLink.href = certificate.source;
    viewLink.target = "_blank";
    viewLink.rel = "noopener noreferrer";
    viewLink.textContent = "PDF ansehen";
    actions.append(viewLink);

    const downloadLink = document.createElement("a");
    downloadLink.href = certificate.source;
    downloadLink.download = "";
    downloadLink.textContent = "Herunterladen";
    actions.append(downloadLink);

    if (certificate.verification) {
      const verificationLink = document.createElement("a");
      verificationLink.href = certificate.verification;
      verificationLink.target = "_blank";
      verificationLink.rel = "noopener noreferrer";
      verificationLink.textContent = "Verifizieren ↗";
      actions.append(verificationLink);
    }

    copy.append(actions);
    entry.append(previewLink, copy);
    item.append(entry);
    certificateList.append(item);
  });
}

function updateAddress(topic, mode) {
  if (mode === "none") {
    return;
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("thema", topic.id);
  window.history[mode === "push" ? "pushState" : "replaceState"](
    { topic: topic.id },
    "",
    nextUrl,
  );
}

function selectTopic(index, options = {}) {
  const boundedIndex = Math.max(0, Math.min(index, topics.length - 1));
  const safeIndex = topics[boundedIndex].locked ? 0 : boundedIndex;
  const topic = topics[safeIndex];
  activeTopicIndex = safeIndex;

  document.body.dataset.theme = topic.theme;
  topicViewer.dataset.theme = topic.theme;
  themeColor.content = themeColors[topic.theme];
  portalTopic.textContent = topic.label;
  topicKicker.textContent = topic.context;
  topicTitle.textContent = topic.label;
  topicDescription.textContent = topic.description;
  themeWordmark.textContent = topic.mark;
  const availableIndex = availableTopics.indexOf(topic);
  themeIndex.textContent = `${String(availableIndex + 1).padStart(2, "0")} / ${String(availableTopics.length).padStart(2, "0")}`;
  statusOutput.textContent = `${topic.label} · ${availableIndex + 1} von ${availableTopics.length} verfügbar`;
  topicViewer.setAttribute("aria-label", `Zertifikatswand ${topic.label}`);

  topicButtons.forEach((button) => {
    const buttonTopic = topics.find((candidate) => candidate.id === button.dataset.topic);
    button.disabled = Boolean(buttonTopic?.locked);
    button.setAttribute("aria-pressed", String(button.dataset.topic === topic.id));
  });

  previousButton.disabled = findAdjacentTopicIndex(safeIndex, -1) < 0;
  nextButton.disabled = findAdjacentTopicIndex(safeIndex, 1) < 0;
  renderCertificates(topic);
  updateAddress(topic, options.history ?? "replace");
}

topicButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextIndex = topics.findIndex((topic) => topic.id === button.dataset.topic);
    if (nextIndex >= 0 && !topics[nextIndex].locked) {
      selectTopic(nextIndex, { history: "replace" });
    }
  });
});

previousButton.addEventListener("click", () => {
  const previousIndex = findAdjacentTopicIndex(activeTopicIndex, -1);
  if (previousIndex >= 0) {
    selectTopic(previousIndex, { history: "replace" });
  }
});

nextButton.addEventListener("click", () => {
  const nextIndex = findAdjacentTopicIndex(activeTopicIndex, 1);
  if (nextIndex >= 0) {
    selectTopic(nextIndex, { history: "replace" });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName))
  ) {
    return;
  }

  const direction = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
  const adjacentIndex = direction === 0 ? -1 : findAdjacentTopicIndex(activeTopicIndex, direction);

  if (adjacentIndex >= 0) {
    event.preventDefault();
    selectTopic(adjacentIndex, { history: "replace" });
    topicButtons[activeTopicIndex]?.focus({ preventScroll: true });
  }
});

window.addEventListener("popstate", () => {
  const requestedTopicId = new URL(window.location.href).searchParams.get("thema");
  const requestedTopicIndex = findRequestedTopicIndex(requestedTopicId);
  selectTopic(requestedTopicIndex >= 0 ? requestedTopicIndex : 0, { history: "replace" });
});

const requestedTopicId = new URL(window.location.href).searchParams.get("thema");
const requestedTopicIndex = findRequestedTopicIndex(requestedTopicId);
selectTopic(requestedTopicIndex >= 0 ? requestedTopicIndex : 0, { history: "replace" });
