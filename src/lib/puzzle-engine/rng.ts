/**
 * PRNG deterministik.
 *
 * Semua keacakan puzzle (bentuk tab, posisi awal potongan) harus reproducible:
 * server hanya mengirim `seed`, lalu setiap client menghasilkan papan yang identik.
 * Karena itu jangan pernah pakai `Math.random()` di dalam puzzle-engine.
 */

export interface Rng {
  /** Float acak di [0, 1). */
  next(): number;
  /** Float acak di [min, max). */
  range(min: number, max: number): number;
  /** Integer acak di [min, max] (inklusif). */
  int(min: number, max: number): number;
  /** true dengan probabilitas `p`. */
  chance(p: number): boolean;
  /** Ambil satu elemen acak. */
  pick<T>(items: readonly T[]): T;
}

/** Mulberry32 — kecil, cepat, dan cukup baik untuk keperluan visual. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)] as never,
  };
}

/** Hash string -> uint32 (FNV-1a). Dipakai untuk seed per-seam. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Gabungkan seed room dengan kunci lokal (mis. nama seam) jadi seed baru. */
export function deriveSeed(seed: number, key: string): number {
  return (hashString(key) ^ Math.imul(seed >>> 0, 0x9e3779b1)) >>> 0;
}

/** Fisher-Yates deterministik. Tidak memodifikasi array input. */
export function shuffleArray<T>(items: readonly T[], rng: Rng): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = result[i] as T;
    result[i] = result[j] as T;
    result[j] = a;
  }
  return result;
}

/** Seed acak untuk room baru (di luar engine, jadi boleh pakai Math.random). */
export function createRandomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
