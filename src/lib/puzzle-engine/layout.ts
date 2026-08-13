import type { PuzzleGrid, PuzzleLayout, Rect } from '@/types';
import { computeGrid } from './grid';

/** Sisi terpanjang papan dalam world unit. Zoom stage yang mengurus tampilan. */
export const BOARD_LONG_SIDE = 1000;

/** Tinggi tab relatif terhadap sisi terpendek potongan. */
const TAB_RATIO = 0.21;

/** Kelonggaran ekstra untuk padding sprite (varian tab tertinggi + heightScale maks). */
const TAB_OUTSET_FACTOR = 1.4;

/** Berapa kali luas total potongan yang disediakan sebagai area sebar. */
const SPREAD_DENSITY = 2.1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Hitung margin di sekeliling papan supaya semua potongan bisa disebar
 * di luar area papan tanpa terlalu bertumpuk.
 *
 * Menyelesaikan: (bW + 2m)(bH + 2m) - bW*bH >= luasYangDibutuhkan
 *   -> 4m^2 + 2m(bW + bH) - luas >= 0
 */
function computeScatterMargin(
  boardWidth: number,
  boardHeight: number,
  totalPieceArea: number,
  minMargin: number,
): number {
  const b = 2 * (boardWidth + boardHeight);
  const solved = (-b + Math.sqrt(b * b + 16 * totalPieceArea)) / 8;
  return Math.max(minMargin, solved);
}

/**
 * Hitung seluruh geometri papan dari ukuran gambar + jumlah potongan.
 * Fungsi murni & deterministik — dipanggil dengan input yang sama di client
 * dan di server sehingga papan setiap pemain identik.
 *
 * @param gridOverride pakai grid yang sudah tersimpan di room (menghindari
 *   kemungkinan perbedaan kalau heuristik `computeGrid` berubah di masa depan).
 */
export function createPuzzleLayout(
  imageWidth: number,
  imageHeight: number,
  requestedPieceCount: number,
  gridOverride?: PuzzleGrid,
): PuzzleLayout {
  const grid = gridOverride ?? computeGrid(imageWidth, imageHeight, requestedPieceCount);

  const scale = BOARD_LONG_SIDE / Math.max(imageWidth, imageHeight);
  const boardWidth = imageWidth * scale;
  const boardHeight = imageHeight * scale;

  const pieceWidth = boardWidth / grid.cols;
  const pieceHeight = boardHeight / grid.rows;
  const shortSide = Math.min(pieceWidth, pieceHeight);

  const tabSize = shortSide * TAB_RATIO;
  const padding = Math.ceil(tabSize * TAB_OUTSET_FACTOR) + 2;

  const totalPieceArea = grid.pieceCount * pieceWidth * pieceHeight * SPREAD_DENSITY;
  const minMargin = Math.max(pieceWidth, pieceHeight) * 1.6 + padding;
  const margin = computeScatterMargin(boardWidth, boardHeight, totalPieceArea, minMargin);

  const board: Rect = {
    x: margin,
    y: margin,
    width: boardWidth,
    height: boardHeight,
  };

  return {
    grid,
    board,
    world: {
      width: boardWidth + margin * 2,
      height: boardHeight + margin * 2,
    },
    pieceWidth,
    pieceHeight,
    tabSize,
    padding,
    snapTolerance: clamp(shortSide * 0.36, 7, 32),
    scale,
  };
}

/** Kotak potongan (tanpa tab) pada posisi benarnya. */
export function pieceSlotRect(layout: PuzzleLayout, row: number, col: number): Rect {
  return {
    x: layout.board.x + col * layout.pieceWidth,
    y: layout.board.y + row * layout.pieceHeight,
    width: layout.pieceWidth,
    height: layout.pieceHeight,
  };
}
