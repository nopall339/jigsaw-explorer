/**
 * Pembaca header gambar — fungsi murni, tanpa dependency & tanpa akses disk.
 *
 * Dipakai server untuk menentukan ukuran gambar **dari byte aslinya**, bukan dari
 * angka yang dikirim client. Selain memberi width/height, keberhasilan parsing
 * sekaligus jadi bukti bahwa file ini memang benar-benar PNG/JPEG/WebP
 * (mengecek `Content-Type` saja tidak cukup, header itu mudah dipalsukan).
 */

export type ImageFormat = 'png' | 'jpeg' | 'webp';

export interface ImageInfo {
  format: ImageFormat;
  width: number;
  height: number;
}

/** Batas ukuran file upload: 10MB. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Sisi terpendek minimum — di bawah ini potongan puzzle jadi terlalu buram. */
export const MIN_IMAGE_SIDE = 200;

/** Batas atas supaya canvas di browser tidak jebol. */
export const MAX_IMAGE_SIDE = 10_000;
export const MAX_IMAGE_PIXELS = 40_000_000;

export const MIME_TYPE_BY_FORMAT: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export const EXTENSION_BY_FORMAT: Record<ImageFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
};

// ------------------------------------------------------------------ byte helpers

function u16be(bytes: Uint8Array, at: number): number {
  return (bytes[at] << 8) | bytes[at + 1];
}

function u32be(bytes: Uint8Array, at: number): number {
  return (
    bytes[at] * 0x1000000 + ((bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3])
  );
}

function u16le(bytes: Uint8Array, at: number): number {
  return bytes[at] | (bytes[at + 1] << 8);
}

function u24le(bytes: Uint8Array, at: number): number {
  return bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
}

function u32le(bytes: Uint8Array, at: number): number {
  return (
    bytes[at] + bytes[at + 1] * 0x100 + bytes[at + 2] * 0x10000 + bytes[at + 3] * 0x1000000
  );
}

function ascii(bytes: Uint8Array, at: number, length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += String.fromCharCode(bytes[at + i]);
  return out;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

// ------------------------------------------------------------------------- PNG

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

function readPng(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 24 || !startsWith(bytes, PNG_SIGNATURE)) return null;
  // Chunk pertama sebuah PNG yang sah wajib IHDR.
  if (ascii(bytes, 12, 4) !== 'IHDR') return null;
  return { format: 'png', width: u32be(bytes, 16), height: u32be(bytes, 20) };
}

// ------------------------------------------------------------------------ JPEG

/** Marker SOF0..SOF15 kecuali DHT (C4), JPG (C8) dan DAC (CC). */
const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

/** Marker tanpa payload: SOI, EOI, RST0..RST7, TEM. */
function isStandaloneMarker(marker: number): boolean {
  return marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
}

function readJpeg(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1; // byte sampah di antara segmen — cari marker berikutnya
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    if (isStandaloneMarker(marker)) {
      offset += 2;
      continue;
    }
    // SOS/EOI: data terkompresi mulai di sini, tidak ada SOF lagi setelahnya.
    if (marker === 0xda || marker === 0xd9) return null;

    const segmentLength = offset + 3 < bytes.length ? u16be(bytes, offset + 2) : 0;
    if (segmentLength < 2) return null;

    if (SOF_MARKERS.has(marker)) {
      if (offset + 9 > bytes.length) return null;
      return { format: 'jpeg', width: u16be(bytes, offset + 7), height: u16be(bytes, offset + 5) };
    }
    offset += 2 + segmentLength;
  }
  return null;
}

// ------------------------------------------------------------------------ WebP

function readWebp(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') {
    return null;
  }

  const chunk = ascii(bytes, 12, 4);

  if (chunk === 'VP8 ') {
    // Lossy: 3 byte frame tag, lalu sync code 9D 01 2A, lalu 14-bit dimensi.
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return {
      format: 'webp',
      width: u16le(bytes, 26) & 0x3fff,
      height: u16le(bytes, 28) & 0x3fff,
    };
  }

  if (chunk === 'VP8L') {
    if (bytes[20] !== 0x2f) return null;
    const bits = u32le(bytes, 21);
    return {
      format: 'webp',
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }

  if (chunk === 'VP8X') {
    // 4 byte flag, lalu canvas width-1 & height-1 masing-masing 24-bit LE.
    return {
      format: 'webp',
      width: u24le(bytes, 24) + 1,
      height: u24le(bytes, 27) + 1,
    };
  }

  return null;
}

// ------------------------------------------------------------------------- API

/**
 * Baca format & dimensi dari byte awal sebuah gambar.
 * Cukup diberi ~64KB pertama; header selalu berada di awal file.
 * Mengembalikan `null` kalau bukan PNG/JPEG/WebP yang bisa dibaca.
 */
export function readImageInfo(bytes: Uint8Array): ImageInfo | null {
  const info = readPng(bytes) ?? readJpeg(bytes) ?? readWebp(bytes);
  if (!info) return null;
  if (!Number.isFinite(info.width) || !Number.isFinite(info.height)) return null;
  if (info.width <= 0 || info.height <= 0) return null;
  return info;
}

export interface ImageCheckFailure {
  ok: false;
  reason: 'unsupported' | 'too_small' | 'too_large';
  message: string;
}

export type ImageCheckResult = ({ ok: true } & ImageInfo) | ImageCheckFailure;

/** Validasi lengkap: format didukung + dimensi masuk akal untuk dijadikan puzzle. */
export function checkImageBytes(bytes: Uint8Array): ImageCheckResult {
  const info = readImageInfo(bytes);
  if (!info) {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Format tidak dikenali. Pakai JPG, PNG, atau WebP.',
    };
  }

  if (Math.min(info.width, info.height) < MIN_IMAGE_SIDE) {
    return {
      ok: false,
      reason: 'too_small',
      message: `Gambar terlalu kecil (${info.width}×${info.height}). Sisi terpendek minimal ${MIN_IMAGE_SIDE}px.`,
    };
  }

  if (
    Math.max(info.width, info.height) > MAX_IMAGE_SIDE ||
    info.width * info.height > MAX_IMAGE_PIXELS
  ) {
    return {
      ok: false,
      reason: 'too_large',
      message: `Resolusi gambar terlalu besar (${info.width}×${info.height}).`,
    };
  }

  return { ok: true, ...info };
}
