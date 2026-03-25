import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import type {
  BoardSquare,
  CapturedPiecesState,
  ChessGameResult,
  ChessGameSnapshot,
  ChessGameStatus,
  ChessMove,
  ChessPieceColor,
  ChessPieceState,
  ChessPieceType,
  ChessStatusPresentation
} from './state';

export interface ChessEngineAdapter {
  canSelectSquare: (square: BoardSquare) => boolean;
  getFen: () => string;
  getLegalTargetSquares: (square: BoardSquare) => BoardSquare[];
  getSnapshot: () => ChessGameSnapshot;
  getTurn: () => ChessPieceColor;
  restart: () => void;
  tryMove: (from: BoardSquare, to: BoardSquare) => boolean;
  undo: () => boolean;
}

export function createChessEngine(): ChessEngineAdapter {
  const chess = new Chess();
  const pieceIdsBySquare = new Map<BoardSquare, string>();
  const pieceIdCounters = new Map<string, number>();
  let cachedMoveHistory: ChessMove[] | null = null;
  let cachedSnapshot: ChessGameSnapshot | null = null;
  const legalMovesCache = new Map<string, BoardSquare[]>();

  reseedPieceIds();

  return {
    canSelectSquare: (square) => {
      if (chess.isGameOver()) {
        return false;
      }

      const piece = chess.get(square as Square);

      if (!piece) {
        return false;
      }

      return mapColor(piece.color) === getTurn() && getLegalTargetSquares(square).length > 0;
    },
    getFen: () => chess.fen(),
    getLegalTargetSquares,
    getSnapshot: () => {
      if (cachedSnapshot) {
        return cachedSnapshot;
      }

      const moveHistory = getMoveHistory();
      const gameResult = getGameResult();
      const checkedKingSquare = getCheckedKingSquare();

      cachedSnapshot = {
        activeColor: getTurn(),
        capturedPieces: getCapturedPieces(moveHistory),
        checkedKingSquare,
        fen: chess.fen(),
        gameOver: gameResult.gameOver,
        gameResult,
        inCheck: chess.inCheck(),
        lastMove: moveHistory.at(-1) ?? null,
        moveHistory,
        pieces: getPieces(),
        restartAvailable: true,
        statusPresentation: getStatusPresentation(gameResult, checkedKingSquare),
        status: getStatus(),
        undoAvailable: moveHistory.length > 0
      };
      return cachedSnapshot;
    },
    getTurn,
    restart: () => {
      chess.reset();
      cachedMoveHistory = null;
      cachedSnapshot = null;
      legalMovesCache.clear();
      reseedPieceIds();
    },
    tryMove: (from, to) => {
      if (chess.isGameOver()) {
        return false;
      }

      const legalMove = chess
        .moves({ square: from as Square, verbose: true })
        .find((move) => move.to === to);

      if (!legalMove) {
        return false;
      }

      const movingPieceId = pieceIdsBySquare.get(from);

      if (!movingPieceId) {
        return false;
      }

      const move = chess.move({
        from,
        promotion: legalMove.promotion ?? 'q',
        to
      });

      if (!move) {
        return false;
      }

      cachedMoveHistory = null;
      cachedSnapshot = null;
      legalMovesCache.clear();
      syncPieceIdsAfterMove(move.from as BoardSquare, move.to as BoardSquare, movingPieceId, move.flags, move.color);
      return true;
    },
    undo: () => {
      const move = chess.undo();

      if (!move) {
        return false;
      }

      cachedMoveHistory = null;
      cachedSnapshot = null;
      legalMovesCache.clear();
      reseedPieceIds();
      return true;
    }
  };

  function getCapturedPieces(moveHistory: ChessMove[]): CapturedPiecesState {
    const capturedPieces: CapturedPiecesState = {
      byBlack: [],
      byWhite: []
    };

    for (const move of moveHistory) {
      if (!move.captured) {
        continue;
      }

      if (move.color === 'white') {
        capturedPieces.byWhite.push(move.captured);
        continue;
      }

      capturedPieces.byBlack.push(move.captured);
    }

    return capturedPieces;
  }

  function getCheckedKingSquare(): BoardSquare | null {
    if (!chess.inCheck()) {
      return null;
    }

    const checkedColor = chess.turn();

    for (const rank of chess.board()) {
      for (const piece of rank) {
        if (!piece || piece.type !== 'k' || piece.color !== checkedColor) {
          continue;
        }

        return piece.square as BoardSquare;
      }
    }

    return null;
  }

  function getGameResult(): ChessGameResult {
    if (chess.isCheckmate()) {
      const winner = getTurn() === 'white' ? 'black' : 'white';

      return {
        gameOver: true,
        outcome: 'checkmate',
        reason: 'checkmate',
        text: `${capitalize(winner)} wins by checkmate.`,
        winner
      };
    }

    if (chess.isStalemate()) {
      return {
        gameOver: true,
        outcome: 'stalemate',
        reason: 'stalemate',
        text: 'Draw by stalemate.',
        winner: null
      };
    }

    if (chess.isInsufficientMaterial()) {
      return {
        gameOver: true,
        outcome: 'draw',
        reason: 'insufficient_material',
        text: 'Draw by insufficient material.',
        winner: null
      };
    }

    if (chess.isThreefoldRepetition()) {
      return {
        gameOver: true,
        outcome: 'draw',
        reason: 'threefold_repetition',
        text: 'Draw by threefold repetition.',
        winner: null
      };
    }

    if (chess.isDrawByFiftyMoves()) {
      return {
        gameOver: true,
        outcome: 'draw',
        reason: 'fifty_move_rule',
        text: 'Draw by fifty-move rule.',
        winner: null
      };
    }

    if (chess.isDraw()) {
      return {
        gameOver: true,
        outcome: 'draw',
        reason: 'draw',
        text: 'Draw.',
        winner: null
      };
    }

    return {
      gameOver: false,
      outcome: 'in_progress',
      reason: null,
      text: 'Game in progress.',
      winner: null
    };
  }

  function getMoveHistory(): ChessMove[] {
    if (cachedMoveHistory) {
      return cachedMoveHistory;
    }

    cachedMoveHistory = chess.history({ verbose: true }).flatMap((move) => {
      const mappedMove = mapMove(move);
      return mappedMove ? [mappedMove] : [];
    });
    return cachedMoveHistory;
  }

  function getPieces(): ChessPieceState[] {
    const pieces: ChessPieceState[] = [];

    for (const rank of chess.board()) {
      for (const piece of rank) {
        if (!piece) {
          continue;
        }

        const square = piece.square as BoardSquare;
        const pieceId = getOrCreatePieceId(square, piece.color, piece.type);

        pieces.push({
          color: mapColor(piece.color),
          id: pieceId,
          square,
          type: mapPieceType(piece.type)
        });
      }
    }

    return pieces;
  }

  function getLegalTargetSquares(square: BoardSquare): BoardSquare[] {
    if (chess.isGameOver()) {
      return [];
    }

    const cached = legalMovesCache.get(square);
    if (cached) {
      return cached;
    }

    const moves = chess
      .moves({ square: square as Square, verbose: true })
      .map((move) => move.to as BoardSquare);
    legalMovesCache.set(square, moves);
    return moves;
  }

  function getOrCreatePieceId(square: BoardSquare, color: Color, type: PieceSymbol): string {
    const existingId = pieceIdsBySquare.get(square);

    if (existingId) {
      return existingId;
    }

    const colorLabel = mapColor(color);
    const typeLabel = mapPieceType(type);
    const counterKey = `${colorLabel}-${typeLabel}`;
    const nextCount = (pieceIdCounters.get(counterKey) ?? 0) + 1;
    pieceIdCounters.set(counterKey, nextCount);

    const pieceId = `${counterKey}-${nextCount}`;
    pieceIdsBySquare.set(square, pieceId);
    return pieceId;
  }

  function getStatus(): ChessGameStatus {
    if (chess.isCheckmate()) {
      return 'checkmate';
    }

    if (chess.isStalemate()) {
      return 'stalemate';
    }

    if (chess.isDraw()) {
      return 'draw';
    }

    if (chess.inCheck()) {
      return 'check';
    }

    return 'in_progress';
  }

  function getStatusPresentation(
    gameResult: ChessGameResult,
    checkedKingSquare: BoardSquare | null
  ): ChessStatusPresentation {
    if (gameResult.gameOver) {
      return {
        detail: gameResult.text,
        headline: 'Game over'
      };
    }

    if (chess.inCheck() && checkedKingSquare) {
      return {
        detail: `Check on ${checkedKingSquare}.`,
        headline: `${capitalize(getTurn())} to move`
      };
    }

    return {
      detail: `Status: ${formatStatus(getStatus())}.`,
      headline: `${capitalize(getTurn())} to move`
    };
  }

  function getTurn(): ChessPieceColor {
    return mapColor(chess.turn());
  }

  function reseedPieceIds(): void {
    pieceIdsBySquare.clear();
    pieceIdCounters.clear();

    for (const rank of chess.board()) {
      for (const piece of rank) {
        if (!piece) {
          continue;
        }

        getOrCreatePieceId(piece.square as BoardSquare, piece.color, piece.type);
      }
    }
  }

  function syncPieceIdsAfterMove(
    from: BoardSquare,
    to: BoardSquare,
    movingPieceId: string,
    flags: string,
    movingColor: Color
  ): void {
    pieceIdsBySquare.delete(from);

    if (flags.includes('e')) {
      const capturedRank = Number(to[1]) + (movingColor === 'w' ? -1 : 1);
      const capturedSquare = `${to[0]}${capturedRank}` as BoardSquare;
      pieceIdsBySquare.delete(capturedSquare);
    } else {
      pieceIdsBySquare.delete(to);
    }

    pieceIdsBySquare.set(to, movingPieceId);

    if (flags.includes('k')) {
      moveRookIdentity('h', 'f', to[1] as BoardSquare[1]);
    }

    if (flags.includes('q')) {
      moveRookIdentity('a', 'd', to[1] as BoardSquare[1]);
    }
  }

  function moveRookIdentity(fromFile: 'a' | 'h', toFile: 'd' | 'f', rank: BoardSquare[1]): void {
    const rookFrom = `${fromFile}${rank}` as BoardSquare;
    const rookTo = `${toFile}${rank}` as BoardSquare;
    const rookId = pieceIdsBySquare.get(rookFrom);

    if (!rookId) {
      return;
    }

    pieceIdsBySquare.delete(rookFrom);
    pieceIdsBySquare.set(rookTo, rookId);
  }
}

function capitalize(value: string): string {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function formatStatus(status: ChessGameStatus): string {
  return status.replace(/_/g, ' ');
}

function mapColor(color: Color): ChessPieceColor {
  return color === 'w' ? 'white' : 'black';
}

function mapMove(move: Move | null): ChessMove | null {
  if (!move) {
    return null;
  }

  const capturedSquare =
    move.captured && move.isEnPassant()
      ? (`${move.to[0]}${Number(move.to[1]) + (move.color === 'w' ? -1 : 1)}` as BoardSquare)
      : move.captured
        ? (move.to as BoardSquare)
        : undefined;

  return {
    captured: move.captured ? mapPieceType(move.captured) : undefined,
    capturedSquare,
    color: mapColor(move.color),
    from: move.from as BoardSquare,
    piece: mapPieceType(move.piece),
    promotion: move.promotion ? mapPieceType(move.promotion) : undefined,
    san: move.san,
    to: move.to as BoardSquare
  };
}

function mapPieceType(type: PieceSymbol): ChessPieceType {
  switch (type) {
    case 'k':
      return 'king';
    case 'q':
      return 'queen';
    case 'r':
      return 'rook';
    case 'b':
      return 'bishop';
    case 'n':
      return 'knight';
    default:
      return 'pawn';
  }
}
