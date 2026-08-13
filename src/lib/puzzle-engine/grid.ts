import type { PuzzleGrid } from '@/types';

const MIN_SIDE = 2;
const MAX_SIDE = 80;

/**
 * Cari kombinasi baris x kolom terbaik untuk sebuah gambar.
 *
 * Dua hal yang kita seimbangkan:
 * 1. jumlah potongan sedekat mungkin dengan yang diminta pemain, dan
 * 2. potongan sepersegi mungkin (rasio 1:1) — potongan gepeng terlihat aneh
 *    dan bentuk tab-nya jadi tidak proporsional.
 *
 * Fungsi murni: aman dipakai di server maupun client.
 */
export function computeGrid(
  imageWidth: number,
  imageHeight: number,
  targetPieceCount: number,
): PuzzleGrid {
  if (!(imageWidth > 0) || !(imageHeight > 0)) {
    throw new Error('computeGrid: ukuran gambar harus > 0');
  }

  const target = Math.max(4, Math.round(targetPieceCount));
  const aspect = imageWidth / imageHeight;
  const idealCols = Math.sqrt(target * aspect);

  const lowCols = Math.max(MIN_SIDE, Math.floor(idealCols / 2));
  const highCols = Math.min(MAX_SIDE, Math.ceil(idealCols * 2) + 1);

  let best: PuzzleGrid | null = null;
  let bestCost = Number.POSITIVE_INFINITY;

  for (let cols = lowCols; cols <= highCols; cols += 1) {
    const rawRows = target / cols;
    const candidates = new Set([Math.floor(rawRows), Math.ceil(rawRows)]);

    for (const rows of candidates) {
      if (rows < MIN_SIDE || rows > MAX_SIDE) continue;

      const pieceCount = rows * cols;
      const pieceAspect = imageWidth / cols / (imageHeight / rows);

      // Selisih jumlah potongan (relatif) + deviasi bentuk potongan dari persegi.
      const countCost = Math.abs(pieceCount - target) / target;
      const shapeCost = Math.abs(Math.log(pieceAspect));
      const cost = countCost + shapeCost * 0.55;

      if (cost < bestCost - 1e-9) {
        bestCost = cost;
        best = { rows, cols, pieceCount };
      }
    }
  }

  if (!best) {
    // Praktis tidak pernah terjadi, tapi tetap beri fallback yang valid.
    const side = Math.max(MIN_SIDE, Math.round(Math.sqrt(target)));
    return { rows: side, cols: side, pieceCount: side * side };
  }

  return best;
}

/** Jumlah potongan sebenarnya untuk sebuah pilihan kesulitan. */
export function resolvePieceCount(
  imageWidth: number,
  imageHeight: number,
  targetPieceCount: number,
): number {
  return computeGrid(imageWidth, imageHeight, targetPieceCount).pieceCount;
}
