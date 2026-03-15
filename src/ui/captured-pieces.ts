import type { CapturedPiecesState, ChessPieceType } from '../chess/state';

const CAPTURE_ORDER: ChessPieceType[] = ['queen', 'rook', 'bishop', 'knight', 'pawn'];

export function renderCapturedPieces(capturedPieces: CapturedPiecesState): string {
  return `
    <div class="captured-groups">
      ${renderCapturedGroup('White captured', capturedPieces.byWhite)}
      ${renderCapturedGroup('Black captured', capturedPieces.byBlack)}
    </div>
  `;
}

function renderCapturedGroup(label: string, pieces: ChessPieceType[]): string {
  if (pieces.length === 0) {
    return `
      <section class="captured-group">
        <p class="captured-label">${label}</p>
        <p class="captured-empty">No captures yet.</p>
      </section>
    `;
  }

  const counts = new Map<ChessPieceType, number>();

  for (const piece of pieces) {
    counts.set(piece, (counts.get(piece) ?? 0) + 1);
  }

  const chips = CAPTURE_ORDER.filter((piece) => counts.has(piece))
    .map((piece) => `<span class="captured-chip">${formatPieceLabel(piece)} x${counts.get(piece)}</span>`)
    .join('');

  return `
    <section class="captured-group">
      <p class="captured-label">${label}</p>
      <div class="captured-chip-row">${chips}</div>
    </section>
  `;
}

function formatPieceLabel(piece: ChessPieceType): string {
  switch (piece) {
    case 'knight':
      return 'knight';
    default:
      return piece;
  }
}
