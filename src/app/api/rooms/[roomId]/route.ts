import { apiError, jsonResponse } from '@/lib/api/respond';
import { isValidRoomId } from '@/lib/ids';
import { getRoomRecord, roomProgress, roomSnapshot } from '@/lib/rooms/roomStore';
import type { PuzzleRoom, RoomSnapshot } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface RoomDetailResponse {
  room: PuzzleRoom;
  progress: { placed: number; total: number };
  playerCount: number;
  /** Hanya diisi kalau `?full=1` — dipakai untuk render awal tanpa menunggu socket. */
  snapshot?: RoomSnapshot;
}

/**
 * GET /api/rooms/:roomId — metadata + progres sebuah room.
 * Halaman `/room/[roomId]` memakai ini untuk render server-side; state realtime
 * setelahnya datang dari Socket.io.
 */
export async function GET(
  request: Request,
  { params }: { params: { roomId: string } },
): Promise<Response> {
  const { roomId } = params;

  if (!isValidRoomId(roomId)) {
    return apiError(400, 'Format id room tidak valid.');
  }

  const record = getRoomRecord(roomId);
  if (!record) {
    return apiError(404, 'Room tidak ditemukan atau sudah kadaluarsa.');
  }

  const wantsFull = new URL(request.url).searchParams.get('full') === '1';

  return jsonResponse<RoomDetailResponse>({
    room: record.room,
    progress: roomProgress(record),
    playerCount: record.players.size,
    ...(wantsFull ? { snapshot: roomSnapshot(record) } : {}),
  });
}
