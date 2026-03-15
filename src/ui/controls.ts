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
  const cameraNote = cameraLocked
    ? 'Camera inspect controls are locked while combat presentation is active.'
    : 'Use mouse wheel to zoom, right-drag to orbit, Shift+right-drag to pan, and R or Reset Camera to restore the default board view.';

  const note = gameOver
    ? 'Undo can step back one half-move from the finished position. Restart resets the standard opening setup.'
    : undoAvailable
      ? 'Undo reverts one half-move. Restart resets the standard opening setup.'
      : 'Undo becomes available after the first half-move. Restart always resets the standard opening setup.';

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
    <p class="control-note">${note}</p>
    <p class="control-note">${cameraNote}</p>
  `;
}
