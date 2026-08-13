'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomSnapshot,
  Player,
  ChatMessage,
  Reaction,
  PlayerCursor,
  RoomStats,
  PieceMovePayload,
  PieceDropPayload,
} from '@/types';

/**
 * Hook untuk koneksi socket room multiplayer.
 * 
 * Mengelola:
 * - Koneksi socket ke room tertentu
 * - Event listener untuk sinkronisasi real-time
 * - Broadcast aksi pemain lokal
 */

export interface UseRoomSocketOptions {
  roomId: string;
  playerName: string;
  playerColor: string;
  onSnapshot?: (snapshot: RoomSnapshot, playerId: string) => void;
  onPlayerJoin?: (player: Player) => void;
  onPlayerLeave?: (playerId: string) => void;
  onPieceLocked?: (pieceId: string, playerId: string) => void;
  onPieceUnlocked?: (pieceId: string) => void;
  onPieceMoved?: (payload: PieceMovePayload & { playerId: string }) => void;
  onPieceDropped?: (payload: PieceDropPayload & { playerId: string; isPlaced: boolean; z: number }) => void;
  onCursorMoved?: (cursor: PlayerCursor) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onReaction?: (reaction: Reaction) => void;
  onRoomStarted?: (startedAt: string) => void;
  onRoomCompleted?: (completedAt: string, stats: RoomStats) => void;
  onRoomSync?: (snapshot: RoomSnapshot) => void;
}

export interface RoomSocketApi {
  isConnected: boolean;
  isJoined: boolean;
  playerId: string | null;
  error: string | null;
  grabPiece: (pieceId: string) => Promise<boolean>;
  movePiece: (payload: PieceMovePayload) => void;
  dropPiece: (payload: PieceDropPayload) => void;
  moveCursor: (x: number, y: number) => void;
  sendChat: (text: string) => void;
  sendReaction: (emoji: string, x: number, y: number) => void;
  resetRoom: () => void;
  disconnect: () => void;
}

export function useRoomSocket(options: UseRoomSocketOptions): RoomSocketApi {
  const {
    roomId,
    playerName,
    playerColor,
    onSnapshot,
    onPlayerJoin,
    onPlayerLeave,
    onPieceLocked,
    onPieceUnlocked,
    onPieceMoved,
    onPieceDropped,
    onCursorMoved,
    onChatMessage,
    onReaction,
    onRoomStarted,
    onRoomCompleted,
    onRoomSync,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const callbacksRef = useRef({
    onSnapshot,
    onPlayerJoin,
    onPlayerLeave,
    onPieceLocked,
    onPieceUnlocked,
    onPieceMoved,
    onPieceDropped,
    onCursorMoved,
    onChatMessage,
    onReaction,
    onRoomStarted,
    onRoomCompleted,
    onRoomSync,
  });

  useEffect(() => {
    callbacksRef.current = {
      onSnapshot,
      onPlayerJoin,
      onPlayerLeave,
      onPieceLocked,
      onPieceUnlocked,
      onPieceMoved,
      onPieceDropped,
      onCursorMoved,
      onChatMessage,
      onReaction,
      onRoomStarted,
      onRoomCompleted,
      onRoomSync,
    };
  });

  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[socket] Connected:', socket.id);
      setIsConnected(true);
      setError(null);

      socket.emit('room:join', { roomId, playerName, color: playerColor }, (result: any) => {
        if (result.ok && result.snapshot && result.playerId) {
          setIsJoined(true);
          setPlayerId(result.playerId);
          callbacksRef.current.onSnapshot?.(result.snapshot, result.playerId);
          console.log('[socket] Joined room:', roomId);
        } else {
          const errorMsg =
            result.error === 'room_not_found'
              ? 'Room tidak ditemukan'
              : result.error === 'room_full'
                ? 'Room sudah penuh'
                : 'Gagal join room';
          setError(errorMsg);
          console.error('[socket] Join failed:', result.error);
        }
      });
    });

    socket.on('disconnect', () => {
      console.log('[socket] Disconnected');
      setIsConnected(false);
      setIsJoined(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[socket] Connection error:', err);
      setError('Gagal terhubung ke server');
    });

    socket.on('player:join', (player) => {
      callbacksRef.current.onPlayerJoin?.(player);
    });

    socket.on('player:leave', ({ playerId }) => {
      callbacksRef.current.onPlayerLeave?.(playerId);
    });

    socket.on('piece:locked', ({ pieceId, playerId }) => {
      callbacksRef.current.onPieceLocked?.(pieceId, playerId);
    });

    socket.on('piece:unlocked', ({ pieceId }) => {
      callbacksRef.current.onPieceUnlocked?.(pieceId);
    });

    socket.on('piece:moved', (payload) => {
      callbacksRef.current.onPieceMoved?.(payload);
    });

    socket.on('piece:dropped', (payload) => {
      callbacksRef.current.onPieceDropped?.(payload);
    });

    socket.on('cursor:moved', (cursor) => {
      callbacksRef.current.onCursorMoved?.(cursor);
    });

    socket.on('chat:message', (message) => {
      callbacksRef.current.onChatMessage?.(message);
    });

    socket.on('reaction:shown', (reaction) => {
      callbacksRef.current.onReaction?.(reaction);
    });

    socket.on('room:started', ({ startedAt }) => {
      callbacksRef.current.onRoomStarted?.(startedAt);
    });

    socket.on('room:completed', ({ completedAt, stats }) => {
      callbacksRef.current.onRoomCompleted?.(completedAt, stats);
    });

    socket.on('room:sync', (snapshot) => {
      callbacksRef.current.onRoomSync?.(snapshot);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, playerName, playerColor]);

  const grabPiece = useCallback(
    (pieceId: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }

        socket.emit('piece:grab', { pieceId }, (result) => {
          resolve(result.ok);
        });
      });
    },
    [],
  );

  const movePiece = useCallback((payload: PieceMovePayload) => {
    socketRef.current?.emit('piece:move', payload);
  }, []);

  const dropPiece = useCallback((payload: PieceDropPayload) => {
    socketRef.current?.emit('piece:drop', payload);
  }, []);

  const moveCursor = useCallback((x: number, y: number) => {
    socketRef.current?.emit('cursor:move', { x, y });
  }, []);

  const sendChat = useCallback((text: string) => {
    socketRef.current?.emit('chat:send', { text });
  }, []);

  const sendReaction = useCallback((emoji: string, x: number, y: number) => {
    socketRef.current?.emit('reaction:send', { emoji, x, y });
  }, []);

  const resetRoom = useCallback(() => {
    socketRef.current?.emit('room:reset');
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  return {
    isConnected,
    isJoined,
    playerId,
    error,
    grabPiece,
    movePiece,
    dropPiece,
    moveCursor,
    sendChat,
    sendReaction,
    resetRoom,
    disconnect,
  };
}
