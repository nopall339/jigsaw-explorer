import { describe, expect, it } from 'vitest';
import { computeGrid, resolvePieceCount } from '../grid';
import { createPuzzleLayout, pieceSlotRect } from '../layout';
import { PIECE_COUNT_OPTIONS } from '@/types';

describe('computeGrid', () => {
  it('menghasilkan jumlah potongan yang dekat dengan permintaan', () => {
    for (const target of PIECE_COUNT_OPTIONS) {
      const grid = computeGrid(1600, 1200, target);
      const drift = Math.abs(grid.pieceCount - target) / target;
      expect(drift).toBeLessThanOrEqual(0.12);
    }
  });

  it('menghasilkan potongan yang mendekati persegi', () => {
    const cases: Array<[number, number]> = [
      [1600, 1200],
      [1920, 1080],
      [1000, 1000],
      [800, 1200],
      [2400, 800],
    ];

    for (const [width, height] of cases) {
      for (const target of PIECE_COUNT_OPTIONS) {
        const grid = computeGrid(width, height, target);
        const pieceAspect = width / grid.cols / (height / grid.rows);
        expect(pieceAspect).toBeGreaterThan(0.7);
        expect(pieceAspect).toBeLessThan(1.43);
      }
    }
  });

  it('mengikuti orientasi gambar', () => {
    const landscape = computeGrid(2000, 1000, 48);
    expect(landscape.cols).toBeGreaterThan(landscape.rows);

    const portrait = computeGrid(1000, 2000, 48);
    expect(portrait.rows).toBeGreaterThan(portrait.cols);
  });

  it('deterministik & selalu minimal 2x2', () => {
    expect(computeGrid(1600, 1200, 12)).toEqual(computeGrid(1600, 1200, 12));
    const tiny = computeGrid(1600, 1200, 4);
    expect(tiny.rows).toBeGreaterThanOrEqual(2);
    expect(tiny.cols).toBeGreaterThanOrEqual(2);
  });

  it('menolak ukuran gambar tidak valid', () => {
    expect(() => computeGrid(0, 100, 48)).toThrow();
    expect(() => computeGrid(100, -1, 48)).toThrow();
  });

  it('resolvePieceCount = rows * cols', () => {
    const grid = computeGrid(1600, 1200, 300);
    expect(resolvePieceCount(1600, 1200, 300)).toBe(grid.rows * grid.cols);
  });
});

describe('createPuzzleLayout', () => {
  it('mempertahankan aspect ratio gambar pada papan', () => {
    const layout = createPuzzleLayout(1600, 1200, 100);
    expect(layout.board.width / layout.board.height).toBeCloseTo(1600 / 1200, 5);
    expect(Math.max(layout.board.width, layout.board.height)).toBeCloseTo(1000, 5);
  });

  it('papan selalu berada di dalam area kerja dengan margin di semua sisi', () => {
    for (const target of PIECE_COUNT_OPTIONS) {
      const layout = createPuzzleLayout(1600, 1200, target);
      expect(layout.board.x).toBeGreaterThan(0);
      expect(layout.board.y).toBeGreaterThan(0);
      expect(layout.board.x + layout.board.width).toBeLessThan(layout.world.width);
      expect(layout.board.y + layout.board.height).toBeLessThan(layout.world.height);
      // margin kiri == margin kanan (papan terpusat)
      expect(layout.world.width - layout.board.width - layout.board.x).toBeCloseTo(layout.board.x, 5);
    }
  });

  it('menyediakan ruang sebar yang cukup untuk semua potongan', () => {
    for (const target of PIECE_COUNT_OPTIONS) {
      const layout = createPuzzleLayout(1600, 1200, target);
      const ringArea = layout.world.width * layout.world.height - layout.board.width * layout.board.height;
      const pieceArea = layout.grid.pieceCount * layout.pieceWidth * layout.pieceHeight;
      expect(ringArea).toBeGreaterThan(pieceArea * 2);
    }
  });

  it('menghormati grid yang sudah tersimpan di room', () => {
    const layout = createPuzzleLayout(1600, 1200, 100, { rows: 5, cols: 7, pieceCount: 35 });
    expect(layout.grid).toEqual({ rows: 5, cols: 7, pieceCount: 35 });
    expect(layout.pieceWidth).toBeCloseTo(layout.board.width / 7, 6);
  });

  it('pieceSlotRect sejajar dengan grid papan', () => {
    const layout = createPuzzleLayout(1200, 800, 48);
    const first = pieceSlotRect(layout, 0, 0);
    expect(first.x).toBeCloseTo(layout.board.x, 6);
    expect(first.y).toBeCloseTo(layout.board.y, 6);

    const last = pieceSlotRect(layout, layout.grid.rows - 1, layout.grid.cols - 1);
    expect(last.x + last.width).toBeCloseTo(layout.board.x + layout.board.width, 4);
    expect(last.y + last.height).toBeCloseTo(layout.board.y + layout.board.height, 4);
  });
});
