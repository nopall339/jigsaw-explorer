import { describe, expect, it } from 'vitest';
import type { PieceEdge, Point, PuzzlePiece } from '@/types';
import {
  buildEdgeSegments,
  buildPiecePath,
  maxEdgeOutset,
  segmentsToSvgPath,
  type PathSegment,
} from '../jigsawPath';
import { buildEdgeMatrix, generatePieces, pieceEdgesAt, pieceId } from '../generatePieces';
import { createPuzzleLayout } from '../layout';

const SEED = 123456;

/** Sampel kurva bezier jadi polyline supaya dua sisi bisa dibandingkan. */
function samplePolyline(start: Point, segments: readonly PathSegment[], steps = 12): Point[] {
  const points: Point[] = [start];
  let cursor = start;

  for (const segment of segments) {
    if (segment.type === 'L') {
      cursor = { x: segment.points[0], y: segment.points[1] };
      points.push(cursor);
      continue;
    }
    if (segment.type === 'M') {
      cursor = { x: segment.points[0], y: segment.points[1] };
      continue;
    }

    const [c1x, c1y, c2x, c2y, ex, ey] = segment.points;
    const p0 = cursor;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const mt = 1 - t;
      const a = mt * mt * mt;
      const b = 3 * mt * mt * t;
      const c = 3 * mt * t * t;
      const d = t * t * t;
      points.push({
        x: a * p0.x + b * c1x + c * c2x + d * ex,
        y: a * p0.y + b * c1y + c * c2y + d * ey,
      });
    }
    cursor = { x: ex, y: ey };
  }

  return points;
}

describe('matriks sisi potongan', () => {
  it('tepi gambar selalu rata', () => {
    const rows = 5;
    const cols = 6;
    const matrix = buildEdgeMatrix(rows, cols, SEED);

    for (let col = 0; col < cols; col += 1) {
      expect(matrix[0]![col]!.top.kind).toBe(0);
      expect(matrix[rows - 1]![col]!.bottom.kind).toBe(0);
    }
    for (let row = 0; row < rows; row += 1) {
      expect(matrix[row]![0]!.left.kind).toBe(0);
      expect(matrix[row]![cols - 1]!.right.kind).toBe(0);
    }
  });

  it('sisi dalam selalu berpasangan tab <-> blank dengan bentuk identik', () => {
    const rows = 7;
    const cols = 8;
    const matrix = buildEdgeMatrix(rows, cols, SEED);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const piece = matrix[row]![col]!;

        if (col < cols - 1) {
          const right = matrix[row]![col + 1]!;
          expect(piece.right.kind + right.left.kind).toBe(0);
          expect(piece.right.kind).not.toBe(0);
          expect(piece.right.variant).toBe(right.left.variant);
          expect(piece.right.heightScale).toBeCloseTo(right.left.heightScale, 12);
        }

        if (row < rows - 1) {
          const below = matrix[row + 1]![col]!;
          expect(piece.bottom.kind + below.top.kind).toBe(0);
          expect(piece.bottom.kind).not.toBe(0);
          expect(piece.bottom.variant).toBe(below.top.variant);
          expect(piece.bottom.heightScale).toBeCloseTo(below.top.heightScale, 12);
        }
      }
    }
  });

  it('deterministik terhadap seed', () => {
    expect(pieceEdgesAt(SEED, 5, 5, 2, 3)).toEqual(pieceEdgesAt(SEED, 5, 5, 2, 3));
    expect(pieceEdgesAt(SEED, 5, 5, 2, 3)).not.toEqual(pieceEdgesAt(SEED + 1, 5, 5, 2, 3));
  });

  it('menghasilkan campuran tab dan blank (bukan semua sama)', () => {
    const matrix = buildEdgeMatrix(10, 10, SEED);
    const kinds = matrix.flatMap((line) => line.map((edges) => edges.right.kind));
    expect(kinds).toContain(1);
    expect(kinds).toContain(-1);
  });
});

describe('kontur jigsaw saling mengunci', () => {
  const width = 80;
  const height = 60;
  const tabSize = 12;

  it('sisi kanan potongan A identik dengan sisi kiri potongan B', () => {
    const rows = 4;
    const cols = 4;
    const matrix = buildEdgeMatrix(rows, cols, SEED);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols - 1; col += 1) {
        const a = matrix[row]![col]!;
        const b = matrix[row]![col + 1]!;

        const x = width; // seam berada di x = width (A di kiri, B di kanan)
        const aSegments = buildEdgeSegments(
          { start: { x, y: 0 }, end: { x, y: height }, normal: { x: 1, y: 0 } },
          a.right,
          tabSize,
        );
        const bSegments = buildEdgeSegments(
          { start: { x, y: height }, end: { x, y: 0 }, normal: { x: -1, y: 0 } },
          b.left,
          tabSize,
        );

        const aPoints = samplePolyline({ x, y: 0 }, aSegments);
        const bPoints = samplePolyline({ x, y: height }, bSegments).reverse();

        expect(aPoints).toHaveLength(bPoints.length);
        aPoints.forEach((point, index) => {
          expect(point.x).toBeCloseTo(bPoints[index]!.x, 9);
          expect(point.y).toBeCloseTo(bPoints[index]!.y, 9);
        });
      }
    }
  });

  it('sisi bawah potongan A identik dengan sisi atas potongan di bawahnya', () => {
    const matrix = buildEdgeMatrix(4, 4, SEED);
    const a = matrix[1]![2]!;
    const b = matrix[2]![2]!;
    const y = height;

    const aPoints = samplePolyline(
      { x: width, y },
      buildEdgeSegments(
        { start: { x: width, y }, end: { x: 0, y }, normal: { x: 0, y: 1 } },
        a.bottom,
        tabSize,
      ),
    );
    const bPoints = samplePolyline(
      { x: 0, y },
      buildEdgeSegments(
        { start: { x: 0, y }, end: { x: width, y }, normal: { x: 0, y: -1 } },
        b.top,
        tabSize,
      ),
    ).reverse();

    aPoints.forEach((point, index) => {
      expect(point.x).toBeCloseTo(bPoints[index]!.x, 9);
      expect(point.y).toBeCloseTo(bPoints[index]!.y, 9);
    });
  });

  it('sisi rata menghasilkan garis lurus', () => {
    const flat: PieceEdge = { kind: 0, variant: 0, heightScale: 1 };
    const segments = buildEdgeSegments(
      { start: { x: 0, y: 0 }, end: { x: width, y: 0 }, normal: { x: 0, y: -1 } },
      flat,
      tabSize,
    );
    expect(segments).toEqual([{ type: 'L', points: [width, 0] }]);
  });
});

describe('buildPiecePath', () => {
  const layout = createPuzzleLayout(1600, 1200, 48);
  const pieces = generatePieces({ layout, seed: SEED });

  it('dimulai dari sudut kiri-atas kotak potongan', () => {
    const piece = pieces.find((item) => item.id === pieceId(1, 1)) as PuzzlePiece;
    const segments = buildPiecePath({
      edges: piece.edges,
      width: piece.width,
      height: piece.height,
      tabSize: layout.tabSize,
      originX: 10,
      originY: 20,
    });

    expect(segments[0]).toEqual({ type: 'M', points: [10, 20] });
    const last = segments[segments.length - 1]!;
    const endX = last.points[last.points.length - 2];
    const endY = last.points[last.points.length - 1];
    expect(endX).toBeCloseTo(10, 6);
    expect(endY).toBeCloseTo(20, 6);
  });

  it('potongan tepi punya sisi lurus, potongan tengah punya tab', () => {
    const corner = pieces.find((item) => item.id === pieceId(0, 0)) as PuzzlePiece;
    expect(corner.edges.top.kind).toBe(0);
    expect(corner.edges.left.kind).toBe(0);

    const middle = pieces.find((item) => item.id === pieceId(1, 1)) as PuzzlePiece;
    expect(middle.edges.top.kind).not.toBe(0);
    expect(middle.edges.left.kind).not.toBe(0);
  });

  it('padding layout cukup menampung tonjolan tab terbesar', () => {
    for (const piece of pieces) {
      expect(maxEdgeOutset(piece.edges, layout.tabSize)).toBeLessThanOrEqual(layout.padding);
    }
  });

  it('bisa diserialisasi ke path SVG', () => {
    const piece = pieces[5] as PuzzlePiece;
    const svg = segmentsToSvgPath(
      buildPiecePath({
        edges: piece.edges,
        width: piece.width,
        height: piece.height,
        tabSize: layout.tabSize,
      }),
    );
    expect(svg.startsWith('M0 0')).toBe(true);
    expect(svg.endsWith('Z')).toBe(true);
    expect(svg).not.toContain('NaN');
  });
});

describe('generatePieces', () => {
  const layout = createPuzzleLayout(1600, 1200, 100);
  const pieces = generatePieces({ layout, seed: SEED });

  it('menghasilkan sebanyak rows * cols potongan dengan id unik', () => {
    expect(pieces).toHaveLength(layout.grid.pieceCount);
    expect(new Set(pieces.map((piece) => piece.id)).size).toBe(pieces.length);
  });

  it('posisi benar menutupi seluruh papan tanpa celah', () => {
    for (const piece of pieces) {
      expect(piece.correctX).toBeCloseTo(layout.board.x + piece.col * layout.pieceWidth, 6);
      expect(piece.correctY).toBeCloseTo(layout.board.y + piece.row * layout.pieceHeight, 6);
      expect(piece.currentX).toBe(piece.correctX);
      expect(piece.isPlaced).toBe(false);
    }
  });
});
