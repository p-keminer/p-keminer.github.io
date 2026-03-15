import { boardIndexToCenteredCoordinate } from '../utils/coords';

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export function squareToWorld(square: string): WorldPosition {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;

  return {
    x: boardIndexToCenteredCoordinate(file),
    y: 0,
    z: boardIndexToCenteredCoordinate(7 - rank)
  };
}
