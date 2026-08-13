/**
 * Akses berkas gambar di sisi server. Modul ini **hanya** boleh diimpor dari
 * route handler / custom server (memakai `node:fs`), jangan dari komponen client.
 */

import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createId } from '@/lib/ids';
import { EXTENSION_BY_FORMAT, readImageInfo, type ImageFormat, type ImageInfo } from './imageSize';

/** Direktori publik yang boleh dijadikan sumber gambar puzzle. */
export const UPLOAD_URL_PREFIX = '/uploads';
export const GALLERY_URL_PREFIX = '/sample-images';

/** Header gambar selalu ada di awal file; tidak perlu membaca 10MB penuh. */
const HEADER_BYTES = 64 * 1024;

/** Hanya nama file sederhana — tanpa direktori, tanpa `..`, tanpa spasi. */
const PUBLIC_IMAGE_URL_PATTERN =
  /^\/(uploads|sample-images)\/[A-Za-z0-9][A-Za-z0-9._-]{0,95}\.(png|jpe?g|webp|svg)$/;

export function publicDir(): string {
  return path.join(process.cwd(), 'public');
}

export function uploadsDir(): string {
  return path.join(publicDir(), 'uploads');
}

export function isPublicImageUrl(url: string): boolean {
  return PUBLIC_IMAGE_URL_PATTERN.test(url) && !url.includes('..');
}

/**
 * Ubah URL publik menjadi path absolut di disk.
 * Mengembalikan `null` kalau URL tidak berbentuk aman atau ternyata keluar dari
 * folder `public/` setelah di-resolve (pertahanan kedua terhadap path traversal).
 */
export function resolvePublicImagePath(url: string): string | null {
  if (!isPublicImageUrl(url)) return null;

  const root = publicDir();
  const resolved = path.resolve(root, `.${url}`);
  const withinRoot = resolved === root || resolved.startsWith(root + path.sep);
  return withinRoot ? resolved : null;
}

/** Baca sebagian awal file — cukup untuk header, hemat memori. */
async function readHead(filePath: string, length: number): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let total = 0;
    const stream = createReadStream(filePath, { start: 0, end: length - 1 });

    stream.on('data', (chunk) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      chunks.push(buffer);
      total += buffer.length;
    });
    stream.on('error', () => resolve(null));
    stream.on('close', () => resolve(total > 0 ? new Uint8Array(Buffer.concat(chunks)) : null));
  });
}

/**
 * Ukuran gambar menurut file di disk (bukan menurut angka kiriman client).
 * `null` kalau file tidak ada, di luar folder publik, atau bukan gambar raster.
 */
export async function readImageInfoFromUrl(url: string): Promise<ImageInfo | null> {
  const filePath = resolvePublicImagePath(url);
  if (!filePath) return null;

  const head = await readHead(filePath, HEADER_BYTES);
  return head ? readImageInfo(head) : null;
}

export async function publicImageExists(url: string): Promise<boolean> {
  const filePath = resolvePublicImagePath(url);
  if (!filePath) return false;
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

export interface SavedUpload {
  url: string;
  fileName: string;
}

/** Simpan hasil upload dengan nama acak — nama asli dari client tidak dipakai sama sekali. */
export async function saveUploadedImage(
  bytes: Uint8Array,
  format: ImageFormat,
): Promise<SavedUpload> {
  const directory = uploadsDir();
  await mkdir(directory, { recursive: true });

  const fileName = `${createId()}.${EXTENSION_BY_FORMAT[format]}`;
  await writeFile(path.join(directory, fileName), bytes);

  return { url: `${UPLOAD_URL_PREFIX}/${fileName}`, fileName };
}
