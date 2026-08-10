const semesterDocuments = Array.from({ length: 10 }, (_, index) => ({
  semester: index + 1,
  label:
    index === 8
      ? "Bachelorarbeit"
      : index === 9
        ? "Masterarbeit"
        : `Semester ${index + 1}`,
  slug:
    index === 8
      ? "bachelorarbeit"
      : index === 9
        ? "masterarbeit"
        : `semester-${String(index + 1).padStart(2, "0")}`,
  fileName: index === 0 ? "notenspiegel.pdf" : null,
  source:
    index === 0
      ? "../assets/leistungsnachweise/notenspiegel-semester-1-redacted.pdf"
      : null,
  preview:
    index === 0
      ? "../assets/leistungsnachweise/notenspiegel-semester-1.png"
      : null,
}));

const semesterButtons = Array.from(document.querySelectorAll("[data-semester]"));
const previousButton = document.querySelector("#previous-semester");
const nextButton = document.querySelector("#next-semester");
const statusOutput = document.querySelector("#semester-status");
const documentPath = document.querySelector("#document-path");
const documentFrame = document.querySelector("#document-frame");
const documentPreview = document.querySelector("#document-preview");
const documentPlaceholder = document.querySelector("#document-placeholder");
const openDocument = document.querySelector("#open-document");
const downloadDocument = document.querySelector("#download-document");
const semesterViewer = document.querySelector("#semester-viewer");

let activeSemesterIndex = 0;

function showDocument(record) {
  const hasDocument = Boolean(record.source && record.preview);

  documentPlaceholder.hidden = hasDocument;
  documentPreview.hidden = !hasDocument;
  openDocument.hidden = !hasDocument;
  downloadDocument.hidden = !hasDocument;

  if (!hasDocument) {
    return;
  }

  openDocument.href = record.source;
  downloadDocument.href = record.source;
  documentPreview.src = record.preview;
  documentPreview.alt = `Vorschau des Leistungsnachweises für ${record.label}`;
  documentFrame.scrollTop = 0;
}

function updateAddress(record, mode) {
  if (mode === "none") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("semester", String(record.semester));
  window.history[mode === "push" ? "pushState" : "replaceState"](
    { semester: record.semester },
    "",
    url,
  );
}

function selectSemester(index, options = {}) {
  const boundedIndex = Math.max(0, Math.min(index, semesterDocuments.length - 1));
  const record = semesterDocuments[boundedIndex];
  activeSemesterIndex = boundedIndex;

  documentPath.textContent = record.fileName
    ? `${record.slug} / ${record.fileName}`
    : `${record.slug} / leer`;
  statusOutput.textContent = `${record.label} · ${record.semester} von ${semesterDocuments.length}`;
  semesterViewer.setAttribute(
    "aria-label",
    record.fileName
      ? `Leistungsnachweis ${record.label}`
      : `${record.label}, noch kein Dokument hinterlegt`,
  );

  semesterButtons.forEach((button, buttonIndex) => {
    button.setAttribute("aria-pressed", String(buttonIndex === boundedIndex));
  });

  previousButton.disabled = boundedIndex === 0;
  nextButton.disabled = boundedIndex === semesterDocuments.length - 1;
  showDocument(record);
  updateAddress(record, options.history ?? "replace");
}

semesterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectSemester(Number(button.dataset.semester), { history: "push" });
  });
});

previousButton.addEventListener("click", () => {
  selectSemester(activeSemesterIndex - 1, { history: "push" });
});

nextButton.addEventListener("click", () => {
  selectSemester(activeSemesterIndex + 1, { history: "push" });
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

  if (event.key === "ArrowLeft" && activeSemesterIndex > 0) {
    event.preventDefault();
    selectSemester(activeSemesterIndex - 1, { history: "push" });
  }

  if (event.key === "ArrowRight" && activeSemesterIndex < semesterDocuments.length - 1) {
    event.preventDefault();
    selectSemester(activeSemesterIndex + 1, { history: "push" });
  }
});

window.addEventListener("popstate", () => {
  const semester = Number(new URL(window.location.href).searchParams.get("semester"));
  const index = Number.isInteger(semester) && semester >= 1 && semester <= 10 ? semester - 1 : 0;
  selectSemester(index, { history: "none" });
});

const requestedSemester = Number(new URL(window.location.href).searchParams.get("semester"));
const initialIndex =
  Number.isInteger(requestedSemester) && requestedSemester >= 1 && requestedSemester <= 10
    ? requestedSemester - 1
    : 0;

selectSemester(initialIndex, { history: "replace" });
