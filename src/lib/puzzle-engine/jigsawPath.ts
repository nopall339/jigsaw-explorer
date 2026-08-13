import type { PieceEdge, PieceEdges, Point } from '@/types';

/**
 * Pembentuk kontur potongan jigsaw klasik (tab & blank yang saling mengunci).
 *
 * Semuanya logic murni: hanya menghasilkan daftar segmen path (moveTo / lineTo /
 * bezierCurveTo) dalam koordinat lokal. Yang menggambar ke canvas ada di
 * `src/lib/puzzle-render`.
 *
 * KUNCI INTERLOCK: profil tab dibuat simetris terhadap u = 0.5. Dua potongan
 * bertetangga menyusuri seam yang sama dari arah berlawanan dengan `kind` yang
 * berlawanan; karena profilnya simetris, kedua kurva jatuh tepat di tempat yang
 * sama sehingga tidak ada celah maupun tumpang tindih.
 */

export type PathSegment =
  | { type: 'M'; points: [number, number] }
  | { type: 'L'; points: [number, number] }
  | { type: 'C'; points: [number, number, number, number, number, number] };

/**
 * Parameter bentuk tab, dalam koordinat ternormalisasi:
 * `u` = 0..1 sepanjang sisi, `v` = tinggi ke arah luar (satuan tinggi tab).
 */
export interface TabProfile {
  /** u tempat bagian rata berakhir (pundak). */
  shoulder: number;
  /** u tempat leher tab (bagian terpencet). */
  neck: number;
  /** v di leher. */
  neckV: number;
  /** Setengah lebar titik kontrol kepala tab, diukur dari u = 0.5. */
  headSpread: number;
  /** v titik kontrol kepala tab. */
  headV: number;
}

/** Beberapa varian bentuk supaya potongan tidak terlihat seragam. */
export const TAB_PROFILES: readonly TabProfile[] = [
  { shoulder: 0.37, neck: 0.435, neckV: 0.42, headSpread: 0.145, headV: 1.18 },
  { shoulder: 0.33, neck: 0.42, neckV: 0.35, headSpread: 0.185, headV: 1.12 },
  { shoulder: 0.4, neck: 0.455, neckV: 0.48, headSpread: 0.12, headV: 1.24 },
];

export function getTabProfile(variant: number): TabProfile {
  const list = TAB_PROFILES;
  const index = ((Math.trunc(variant) % list.length) + list.length) % list.length;
  return list[index] as TabProfile;
}

type Cubic = [number, number, number, number, number, number];

/**
 * Lima kurva kubik dalam ruang (u, v), dari (0,0) ke (1,0).
 * Dibangun dari parameter profil sehingga simetri terhadap u = 0.5 terjamin.
 */
export function profileCurves(profile: TabProfile): Cubic[] {
  const { shoulder: s, neck: n, neckV: nv, headSpread: hs, headV: hv } = profile;
  const neckRun = n - s;

  return [
    [s * 0.6, 0, s * 0.85, 0, s, 0],
    [s + neckRun * 0.55, 0.03, n - neckRun * 0.9, nv * 0.72, n, nv],
    [0.5 - hs, hv, 0.5 + hs, hv, 1 - n, nv],
    [1 - n + neckRun * 0.9, nv * 0.72, 1 - s - neckRun * 0.55, 0.03, 1 - s, 0],
    [1 - s * 0.85, 0, 1 - s * 0.6, 0, 1, 0],
  ];
}

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

/** Tinggi maksimum tab (dalam satuan tinggi tab) untuk sebuah varian. */
export function profilePeakV(variant: number): number {
  const profile = getTabProfile(variant);
  const head = profileCurves(profile)[2] as Cubic;
  const startV = profile.neckV;
  let peak = startV;
  for (let i = 0; i <= 24; i += 1) {
    const v = cubicAt(startV, head[1], head[3], head[5], i / 24);
    if (v > peak) peak = v;
  }
  return peak;
}

/** Seberapa jauh sisi ini menonjol ke luar kotak potongan (world unit). */
export function edgeOutset(edge: PieceEdge, tabSize: number): number {
  if (edge.kind === 0) return 0;
  return profilePeakV(edge.variant) * edge.heightScale * tabSize;
}

/** Tonjolan terbesar dari keempat sisi — dipakai untuk menghitung padding sprite. */
export function maxEdgeOutset(edges: PieceEdges, tabSize: number): number {
  return Math.max(
    edgeOutset(edges.top, tabSize),
    edgeOutset(edges.right, tabSize),
    edgeOutset(edges.bottom, tabSize),
    edgeOutset(edges.left, tabSize),
  );
}

interface EdgeGeometry {
  start: Point;
  end: Point;
  /** Normal satuan yang mengarah ke luar potongan. */
  normal: Point;
}

/**
 * Segmen-segmen untuk satu sisi (tanpa `M` — diasumsikan kursor sudah di `start`).
 */
export function buildEdgeSegments(
  geometry: EdgeGeometry,
  edge: PieceEdge,
  tabSize: number,
): PathSegment[] {
  const { start, end, normal } = geometry;

  if (edge.kind === 0) {
    return [{ type: 'L', points: [end.x, end.y] }];
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const alongX = dx / length;
  const alongY = dy / length;

  // kind: +1 tab menonjol keluar, -1 cekungan ke dalam.
  const depth = tabSize * edge.heightScale * edge.kind;

  const toPoint = (u: number, v: number): [number, number] => [
    start.x + alongX * u * length + normal.x * v * depth,
    start.y + alongY * u * length + normal.y * v * depth,
  ];

  return profileCurves(getTabProfile(edge.variant)).map((curve) => {
    const [c1x, c1y] = toPoint(curve[0], curve[1]);
    const [c2x, c2y] = toPoint(curve[2], curve[3]);
    const [ex, ey] = toPoint(curve[4], curve[5]);
    return { type: 'C', points: [c1x, c1y, c2x, c2y, ex, ey] } satisfies PathSegment;
  });
}

export interface BuildPiecePathOptions {
  edges: PieceEdges;
  /** Ukuran kotak potongan tanpa tab. */
  width: number;
  height: number;
  tabSize: number;
  /** Posisi sudut kiri-atas kotak potongan pada koordinat keluaran. */
  originX?: number;
  originY?: number;
}

/**
 * Kontur tertutup satu potongan: atas (kiri->kanan), kanan (atas->bawah),
 * bawah (kanan->kiri), kiri (bawah->atas).
 */
export function buildPiecePath({
  edges,
  width,
  height,
  tabSize,
  originX = 0,
  originY = 0,
}: BuildPiecePathOptions): PathSegment[] {
  const x0 = originX;
  const y0 = originY;
  const x1 = originX + width;
  const y1 = originY + height;

  const segments: PathSegment[] = [{ type: 'M', points: [x0, y0] }];

  segments.push(
    ...buildEdgeSegments(
      { start: { x: x0, y: y0 }, end: { x: x1, y: y0 }, normal: { x: 0, y: -1 } },
      edges.top,
      tabSize,
    ),
    ...buildEdgeSegments(
      { start: { x: x1, y: y0 }, end: { x: x1, y: y1 }, normal: { x: 1, y: 0 } },
      edges.right,
      tabSize,
    ),
    ...buildEdgeSegments(
      { start: { x: x1, y: y1 }, end: { x: x0, y: y1 }, normal: { x: 0, y: 1 } },
      edges.bottom,
      tabSize,
    ),
    ...buildEdgeSegments(
      { start: { x: x0, y: y1 }, end: { x: x0, y: y0 }, normal: { x: -1, y: 0 } },
      edges.left,
      tabSize,
    ),
  );

  return segments;
}

/** Interface minimal (CanvasRenderingContext2D & Konva.Context memenuhinya). */
export interface PathSink {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void;
  closePath(): void;
}

/** Jalankan daftar segmen ke sebuah context canvas. */
export function tracePath(sink: PathSink, segments: readonly PathSegment[]): void {
  sink.beginPath();
  for (const segment of segments) {
    if (segment.type === 'M') {
      sink.moveTo(segment.points[0], segment.points[1]);
    } else if (segment.type === 'L') {
      sink.lineTo(segment.points[0], segment.points[1]);
    } else {
      const [c1x, c1y, c2x, c2y, x, y] = segment.points;
      sink.bezierCurveTo(c1x, c1y, c2x, c2y, x, y);
    }
  }
  sink.closePath();
}

const round = (value: number): string => (Math.round(value * 100) / 100).toString();

/** Versi string SVG — berguna untuk debug & Konva.Path. */
export function segmentsToSvgPath(segments: readonly PathSegment[]): string {
  const parts = segments.map((segment) => `${segment.type}${segment.points.map(round).join(' ')}`);
  return `${parts.join(' ')} Z`;
}
