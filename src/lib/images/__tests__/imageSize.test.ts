import { describe, expect, it } from 'vitest';
import {
  checkImageBytes,
  MAX_IMAGE_SIDE,
  MIN_IMAGE_SIDE,
  readImageInfo,
} from '../imageSize';

// ------------------------------------------------------------- pembuat fixture

function bytes(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

function asciiBytes(text: string): Uint8Array {
  return Uint8Array.from(text, (char) => char.charCodeAt(0));
}

function be32(value: number): Uint8Array {
  return bytes((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}

function be16(value: number): Uint8Array {
  return bytes((value >>> 8) & 0xff, value & 0xff);
}

function le16(value: number): Uint8Array {
  return bytes(value & 0xff, (value >>> 8) & 0xff);
}

function le24(value: number): Uint8Array {
  return bytes(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff);
}

function png(width: number, height: number): Uint8Array {
  return concat(
    bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    be32(13),
    asciiBytes('IHDR'),
    be32(width),
    be32(height),
    bytes(8, 6, 0, 0, 0), // bit depth, color type, compression, filter, interlace
    be32(0), // CRC palsu — parser tidak memeriksanya
  );
}

function jpegSegment(marker: number, payload: Uint8Array): Uint8Array {
  return concat(bytes(0xff, marker), be16(payload.length + 2), payload);
}

function jpeg(
  width: number,
  height: number,
  options: { sofMarker?: number; extras?: Uint8Array[] } = {},
): Uint8Array {
  const { sofMarker = 0xc0, extras = [] } = options;
  const sof = concat(bytes(8), be16(height), be16(width), bytes(3));
  return concat(
    bytes(0xff, 0xd8),
    jpegSegment(0xe0, concat(asciiBytes('JFIF\0'), bytes(1, 1, 0, 0, 1, 0, 1, 0, 0))),
    ...extras,
    jpegSegment(sofMarker, sof),
    bytes(0xff, 0xda), // SOS
  );
}

function riff(chunkName: string, chunkPayload: Uint8Array): Uint8Array {
  const body = concat(asciiBytes('WEBP'), asciiBytes(chunkName), be32(chunkPayload.length), chunkPayload);
  return concat(asciiBytes('RIFF'), be32(body.length), body);
}

function webpLossy(width: number, height: number): Uint8Array {
  return riff(
    'VP8 ',
    concat(
      bytes(0x30, 0x01, 0x00), // frame tag
      bytes(0x9d, 0x01, 0x2a), // sync code
      le16(width),
      le16(height),
      new Uint8Array(8), // isi frame (tidak dibaca)
    ),
  );
}

function webpLossless(width: number, height: number): Uint8Array {
  const bits = (width - 1) | ((height - 1) << 14);
  return riff(
    'VP8L',
    concat(
      bytes(0x2f),
      bytes(bits & 0xff, (bits >>> 8) & 0xff, (bits >>> 16) & 0xff, (bits >>> 24) & 0xff),
      new Uint8Array(12),
    ),
  );
}

function webpExtended(width: number, height: number): Uint8Array {
  return riff(
    'VP8X',
    concat(bytes(0x10, 0, 0, 0), le24(width - 1), le24(height - 1), new Uint8Array(8)),
  );
}

// ----------------------------------------------------------------------- tests

describe('readImageInfo', () => {
  it('membaca dimensi PNG', () => {
    expect(readImageInfo(png(1600, 1200))).toEqual({ format: 'png', width: 1600, height: 1200 });
  });

  it('membaca dimensi JPEG baseline', () => {
    expect(readImageInfo(jpeg(1920, 1080))).toEqual({
      format: 'jpeg',
      width: 1920,
      height: 1080,
    });
  });

  it('membaca JPEG progressive (SOF2) dan melewati segmen lain', () => {
    const exif = jpegSegment(0xe1, concat(asciiBytes('Exif\0\0'), new Uint8Array(64)));
    const comment = jpegSegment(0xfe, asciiBytes('dibuat oleh sesuatu'));
    expect(readImageInfo(jpeg(800, 600, { sofMarker: 0xc2, extras: [exif, comment] }))).toEqual({
      format: 'jpeg',
      width: 800,
      height: 600,
    });
  });

  it('tahan terhadap fill byte 0xFF sebelum marker', () => {
    const padded = concat(bytes(0xff, 0xd8, 0xff, 0xff), jpeg(640, 480).subarray(2));
    expect(readImageInfo(padded)?.width).toBe(640);
  });

  it('tidak salah mengira DHT (0xC4) sebagai SOF', () => {
    const dht = jpegSegment(0xc4, new Uint8Array(28));
    expect(readImageInfo(jpeg(1024, 768, { extras: [dht] }))).toEqual({
      format: 'jpeg',
      width: 1024,
      height: 768,
    });
  });

  it('membaca ketiga varian WebP', () => {
    expect(readImageInfo(webpLossy(1280, 720))).toEqual({
      format: 'webp',
      width: 1280,
      height: 720,
    });
    expect(readImageInfo(webpLossless(300, 900))).toEqual({
      format: 'webp',
      width: 300,
      height: 900,
    });
    expect(readImageInfo(webpExtended(4096, 2160))).toEqual({
      format: 'webp',
      width: 4096,
      height: 2160,
    });
  });

  it('menolak SVG, GIF, teks biasa, dan buffer kosong', () => {
    expect(readImageInfo(asciiBytes('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(readImageInfo(concat(asciiBytes('GIF89a'), le16(100), le16(100)))).toBeNull();
    expect(readImageInfo(asciiBytes('ini cuma teks, bukan gambar sama sekali'))).toBeNull();
    expect(readImageInfo(new Uint8Array(0))).toBeNull();
  });

  it('menolak file yang terpotong', () => {
    expect(readImageInfo(png(500, 500).subarray(0, 20))).toBeNull();
    expect(readImageInfo(jpeg(500, 500).subarray(0, 6))).toBeNull();
    expect(readImageInfo(webpLossy(500, 500).subarray(0, 24))).toBeNull();
  });

  it('menolak PNG dengan dimensi nol', () => {
    expect(readImageInfo(png(0, 100))).toBeNull();
  });

  it('tidak pernah membaca di luar batas buffer', () => {
    // Semua prefix dari sebuah JPEG valid harus mengembalikan info atau null,
    // tidak boleh melempar (RangeError / undefined arithmetic).
    const full = jpeg(1000, 800);
    for (let length = 0; length <= full.length; length += 1) {
      expect(() => readImageInfo(full.subarray(0, length))).not.toThrow();
    }
  });
});

describe('checkImageBytes', () => {
  it('meloloskan gambar berukuran wajar', () => {
    const result = checkImageBytes(png(1600, 1200));
    expect(result).toMatchObject({ ok: true, width: 1600, height: 1200, format: 'png' });
  });

  it('menolak format tak didukung dengan alasan unsupported', () => {
    expect(checkImageBytes(asciiBytes('<svg/>'))).toMatchObject({
      ok: false,
      reason: 'unsupported',
    });
  });

  it('menolak gambar di bawah sisi minimum', () => {
    expect(checkImageBytes(png(MIN_IMAGE_SIDE - 1, 4000))).toMatchObject({
      ok: false,
      reason: 'too_small',
    });
  });

  it('menolak gambar melewati sisi maksimum', () => {
    expect(checkImageBytes(png(MAX_IMAGE_SIDE + 1, 500))).toMatchObject({
      ok: false,
      reason: 'too_large',
    });
  });

  it('menolak total pixel berlebihan meski tiap sisi masih di bawah batas', () => {
    expect(checkImageBytes(png(9000, 9000))).toMatchObject({ ok: false, reason: 'too_large' });
  });

  it('pesan error selalu berupa kalimat yang bisa ditampilkan ke pemain', () => {
    const result = checkImageBytes(png(10, 10));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.length).toBeGreaterThan(10);
  });
});
