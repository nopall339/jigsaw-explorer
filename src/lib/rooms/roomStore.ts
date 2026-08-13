/**
 * Penyimpanan room aktif — in-memory, cukup untuk MVP.
 *
 * Dua hal penting:
 *
 * 1. Map disimpan di `globalThis`. Route handler Next.js dan custom Socket.io
 *    server berjalan dalam satu proses tetapi punya module registry terpisah
 *    (bundle webpack vs modul tsx), jadi `const rooms = new Map()` biasa akan
 *    menghasilkan *dua* store yang berbeda. Lewat `globalThis` keduanya
 *    menunjuk objek yang sama. Ini juga membuat state selamat dari hot reload.
 *
 * 2. Semua akses lewat fungsi di file ini. Kalau nanti pindah ke Redis, cukup
 *    ganti isi fungsi-fungsi ini (bentuknya sudah async-friendly: pemanggil
 *    tidak pernah memegang referensi Map-nya langsung).
 */

import { createId, createRoomId } from '@/lib/ids';
import { computeGrid, createPuzzle, createRandomSeed, piecesToStateMap } from '@/lib/puzzle-engine';
import type {
  ChatMessage,
  PieceStateMap,
  Player,
  PuzzleRoom,
  RoomSnapshot,
  RoomStats,
} from '@/types';
import type { RoomInput } from './validation';

/** Room tanpa aktivitas selama ini akan dibuang. */
export const ROOM_TTL_MS = 12 * 60 * 60 * 1000;

/** Batas kasar supaya memori server tidak tumbuh tanpa henti. */
export const MAX_ROOMS = 500;

/** Batas pemain per room (label cursor jadi tidak terbaca kalau lebih dari ini). */
export const MAX_PLAYERS_PER_ROOM = 8;

/** Riwayat chat yang disimpan per room. */
export const MAX_CHAT_HISTORY = 60;

export interface RoomPlayer extends Player {
  socketId: string;
}

export interface RoomRecord {
  room: PuzzleRoom;
  pieces: PieceStateMap;
  /** playerId -> pemain yang sedang online. */
  players: Map<string, RoomPlayer>;
  chat: ChatMessage[];
  /** Semua nama yang pernah ikut, urut kedatangan (untuk statistik akhir). */
  contributors: Map<string, string>;
  /** Naik satu setiap "acak ulang" — dipakai untuk menurunkan seed sebaran. */
  scatterRound: number;
  lastTouchedAt: number;
}

interface RoomStore {
  rooms: Map<string, RoomRecord>;
  lastPrunedAt: number;
}

const STORE_KEY = '__jigsawExplorerRooms__' as const;

type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: RoomStore };

function store(): RoomStore {
  const scope = globalThis as GlobalWithStore;
  let existing = scope[STORE_KEY];
  if (!existing) {
    existing = { rooms: new Map(), lastPrunedAt: nowMs() };
    scope[STORE_KEY] = existing;
  }
  return existing;
}

function nowMs(): number {
  return Date.now();
}

function nowIso(): string {
  return new Date().toISOString();
}

// ------------------------------------------------------------------ housekeeping

/** Buang room kadaluarsa; dipanggil otomatis dari `createRoom`. */
export function pruneStaleRooms(): number {
  const state = store();
  const cutoff = nowMs() - ROOM_TTL_MS;
  let removed = 0;

  for (const [id, record] of state.rooms) {
    if (record.lastTouchedAt < cutoff) {
      state.rooms.delete(id);
      removed += 1;
    }
  }

  // Masih penuh? Buang yang paling lama tidak disentuh.
  if (state.rooms.size >= MAX_ROOMS) {
    const byAge = [...state.rooms.entries()].sort(
      (a, b) => a[1].lastTouchedAt - b[1].lastTouchedAt,
    );
    const excess = state.rooms.size - MAX_ROOMS + 1;
    for (const [id] of byAge.slice(0, excess)) {
      state.rooms.delete(id);
      removed += 1;
    }
  }

  state.lastPrunedAt = nowMs();
  return removed;
}

export function roomCount(): number {
  return store().rooms.size;
}

function unusedRoomId(): string {
  const { rooms } = store();
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const id = createRoomId();
    if (!rooms.has(id)) return id;
  }
  // Praktis tidak pernah terjadi (31^7 kemungkinan); tetap sediakan jalan keluar.
  return `${createRoomId()}${createId().slice(0, 3)}`;
}

// ------------------------------------------------------------------------ CRUD

export interface CreateRoomOptions extends RoomInput {
  imageWidth: number;
  imageHeight: number;
  /** Untuk pengujian — biasanya dibiarkan supaya acak. */
  seed?: number;
}

export function createRoom(options: CreateRoomOptions): RoomRecord {
  pruneStaleRooms();

  const grid = computeGrid(options.imageWidth, options.imageHeight, options.requestedPieceCount);

  const room: PuzzleRoom = {
    id: unusedRoomId(),
    createdAt: nowIso(),
    startedAt: null,
    completedAt: null,
    isCompleted: false,
    imageUrl: options.imageUrl,
    imageWidth: options.imageWidth,
    imageHeight: options.imageHeight,
    imageTitle: options.imageTitle,
    imageSource: options.imageSource,
    requestedPieceCount: options.requestedPieceCount,
    gridRows: grid.rows,
    gridCols: grid.cols,
    pieceCount: grid.pieceCount,
    seed: options.seed ?? createRandomSeed(),
    allowRotation: options.allowRotation,
  };

  const { pieces } = createPuzzle(room, { scatter: true, scatterRound: 0 });

  const record: RoomRecord = {
    room,
    pieces: piecesToStateMap(pieces),
    players: new Map(),
    chat: [],
    contributors: new Map(),
    scatterRound: 0,
    lastTouchedAt: nowMs(),
  };

  store().rooms.set(room.id, record);
  return record;
}

export function getRoomRecord(roomId: string): RoomRecord | null {
  const record = store().rooms.get(roomId);
  if (!record) return null;
  if (record.lastTouchedAt < nowMs() - ROOM_TTL_MS) {
    store().rooms.delete(roomId);
    return null;
  }
  return record;
}

export function getRoom(roomId: string): PuzzleRoom | null {
  return getRoomRecord(roomId)?.room ?? null;
}

export function deleteRoom(roomId: string): boolean {
  return store().rooms.delete(roomId);
}

export function touchRoom(record: RoomRecord): void {
  record.lastTouchedAt = nowMs();
}

/** Sebar ulang semua potongan yang belum terpasang dengan seed baru. */
export function reshuffleRoom(record: RoomRecord): PieceStateMap {
  record.scatterRound += 1;

  const { pieces } = createPuzzle(record.room, {
    scatter: true,
    scatterRound: record.scatterRound,
  });

  const next: PieceStateMap = {};
  for (const piece of pieces) {
    const current = record.pieces[piece.id];
    // Potongan yang sudah benar tidak diganggu.
    next[piece.id] =
      current && current.isPlaced
        ? { ...current, lockedBy: null }
        : {
            x: piece.currentX,
            y: piece.currentY,
            rotation: piece.rotation,
            isPlaced: false,
            z: piece.z,
            lockedBy: null,
          };
  }

  record.pieces = next;
  touchRoom(record);
  return next;
}

// --------------------------------------------------------------------- snapshot

export function roomSnapshot(record: RoomRecord): RoomSnapshot {
  return {
    room: { ...record.room },
    pieces: record.pieces,
    players: [...record.players.values()].map(({ socketId: _socketId, ...player }) => player),
    chat: record.chat.slice(-MAX_CHAT_HISTORY),
    contributors: [...record.contributors.values()],
    serverTime: nowIso(),
  };
}

export function roomStats(record: RoomRecord): RoomStats {
  const { startedAt, completedAt } = record.room;
  const startMs = startedAt ? Date.parse(startedAt) : Date.parse(record.room.createdAt);
  const endMs = completedAt ? Date.parse(completedAt) : nowMs();

  return {
    durationMs: Math.max(0, endMs - startMs),
    playerCount: record.contributors.size,
    playerNames: [...record.contributors.values()],
    pieceCount: record.room.pieceCount,
  };
}

/** Progres potongan yang sudah terpasang (dihitung dari state milik server). */
export function roomProgress(record: RoomRecord): { placed: number; total: number } {
  let placed = 0;
  let total = 0;
  for (const state of Object.values(record.pieces)) {
    total += 1;
    if (state.isPlaced) placed += 1;
  }
  return { placed, total };
}
