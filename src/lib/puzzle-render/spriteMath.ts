/**
 * Perhitungan ukuran sprite potongan — logic murni, tanpa canvas & tanpa DOM,
 * jadi bisa diuji langsung di Node.
 *
 * Kenapa perlu "sprite": menggambar ulang kontur bezier + clip untuk 500
 * potongan setiap frame terlalu berat. Jadi setiap potongan dirasterisasi
 * **sekali** ke canvas kecil, lalu papan cuma menyalin bitmap itu (murah).
 */

import type { PuzzleLayout, Size } from '@/types';

/**
 * Batas total pixel seluruh sprite (bukan byte). 12 juta px ≈ 48 MB RGBA —
 * aman untuk laptop kelas menengah, termasuk saat 500 potongan.
 */
export const SPRITE_PIXEL_BUDGET = 12_000_000;

export const MIN_SPRITE_SCALE = 1;
export const MAX_SPRITE_SCALE = 2.5;

/** Ukuran sprite dalam world unit: kotak potongan + padding tab di keempat sisi. */
export function spriteSizeInWorld(layout: PuzzleLayout): Size {
  return {
    width: layout.pieceWidth + layout.padding * 2,
    height: layout.pieceHeight + layout.padding * 2,
  };
}

/**
 * Berapa pixel per world unit sebaiknya dipakai untuk merasterisasi potongan.
 *
 * Dua tekanan yang berlawanan:
 * - makin besar skala, makin tajam saat pemain zoom in;
 * - makin besar skala, makin banyak memori (dikali jumlah potongan).
 *
 * Jadi ambil `devicePixelRatio` sebagai target ideal, lalu turunkan kalau
 * total pixel-nya melewati anggaran.
 */
export function computeSpriteScale(
  layout: PuzzleLayout,
  devicePixelRatio = 1,
  pixelBudget = SPRITE_PIXEL_BUDGET,
): number {
  const { width, height } = spriteSizeInWorld(layout);
  const areaPerPiece = Math.max(1, width * height);
  const total = Math.max(1, layout.grid.pieceCount);

  const ideal = Math.min(MAX_SPRITE_SCALE, Math.max(MIN_SPRITE_SCALE, devicePixelRatio * 1.25));
  const affordable = Math.sqrt(pixelBudget / (areaPerPiece * total));

  return Math.max(MIN_SPRITE_SCALE, Math.min(ideal, affordable));
}

/** Ukuran canvas sprite dalam pixel sungguhan. */
export function spriteCanvasSize(layout: PuzzleLayout, scale: number): Size {
  const { width, height } = spriteSizeInWorld(layout);
  return {
    width: Math.max(1, Math.ceil(width * scale)),
    height: Math.max(1, Math.ceil(height * scale)),
  };
}

/** Perkiraan pemakaian memori seluruh sprite (byte) — dipakai di test & log dev. */
export function estimateSpriteMemory(layout: PuzzleLayout, scale: number): number {
  const { width, height } = spriteCanvasSize(layout, scale);
  return width * height * 4 * layout.grid.pieceCount;
}
