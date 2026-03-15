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
          Back to Room
        </button>
      </div>
    </div>` : ''}
    <div class="control-row">
      <button class="control-button" data-control="undo" type="button" ${undoAvailable ? '' : 'disabled'}>
        Undo
      </button>
      <button class="control-button control-button--secondary" data-control="restart" type="button" ${restartAvailable ? '' : 'disabled'}>
        Restart
      </button>
      <button class="control-button control-button--secondary" data-control="camera-reset" type="button" ${cameraLocked ? 'disabled' : ''}>
        Reset Camera
      </button>
    </div>
  `;
}
