import { apiError, jsonResponse } from '@/lib/api/respond';
import { saveUploadedImage } from '@/lib/images/imageFile';
import { checkImageBytes, MAX_UPLOAD_BYTES } from '@/lib/images/imageSize';
import { sanitizeTitle } from '@/lib/rooms/validation';
import { formatBytes } from '@/lib/utils';
import type { UploadImageResponse } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Toleransi kecil untuk overhead boundary multipart saat memeriksa Content-Length. */
const MULTIPART_OVERHEAD = 8 * 1024;

/**
 * POST /api/upload — terima satu file gambar (field `file`), simpan ke
 * `public/uploads`, balas URL + dimensi aslinya.
 *
 * Yang divalidasi:
 * - ukuran <= 10MB (dicek dari header *dan* dari byte yang benar-benar diterima)
 * - format PNG/JPEG/WebP menurut **magic bytes**, bukan menurut Content-Type
 * - resolusi masuk akal untuk dipotong jadi puzzle
 *
 * Nama file dari client tidak pernah dipakai sebagai nama di disk.
 */
export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return apiError(415, 'Kirim gambar sebagai multipart/form-data dengan field "file".');
  }

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD) {
    return apiError(413, `Ukuran file maksimal ${formatBytes(MAX_UPLOAD_BYTES)}.`);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(400, 'Isi form tidak bisa dibaca. Coba upload ulang.');
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return apiError(400, 'Field "file" tidak ditemukan.');
  }
  if (file.size === 0) {
    return apiError(400, 'File kosong.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return apiError(413, `Ukuran file maksimal ${formatBytes(MAX_UPLOAD_BYTES)}.`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return apiError(413, `Ukuran file maksimal ${formatBytes(MAX_UPLOAD_BYTES)}.`);
  }

  const check = checkImageBytes(bytes);
  if (!check.ok) {
    return apiError(check.reason === 'unsupported' ? 415 : 422, check.message);
  }

  let saved;
  try {
    saved = await saveUploadedImage(bytes, check.format);
  } catch {
    return apiError(500, 'Gagal menyimpan gambar di server.');
  }

  const baseName = file.name.replace(/\.[^.]*$/, '').replace(/[_-]+/g, ' ');

  return jsonResponse<UploadImageResponse>(
    {
      url: saved.url,
      width: check.width,
      height: check.height,
      title: sanitizeTitle(baseName, 'Foto kamu'),
    },
    { status: 201 },
  );
}
