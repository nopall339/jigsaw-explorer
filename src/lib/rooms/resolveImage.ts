/**
 * Menentukan ukuran & judul gambar untuk sebuah room **dari sisi server**.
 *
 * Angka `imageWidth`/`imageHeight` yang dikirim client sengaja tidak dipakai:
 * kalau salah (atau dipalsukan), semua pemain akan menghasilkan grid berbeda dan
 * papan jadi tidak sinkron. Sumber kebenarannya:
 * - galeri bawaan -> `manifest.json`
 * - hasil upload  -> header file yang benar-benar ada di `public/uploads`
 */

import { findGalleryImage } from '@/lib/gallery';
import { readImageInfoFromUrl } from '@/lib/images/imageFile';
import { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE, MIN_IMAGE_SIDE } from '@/lib/images/imageSize';
import type { ParseResult, RoomInput } from './validation';

export interface ResolvedImage {
  imageWidth: number;
  imageHeight: number;
  imageTitle: string;
}

function withinLimits(width: number, height: number): boolean {
  return (
    Math.min(width, height) >= MIN_IMAGE_SIDE &&
    Math.max(width, height) <= MAX_IMAGE_SIDE &&
    width * height <= MAX_IMAGE_PIXELS
  );
}

export async function resolveRoomImage(input: RoomInput): Promise<ParseResult<ResolvedImage>> {
  const gallery = findGalleryImage(input.imageUrl);
  if (gallery) {
    return {
      ok: true,
      value: {
        imageWidth: gallery.width,
        imageHeight: gallery.height,
        imageTitle: input.imageTitle || gallery.title,
      },
    };
  }

  if (!input.imageUrl.startsWith('/uploads/')) {
    return { ok: false, message: 'Gambar galeri tidak ditemukan.' };
  }

  const info = await readImageInfoFromUrl(input.imageUrl);
  if (!info) {
    return {
      ok: false,
      message: 'Gambar hasil upload tidak ditemukan lagi di server. Coba upload ulang.',
    };
  }

  if (!withinLimits(info.width, info.height)) {
    return { ok: false, message: `Resolusi gambar tidak didukung (${info.width}×${info.height}).` };
  }

  return {
    ok: true,
    value: {
      imageWidth: info.width,
      imageHeight: info.height,
      imageTitle: input.imageTitle || 'Foto kamu',
    },
  };
}
