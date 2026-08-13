'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import { usePuzzleState } from '@/hooks/usePuzzleState';
import { useRoomSocket } from '@/hooks/useRoomSocket';
import { usePieceSprites } from '@/hooks/usePieceSprites';
import ProgressBar from './ProgressBar';
import ReferenceImage from './ReferenceImage';
import { Button } from '@/components/ui/Button';
import type { PuzzleRoom, PuzzlePiece } from '@/types';

interface PuzzleBoardProps {
  room: PuzzleRoom;
}

const PLAYER_COLORS = [
  '#f0a44a', '#5ad1b0', '#f87171', '#60a5fa', '#a78bfa', '#fb923c', '#34d399', '#fbbf24',
];

function getRandomPlayerColor() {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)] || '#f0a44a';
}

function getPlayerName() {
  const adjectives = ['Cepat', 'Pintar', 'Hebat', 'Jago', 'Pro', 'Master'];
  const nouns = ['Pemain', 'Penyusun', 'Ahli', 'Ninja', 'Expert'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

export default function PuzzleBoard({ room }: PuzzleBoardProps) {
  const [playerName] = useState(() => getPlayerName());
  const [playerColor] = useState(() => getRandomPlayerColor());
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isCompleted, setIsCompleted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const puzzleState = usePuzzleState({
    spec: room,
    initialPieces: null,
  });

  const socket = useRoomSocket({
    roomId: room.id,
    playerName,
    playerColor,
    onSnapshot: (snapshot, playerId) => {
      console.log('Snapshot received:', snapshot);
      puzzleState.applyStates(snapshot.pieces);
    },
    onPieceLocked: (pieceId, playerId) => {
      puzzleState.setLock(pieceId, playerId);
    },
    onPieceUnlocked: (pieceId) => {
      puzzleState.setLock(pieceId, null);
    },
    onPieceMoved: (payload) => {
      puzzleState.applyRemote(payload.pieceId, {
        x: payload.x,
        y: payload.y,
        rotation: payload.rotation,
      });
    },
    onPieceDropped: (payload) => {
      puzzleState.applyRemote(payload.pieceId, {
        x: payload.x,
        y: payload.y,
        rotation: payload.rotation,
        isPlaced: payload.isPlaced,
        z: payload.z,
        lockedBy: null,
      });
    },
    onRoomCompleted: () => {
      setIsCompleted(true);
    },
  });

  const sprites = usePieceSprites({
    imageUrl: room.imageUrl,
    imageWidth: room.imageWidth,
    imageHeight: room.imageHeight,
    seed: room.seed,
    pieces: puzzleState.pieces,
    layout: puzzleState.layout,
  });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handlePieceDragStart = useCallback(
    async (piece: PuzzlePiece) => {
      if (piece.isPlaced) return;
      
      const canGrab = await socket.grabPiece(piece.id);
      if (canGrab) {
        puzzleState.grab(piece.id);
      }
    },
    [socket, puzzleState],
  );

  const handlePieceDragMove = useCallback(
    (piece: PuzzlePiece, x: number, y: number) => {
      socket.movePiece({
        pieceId: piece.id,
        x,
        y,
        rotation: piece.rotation,
      });
    },
    [socket],
  );

  const handlePieceDragEnd = useCallback(
    (piece: PuzzlePiece, x: number, y: number) => {
      const result = puzzleState.drop(piece.id, x, y);
      if (result) {
        socket.dropPiece({
          pieceId: piece.id,
          x: result.x,
          y: result.y,
          rotation: result.rotation,
        });
      }
    },
    [socket, puzzleState],
  );

  const handleReset = () => {
    socket.resetRoom();
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link disalin! Bagikan ke teman untuk main bareng.');
    } catch {
      prompt('Salin link ini untuk dibagikan:', url);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-board-950">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-board-900 px-4 py-3">
        <div>
          <h1 className="font-semibold text-slate-100">{room.imageTitle}</h1>
          <p className="text-sm text-slate-400">
            {room.pieceCount} potongan
            {socket.isJoined && <span className="ml-2">· Online</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handleShare}>
            Bagikan
          </Button>
          <Button variant="secondary" size="sm" onClick={handleReset}>
            Acak Ulang
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1">
        <Stage width={stageSize.width} height={stageSize.height}>
          <Layer>
            {sprites.status === 'ready' && sprites.sprites &&
              puzzleState.pieces.map((piece) => {
                const sprite = sprites.sprites?.byId.get(piece.id);
                if (!sprite) return null;

                return (
                  <KonvaImage
                    key={piece.id}
                    image={sprite}
                    x={piece.currentX}
                    y={piece.currentY}
                    rotation={piece.rotation}
                    draggable={!piece.isPlaced && !piece.lockedByPlayerId}
                    opacity={piece.lockedByPlayerId ? 0.7 : 1}
                    onDragStart={() => handlePieceDragStart(piece)}
                    onDragMove={(e) => {
                      handlePieceDragMove(piece, e.target.x(), e.target.y());
                    }}
                    onDragEnd={(e) => {
                      handlePieceDragEnd(piece, e.target.x(), e.target.y());
                    }}
                  />
                );
              })}
          </Layer>
        </Stage>

        {/* Overlay UI */}
        <div className="pointer-events-none absolute inset-0 p-4">
          <div className="flex h-full flex-col">
            {/* Top Right: Reference Image */}
            <div className="pointer-events-auto ml-auto">
              <ReferenceImage imageUrl={room.imageUrl} imageTitle={room.imageTitle} />
            </div>

            {/* Bottom: Progress */}
            <div className="pointer-events-auto mt-auto">
              <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-board-900/90 p-4 backdrop-blur-sm">
                <ProgressBar
                  placed={puzzleState.progress.placed}
                  total={puzzleState.progress.total}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Completion Modal */}
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-board-950/80 backdrop-blur-sm">
            <div className="animate-fade-in rounded-2xl border border-white/10 bg-board-900 p-8 text-center shadow-2xl">
              <div className="mb-4 text-6xl">🎉</div>
              <h2 className="mb-2 text-3xl font-bold text-slate-50">Selesai!</h2>
              <p className="mb-6 text-slate-400">Puzzle berhasil diselesaikan</p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => window.location.href = '/'}>
                  Beranda
                </Button>
                <Button onClick={() => window.location.href = '/create'}>
                  Puzzle Baru
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        {!socket.isConnected && (
          <div className="absolute bottom-4 left-4 rounded-lg bg-rose-500/90 px-4 py-2 text-sm text-white">
            Koneksi terputus...
          </div>
        )}
      </div>
    </div>
  );
}
