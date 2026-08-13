import type { GalleryImage } from '@/types';
import manifest from '../../public/sample-images/manifest.json';

/**
 * Galeri gambar bawaan.
 *
 * `manifest.json` dihasilkan oleh `npm run gen:images` — jadi daftar gambar,
 * ukuran, dan kategorinya cuma punya satu sumber kebenaran.
 */
export const GALLERY_IMAGES: readonly GalleryImage[] = manifest as GalleryImage[];

/** Kategori unik, urutannya mengikuti manifest. */
export const GALLERY_CATEGORIES: readonly string[] = Array.from(
  new Set(GALLERY_IMAGES.map((image) => image.category)),
);

export function findGalleryImage(url: string): GalleryImage | undefined {
  return GALLERY_IMAGES.find((image) => image.url === url);
}

export function galleryByCategory(category: string | null): readonly GalleryImage[] {
  if (!category) return GALLERY_IMAGES;
  return GALLERY_IMAGES.filter((image) => image.category === category);
}

export const DEFAULT_GALLERY_IMAGE = GALLERY_IMAGES[0] as GalleryImage;
