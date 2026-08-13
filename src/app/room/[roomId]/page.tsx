'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/Spinner';
import type { PuzzleRoom } from '@/types';

// PuzzleBoard menggunakan Konva yang perlu SSR disabled
const PuzzleBoard = dynamic(() => import('@/components/puzzle/PuzzleBoard'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-board-950">
      <div className="text-center">
        <Spinner className="mx-auto mb-4 h-8 w-8 text-accent" />
        <p className="text-slate-400">Memuat puzzle...</p>
      </div>
    </div>
  ),
});

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<PuzzleRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms?id=${encodeURIComponent(roomId)}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Room tidak ditemukan atau sudah kadaluarsa');
          }
          throw new Error('Gagal memuat room');
        }

        const data = await response.json();
        setRoom(data.room);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-board-950">
        <div className="text-center">
          <Spinner className="mx-auto mb-4 h-8 w-8 text-accent" />
          <p className="text-slate-400">Memuat room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex h-screen items-center justify-center bg-board-950">
        <div className="text-center">
          <div className="mb-4 text-5xl">😕</div>
          <h1 className="mb-2 text-2xl font-bold text-slate-100">
            {error || 'Room tidak ditemukan'}
          </h1>
          <p className="mb-6 text-slate-400">
            Room mungkin sudah dihapus atau link-nya salah.
          </p>
          <button
            onClick={() => router.push('/create')}
            className="rounded-xl bg-accent px-6 py-3 font-semibold text-board-950 transition-colors hover:bg-accent-soft"
          >
            Buat Puzzle Baru
          </button>
        </div>
      </div>
    );
  }

  return <PuzzleBoard room={room} />;
}
