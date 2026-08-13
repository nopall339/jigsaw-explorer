import type { PieceStateMap, PuzzleLayout, PuzzlePiece, PuzzleSpec } from '@/types';
import { generatePieces } from './generatePieces';
import { createPuzzleLayout } from './layout';
import { deriveSeed } from './rng';
import { shufflePieces } from './shuffle';

export * from './grid';
export * from './jigsawPath';
export * from './layout';
export * from './rng';
export * from './generatePieces';
export * from './shuffle';
export * from './snapLogic';

export interface CreatePuzzleResult {
  layout: PuzzleLayout;
  pieces: PuzzlePiece[];
}

/** Seed terpisah untuk sebaran awal, supaya "acak ulang" tidak mengubah bentuk tab. */
export function scatterSeed(seed: number, round = 0): number {
  return deriveSeed(seed, `scatter:${round}`);
}

/**
 * Titik masuk utama: dari spesifikasi room -> layout + potongan siap dimainkan.
 * Dipanggil dengan spec yang sama di client & server, hasilnya identik.
 */
export function createPuzzle(
  spec: PuzzleSpec,
  options: { scatter?: boolean; scatterRound?: number } = {},
): CreatePuzzleResult {
  const { scatter = true, scatterRound = 0 } = options;

  const layout = createPuzzleLayout(spec.imageWidth, spec.imageHeight, spec.requestedPieceCount, {
    rows: spec.gridRows,
    cols: spec.gridCols,
    pieceCount: spec.gridRows * spec.gridCols,
  });

  const pieces = generatePieces({ layout, seed: spec.seed });
  if (!scatter) return { layout, pieces };

  return {
    layout,
    pieces: shufflePieces(pieces, {
      layout,
      seed: scatterSeed(spec.seed, scatterRound),
      allowRotation: spec.allowRotation,
    }),
  };
}

/** Ambil bagian state yang perlu dikirim lewat jaringan. */
export function piecesToStateMap(pieces: readonly PuzzlePiece[]): PieceStateMap {
  const map: PieceStateMap = {};
  for (const piece of pieces) {
    map[piece.id] = {
      x: piece.currentX,
      y: piece.currentY,
      rotation: piece.rotation,
      isPlaced: piece.isPlaced,
      z: piece.z,
      lockedBy: piece.lockedByPlayerId ?? null,
    };
  }
  return map;
}

/** Terapkan state dari server ke potongan hasil generate lokal. */
export function applyPieceStates(
  pieces: readonly PuzzlePiece[],
  states: PieceStateMap,
): PuzzlePiece[] {
  return pieces.map((piece) => {
    const state = states[piece.id];
    if (!state) return piece;
    return {
      ...piece,
      currentX: state.x,
      currentY: state.y,
      rotation: state.rotation,
      isPlaced: state.isPlaced,
      z: state.z,
      lockedByPlayerId: state.lockedBy,
    };
  });
}
