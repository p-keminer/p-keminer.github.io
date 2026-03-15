export type BoardFile = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type BoardRank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
export type BoardSquare = `${BoardFile}${BoardRank}`;

export type ChessPieceColor = 'white' | 'black';
export type ChessPieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type ChessGameStatus = 'in_progress' | 'check' | 'checkmate' | 'stalemate' | 'draw';
export type ChessDrawReason = 'draw' | 'fifty_move_rule' | 'insufficient_material' | 'threefold_repetition';
export type ChessGameResultOutcome = 'checkmate' | 'draw' | 'in_progress' | 'stalemate';

export interface ChessMove {
  captured?: ChessPieceType;
  capturedSquare?: BoardSquare;
  color: ChessPieceColor;
  from: BoardSquare;
  piece: ChessPieceType;
  promotion?: ChessPieceType;
  san: string;
  to: BoardSquare;
}

export interface CapturedPiecesState {
  byBlack: ChessPieceType[];
  byWhite: ChessPieceType[];
}

export interface ChessGameResult {
  gameOver: boolean;
  outcome: ChessGameResultOutcome;
  reason: ChessDrawReason | 'checkmate' | 'stalemate' | null;
  text: string;
  winner: ChessPieceColor | null;
}

export interface ChessStatusPresentation {
  detail: string;
  headline: string;
}

export interface ChessPieceState {
  color: ChessPieceColor;
  id: string;
  square: BoardSquare;
  type: ChessPieceType;
}

export interface ChessGameSnapshot {
  activeColor: ChessPieceColor;
  capturedPieces: CapturedPiecesState;
  checkedKingSquare: BoardSquare | null;
  fen: string;
  gameOver: boolean;
  gameResult: ChessGameResult;
  inCheck: boolean;
  lastMove: ChessMove | null;
  moveHistory: ChessMove[];
  pieces: ChessPieceState[];
  restartAvailable: boolean;
  statusPresentation: ChessStatusPresentation;
  status: ChessGameStatus;
  undoAvailable: boolean;
}
