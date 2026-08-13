import type { PieceEdge, PieceEdges, PuzzleLayout, PuzzlePiece } from '@/types';
import { TAB_PROFILES } from './jigsawPath';
import { createRng, deriveSeed } from './rng';

/**
 * Pembentuk daftar potongan puzzle. Logic murni — tidak menyentuh DOM/canvas,
 * jadi mudah di-unit-test dan bisa dipakai juga di sisi server.
 */

const FLAT_EDGE: PieceEdge = { kind: 0, variant: 0, heightScale: 1 };

/** Nama seam antar dua potongan; dua potongan bertetangga memakai nama yang sama. */
export function horizontalSeamKey(row: number, col: number): string {
  return `h:${row}:${col}`;
}

export function verticalSeamKey(row: number, col: number): string {
  return `v:${row}:${col}`;
}

/**
 * Bentuk sisi untuk sebuah seam.
 *
 * Seluruh sifat sisi (arah tab, varian bentuk, tinggi) diturunkan dari
 * `seed + nama seam`, sehingga potongan di kedua sisi seam otomatis sepadan
 * tanpa perlu saling berkomunikasi.
 *
 * @param flip `true` untuk potongan di sisi bawah/kanan seam — arah tab dibalik.
 */
export function seamEdge(seed: number, seamKey: string, flip: boolean): PieceEdge {
  const rng = createRng(deriveSeed(seed, seamKey));
  const sign = rng.chance(0.5) ? 1 : -1;
  const variant = rng.int(0, TAB_PROFILES.length - 1);
  const heightScale = 0.88 + rng.next() * 0.24;

  return {
    kind: (flip ? -sign : sign) as 1 | -1,
    variant,
    heightScale,
  };
}

/** Keempat sisi untuk satu posisi grid. Tepi gambar selalu rata. */
export function pieceEdgesAt(
  seed: number,
  rows: number,
  cols: number,
  row: number,
  col: number,
): PieceEdges {
  return {
    top: row === 0 ? FLAT_EDGE : seamEdge(seed, horizontalSeamKey(row - 1, col), true),
    bottom: row === rows - 1 ? FLAT_EDGE : seamEdge(seed, horizontalSeamKey(row, col), false),
    left: col === 0 ? FLAT_EDGE : seamEdge(seed, verticalSeamKey(row, col - 1), true),
    right: col === cols - 1 ? FLAT_EDGE : seamEdge(seed, verticalSeamKey(row, col), false),
  };
}

/** Matriks sisi lengkap — dipakai di test untuk memastikan tab & blank sepadan. */
export function buildEdgeMatrix(rows: number, cols: number, seed: number): PieceEdges[][] {
  const matrix: PieceEdges[][] = [];
  for (let row = 0; row < rows; row += 1) {
    const line: PieceEdges[] = [];
    for (let col = 0; col < cols; col += 1) {
      line.push(pieceEdgesAt(seed, rows, cols, row, col));
    }
    matrix.push(line);
  }
  return matrix;
}

export function pieceId(row: number, col: number): string {
  return `p${row}-${col}`;
}

export interface GeneratePiecesOptions {
  layout: PuzzleLayout;
  seed: number;
}

/**
 * Hasilkan semua potongan pada posisi *benar* (belum diacak, `isPlaced: false`).
 * Pakai `shufflePieces` untuk menyebarnya ke area kerja.
 */
export function generatePieces({ layout, seed }: GeneratePiecesOptions): PuzzlePiece[] {
  const { grid, board, pieceWidth, pieceHeight } = layout;
  const pieces: PuzzlePiece[] = [];

  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const correctX = board.x + col * pieceWidth;
      const correctY = board.y + row * pieceHeight;

      pieces.push({
        id: pieceId(row, col),
        row,
        col,
        width: pieceWidth,
        height: pieceHeight,
        correctX,
        correctY,
        currentX: correctX,
        currentY: correctY,
        rotation: 0,
        isPlaced: false,
        z: row * grid.cols + col,
        lockedByPlayerId: null,
        edges: pieceEdgesAt(seed, grid.rows, grid.cols, row, col),
      });
    }
  }

  return pieces;
}
