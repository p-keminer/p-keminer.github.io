export function renderControls({
  cameraLocked,
  gameOver,
  restartAvailable,
  showReturnToRoom,
  undoAvailable
}: {
  cameraLocked: boolean;
  gameOver: boolean;
  restartAvailable: boolean;
  showReturnToRoom?: boolean;
  undoAvailable: boolean;
}): string {
  return `
    ${showReturnToRoom ? `
    <div class="control-group">
      <p class="control-label">Navigation</p>
      <div class="control-row">
        <button class="control-button control-button--secondary" data-control="return-to-room" type="button">
          Zur Übersicht
        </button>
      </div>
    </div>` : ''}
    <div class="control-row">
      <button class="control-button" data-control="undo" type="button" ${undoAvailable ? '' : 'disabled'}>
        Rückgängig
      </button>
      <button class="control-button control-button--secondary" data-control="restart" type="button" ${restartAvailable ? '' : 'disabled'}>
        Neustart
      </button>
      <button class="control-button control-button--secondary" data-control="camera-reset" type="button" ${cameraLocked ? 'disabled' : ''}>
        Kamera zentrieren
      </button>
    </div>
  `;
}
