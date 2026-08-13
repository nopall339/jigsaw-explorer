'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyPieceStates,
  computeProgress,
  createPuzzle,
  normalizeRotation,
  resolveDrop,
  type PuzzleProgress,
} from '@/lib/puzzle-engine';
import type {
  PieceState,
  PieceStateMap,
  PuzzleLayout,
  PuzzlePiece,
  PuzzleSpec,
} from '@/types';

/**
 * State seluruh potongan di sisi client.
 *
 * Yang *tidak* ada di sini, dengan sengaja:
 * - render / canvas (lihat `src/lib/puzzle-render`),
 * - socket (lihat `useRoomSocket`).
 *
 * Hook ini hanya mengurus "papan siapa memegang apa dan di mana", dan selalu
 * memakai fungsi murni dari `puzzle-engine` untuk snapping supaya keputusan
 * client identik dengan keputusan server.
 */

export interface UsePuzzleStateOptions {
  spec: PuzzleSpec;
  /** State awal dari server. Kalau null, potongan disebar dari seed room. */
  initialPieces?: PieceStateMap | null;
  /** Ronde sebaran awal (dipakai server saat room sudah pernah di-reset). */
  initialScatterRound?: number;
}

export interface DropOutcome {
  x: number;
  y: number;
  rotation: number;
  isPlaced: boolean;
  z: number;
  /** true kalau potongan baru saja terpasang di panggilan ini. */
  justPlaced: boolean;
}

export interface PuzzleStateApi {
  layout: PuzzleLayout;
  pieces: PuzzlePiece[];
  progress: PuzzleProgress;
  /** Potongan menurut id — pencarian O(1) untuk handler drag. */
  getPiece: (pieceId: string) => PuzzlePiece | undefined;

  /** Angkat potongan ke tumpukan paling atas. `null` kalau tidak boleh diangkat. */
  grab: (pieceId: string) => PuzzlePiece | null;
  /** Lepas potongan; menerapkan snap lewat `resolveDrop`. */
  drop: (pieceId: string, x: number, y: number, rotation?: number) => DropOutcome | null;
  rotate: (pieceId: string, deltaDeg: number) => DropOutcome | null;
  /** Sebar ulang potongan yang belum terpasang. */
  reshuffle: (round: number) => void;

  // ---- dari server
  applyStates: (states: PieceStateMap) => void;
  applyRemote: (pieceId: string, patch: Partial<PieceState>) => void;
  setLock: (pieceId: string, playerId: string | null) => void;
  clearLocksOf: (playerId: string) => void;
}

function patchPiece(piece: PuzzlePiece, patch: Partial<PieceState>): PuzzlePiece {
  return {
    ...piece,
    currentX: patch.x ?? piece.currentX,
    currentY: patch.y ?? piece.currentY,
    rotation: patch.rotation ?? piece.rotation,
    isPlaced: patch.isPlaced ?? piece.isPlaced,
    z: patch.z ?? piece.z,
    lockedByPlayerId: patch.lockedBy !== undefined ? patch.lockedBy : piece.lockedByPlayerId,
  };
}

function highestZ(pieces: readonly PuzzlePiece[]): number {
  let max = 0;
  for (const piece of pieces) if (piece.z > max) max = piece.z;
  return max;
}

export function usePuzzleState({
  spec,
  initialPieces = null,
  initialScatterRound = 0,
}: UsePuzzleStateOptions): PuzzleStateApi {
  // Geometri & bentuk potongan sepenuhnya turunan dari spec — dihitung sekali.
  const base = useMemo(
    () => createPuzzle(spec, { scatter: true, scatterRound: initialScatterRound }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      spec.imageWidth,
      spec.imageHeight,
      spec.requestedPieceCount,
      spec.gridRows,
      spec.gridCols,
      spec.seed,
      spec.allowRotation,
      initialScatterRound,
    ],
  );

  const [pieces, setPieces] = useState<PuzzlePiece[]>(() =>
    initialPieces ? applyPieceStates(base.pieces, initialPieces) : base.pieces,
  );

  // Papan baru (mis. pindah room) — mulai dari sebaran awalnya.
  const baseRef = useRef(base);
  useEffect(() => {
    if (baseRef.current === base) return;
    baseRef.current = base;
    setPieces(base.pieces);
  }, [base]);

  const byId = useMemo(() => {
    const map = new Map<string, PuzzlePiece>();
    for (const piece of pieces) map.set(piece.id, piece);
    return map;
  }, [pieces]);

  const byIdRef = useRef(byId);
  byIdRef.current = byId;

  const topZRef = useRef(highestZ(pieces));

  // ---------------------------------------------------------------- batching
  // Pergerakan pemain lain bisa datang ~20x/detik per potongan. Tanpa
  // digabungkan, tiap paket memicu satu render. Dikumpulkan per frame saja.
  const queueRef = useRef<Map<string, Partial<PieceState>> | null>(null);
  const frameRef = useRef<number | null>(null);

  const flushQueue = useCallback(() => {
    frameRef.current = null;
    const queue = queueRef.current;
    queueRef.current = null;
    if (!queue || queue.size === 0) return;

    setPieces((previous) =>
      previous.map((piece) => {
        const patch = queue.get(piece.id);
        return patch ? patchPiece(piece, patch) : piece;
      }),
    );

    for (const patch of queue.values()) {
      if (patch.z !== undefined && patch.z > topZRef.current) topZRef.current = patch.z;
    }
  }, []);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const enqueue = useCallback(
    (pieceId: string, patch: Partial<PieceState>) => {
      const queue = queueRef.current ?? new Map<string, Partial<PieceState>>();
      queueRef.current = queue;
      queue.set(pieceId, { ...queue.get(pieceId), ...patch });

      if (frameRef.current === null) {
        frameRef.current =
          typeof requestAnimationFrame === 'function'
            ? requestAnimationFrame(flushQueue)
            : (setTimeout(flushQueue, 16) as unknown as number);
      }
    },
    [flushQueue],
  );

  /** Aksi lokal menang atas paket server yang masih menunggu untuk potongan itu. */
  const dropPending = useCallback((pieceId: string) => {
    queueRef.current?.delete(pieceId);
  }, []);

  const updateOne = useCallback(
    (pieceId: string, patch: Partial<PieceState>) => {
      dropPending(pieceId);
      setPieces((previous) =>
        previous.map((piece) => (piece.id === pieceId ? patchPiece(piece, patch) : piece)),
      );
    },
    [dropPending],
  );

  // ------------------------------------------------------------- aksi lokal

  const getPiece = useCallback((pieceId: string) => byIdRef.current.get(pieceId), []);

  const grab = useCallback(
    (pieceId: string): PuzzlePiece | null => {
      const piece = byIdRef.current.get(pieceId);
      if (!piece || piece.isPlaced) return null;

      topZRef.current += 1;
      const z = topZRef.current;
      updateOne(pieceId, { z });
      return { ...piece, z };
    },
    [updateOne],
  );

  const drop = useCallback(
    (pieceId: string, x: number, y: number, rotation?: number): DropOutcome | null => {
      const piece = byIdRef.current.get(pieceId);
      if (!piece) return null;

      const result = resolveDrop({
        piece,
        x,
        y,
        rotation: rotation ?? piece.rotation,
        tolerance: base.layout.snapTolerance,
      });

      const z = result.isPlaced ? piece.z : topZRef.current;
      updateOne(pieceId, { ...result, z, lockedBy: null });

      return { ...result, z, justPlaced: result.isPlaced && !piece.isPlaced };
    },
    [base.layout.snapTolerance, updateOne],
  );

  /**
   * Putar potongan. Kalau setelah diputar posisinya sudah pas dan sudutnya lurus,
   * potongan langsung terpasang — memutar potongan yang sudah "di tempatnya"
   * terasa seperti mengunci, bukan harus diangkat lagi.
   */
  const rotate = useCallback(
    (pieceId: string, deltaDeg: number): DropOutcome | null => {
      const piece = byIdRef.current.get(pieceId);
      if (!piece || piece.isPlaced) return null;

      const rotation = normalizeRotation(piece.rotation + deltaDeg);
      return drop(pieceId, piece.currentX, piece.currentY, rotation);
    },
    [drop],
  );

  /**
   * Sebar ulang. Sengaja memakai jalur yang sama dengan `reshuffleRoom` di
   * server (sebar penuh dari seed ronde, lalu potongan yang sudah benar
   * dikembalikan) supaya hasil optimistis di client identik dengan server.
   */
  const reshuffle = useCallback(
    (round: number) => {
      const fresh = createPuzzle(spec, { scatter: true, scatterRound: round });
      queueRef.current = null;

      setPieces((previous) => {
        const currentById = new Map(previous.map((piece) => [piece.id, piece]));
        return fresh.pieces.map((piece) => {
          const current = currentById.get(piece.id);
          if (current?.isPlaced) return { ...current, lockedByPlayerId: null };
          return piece;
        });
      });

      topZRef.current = highestZ(fresh.pieces);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      spec.imageWidth,
      spec.imageHeight,
      spec.requestedPieceCount,
      spec.gridRows,
      spec.gridCols,
      spec.seed,
      spec.allowRotation,
    ],
  );

  // ----------------------------------------------------------- dari server

  const applyStates = useCallback(
    (states: PieceStateMap) => {
      queueRef.current = null;
      const next = applyPieceStates(base.pieces, states);
      topZRef.current = highestZ(next);
      setPieces(next);
    },
    [base.pieces],
  );

  const applyRemote = useCallback(
    (pieceId: string, patch: Partial<PieceState>) => enqueue(pieceId, patch),
    [enqueue],
  );

  const setLock = useCallback(
    (pieceId: string, playerId: string | null) => enqueue(pieceId, { lockedBy: playerId }),
    [enqueue],
  );

  const clearLocksOf = useCallback((playerId: string) => {
    setPieces((previous) =>
      previous.map((piece) =>
        piece.lockedByPlayerId === playerId ? { ...piece, lockedByPlayerId: null } : piece,
      ),
    );
  }, []);

  const progress = useMemo(() => computeProgress(pieces), [pieces]);

  return {
    layout: base.layout,
    pieces,
    progress,
    getPiece,
    grab,
    drop,
    rotate,
    reshuffle,
    applyStates,
    applyRemote,
    setLock,
    clearLocksOf,
  };
}

export type { PuzzleProgress };
