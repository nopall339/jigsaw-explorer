/** Muat gambar untuk dipakai di canvas. Hanya dipanggil dari client. */
export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Gambar selalu berasal dari origin sendiri (/sample-images atau /uploads),
    // tapi tetap set crossOrigin supaya canvas tidak ter-taint kalau nanti
    // gambar dipindah ke CDN/object storage.
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Gagal memuat gambar: ${url}`));
    image.src = url;
  });
}

/**
 * Ukuran gambar yang benar-benar dipakai saat menggambar.
 *
 * SVG di beberapa browser melaporkan `naturalWidth = 0` kalau atribut width /
 * height tidak ada, jadi sediakan nilai cadangan dari metadata room.
 */
export function drawableSize(
  image: HTMLImageElement,
  fallbackWidth: number,
  fallbackHeight: number,
): { width: number; height: number } {
  const width = image.naturalWidth || fallbackWidth;
  const height = image.naturalHeight || fallbackHeight;
  return { width, height };
}
