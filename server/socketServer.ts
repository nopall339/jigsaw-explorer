/**
 * Custom Node server: Next.js + Socket.io dalam satu proses.
 *
 * Server ini:
 * - Menjalankan Next.js dev/production server
 * - Menambahkan Socket.io untuk sinkronisasi multiplayer real-time
 * - Mengelola state room aktif (in-memory Map, shared dengan Next.js routes)
 *
 * Semua logic puzzle & snapping memakai fungsi murni yang sama dengan client
 * (dari `puzzle-engine`), jadi keputusan server selalu konsisten.
 */

import { createServer } from 'node:http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  JoinRoomPayload,
  PieceMovePayload,
  PieceDropPayload,
  Point,
  ChatMessage,
  Reaction,
} from '../src/types/index.js';
import {
  getRoomRecord,
  touchRoom,
  roomSnapshot,
  roomStats,
  reshuffleRoom,
  MAX_PLAYERS_PER_ROOM,
  MAX_CHAT_HISTORY,
  type RoomPlayer,
} from '../src/lib/rooms/roomStore.js';
import { resolveDrop } from '../src/lib/puzzle-engine/snapLogic.js';
import { computeGrid } from '../src/lib/puzzle-engine/grid.js';
import { createId } from '../src/lib/ids.js';

const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isDev = NODE_ENV !== 'production';

const app = next({ dev: isDev });
const handle = app.getRequestHandler();

type ServerSocket = import('socket.io').Socket<ClientToServerEvents, ServerToClientEvents>;

function nowIso(): string {
  return new Date().toISOString();
}

/** Ambil record room yang socketnya ikuti. */
function socketRoom(socket: ServerSocket): ReturnType<typeof getRoomRecord> {
  const roomIds = [...socket.rooms].filter((room) => room !== socket.id);
  if (roomIds.length === 0) return null;
  return getRoomRecord(roomIds[0] ?? '');
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error('Next.js handler error:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: isDev ? '*' : false,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log('[socket] Client connected:', socket.id);

    // ----------------------------------------------------------------- room:join
    socket.on('room:join', (payload: JoinRoomPayload, ack) => {
      const { roomId, playerName, color } = payload;
      const record = getRoomRecord(roomId);

      if (!record) {
        ack({ ok: false, error: 'room_not_found' });
        return;
      }

      // ponytail: Check if this socket already joined - prevent double-join on reconnect
      const existingPlayerId = socket.data.playerId as string | undefined;
      if (existingPlayerId && record.players.has(existingPlayerId)) {
        // Already joined, just return snapshot
        ack({ ok: true, playerId: existingPlayerId, snapshot: roomSnapshot(record) });
        console.log(`[room:join] Player ${existingPlayerId} already in room ${roomId}, returning snapshot`);
        return;
      }

      if (record.players.size >= MAX_PLAYERS_PER_ROOM) {
        ack({ ok: false, error: 'room_full' });
        return;
      }

      const playerId = createId();
      const player: RoomPlayer = {
        id: playerId,
        name: playerName.slice(0, 40) || 'Pemain',
        color,
        joinedAt: nowIso(),
        socketId: socket.id,
      };

      record.players.set(playerId, player);
      record.contributors.set(playerId, player.name);

      if (!record.room.startedAt) {
        record.room.startedAt = nowIso();
        io.to(roomId).emit('room:started', { startedAt: record.room.startedAt });
      }

      socket.join(roomId);
      socket.data.playerId = playerId;
      touchRoom(record);

      const { socketId: _socketId, ...publicPlayer } = player;
      socket.to(roomId).emit('player:join', publicPlayer);

      ack({ ok: true, playerId, snapshot: roomSnapshot(record) });
      console.log(`[room:join] Player ${player.name} joined room ${roomId}`);
    });

    // -------------------------------------------------------------- piece:grab
    socket.on('piece:grab', ({ pieceId }, ack) => {
      const record = socketRoom(socket);
      if (!record) {
        ack({ ok: false });
        return;
      }

      const playerId = socket.data.playerId as string | undefined;
      if (!playerId) {
        ack({ ok: false });
        return;
      }

      const state = record.pieces[pieceId];
      if (!state) {
        ack({ ok: false });
        return;
      }

      if (state.isPlaced) {
        ack({ ok: false, lockedBy: null });
        return;
      }

      if (state.lockedBy && state.lockedBy !== playerId) {
        ack({ ok: false, lockedBy: state.lockedBy });
        return;
      }

      state.lockedBy = playerId;
      touchRoom(record);

      socket.to(record.room.id).emit('piece:locked', { pieceId, playerId });
      ack({ ok: true, lockedBy: playerId });
    });

    // -------------------------------------------------------------- piece:move
    socket.on('piece:move', (payload: PieceMovePayload) => {
      const record = socketRoom(socket);
      if (!record) return;

      const playerId = socket.data.playerId as string | undefined;
      if (!playerId) return;

      const state = record.pieces[payload.pieceId];
      if (!state || state.lockedBy !== playerId) return;

      state.x = payload.x;
      state.y = payload.y;
      state.rotation = payload.rotation;
      touchRoom(record);

      socket.to(record.room.id).emit('piece:moved', { ...payload, playerId });
    });

    // -------------------------------------------------------------- piece:drop
    socket.on('piece:drop', (payload: PieceDropPayload) => {
      const record = socketRoom(socket);
      if (!record) return;

      const playerId = socket.data.playerId as string | undefined;
      if (!playerId) return;

      const state = record.pieces[payload.pieceId];
      if (!state || state.lockedBy !== playerId) return;

      const grid = computeGrid(
        record.room.imageWidth,
        record.room.imageHeight,
        record.room.requestedPieceCount,
      );
      const pieceWidth = record.room.imageWidth / grid.cols;
      const pieceHeight = record.room.imageHeight / grid.rows;

      const match = payload.pieceId.match(/^p(\d+)-(\d+)$/);
      if (!match) return;

      const row = Number(match[1]);
      const col = Number(match[2]);
      const boardMargin = Math.max(pieceWidth, pieceHeight) * 2;

      const correctX = boardMargin + col * pieceWidth;
      const correctY = boardMargin + row * pieceHeight;

      const result = resolveDrop({
        piece: {
          id: payload.pieceId,
          row,
          col,
          width: pieceWidth,
          height: pieceHeight,
          correctX,
          correctY,
          currentX: state.x,
          currentY: state.y,
          rotation: state.rotation,
          isPlaced: state.isPlaced,
          z: state.z,
          lockedByPlayerId: state.lockedBy,
          edges: {
            top: { kind: 0, variant: 0, heightScale: 1 },
            right: { kind: 0, variant: 0, heightScale: 1 },
            bottom: { kind: 0, variant: 0, heightScale: 1 },
            left: { kind: 0, variant: 0, heightScale: 1 },
          },
        },
        x: payload.x,
        y: payload.y,
        rotation: payload.rotation,
        tolerance: Math.min(pieceWidth, pieceHeight) * 0.25,
      });

      const wasPlaced = state.isPlaced;
      state.x = result.x;
      state.y = result.y;
      state.rotation = result.rotation;
      state.isPlaced = result.isPlaced;
      state.lockedBy = null;

      if (!result.isPlaced) {
        const maxZ = Math.max(...Object.values(record.pieces).map((s) => s.z));
        state.z = maxZ + 1;
      }

      touchRoom(record);

      socket.to(record.room.id).emit('piece:dropped', {
        pieceId: payload.pieceId,
        x: result.x,
        y: result.y,
        rotation: result.rotation,
        isPlaced: result.isPlaced,
        z: state.z,
        playerId,
      });

      socket.emit('piece:unlocked', { pieceId: payload.pieceId });
      socket.to(record.room.id).emit('piece:unlocked', { pieceId: payload.pieceId });

      if (!wasPlaced && result.isPlaced) {
        const allPlaced = Object.values(record.pieces).every((s) => s.isPlaced);
        if (allPlaced && !record.room.isCompleted) {
          record.room.isCompleted = true;
          record.room.completedAt = nowIso();
          const stats = roomStats(record);
          io.to(record.room.id).emit('room:completed', {
            completedAt: record.room.completedAt,
            stats,
          });
          console.log(`[room:completed] Room ${record.room.id} completed!`);
        }
      }
    });

    // ------------------------------------------------------------- cursor:move
    socket.on('cursor:move', (payload: Point) => {
      const record = socketRoom(socket);
      if (!record) return;

      const playerId = socket.data.playerId as string | undefined;
      if (!playerId) return;

      socket.to(record.room.id).emit('cursor:moved', {
        playerId,
        x: payload.x,
        y: payload.y,
      });
    });

    // -------------------------------------------------------------- chat:send
    socket.on('chat:send', ({ text }) => {
      const record = socketRoom(socket);
      if (!record) return;

      const playerId = socket.data.playerId as string | undefined;
      const player = playerId ? record.players.get(playerId) : null;
      if (!player) return;

      const message: ChatMessage = {
        id: createId(),
        playerId: player.id,
        playerName: player.name,
        color: player.color,
        text: text.slice(0, 300),
        sentAt: nowIso(),
        kind: 'text',
      };

      record.chat.push(message);
      if (record.chat.length > MAX_CHAT_HISTORY) {
        record.chat.splice(0, record.chat.length - MAX_CHAT_HISTORY);
      }

      touchRoom(record);
      io.to(record.room.id).emit('chat:message', message);
    });

    // --------------------------------------------------------- reaction:send
    socket.on('reaction:send', ({ emoji, x, y }) => {
      const record = socketRoom(socket);
      if (!record) return;

      const playerId = socket.data.playerId as string | undefined;
      if (!playerId) return;

      const reaction: Reaction = {
        id: createId(),
        playerId,
        emoji: emoji.slice(0, 10),
        x,
        y,
      };

      touchRoom(record);
      io.to(record.room.id).emit('reaction:shown', reaction);
    });

    // ------------------------------------------------------------- room:reset
    socket.on('room:reset', () => {
      const record = socketRoom(socket);
      if (!record) return;

      reshuffleRoom(record);
      io.to(record.room.id).emit('room:sync', roomSnapshot(record));
      console.log(`[room:reset] Room ${record.room.id} shuffled`);
    });

    // ------------------------------------------------------------ disconnect
    socket.on('disconnect', () => {
      const record = socketRoom(socket);
      if (!record) {
        console.log('[socket] Client disconnected (no room):', socket.id);
        return;
      }

      const playerId = socket.data.playerId as string | undefined;
      if (playerId) {
        record.players.delete(playerId);

        for (const [pieceId, state] of Object.entries(record.pieces)) {
          if (state.lockedBy === playerId) {
            state.lockedBy = null;
            socket.to(record.room.id).emit('piece:unlocked', { pieceId });
          }
        }

        socket.to(record.room.id).emit('player:leave', { playerId });
        console.log(`[disconnect] Player ${playerId} left room ${record.room.id}`);
      }

      touchRoom(record);
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> Environment: ${NODE_ENV}`);
    console.log(`> Socket.io enabled`);
  });
});

