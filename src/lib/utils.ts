import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** 125_000 -> "2:05", 3_725_000 -> "1:02:05" */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Warna cursor/label pemain — dipilih supaya kontras di atas papan gelap. */
export const PLAYER_COLORS = [
  '#f0a44a',
  '#5ad1b0',
  '#7aa2f7',
  '#f78ca2',
  '#c8a2f7',
  '#9ed36a',
  '#f7d76a',
  '#6ad0f7',
] as const;

const NAME_ADJECTIVES = [
  'Rajin',
  'Jeli',
  'Sabar',
  'Cepat',
  'Tenang',
  'Ceria',
  'Cermat',
  'Gesit',
] as const;

const NAME_NOUNS = ['Elang', 'Rusa', 'Koi', 'Kupu', 'Kelinci', 'Panda', 'Berang', 'Merpati'] as const;

export function randomPlayerName(): string {
  const adjective = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
  const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
  return `${noun} ${adjective}`;
}

export function randomPlayerColor(): string {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)] as string;
}

/** Warna stabil dari sebuah id (dipakai kalau pemain tidak punya warna). */
export function colorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PLAYER_COLORS[hash % PLAYER_COLORS.length] as string;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Batasi frekuensi pemanggilan (untuk broadcast posisi lewat socket). */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): ((...args: Args) => void) & { flush(): void; cancel(): void } {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Args | null = null;

  const invoke = (args: Args) => {
    lastCall = Date.now();
    pending = null;
    fn(...args);
  };

  const throttled = (...args: Args) => {
    const now = Date.now();
    const remaining = waitMs - (now - lastCall);
    pending = args;

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      invoke(args);
      return;
    }

    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        if (pending) invoke(pending);
      }, remaining);
    }
  };

  throttled.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending) invoke(pending);
  };

  throttled.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pending = null;
  };

  return throttled;
}
