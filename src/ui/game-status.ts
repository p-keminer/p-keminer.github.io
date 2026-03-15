import type { ChessGameResult, ChessStatusPresentation } from '../chess/state';

export function renderGameStatusPanel({
  gameResult,
  statusPresentation
}: {
  gameResult: ChessGameResult;
  statusPresentation: ChessStatusPresentation;
}): string {
  const statusClass = gameResult.gameOver ? 'status-panel status-panel--game-over' : 'status-panel';
  const reasonLabel = formatReason(gameResult);

  return `
    <div class="${statusClass}">
      <p class="status-panel-label">Game status</p>
      <p class="status-panel-headline">${statusPresentation.headline}</p>
      <p class="status-panel-detail">${statusPresentation.detail}</p>
      ${reasonLabel ? `<p class="status-panel-reason">${reasonLabel}</p>` : ''}
    </div>
  `;
}

function formatReason(gameResult: ChessGameResult): string | null {
  if (!gameResult.gameOver || !gameResult.reason) {
    return null;
  }

  switch (gameResult.reason) {
    case 'checkmate':
      return 'Result: checkmate';
    case 'stalemate':
      return 'Result: stalemate';
    case 'insufficient_material':
      return 'Result: insufficient material';
    case 'threefold_repetition':
      return 'Result: threefold repetition';
    case 'fifty_move_rule':
      return 'Result: fifty-move rule';
    default:
      return 'Result: draw';
  }
}
