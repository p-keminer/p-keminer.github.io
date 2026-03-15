import type { ChessMove } from '../chess/state';
import { formatMove } from '../chess/moves';

export function renderMoveList(moves: ChessMove[]): string {
  if (moves.length === 0) {
    return '<p class="move-history-empty">No moves yet.</p>';
  }

  const rounds = buildMoveRounds(moves);
  const rows = rounds
    .map(
      (round) => `
        <li class="move-history-row">
          <span class="move-history-number">${round.moveNumber}.</span>
          <span class="move-history-ply">${formatMove(round.white)}</span>
          <span class="move-history-ply ${round.black ? '' : 'move-history-ply--empty'}">${round.black ? formatMove(round.black) : '...'}</span>
        </li>
      `
    )
    .join('');

  return `<ol class="move-history">${rows}</ol>`;
}

function buildMoveRounds(moves: ChessMove[]): Array<{ black?: ChessMove; moveNumber: number; white: ChessMove }> {
  const rounds: Array<{ black?: ChessMove; moveNumber: number; white: ChessMove }> = [];

  for (let index = 0; index < moves.length; index += 2) {
    rounds.push({
      black: moves[index + 1],
      moveNumber: index / 2 + 1,
      white: moves[index]
    });
  }

  return rounds;
}
