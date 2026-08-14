import { apiError, jsonResponse } from '@/lib/api/respond';
import { isValidRoomId } from '@/lib/ids';
import { resolveRoomImage } from '@/lib/rooms/resolveImage';
import { createRoom, deleteRoom, getRoom, roomCount } from '@/lib/rooms/roomStore';
import { parseCreateRoomRequest } from '@/lib/rooms/validation';
import type { CreateRoomResponse } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/rooms — buat room baru.
 *
 * Body: `CreateRoomRequest`. Server yang menentukan id, seed, dan grid, lalu
 * menyebar potongan awal. Semua pemain nanti menurunkan papan yang identik dari
 * data ini, jadi tidak ada geometri yang perlu dikirim lewat jaringan.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'Body harus JSON yang valid.');
  }

  const parsed = parseCreateRoomRequest(body);
  if (!parsed.ok) return apiError(400, parsed.message);

  const image = await resolveRoomImage(parsed.value);
  if (!image.ok) return apiError(400, image.message);

  const record = createRoom({ ...parsed.value, ...image.value });

  return jsonResponse<CreateRoomResponse>(
    { room: record.room },
    { status: 201, headers: { location: `/room/${record.room.id}` } },
  );
}

/**
 * GET /api/rooms?id=abc123 — metadata satu room.
 * Tanpa `id`: hanya jumlah room aktif (untuk cek kesehatan server).
 */
export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return jsonResponse({ activeRooms: roomCount() });
  }

  if (!isValidRoomId(id)) {
    return apiError(400, 'Format id room tidak valid.');
  }

  const room = getRoom(id);
  if (!room) return apiError(404, 'Room tidak ditemukan atau sudah kadaluarsa.');

  return jsonResponse<CreateRoomResponse>({ room });
}
