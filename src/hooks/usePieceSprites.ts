'use client';

import { useEffect, useRef, useState } from 'react';
import {
  buildPieceSprites,
  drawableSize,
  loadImageElement,
  SpriteBuildCancelled,
  type PieceSpriteSet,
} from '@/lib/puzzle-render';
import type { PuzzleLayout, PuzzlePiece } from '@/types';

export type SpriteStatus = 'loading' | 'ready' | 'error';

export interface UsePieceSpritesOptions {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  /** Seed room — ikut menentukan bentuk tab, jadi bagian dari identitas sprite. */
  seed: number;
  layout: PuzzleLayout;
  pieces: readonly PuzzlePiece[];
}

export interface UsePieceSpritesResult {
  sprites: PieceSpriteSet | null;
  status: SpriteStatus;
  /** 0..1 — kemajuan rasterisasi, untuk layar "menyiapkan potongan". */
  progress: number;
  error: string | null;
}

/**
 * Muat gambar lalu rasterisasi semua potongan sekali saja.
 *
 * Sengaja **tidak** ikut berubah saat potongan digerakkan: sprite hanya
 * bergantung pada geometri (gambar + seed + layout), bukan pada posisi. Karena
 * itu `pieces` dibaca lewat ref dan tidak masuk ke daftar dependensi.
 */
export function usePieceSprites({
  imageUrl,
  imageWidth,
  imageHeight,
  seed,
  layout,
  pieces,
}: UsePieceSpritesOptions): UsePieceSpritesResult {
  const [result, setResult] = useState<UsePieceSpritesResult>({
    sprites: null,
    status: 'loading',
    progress: 0,
    error: null,
  });

  // Ref supaya perubahan posisi potongan tidak memicu rasterisasi ulang.
  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;

  useEffect(() => {
    let cancelled = false;
    setResult({ sprites: null, status: 'loading', progress: 0, error: null });

    (async () => {
      try {
        const image = await loadImageElement(imageUrl);
        if (cancelled) return;

        const natural = drawableSize(image, imageWidth, imageHeight);

        const sprites = await buildPieceSprites({
          pieces: piecesRef.current,
          layout,
          image,
          imageWidth: natural.width,
          imageHeight: natural.height,
          devicePixelRatio: typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
          onProgress: (done, total) => {
            if (!cancelled) {
              setResult((previous) => ({ ...previous, progress: total === 0 ? 1 : done / total }));
            }
          },
          shouldCancel: () => cancelled,
        });

        if (cancelled) return;
        setResult({ sprites, status: 'ready', progress: 1, error: null });
      } catch (error) {
        if (cancelled || error instanceof SpriteBuildCancelled) return;
        setResult({
          sprites: null,
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Gambar puzzle gagal disiapkan.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageUrl, imageWidth, imageHeight, seed, layout]);

  return result;
}
