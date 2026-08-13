import type { PuzzleLayout, PuzzlePiece } from '@/types';
import { createRng, shuffleArray, type Rng } from './rng';

/**
 * Sebar potongan ke area kerja di sekeliling papan (bukan di atas papan),
 * supaya area target tetap terlihat jelas.
 *
 * Deterministik: dengan `seed` yang sama, semua pemain di satu room melihat
 * susunan awal yang identik.
 */

export const ROTATION_STEPS = [0, 90, 180, 270] as const;

interface Band {
  x0: number;
  y0: number;
  /** Batas maksimum posisi kiri-atas potongan (bukan tepi band). */
  x1: number;
  y1: number;
}

function bandArea(band: Band): number {
  return Math.max(0, band.x1 - band.x0) * Math.max(0, band.y1 - band.y0);
}

/** Empat pita di sekeliling papan tempat potongan boleh diletakkan. */
export function scatterBands(layout: PuzzleLayout): Band[] {
  const { board, world, pieceWidth: pw, pieceHeight: ph, padding: p } = layout;
  const gap = Math.max(p, Math.min(pw, ph) * 0.2);

  const maxX = world.width - p - pw;
  const maxY = world.height - p - ph;

  const bands: Band[] = [
    // atas
    { x0: p, y0: p, x1: maxX, y1: board.y - gap - ph },
    // bawah
    { x0: p, y0: board.y + board.height + gap, x1: maxX, y1: maxY },
    // kiri (hanya setinggi papan, supaya tidak tumpang tindih dengan pita atas/bawah)
    { x0: p, y0: board.y, x1: board.x - gap - pw, y1: board.y + board.height - ph },
    // kanan
    {
      x0: board.x + board.width + gap,
      y0: board.y,
      x1: maxX,
      y1: board.y + board.height - ph,
    },
  ];

  return bands.filter((band) => bandArea(band) > 0);
}

/**
 * Sebar `count` posisi di dalam satu pita memakai stratified sampling
 * (grid + jitter). Jauh lebih rapi daripada acak murni: tidak ada tumpukan
 * pekat di satu titik sementara sisi lain kosong.
 */
function stratifiedPositions(band: Band, count: number, rng: Rng): Array<[number, number]> {
  const width = band.x1 - band.x0;
  const height = band.y1 - band.y0;
  const cols = Math.max(1, Math.round(Math.sqrt((count * width) / Math.max(height, 1e-6))));
  const rows = Math.max(1, Math.ceil(count / cols));
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  const positions: Array<[number, number]> = [];
  for (let index = 0; index < count; index += 1) {
    const cellX = index % cols;
    const cellY = Math.floor(index / cols) % rows;
    positions.push([
      band.x0 + (cellX + rng.range(0.08, 0.92)) * cellWidth,
      band.y0 + (cellY + rng.range(0.08, 0.92)) * cellHeight,
    ]);
  }
  return positions;
}

export interface ShuffleOptions {
  layout: PuzzleLayout;
  seed: number;
  allowRotation?: boolean;
  /** Hanya acak potongan yang belum terpasang (untuk tombol "rapikan"). */
  onlyUnplaced?: boolean;
}

/**
 * Kembalikan salinan `pieces` dengan posisi awal yang sudah diacak.
 * Array input tidak dimodifikasi.
 */
export function shufflePieces(
  pieces: readonly PuzzlePiece[],
  { layout, seed, allowRotation = false, onlyUnplaced = false }: ShuffleOptions,
): PuzzlePiece[] {
  const rng = createRng(seed);
  const bands = scatterBands(layout);

  const movable = onlyUnplaced ? pieces.filter((piece) => !piece.isPlaced) : pieces.slice();
  const order = shuffleArray(movable, rng);

  // Bagi potongan ke tiap pita sebanding dengan luasnya.
  const totalArea = bands.reduce((sum, band) => sum + bandArea(band), 0);
  const placements = new Map<string, { x: number; y: number }>();

  if (bands.length === 0 || totalArea <= 0) {
    // Fallback ekstrem (papan sangat besar relatif dunia): sebar di mana saja.
    for (const piece of order) {
      placements.set(piece.id, {
        x: rng.range(0, Math.max(1, layout.world.width - piece.width)),
        y: rng.range(0, Math.max(1, layout.world.height - piece.height)),
      });
    }
  } else {
    let cursor = 0;
    bands.forEach((band, bandIndex) => {
      const isLast = bandIndex === bands.length - 1;
      const share = isLast
        ? order.length - cursor
        : Math.round((bandArea(band) / totalArea) * order.length);
      const slice = order.slice(cursor, cursor + Math.max(0, share));
      cursor += slice.length;

      stratifiedPositions(band, slice.length, rng).forEach(([x, y], index) => {
        const piece = slice[index];
        if (piece) placements.set(piece.id, { x, y });
      });
    });
  }

  let z = 0;
  return pieces.map((piece) => {
    const placement = placements.get(piece.id);
    if (!placement) return piece;

    z += 1;
    return {
      ...piece,
      currentX: placement.x,
      currentY: placement.y,
      rotation: allowRotation ? (rng.pick(ROTATION_STEPS) as number) : 0,
      isPlaced: false,
      lockedByPlayerId: null,
      z,
    };
  });
}
