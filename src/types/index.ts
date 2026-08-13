/**
 * Tipe inti Jigsaw Explorer.
 *
 * Konvensi koordinat:
 * - Semua posisi potongan memakai "world coordinate" (satuan papan), bukan pixel gambar
 *   dan bukan pixel layar. Konversi world -> layar dilakukan oleh stage (zoom & pan).
 * - `currentX/currentY` selalu menunjuk sudut kiri-atas *kotak* potongan (tanpa tab),
 *   sehingga potongan benar ketika `currentX === correctX && currentY === correctY`.
 */

// ---------------------------------------------------------------- geometri dasar

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

// ---------------------------------------------------------------- puzzle statis

/** Pilihan jumlah potongan yang ditawarkan di UI. */
export const PIECE_COUNT_OPTIONS = [12, 48, 100, 300, 500] as const;

export type PieceCountOption = (typeof PIECE_COUNT_OPTIONS)[number];

/**
 * Bentuk satu sisi potongan.
 * `1` = tab (menonjol ke luar), `-1` = blank (cekungan), `0` = rata (tepi gambar).
 */
export type EdgeKind = -1 | 0 | 1;

export interface PieceEdge {
  kind: EdgeKind;
  /** Index varian profil tab (bentuk kepala/leher berbeda-beda biar tidak monoton). */
  variant: number;
  /** Pengali tinggi tab (0.88 - 1.12). Selalu sama untuk dua potongan yang bertemu. */
  heightScale: number;
}

export interface PieceEdges {
  top: PieceEdge;
  right: PieceEdge;
  bottom: PieceEdge;
  left: PieceEdge;
}

export type EdgeSide = keyof PieceEdges;

export interface PuzzleGrid {
  rows: number;
  cols: number;
  /** rows * cols — bisa sedikit berbeda dari jumlah yang diminta pemain. */
  pieceCount: number;
}

/**
 * Geometri turunan dari (ukuran gambar + jumlah potongan).
 * Dihitung dengan fungsi murni yang sama di client maupun server, sehingga
 * semua pemain dalam satu room memakai papan yang identik.
 */
export interface PuzzleLayout {
  grid: PuzzleGrid;
  /** Area target tempat gambar utuh berada, dalam world coordinate. */
  board: Rect;
  /** Seluruh area kerja (papan + ruang untuk menyebar potongan). */
  world: Size;
  pieceWidth: number;
  pieceHeight: number;
  /** Tinggi tab jigsaw dalam world unit. */
  tabSize: number;
  /** Padding sprite di setiap sisi agar tab tidak terpotong. */
  padding: number;
  /** Jarak maksimum (world unit) agar potongan otomatis nempel. */
  snapTolerance: number;
  /** world unit per pixel gambar asli. */
  scale: number;
}

/** Satu potongan puzzle: geometri statis + state runtime. */
export interface PuzzlePiece {
  id: string;
  row: number;
  col: number;
  /** Ukuran kotak potongan (tanpa tab). */
  width: number;
  height: number;
  correctX: number;
  correctY: number;
  currentX: number;
  currentY: number;
  /** Derajat (0/90/180/270). Selalu 0 kalau rotasi dimatikan. */
  rotation: number;
  isPlaced: boolean;
  /** Urutan tumpukan; makin besar makin di atas. */
  z: number;
  lockedByPlayerId?: string | null;
  edges: PieceEdges;
}

/** Bagian potongan yang berubah saat dimainkan — ini yang dikirim lewat socket. */
export interface PieceState {
  x: number;
  y: number;
  rotation: number;
  isPlaced: boolean;
  z: number;
  lockedBy: string | null;
}

export type PieceStateMap = Record<string, PieceState>;

// ---------------------------------------------------------------- room & pemain

export type PuzzleImageSource = 'gallery' | 'upload';

/** Semua yang menentukan bentuk sebuah puzzle (deterministik lewat `seed`). */
export interface PuzzleSpec {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  imageTitle: string;
  imageSource: PuzzleImageSource;
  /** Jumlah potongan yang dipilih pemain (sebelum disesuaikan ke grid). */
  requestedPieceCount: number;
  gridRows: number;
  gridCols: number;
  /** gridRows * gridCols. */
  pieceCount: number;
  seed: number;
  allowRotation: boolean;
}

export interface PuzzleRoom extends PuzzleSpec {
  id: string;
  createdAt: string;
  /** Diisi saat potongan pertama disentuh (timer mulai jalan). */
  startedAt: string | null;
  completedAt: string | null;
  isCompleted: boolean;
}

export interface Player {
  id: string;
  name: string;
  /** Warna cursor & label. */
  color: string;
  joinedAt: string;
}

export interface PlayerCursor {
  playerId: string;
  x: number;
  y: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  color: string;
  text: string;
  sentAt: string;
  timestamp?: string; // alias untuk sentAt (backward compat)
  kind: 'text' | 'system';
}

export interface Reaction {
  id: string;
  playerId: string;
  emoji: string;
  x: number;
  y: number;
  timestamp?: string; // optional timestamp
}

export interface RoomStats {
  durationMs: number;
  playerCount: number;
  playerNames: string[];
  pieceCount: number;
}

/** State lengkap sebuah room saat pemain baru masuk. */
export interface RoomSnapshot {
  room: PuzzleRoom;
  pieces: PieceStateMap;
  players: Player[];
  chat: ChatMessage[];
  /** Nama semua pemain yang pernah ikut (untuk statistik akhir). */
  contributors: string[];
  serverTime: string;
}

// ---------------------------------------------------------------- socket events

export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
  color: string;
}

export interface JoinRoomResult {
  ok: boolean;
  snapshot?: RoomSnapshot;
  playerId?: string;
  error?: 'room_not_found' | 'room_full';
}

export interface PieceMovePayload {
  pieceId: string;
  x: number;
  y: number;
  rotation: number;
}

export interface PieceDropPayload extends PieceMovePayload {}

export interface PieceGrabResult {
  ok: boolean;
  lockedBy?: string | null;
}

/** Event: client -> server. */
export interface ClientToServerEvents {
  'room:join': (payload: JoinRoomPayload, ack: (result: JoinRoomResult) => void) => void;
  'room:reset': () => void;
  'piece:grab': (payload: { pieceId: string }, ack: (result: PieceGrabResult) => void) => void;
  'piece:move': (payload: PieceMovePayload) => void;
  'piece:drop': (payload: PieceDropPayload) => void;
  'cursor:move': (payload: Point) => void;
  'chat:send': (payload: { text: string }) => void;
  'reaction:send': (payload: { emoji: string; x: number; y: number }) => void;
}

/** Event: server -> client. */
export interface ServerToClientEvents {
  'room:sync': (snapshot: RoomSnapshot) => void;
  'room:started': (payload: { startedAt: string }) => void;
  'room:completed': (payload: { completedAt: string; stats: RoomStats }) => void;
  'player:join': (player: Player) => void;
  'player:leave': (payload: { playerId: string }) => void;
  'piece:locked': (payload: { pieceId: string; playerId: string }) => void;
  'piece:unlocked': (payload: { pieceId: string }) => void;
  'piece:moved': (payload: PieceMovePayload & { playerId: string }) => void;
  'piece:dropped': (payload: {
    pieceId: string;
    x: number;
    y: number;
    rotation: number;
    isPlaced: boolean;
    z: number;
    playerId: string;
  }) => void;
  'cursor:moved': (payload: PlayerCursor) => void;
  'chat:message': (message: ChatMessage) => void;
  'reaction:shown': (reaction: Reaction) => void;
}

// ---------------------------------------------------------------- API payloads

export interface CreateRoomRequest {
  imageUrl: string;
  /**
   * Sekadar petunjuk dari client. Server selalu membaca ulang ukuran gambar dari
   * file aslinya, jadi angka di sini tidak pernah dipercaya apa adanya.
   */
  imageWidth?: number;
  imageHeight?: number;
  imageTitle?: string;
  imageSource?: PuzzleImageSource;
  pieceCount: number;
  allowRotation?: boolean;
}

export interface CreateRoomResponse {
  room: PuzzleRoom;
}

export interface UploadImageResponse {
  url: string;
  width: number;
  height: number;
  title: string;
}

export interface ApiError {
  error: string;
}

// ---------------------------------------------------------------- galeri bawaan

export interface GalleryImage {
  id: string;
  title: string;
  category: string;
  url: string;
  width: number;
  height: number;
}
