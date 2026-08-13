import { describe, expect, it } from 'vitest';
import type { PuzzlePiece, PuzzleSpec } from '@/types';
import { createPuzzleLayout } from '../layout';
import { generatePieces } from '../generatePieces';
import { scatterBands, shufflePieces } from '../shuffle';
import {
  clampToWorld,
  computeProgress,
  distanceToSlot,
  isRotationAligned,
  normalizeRotation,
  resolveDrop,
  shouldSnap,
} from '../snapLogic';
import { applyPieceStates, createPuzzle, piecesToStateMap } from '../index';
import { createRng, deriveSeed, hashString, shuffleArray } from '../rng';

const SEED = 987654321;

describe('rng', () => {
  it('deterministik untuk seed yang sama', () => {
    const a = createRng(SEED);
    const b = createRng(SEED);
    for (let i = 0; i < 20; i += 1) expect(a.next()).toBe(b.next());
  });

  it('menghasilkan nilai di rentang yang benar', () => {
    const rng = createRng(42);
    for (let i = 0; i < 500; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      const int = rng.int(3, 7);
      expect(int).toBeGreaterThanOrEqual(3);
      expect(int).toBeLessThanOrEqual(7);
    }
  });

  it('hashString & deriveSeed stabil dan berbeda per kunci', () => {
    expect(hashString('v:1:2')).toBe(hashString('v:1:2'));
    expect(hashString('v:1:2')).not.toBe(hashString('v:2:1'));
    expect(deriveSeed(SEED, 'a')).not.toBe(deriveSeed(SEED, 'b'));
    expect(deriveSeed(SEED, 'a')).toBe(deriveSeed(SEED, 'a'));
  });

  it('shuffleArray tidak mengubah input dan mempertahankan semua elemen', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const output = shuffleArray(input, createRng(SEED));
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(output.slice().sort((a, b) => a - b)).toEqual(input);
  });
});

describe('shufflePieces', () => {
  const layout = createPuzzleLayout(1600, 1200, 100);
  const pieces = generatePieces({ layout, seed: SEED });

  it('deterministik untuk seed yang sama', () => {
    const a = shufflePieces(pieces, { layout, seed: SEED });
    const b = shufflePieces(pieces, { layout, seed: SEED });
    expect(a.map((piece) => [piece.id, piece.currentX, piece.currentY])).toEqual(
      b.map((piece) => [piece.id, piece.currentX, piece.currentY]),
    );
  });

  it('menghasilkan sebaran berbeda untuk seed berbeda', () => {
    const a = shufflePieces(pieces, { layout, seed: SEED });
    const b = shufflePieces(pieces, { layout, seed: SEED + 7 });
    const identical = a.filter(
      (piece, index) => piece.currentX === b[index]!.currentX && piece.currentY === b[index]!.currentY,
    );
    expect(identical.length).toBeLessThan(pieces.length * 0.1);
  });

  it('semua potongan berada di dalam area kerja', () => {
    for (const piece of shufflePieces(pieces, { layout, seed: SEED })) {
      expect(piece.currentX).toBeGreaterThanOrEqual(0);
      expect(piece.currentY).toBeGreaterThanOrEqual(0);
      expect(piece.currentX + piece.width).toBeLessThanOrEqual(layout.world.width);
      expect(piece.currentY + piece.height).toBeLessThanOrEqual(layout.world.height);
    }
  });

  it('tidak ada potongan yang menutupi area papan', () => {
    const { board } = layout;
    for (const piece of shufflePieces(pieces, { layout, seed: SEED })) {
      const overlapsX = piece.currentX < board.x + board.width && piece.currentX + piece.width > board.x;
      const overlapsY = piece.currentY < board.y + board.height && piece.currentY + piece.height > board.y;
      expect(overlapsX && overlapsY).toBe(false);
    }
  });

  it('tidak menumpuk semua potongan di titik yang sama', () => {
    const scattered = shufflePieces(pieces, { layout, seed: SEED });
    const unique = new Set(
      scattered.map((piece) => `${Math.round(piece.currentX / 5)}:${Math.round(piece.currentY / 5)}`),
    );
    expect(unique.size).toBeGreaterThan(scattered.length * 0.7);
  });

  it('memberi rotasi hanya kalau diizinkan', () => {
    const noRotation = shufflePieces(pieces, { layout, seed: SEED });
    expect(noRotation.every((piece) => piece.rotation === 0)).toBe(true);

    const rotated = shufflePieces(pieces, { layout, seed: SEED, allowRotation: true });
    expect(rotated.some((piece) => piece.rotation !== 0)).toBe(true);
    expect(rotated.every((piece) => [0, 90, 180, 270].includes(piece.rotation))).toBe(true);
  });

  it('onlyUnplaced tidak menggeser potongan yang sudah terpasang', () => {
    const withPlaced: PuzzlePiece[] = pieces.map((piece, index) =>
      index % 3 === 0 ? { ...piece, isPlaced: true } : piece,
    );
    const result = shufflePieces(withPlaced, { layout, seed: SEED, onlyUnplaced: true });

    result.forEach((piece, index) => {
      if (withPlaced[index]!.isPlaced) {
        expect(piece.currentX).toBe(withPlaced[index]!.currentX);
        expect(piece.isPlaced).toBe(true);
      }
    });
  });

  it('empat pita sebar tersedia untuk layout normal', () => {
    expect(scatterBands(layout)).toHaveLength(4);
  });
});

describe('snapLogic', () => {
  const layout = createPuzzleLayout(1200, 900, 48);
  const [piece] = generatePieces({ layout, seed: SEED });
  const base = piece as PuzzlePiece;

  it('normalizeRotation membawa sudut ke 0..359', () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
  });

  it('isRotationAligned toleran terhadap sedikit miring', () => {
    expect(isRotationAligned(0)).toBe(true);
    expect(isRotationAligned(5)).toBe(true);
    expect(isRotationAligned(355)).toBe(true);
    expect(isRotationAligned(90)).toBe(false);
    expect(isRotationAligned(180)).toBe(false);
  });

  it('distanceToSlot & shouldSnap memakai toleransi', () => {
    const near: PuzzlePiece = { ...base, currentX: base.correctX + 6, currentY: base.correctY - 8 };
    expect(distanceToSlot(near)).toBeCloseTo(10, 6);
    expect(shouldSnap(near, 15)).toBe(true);
    expect(shouldSnap(near, 5)).toBe(false);

    const rotated: PuzzlePiece = { ...near, rotation: 90 };
    expect(shouldSnap(rotated, 15)).toBe(false);
  });

  it('resolveDrop menempelkan potongan tepat ke slotnya', () => {
    const result = resolveDrop({
      piece: base,
      x: base.correctX + 4,
      y: base.correctY + 4,
      rotation: 3,
      tolerance: layout.snapTolerance,
    });

    expect(result.isPlaced).toBe(true);
    expect(result.x).toBe(base.correctX);
    expect(result.y).toBe(base.correctY);
    expect(result.rotation).toBe(0);
  });

  it('resolveDrop membiarkan potongan yang jauh apa adanya', () => {
    const result = resolveDrop({
      piece: base,
      x: base.correctX + 400,
      y: base.correctY + 120,
      rotation: 90,
      tolerance: layout.snapTolerance,
    });

    expect(result.isPlaced).toBe(false);
    expect(result.x).toBe(base.correctX + 400);
    expect(result.rotation).toBe(90);
  });

  it('clampToWorld menahan potongan di area kerja', () => {
    const clamped = clampToWorld(-9999, 9999, base, layout);
    expect(clamped.x).toBeGreaterThan(-base.width);
    expect(clamped.y).toBeLessThan(layout.world.height);
  });

  it('computeProgress menghitung potongan terpasang', () => {
    const pieces = generatePieces({ layout, seed: SEED }).map((item, index) =>
      index < 10 ? { ...item, isPlaced: true } : item,
    );
    const progress = computeProgress(pieces);
    expect(progress.placed).toBe(10);
    expect(progress.total).toBe(pieces.length);
    expect(progress.isComplete).toBe(false);

    const all = pieces.map((item) => ({ ...item, isPlaced: true }));
    expect(computeProgress(all).isComplete).toBe(true);
    expect(computeProgress([]).isComplete).toBe(false);
  });
});

describe('createPuzzle & sinkronisasi state', () => {
  const spec: PuzzleSpec = {
    imageUrl: '/sample-images/test.svg',
    imageWidth: 1600,
    imageHeight: 1200,
    imageTitle: 'Test',
    imageSource: 'gallery',
    requestedPieceCount: 48,
    gridRows: 6,
    gridCols: 8,
    pieceCount: 48,
    seed: SEED,
    allowRotation: false,
  };

  it('client & server menghasilkan papan yang identik dari spec yang sama', () => {
    const a = createPuzzle(spec);
    const b = createPuzzle(spec);
    expect(a.layout).toEqual(b.layout);
    expect(a.pieces).toEqual(b.pieces);
    expect(a.pieces).toHaveLength(48);
  });

  it('menghormati grid dari spec', () => {
    const { layout } = createPuzzle(spec);
    expect(layout.grid).toEqual({ rows: 6, cols: 8, pieceCount: 48 });
  });

  it('scatterRound berbeda menghasilkan sebaran berbeda tapi bentuk tab sama', () => {
    const first = createPuzzle(spec, { scatterRound: 0 });
    const second = createPuzzle(spec, { scatterRound: 1 });

    expect(second.pieces.map((piece) => piece.edges)).toEqual(
      first.pieces.map((piece) => piece.edges),
    );
    expect(second.pieces.map((piece) => piece.currentX)).not.toEqual(
      first.pieces.map((piece) => piece.currentX),
    );
  });

  it('piecesToStateMap -> applyPieceStates bolak-balik tanpa kehilangan data', () => {
    const { pieces } = createPuzzle(spec);
    const moved = pieces.map((piece, index) =>
      index === 3 ? { ...piece, currentX: 12, currentY: 34, isPlaced: true, z: 99 } : piece,
    );

    const states = piecesToStateMap(moved);
    const restored = applyPieceStates(pieces, states);

    expect(restored[3]!.currentX).toBe(12);
    expect(restored[3]!.currentY).toBe(34);
    expect(restored[3]!.isPlaced).toBe(true);
    expect(restored[3]!.z).toBe(99);
    expect(restored.map((piece) => piece.edges)).toEqual(pieces.map((piece) => piece.edges));
  });
});
