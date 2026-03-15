export function renderHud(label: string, status: string, detail?: string): string {
  return `
    <div class="hud-card">
      <p class="hud-label">${label}</p>
      <p class="hud-status">${status}</p>
      ${detail ? `<p class="hud-detail">${detail}</p>` : ''}
    </div>
  `;
}
