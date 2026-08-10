const progressElement = document.querySelector<HTMLElement>('[data-intro-progress]');
const progressValue = document.querySelector<HTMLElement>('[data-intro-progress-value]');

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function setIntroLoadingProgress(value: number): void {
  if (!progressElement || !progressValue) {
    return;
  }

  const previousValue = Number(progressElement.dataset.progress ?? progressElement.getAttribute('aria-valuenow') ?? 0);
  const nextValue = Math.max(clampProgress(previousValue), clampProgress(value));
  const roundedValue = Math.round(nextValue);

  progressElement.dataset.progress = String(nextValue);
  progressElement.setAttribute('aria-valuenow', String(roundedValue));
  progressValue.textContent = `${roundedValue}%`;
}
