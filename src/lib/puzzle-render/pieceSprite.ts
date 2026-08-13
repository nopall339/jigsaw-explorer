/**
 * Rasterisasi potongan puzzle ke canvas kecil (sprite).
 *
 * Ini satu-satunya tempat di aplikasi yang benar-benar menggambar potongan.
 * Papan (`PuzzleBoard`) hanya memindahkan sprite; state potongan diurus
 * `usePuzzleState`. Pemisahan ini disengaja: render, state, dan geometri tidak
 * saling tahu.
 */

import { buildPiecePath, tracePath } from '@/lib/puzzle-engine/jigsawPath';
import type { PuzzleLayout, PuzzlePiece } from '@/types';
import { computeSpriteScale, spriteCanvasSize, spriteSizeInWorld } from './spriteMath';

/** Sumber gambar apa pun yang bisa dipakai `drawImage`. */
export type DrawableImage = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

export interface PieceSpriteSet {
  /** pieceId -> canvas hasil rasterisasi. */
  byId: Map<string, HTMLCanvasElement>;
  /** Ukuran sprite dalam world unit (sama untuk semua potongan). */
  spriteWidth: number;
  spriteHeight: number;
  /** Jarak dari tepi sprite ke kotak potongan, world unit (= layout.padding). */
  padding: number;
  /** Pixel per world unit yang dipakai saat merasterisasi. */
  scale: number;
}

export type CanvasFactory = (width: number, height: number) => HTMLCanvasElement;

const defaultCanvasFactory: CanvasFactory = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

// ------------------------------------------------------------------ satu potongan

export interface DrawPieceSpriteOptions {
  piece: PuzzlePiece;
  layout: PuzzleLayout;
  image: DrawableImage;
  /** Ukuran gambar sumber (natural size), untuk memetakan ke ukuran papan. */
  imageWidth: number;
  imageHeight: number;
  scale: number;
}

/**
 * Gambar satu potongan ke context yang sudah disiapkan.
 *
 * Alur: skala ke world unit -> geser supaya sudut kiri-atas kotak potongan ada
 * di (padding, padding) -> clip dengan kontur jigsaw -> gambar **seluruh** papan
 * dengan offset negatif, sehingga hanya bagian milik potongan ini yang tersisa.
 */
export function drawPieceSprite(
  ctx: CanvasRenderingContext2D,
  { piece, layout, image, imageWidth, imageHeight, scale }: DrawPieceSpriteOptions,
): void {
  const { board, tabSize, padding } = layout;

  const path = buildPiecePath({
    edges: piece.edges,
    width: piece.width,
    height: piece.height,
    tabSize,
    originX: 0,
    originY: 0,
  });

  // Posisi potongan ini di dalam gambar utuh (world unit, relatif sudut papan).
  const offsetX = piece.correctX - board.x;
  const offsetY = piece.correctY - board.y;

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.translate(padding, padding);

  // ------ isi potongan
  ctx.save();
  tracePath(ctx, path);
  ctx.clip();
  ctx.drawImage(image, 0, 0, imageWidth, imageHeight, -offsetX, -offsetY, board.width, board.height);

  // Bevel: highlight tipis dari arah kiri-atas + bayangan dari kanan-bawah.
  // Keduanya masih di dalam clip, jadi hanya sisi dalam potongan yang kena.
  const bevel = Math.max(0.6, tabSize * 0.14);

  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = bevel * 1.4;
  ctx.save();
  ctx.translate(bevel * 0.55, bevel * 0.55);
  tracePath(ctx, path);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = 'rgba(0,0,0,0.42)';
  ctx.lineWidth = bevel * 1.6;
  ctx.save();
  ctx.translate(-bevel * 0.5, -bevel * 0.5);
  tracePath(ctx, path);
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // buka clip

  // ------ garis tepi supaya potongan tetap terbaca di atas papan gelap
  tracePath(ctx, path);
  ctx.lineWidth = Math.max(0.5, bevel * 0.55);
  ctx.strokeStyle = 'rgba(9,12,19,0.55)';
  ctx.stroke();

  ctx.restore();
}

export interface BuildPieceSpritesOptions {
  pieces: readonly PuzzlePiece[];
  layout: PuzzleLayout;
  image: DrawableImage;
  imageWidth: number;
  imageHeight: number;
  /** Kosongkan untuk memakai `computeSpriteScale`. */
  scale?: number;
  devicePixelRatio?: number;
  createCanvas?: CanvasFactory;
}

/** Versi sinkron — dipakai kalau jumlah potongan kecil atau di dalam test. */
export function buildPieceSpritesSync(options: BuildPieceSpritesOptions): PieceSpriteSet {
  const { pieces, layout } = options;
  const scale = options.scale ?? computeSpriteScale(layout, options.devicePixelRatio ?? 1);
  const createCanvas = options.createCanvas ?? defaultCanvasFactory;
  const canvasSize = spriteCanvasSize(layout, scale);
  const worldSize = spriteSizeInWorld(layout);

  const byId = new Map<string, HTMLCanvasElement>();
  for (const piece of pieces) {
    byId.set(piece.id, renderOne(piece, options, scale, canvasSize, createCanvas));
  }

  return {
    byId,
    spriteWidth: worldSize.width,
    spriteHeight: worldSize.height,
    padding: layout.padding,
    scale,
  };
}

function renderOne(
  piece: PuzzlePiece,
  options: BuildPieceSpritesOptions,
  scale: number,
  canvasSize: { width: number; height: number },
  createCanvas: CanvasFactory,
): HTMLCanvasElement {
  const canvas = createCanvas(canvasSize.width, canvasSize.height);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawPieceSprite(ctx, {
      piece,
      layout: options.layout,
      image: options.image,
      imageWidth: options.imageWidth,
      imageHeight: options.imageHeight,
      scale,
    });
  }
  return canvas;
}

export interface BuildPieceSpritesAsyncOptions extends BuildPieceSpritesOptions {
  /** Potongan per batch sebelum melepas kendali ke browser. */
  chunkSize?: number;
  onProgress?: (done: number, total: number) => void;
  /** Dipanggil sebelum tiap batch; kembalikan `true` untuk membatalkan. */
  shouldCancel?: () => boolean;
}

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });

/**
 * Versi bertahap: merasterisasi 500 potongan sekaligus membekukan tab selama
 * ratusan milidetik. Dipecah per batch supaya indikator "menyiapkan potongan"
 * tetap bergerak dan tab tidak terasa hang.
 *
 * Melempar `SpriteBuildCancelled` kalau `shouldCancel()` mengembalikan `true`
 * (mis. pemain keluar halaman di tengah proses).
 */
export async function buildPieceSprites(
  options: BuildPieceSpritesAsyncOptions,
): Promise<PieceSpriteSet> {
  const { pieces, layout, chunkSize = 24, onProgress, shouldCancel } = options;
  const scale = options.scale ?? computeSpriteScale(layout, options.devicePixelRatio ?? 1);
  const createCanvas = options.createCanvas ?? defaultCanvasFactory;
  const canvasSize = spriteCanvasSize(layout, scale);
  const worldSize = spriteSizeInWorld(layout);

  const byId = new Map<string, HTMLCanvasElement>();
  const total = pieces.length;

  for (let index = 0; index < total; index += 1) {
    if (index > 0 && index % chunkSize === 0) {
      onProgress?.(index, total);
      await nextFrame();
      if (shouldCancel?.()) throw new SpriteBuildCancelled();
    }

    const piece = pieces[index];
    if (piece) byId.set(piece.id, renderOne(piece, options, scale, canvasSize, createCanvas));
  }

  onProgress?.(total, total);

  return {
    byId,
    spriteWidth: worldSize.width,
    spriteHeight: worldSize.height,
    padding: layout.padding,
    scale,
  };
}

export class SpriteBuildCancelled extends Error {
  constructor() {
    super('Pembuatan sprite dibatalkan.');
    this.name = 'SpriteBuildCancelled';
  }
}
