/**
 * Pembuat id pendek. Tanpa dependency eksternal supaya modul ini aman dipakai
 * dari Next.js maupun dari custom server (tsx/CommonJS).
 */

/** Tanpa 0/O/1/I/l supaya link room mudah dibacakan lewat telepon. */
const ROOM_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomString(alphabet: string, length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function createRoomId(): string {
  return randomString(ROOM_ALPHABET, 7);
}

export function createId(prefix = ''): string {
  return `${prefix}${randomString(ID_ALPHABET, 10)}`;
}

const ROOM_ID_PATTERN = /^[a-z0-9]{4,24}$/;

export function isValidRoomId(value: string): boolean {
  return ROOM_ID_PATTERN.test(value);
}
