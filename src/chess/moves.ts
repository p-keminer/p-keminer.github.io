import type { ChessMove } from './state';

export function formatMove(move: ChessMove): string {
  return move.san || `${move.from}-${move.to}`;
}
