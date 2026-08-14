import type { PuzzleLayout, PuzzlePiece } from '@/types';

/**
 * Logic snapping & progres. Murni, tanpa DOM.
 */

/** Toleransi sudut (derajat) agar potongan yang diputar dianggap lurus. */
export const ROTATION_TOLERANCE_DEG = 14;

export function normalizeRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Seberapa jauh sudut dari kelipatan 360 (0/360 dianggap sama). */
export function rotationOffset(degrees: number): number {
  const normalized = normalizeRotation(degrees);
  return Math.min(normalized, 360 - normalized);
}

export function isRotationAligned(
  degrees: number,
  toleranceDeg: number = ROTATION_TOLERANCE_DEG,
): boolean {
  return rotationOffset(degrees) <= toleranceDeg;
}

/** Jarak posisi potongan saat ini ke posisi benarnya. */
export function distanceToSlot(piece: PuzzlePiece): number {
  return Math.hypot(piece.currentX - piece.correctX, piece.currentY - piece.correctY);
}

/**
 * Apakah potongan sudah cukup dekat (dan cukup lurus) untuk di-snap otomatis?
 */
export function shouldSnap(piece: PuzzlePiece, tolerancePx = 15): boolean {
  return distanceToSlot(piece) <= tolerancePx && isRotationAligned(piece.rotation);
}

export interface DropInput {
  piece: PuzzlePiece;
  /** Posisi kiri-atas kotak potongan saat dilepas (world unit). */
  x: number;
  y: number;
  rotation: number;
  tolerance: number;
}

export interface DropResult {
  x: number;
  y: number;
  rotation: number;
  isPlaced: boolean;
}

/**
 * Tentukan posisi akhir sebuah potongan saat dilepas.
 * Dipakai baik di client (feedback instan) maupun di server (sumber kebenaran),
 * jadi hasilnya selalu konsisten.
 */
export function resolveDrop({ piece, x, y, rotation, tolerance }: DropInput): DropResult {
  const distance = Math.hypot(x - piece.correctX, y - piece.correctY);
  const near = distance <= tolerance;
  const rotationAligned = isRotationAligned(rotation);
  
  console.log('[resolveDrop]', piece.id, {
    dropPos: `${x.toFixed(1)},${y.toFixed(1)}`,
    correctPos: `${piece.correctX.toFixed(1)},${piece.correctY.toFixed(1)}`,
    distance: distance.toFixed(2),
    tolerance,
    near,
    rotation: rotation.toFixed(2),
    rotationOffset: rotationOffset(rotation).toFixed(2),
    rotationAligned,
    willSnap: near && rotationAligned
  });

  if (near && rotationAligned) {
    return { x: piece.correctX, y: piece.correctY, rotation: 0, isPlaced: true };
  }

  return { x, y, rotation: normalizeRotation(rotation), isPlaced: false };
}

/** Jaga agar potongan tidak hilang di luar area kerja. */
export function clampToWorld(
  x: number,
  y: number,
  piece: PuzzlePiece,
  layout: PuzzleLayout,
): { x: number; y: number } {
  const margin = layout.padding;
  return {
    x: Math.min(Math.max(x, margin - piece.width * 0.5), layout.world.width - margin - piece.width * 0.5),
    y: Math.min(
      Math.max(y, margin - piece.height * 0.5),
      layout.world.height - margin - piece.height * 0.5,
    ),
  };
}

export function countPlaced(pieces: readonly PuzzlePiece[]): number {
  let placed = 0;
  for (const piece of pieces) if (piece.isPlaced) placed += 1;
  return placed;
}

export interface PuzzleProgress {
  placed: number;
  total: number;
  /** 0..1 */
  ratio: number;
  isComplete: boolean;
}

export function computeProgress(pieces: readonly PuzzlePiece[]): PuzzleProgress {
  const total = pieces.length;
  const placed = countPlaced(pieces);
  return {
    placed,
    total,
    ratio: total === 0 ? 0 : placed / total,
    isComplete: total > 0 && placed === total,
  };
}

export function isPuzzleComplete(pieces: readonly PuzzlePiece[]): boolean {
  return computeProgress(pieces).isComplete;
}
