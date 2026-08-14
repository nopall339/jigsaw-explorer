'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Text, Group } from 'react-konva';
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

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function PuzzleBoard({ room }: PuzzleBoardProps) {
  const [playerName] = useState(() => getPlayerName());
  const [playerColor] = useState(() => getRandomPlayerColor());
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionStats, setCompletionStats] = useState<{ durationMs: number; playerCount: number; playerNames: string[] } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  // Zoom & Pan state
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });

  // Other players' cursors
  const [otherCursors, setOtherCursors] = useState<Map<string, { x: number; y: number; name: string; color: string }>>(new Map());
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<Map<string, { name: string; color: string }>>(new Map());

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
      
      // Initialize online players from snapshot
      const players = new Map();
      snapshot.players.forEach((player) => {
        if (player.id !== playerId) {
          players.set(player.id, { name: player.name, color: player.color });
        }
      });
      setOnlinePlayers(players);
    },
    onRoomSync: (snapshot) => {
      console.log('[room:sync] Reshuffle received:', snapshot);
      puzzleState.applyStates(snapshot.pieces); // ponytail: shuffle wasn't applying
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
    onRoomCompleted: (completedAt, stats) => {
      setIsCompleted(true);
      setCompletionStats({
        durationMs: stats.durationMs,
        playerCount: stats.playerCount,
        playerNames: stats.playerNames,
      });
    },
    onPlayerJoin: (player) => {
      setOnlinePlayers((prev) => {
        const updated = new Map(prev);
        updated.set(player.id, { name: player.name, color: player.color });
        return updated;
      });
    },
    onPlayerLeave: (playerId) => {
      setOnlinePlayers((prev) => {
        const updated = new Map(prev);
        updated.delete(playerId);
        return updated;
      });
      setOtherCursors((prev) => {
        const updated = new Map(prev);
        updated.delete(playerId);
        return updated;
      });
    },
    onCursorMoved: (cursor) => {
      const playerInfo = onlinePlayers.get(cursor.playerId);
      if (playerInfo) {
        setOtherCursors((prev) => {
          const updated = new Map(prev);
          updated.set(cursor.playerId, {
            x: cursor.x,
            y: cursor.y,
            name: playerInfo.name,
            color: playerInfo.color,
          });
          return updated;
        });
      }
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

  // Zoom & Pan handlers
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const scaleBy = 1.1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    // Limit zoom range
    const clampedScale = Math.max(0.5, Math.min(3, newScale));

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setStageScale(clampedScale);
    setStagePos(newPos);
  }, [stageScale, stagePos]);

  const handleMouseDown = useCallback((e: any) => {
    // Only pan if clicking on empty space (not on a piece)
    if (e.target === e.target.getStage()) {
      setIsPanning(true);
      lastPointerPos.current = e.target.getStage().getPointerPosition();
    }
  }, []);

  const handleMouseMove = useCallback((e: any) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    
    // Pan handling
    if (isPanning) {
      const dx = pointer.x - lastPointerPos.current.x;
      const dy = pointer.y - lastPointerPos.current.y;

      setStagePos({
        x: stagePos.x + dx,
        y: stagePos.y + dy,
      });

      lastPointerPos.current = pointer;
    }

    // Broadcast cursor position (throttled to 50ms)
    if (socket.isConnected) {
      // Convert screen coordinates to world coordinates
      const worldX = (pointer.x - stagePos.x) / stageScale;
      const worldY = (pointer.y - stagePos.y) / stageScale;

      if (!cursorThrottleRef.current) {
        socket.moveCursor(worldX, worldY);
        cursorThrottleRef.current = setTimeout(() => {
          cursorThrottleRef.current = null;
        }, 50);
      }
    }
  }, [isPanning, stagePos, stageScale, socket]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleResetZoom = useCallback(() => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
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

  // Toast notification state
  const [showShareToast, setShowShareToast] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    
    // Debug: pastikan URL tidak kosong
    console.log('[handleShare] URL to copy:', url);
    console.log('[handleShare] roomId:', room.id);
    
    if (!url || url.trim() === '') {
      console.error('[handleShare] URL is empty!');
      alert('Error: Link tidak valid. Coba refresh halaman.');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(url);
      console.log('[handleShare] Copy success:', url);
      // Non-blocking toast instead of alert
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    } catch (err) {
      console.error('[handleShare] Copy failed:', err);
      // Fallback: prompt is less blocking than alert
      prompt('Salin link ini untuk dibagikan:', url);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-board-950 overflow-y-auto">
      {/* Minimalist Top Bar - Hanya info penting */}
      <div className="flex items-center justify-between border-b border-white/10 bg-board-900 px-4 py-2">
        <div>
          <h1 className="text-sm font-semibold text-slate-100">{room.imageTitle}</h1>
          <p className="text-xs text-slate-400">
            {room.pieceCount} potongan
            {socket.isJoined && <span className="ml-2">· Online</span>}
          </p>
        </div>
        {/* Hanya indicator online count */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            {onlinePlayers.size + 1} online
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1">
        <Stage 
          ref={stageRef}
          width={stageSize.width} 
          height={stageSize.height}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          draggable={false}
        >
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

            {/* Render other players' cursors */}
            {Array.from(otherCursors.entries()).map(([playerId, cursor]) => (
              <Group key={playerId} x={cursor.x} y={cursor.y}>
                {/* Cursor dot */}
                <Circle
                  radius={8}
                  fill={cursor.color}
                  stroke="#fff"
                  strokeWidth={2}
                  shadowColor="black"
                  shadowBlur={4}
                  shadowOpacity={0.3}
                />
                {/* Player name label */}
                <Text
                  text={cursor.name}
                  x={12}
                  y={-8}
                  fontSize={14}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fill="#fff"
                  padding={4}
                  shadowColor="black"
                  shadowBlur={3}
                  shadowOpacity={0.5}
                />
                {/* Label background */}
                <Circle
                  x={8 + (cursor.name.length * 4)}
                  y={0}
                  radius={cursor.name.length * 4 + 8}
                  fill={cursor.color}
                  opacity={0.8}
                  listening={false}
                />
              </Group>
            ))}
          </Layer>
        </Stage>

        {/* Overlay UI */}
        <div className="pointer-events-none absolute inset-0 p-4">
          <div className="flex h-full flex-col">
            {/* Top Right: Reference Image */}
            <div className="pointer-events-auto ml-auto">
              <ReferenceImage imageUrl={room.imageUrl} imageTitle={room.imageTitle} />
            </div>

            {/* Bottom: Controls + Progress + Zoom */}
            <div className="pointer-events-auto mt-auto flex items-end justify-between gap-4">
              {/* Left: Zoom Controls */}
              <div className="flex flex-col gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleResetZoom}
                  title="Reset zoom & pan (1:1)"
                >
                  🔍 Reset Zoom
                </Button>
                <div className="rounded-lg bg-board-900/90 px-3 py-1 text-xs text-slate-400 backdrop-blur-sm">
                  Zoom: {Math.round(stageScale * 100)}%
                </div>
              </div>

              {/* Center: Progress */}
              <div className="flex-1 max-w-md">
                <div className="rounded-xl border border-white/10 bg-board-900/90 p-4 backdrop-blur-sm">
                  <ProgressBar
                    placed={puzzleState.progress.placed}
                    total={puzzleState.progress.total}
                  />
                </div>
              </div>

              {/* Right: Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleShare}
                  title="Bagikan link room"
                >
                  📤 Bagikan
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleReset}
                  title="Acak ulang semua potongan"
                >
                  🔄 Acak Ulang
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Modal */}
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-board-950/80 backdrop-blur-sm">
            <div className="animate-fade-in rounded-2xl border border-white/10 bg-board-900 p-8 text-center shadow-2xl max-w-md w-full mx-4">
              <div className="mb-4 text-6xl">🎉</div>
              <h2 className="mb-2 text-3xl font-bold text-slate-50">Selesai!</h2>
              <p className="mb-6 text-slate-400">Puzzle berhasil diselesaikan</p>
              
              {/* Statistics */}
              {completionStats && (
                <div className="mb-6 space-y-3 rounded-lg bg-board-950/50 p-4 text-left">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-sm text-slate-400">⏱️ Waktu Total</span>
                    <span className="font-mono text-lg font-semibold text-slate-100">
                      {formatDuration(completionStats.durationMs)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-sm text-slate-400">👥 Jumlah Pemain</span>
                    <span className="text-lg font-semibold text-slate-100">
                      {completionStats.playerCount} orang
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">🧩 Potongan</span>
                    <span className="text-lg font-semibold text-slate-100">
                      {room.pieceCount} pieces
                    </span>
                  </div>
                  {completionStats.playerNames.length > 0 && (
                    <div className="pt-2">
                      <div className="mb-1 text-xs text-slate-500">Kontributor:</div>
                      <div className="flex flex-wrap gap-1">
                        {completionStats.playerNames.map((name, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-board-800 px-2 py-1 text-xs text-slate-300"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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

        {/* Share Toast Notification */}
        {showShareToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 rounded-lg bg-emerald-500/90 px-6 py-3 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
            ✅ Link disalin! Bagikan ke teman untuk main bareng.
          </div>
        )}
      </div>
    </div>
  );
}
